'use client';

import * as React from 'react';
import { format, isValid } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useDateFormat } from '@/hooks/use-date-format';
import {
  DATE_INPUT_FORMATS,
  type DateInputFormat,
} from '@/lib/date';

export interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  id,
  name,
}: DatePickerProps) {
  const { inputFormat } = useDateFormat();
  const [open, setOpen] = React.useState(false);
  const [displayValue, setDisplayValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const formatPattern = DATE_INPUT_FORMATS[inputFormat];

  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    const d = new Date(value);
    return isValid(d) ? d : undefined;
  }, [value]);

  React.useEffect(() => {
    if (parsedDate) {
      setDisplayValue(format(parsedDate, formatPattern));
    } else {
      setDisplayValue('');
    }
  }, [parsedDate, formatPattern]);

  const handleSelect = React.useCallback(
    (date: Date | undefined) => {
      if (date) {
        const iso = format(date, 'yyyy-MM-dd');
        onChange?.(iso);
        setDisplayValue(format(date, formatPattern));
      }
      setOpen(false);
    },
    [onChange, formatPattern],
  );

  const handleClear = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.('');
      setDisplayValue('');
    },
    [onChange],
  );

  const handleTextChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDisplayValue(raw);

      if (!raw.trim()) {
        onChange?.('');
        return;
      }
    },
    [onChange],
  );

  const handleTextBlur = React.useCallback(() => {
    if (!displayValue.trim()) {
      onChange?.('');
      return;
    }

    const parts = displayValue.split(/[/.\-/]/);
    let date: Date | null = null;

    if (inputFormat === 'dd/MM/yyyy' || inputFormat === 'dd.MM.yyyy') {
      const [d, m, y] = parts;
      if (d && m && y) date = new Date(Number(y), Number(m) - 1, Number(d));
    } else if (inputFormat === 'MM/dd/yyyy' || inputFormat === 'MM.dd.yyyy') {
      const [m, d, y] = parts;
      if (d && m && y) date = new Date(Number(y), Number(m) - 1, Number(d));
    } else if (inputFormat === 'yyyy-MM-dd' || inputFormat === 'yyyy/MM/dd') {
      const [y, m, d] = parts;
      if (d && m && y) date = new Date(Number(y), Number(m) - 1, Number(d));
    }

    if (date && isValid(date)) {
      const iso = format(date, 'yyyy-MM-dd');
      onChange?.(iso);
      setDisplayValue(format(date, formatPattern));
    }
  }, [displayValue, inputFormat, onChange, formatPattern]);

  return (
    <div className={cn('relative flex items-center', className)}>
      <Input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        value={displayValue}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        placeholder={placeholder ?? formatPattern}
        disabled={disabled}
        className="pr-8"
        autoComplete="off"
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
          >
            <CalendarIcon className="size-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={parsedDate}
            onSelect={handleSelect}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export interface DatePickerFieldProps extends Omit<DatePickerProps, 'value' | 'onChange'> {
  value?: string;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  name?: string;
}

export function DatePickerField({
  value,
  onChange,
  name,
  ...props
}: DatePickerFieldProps) {
  const handleChange = React.useCallback(
    (iso: string) => {
      onChange?.({ target: { value: iso, name } });
    },
    [onChange, name],
  );

  return (
    <DatePicker
      value={value}
      onChange={handleChange}
      name={name}
      {...props}
    />
  );
}
