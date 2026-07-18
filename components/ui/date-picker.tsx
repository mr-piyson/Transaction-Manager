'use client';

import * as React from 'react';
import { Controller, type Control, type FieldValues, type FieldPath, type RegisterOptions } from 'react-hook-form';
import { format, isValid, set } from 'date-fns';
import { CalendarIcon, Clock, X } from 'lucide-react';
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
  parseDateFromInput,
  parseDateTimeFromInput,
  type DateInputFormat,
} from '@/lib/date';

// =============================================================================
// DateInput — comprehensive date (or datetime) input + calendar picker
// =============================================================================

export interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value?: string;
  onChange?: (iso: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;

  /** Earliest selectable date (ISO string or Date). */
  minDate?: string | Date;
  /** Latest selectable date (ISO string or Date). */
  maxDate?: string | Date;
  /** Specific dates to disable. */
  disabledDates?: Date[];

  /** Show inline error message below the input. */
  error?: string;
  /** Visual required indicator (red asterisk). Does not add native required. */
  required?: boolean;
  /** Add "Today" quick-select button in the calendar popover. */
  showTodayButton?: boolean;
  /** "date" (default) or "datetime" (adds HH:mm time picker in popover). */
  mode?: 'date' | 'datetime';
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  function DateInput(
    {
      value,
      onChange,
      placeholder,
      disabled = false,
      className,
      id,
      name,
      minDate,
      maxDate,
      disabledDates,
      error,
      required: showRequired,
      showTodayButton = false,
      mode = 'date',
      ...rest
    },
    ref,
  ) {
    const { inputFormat } = useDateFormat();
    const [open, setOpen] = React.useState(false);
    const [displayValue, setDisplayValue] = React.useState('');
    const [textError, setTextError] = React.useState(false);
    const [timeValue, setTimeValue] = React.useState('12:00');
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Merge forwarded ref with local ref
    const mergedRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      },
      [ref],
    );

    const formatPattern = DATE_INPUT_FORMATS[inputFormat];

    const parsedDate = React.useMemo(() => {
      if (!value) return undefined;
      const d = new Date(value);
      return isValid(d) ? d : undefined;
    }, [value]);

    // Sync display value when external value changes
    React.useEffect(() => {
      if (parsedDate) {
        setDisplayValue(format(parsedDate, mode === 'datetime' ? `${formatPattern} 'HH:mm'` : formatPattern));
        setTimeValue(format(parsedDate, 'HH:mm'));
      } else {
        setDisplayValue('');
      }
      setTextError(false);
    }, [parsedDate, formatPattern, mode]);

    // Parse min/max to Date objects
    const minDateObj = React.useMemo(() => (minDate ? new Date(minDate) : undefined), [minDate]);
    const maxDateObj = React.useMemo(() => (maxDate ? new Date(maxDate) : undefined), [maxDate]);

    // Build disabled function for Calendar
    const isDisabled = React.useCallback(
      (date: Date) => {
        if (minDateObj && date < minDateObj) return true;
        if (maxDateObj && date > maxDateObj) return true;
        if (disabledDates?.length) {
          const ts = date.getTime();
          return disabledDates.some((d) => d.getTime() === ts);
        }
        return false;
      },
      [minDateObj, maxDateObj, disabledDates],
    );

    const commitChange = React.useCallback(
      (date: Date | undefined) => {
        if (!date) {
          onChange?.('');
          return;
        }
        if (mode === 'datetime') {
          const [h, m] = timeValue.split(':').map(Number);
          const dt = set(date, { hours: h || 0, minutes: m || 0, seconds: 0, milliseconds: 0 });
          onChange?.(dt.toISOString());
        } else {
          onChange?.(format(date, 'yyyy-MM-dd'));
        }
      },
      [onChange, mode, timeValue],
    );

    const handleSelect = React.useCallback(
      (date: Date | undefined) => {
        if (date) {
          commitChange(date);
          if (mode === 'datetime') {
            setDisplayValue(format(date, `${formatPattern} 'HH:mm'`));
          } else {
            setDisplayValue(format(date, formatPattern));
          }
          setTextError(false);
        }
        setOpen(false);
      },
      [commitChange, formatPattern, mode],
    );

    const handleClear = React.useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange?.('');
        setDisplayValue('');
        setTextError(false);
      },
      [onChange],
    );

    const handleTextChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setDisplayValue(raw);
        setTextError(false);

        if (!raw.trim()) {
          onChange?.('');
        }
      },
      [onChange],
    );

    const handleTextBlur = React.useCallback(() => {
      if (!displayValue.trim()) {
        onChange?.('');
        setTextError(false);
        return;
      }

      const parsed = mode === 'datetime'
        ? parseDateTimeFromInput(displayValue, inputFormat)
        : parseDateFromInput(displayValue, inputFormat);

      if (parsed && isValid(parsed)) {
        commitChange(parsed);
        if (mode === 'datetime') {
          setDisplayValue(format(parsed, `${formatPattern} 'HH:mm'`));
          setTimeValue(format(parsed, 'HH:mm'));
        } else {
          setDisplayValue(format(parsed, formatPattern));
        }
        setTextError(false);
      } else {
        setTextError(true);
      }
    }, [displayValue, inputFormat, onChange, formatPattern, mode, commitChange]);

    const handleToday = React.useCallback(() => {
      const now = new Date();
      commitChange(now);
      if (mode === 'datetime') {
        setDisplayValue(format(now, `${formatPattern} 'HH:mm'`));
        setTimeValue(format(now, 'HH:mm'));
      } else {
        setDisplayValue(format(now, formatPattern));
      }
      setTextError(false);
      setOpen(false);
    }, [commitChange, formatPattern, mode]);

    const handleTimeChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value;
        setTimeValue(newTime);
        if (parsedDate) {
          const [h, m] = newTime.split(':').map(Number);
          const dt = set(parsedDate, { hours: h || 0, minutes: m || 0, seconds: 0, milliseconds: 0 });
          onChange?.(dt.toISOString());
          setDisplayValue(format(dt, `${formatPattern} 'HH:mm'`));
        }
      },
      [parsedDate, onChange, formatPattern],
    );

    const hasError = !!error || textError;

    return (
      <div className={cn('relative flex flex-col', className)}>
        <div className="relative flex items-center">
          <Input
            ref={mergedRef}
            id={id}
            name={name}
            type="text"
            value={displayValue}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            placeholder={placeholder ?? formatPattern}
            disabled={disabled}
            autoComplete="off"
            className={cn(
              'pr-8',
              hasError && 'border-destructive text-destructive focus-visible:ring-destructive',
            )}
            aria-invalid={hasError || undefined}
            {...rest}
          />
          {showRequired && (
            <span className="absolute -top-1 -right-1 text-destructive text-xs leading-none">*</span>
          )}
          {displayValue && !disabled && (
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
                disabled={isDisabled}
                autoFocus
              />
              {mode === 'datetime' && (
                <div className="flex items-center gap-2 border-t px-4 py-3">
                  <Clock className="size-4 text-muted-foreground shrink-0" />
                  <Input
                    type="time"
                    value={timeValue}
                    onChange={handleTimeChange}
                    className="h-8 w-24 text-sm"
                  />
                </div>
              )}
              {showTodayButton && (
                <div className="border-t px-4 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-xs"
                    onClick={handleToday}
                  >
                    Today
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
        {(error || textError) && (
          <p className="mt-1 text-xs text-destructive">
            {error ?? 'Invalid date'}
          </p>
        )}
      </div>
    );
  },
);

// =============================================================================
// DateInputField — react-hook-form Controller wrapper (recommended for forms)
// =============================================================================

export interface DateInputFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<DateInputProps, 'value' | 'onChange'> {
  /** react-hook-form control from useForm(). */
  control: Control<TFieldValues>;
  /** Field name matching your schema. */
  name: FieldPath<TFieldValues>;
  /** Validation rules passed to Controller. */
  rules?: RegisterOptions<TFieldValues>;
}

export function DateInputField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  rules,
  required,
  ...props
}: DateInputFieldProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <DateInput
          {...props}
          {...field}
          value={field.value ?? ''}
          onChange={field.onChange}
          required={required}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}

// =============================================================================
// Legacy DatePicker / DatePickerField — kept for backward compatibility
// =============================================================================

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

    const parsed = parseDateFromInput(displayValue, inputFormat);
    if (parsed && isValid(parsed)) {
      const iso = format(parsed, 'yyyy-MM-dd');
      onChange?.(iso);
      setDisplayValue(format(parsed, formatPattern));
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
