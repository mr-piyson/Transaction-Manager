'use client';

import * as React from 'react';
import {
  Controller,
  type Control,
  type FieldValues,
  type FieldPath,
  type RegisterOptions,
} from 'react-hook-form';
import { format, isValid, set, startOfDay } from 'date-fns';
import { CalendarIcon, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useDateFormat } from '@/hooks/use-date-format';
import {
  DATE_INPUT_FORMATS,
  parseDateFromInput,
  parseDateTimeFromInput,
  safeParseISO,
  type DateInputFormat,
} from '@/lib/date';

// =============================================================================
// DateInput — comprehensive date (or datetime) input + calendar picker
//
// Behaviour:
//   - User types freely in the text input
//   - On blur: if the text is a valid date → commit it, sync calendar
//             if the text is NOT a valid date → revert to last valid date, show error
//   - Calendar selection → immediately updates the text input
//   - The input NEVER displays an invalid date string after blur
// =============================================================================

export interface DateInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'onBlur'
> {
  value?: string;
  onChange?: (iso: string) => void;
  // Called *in addition to* the internal validation/revert logic on blur.
  // (Kept as a zero-arg callback so it matches react-hook-form's field.onBlur.)
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;

  minDate?: string | Date;
  maxDate?: string | Date;
  disabledDates?: Date[];

  error?: string;
  required?: boolean;
  showTodayButton?: boolean;
  mode?: 'date' | 'datetime';
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  {
    value: controlledValue,
    onChange,
    onBlur,
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
  // True while the text input has focus. Used to stop the display-sync
  // effect from rewriting the input's text out from under the user's own
  // keystrokes (that race was the cause of corrupted text like
  // "2026-08-016" appearing while typing "2026-08-16").
  const isFocusedRef = React.useRef(false);

  // ---- Stable refs (avoid stale closures) ----
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const onBlurRef = React.useRef(onBlur);
  onBlurRef.current = onBlur;
  const modeRef = React.useRef(mode);
  modeRef.current = mode;
  const timeValueRef = React.useRef(timeValue);
  timeValueRef.current = timeValue;
  const inputFormatRef = React.useRef(inputFormat);
  inputFormatRef.current = inputFormat;
  const displayValueRef = React.useRef(displayValue);
  displayValueRef.current = displayValue;

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
  // NOTE: no surrounding quotes around HH:mm — quoting it turns it into
  // literal text in date-fns format strings, so it would print the
  // literal characters "HH:mm" instead of the actual time.
  const dateTimeFormatPattern = `${formatPattern} HH:mm`;

  // Derived parsed date from controlled value.
  // Uses safeParseISO instead of `new Date(string)` to avoid the classic
  // bug where date-only ISO strings ("2024-04-18") are interpreted as
  // UTC midnight, shifting the displayed day in timezones behind UTC.
  const parsedDate = React.useMemo(() => {
    if (!controlledValue) return undefined;
    return safeParseISO(controlledValue) ?? undefined;
  }, [controlledValue]);

  // Sync display + timeValue when controlled value changes from outside
  // (calendar selection, programmatic setValue, etc.)
  React.useEffect(() => {
    // While the user is actively typing, the text input is the source of
    // truth for `displayValue` — handleTextChange/handleTextBlur own it.
    // Reformatting here mid-keystroke is what caused stray zero-padding
    // (e.g. "2026-08-16" getting mangled into "2026-08-016"). Only
    // resync from an external value change (calendar click, "Today"
    // button, parent setValue) once the field isn't focused.
    if (isFocusedRef.current) return;

    if (parsedDate) {
      const fmt = mode === 'datetime' ? dateTimeFormatPattern : formatPattern;
      setDisplayValue(format(parsedDate, fmt));
      setTimeValue(format(parsedDate, 'HH:mm'));
    } else {
      setDisplayValue('');
    }
    setTextError(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedDate, formatPattern, mode]);

  // ---- Min/max/disabled ----
  const minDateObj = React.useMemo(
    () => (minDate ? (safeParseISO(minDate) ?? undefined) : undefined),
    [minDate],
  );
  const maxDateObj = React.useMemo(
    () => (maxDate ? (safeParseISO(maxDate) ?? undefined) : undefined),
    [maxDate],
  );
  // Precompute a Set of day-timestamps for O(1) lookups instead of
  // re-scanning the whole disabledDates array on every calendar cell.
  const disabledDaySet = React.useMemo(() => {
    if (!disabledDates?.length) return null;
    return new Set(disabledDates.map((d) => startOfDay(d).getTime()));
  }, [disabledDates]);

  const isDisabled = React.useCallback(
    (date: Date) => {
      if (minDateObj && date < minDateObj) return true;
      if (maxDateObj && date > maxDateObj) return true;
      if (disabledDaySet && disabledDaySet.has(startOfDay(date).getTime())) {
        return true;
      }
      return false;
    },
    [minDateObj, maxDateObj, disabledDaySet],
  );

  // ---- Commit helpers (stable — read from refs) ----

  const commitDate = React.useCallback((date: Date | undefined) => {
    if (!date) {
      onChangeRef.current?.('');
      return;
    }
    if (modeRef.current === 'datetime') {
      const raw = timeValueRef.current;
      const [h, m] = raw.split(':').map(Number);
      const dt = set(date, {
        hours: h || 0,
        minutes: m || 0,
        seconds: 0,
        milliseconds: 0,
      });
      onChangeRef.current?.(dt.toISOString());
    } else {
      onChangeRef.current?.(format(date, 'yyyy-MM-dd'));
    }
  }, []);

  const formatForDisplay = React.useCallback(
    (date: Date) => {
      if (modeRef.current === 'datetime') {
        return format(date, dateTimeFormatPattern);
      }
      return format(date, formatPattern);
    },
    [formatPattern, dateTimeFormatPattern],
  );

  // ---- Parse text → Date using current settings format ----
  const parseText = React.useCallback((text: string): Date | null => {
    if (!text.trim()) return null;
    return modeRef.current === 'datetime'
      ? parseDateTimeFromInput(text, inputFormatRef.current)
      : parseDateFromInput(text, inputFormatRef.current);
  }, []);

  // ---- Calendar selection ----
  const handleSelect = React.useCallback(
    (date: Date | undefined) => {
      if (date) {
        commitDate(date);
        setDisplayValue(formatForDisplay(date));
        setTextError(false);
      }
      setOpen(false);
    },
    [commitDate, formatForDisplay],
  );

  // ---- Clear button ----
  const handleClear = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeRef.current?.('');
    setDisplayValue('');
    setTextError(false);
  }, []);

  // ---- Text input: typing ----
  const handleTextChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDisplayValue(raw);
      setTextError(false);

      if (!raw.trim()) {
        onChangeRef.current?.('');
        return;
      }

      // Real-time sync: if the typed text forms a complete valid date,
      // commit it immediately so the calendar updates while typing.
      const parsed = parseText(raw);
      if (parsed && isValid(parsed)) {
        commitDate(parsed);
      }
    },
    [parseText, commitDate],
  );

  // ---- Text input: focus ----
  const handleTextFocus = React.useCallback(() => {
    isFocusedRef.current = true;
  }, []);

  // ---- Text input: blur (final validation) ----
  const handleTextBlur = React.useCallback(() => {
    isFocusedRef.current = false;
    const text = displayValueRef.current;

    if (!text.trim()) {
      onChangeRef.current?.('');
      setTextError(false);
      onBlurRef.current?.();
      return;
    }

    const parsed = parseText(text);

    if (parsed && isValid(parsed)) {
      // Valid date → commit and sync
      commitDate(parsed);
      setDisplayValue(formatForDisplay(parsed));
      if (modeRef.current === 'datetime') {
        const t = format(parsed, 'HH:mm');
        setTimeValue(t);
        timeValueRef.current = t;
      }
      setTextError(false);
    } else {
      // INVALID date → revert input to last known good value, show error.
      // We never called onChange with the invalid text, so `parsedDate`
      // (derived from the still-unchanged controlledValue) holds the last
      // good value — just re-render it.
      if (parsedDate && isValid(parsedDate)) {
        setDisplayValue(formatForDisplay(parsedDate));
      } else {
        setDisplayValue('');
      }
      setTextError(true);
    }

    onBlurRef.current?.();
  }, [commitDate, formatForDisplay, parseText, parsedDate]);

  // ---- Today button ----
  const handleToday = React.useCallback(() => {
    const now = new Date();
    commitDate(now);
    setDisplayValue(formatForDisplay(now));
    if (modeRef.current === 'datetime') {
      const t = format(now, 'HH:mm');
      setTimeValue(t);
      timeValueRef.current = t;
    }
    setTextError(false);
    setOpen(false);
  }, [commitDate, formatForDisplay]);

  // ---- Time picker change ----
  const handleTimeChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = e.target.value;
      setTimeValue(newTime);
      timeValueRef.current = newTime;
      if (parsedDate) {
        const [h, m] = newTime.split(':').map(Number);
        const dt = set(parsedDate, {
          hours: h || 0,
          minutes: m || 0,
          seconds: 0,
          milliseconds: 0,
        });
        onChangeRef.current?.(dt.toISOString());
        setDisplayValue(format(dt, dateTimeFormatPattern));
      }
    },
    [parsedDate, dateTimeFormatPattern],
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
          placeholder={placeholder ?? formatPattern}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            'pr-8',
            hasError && 'border-destructive text-destructive focus-visible:ring-destructive',
          )}
          aria-invalid={hasError || undefined}
          {...rest}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          onFocus={(e) => {
            rest.onFocus?.(e);
            handleTextFocus();
          }}
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
              captionLayout="dropdown"
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
          {error ?? `Invalid date. Use ${formatPattern} format.`}
        </p>
      )}
    </div>
  );
});

// =============================================================================
// DateInputField — react-hook-form Controller wrapper
//
// IMPORTANT: does NOT spread {…field} onto DateInput. Each prop is passed
// explicitly so that DateInput's own onBlur (validation + revert) is never
// silently overwritten by the Controller's onBlur. DateInput now declares
// `onBlur` explicitly in its own props (instead of letting it fall into
// ...rest), and calls it *after* running its internal validation, so both
// RHF's touched-tracking and the revert/error behavior work together.
// =============================================================================

export interface DateInputFieldProps<TFieldValues extends FieldValues = FieldValues> extends Omit<
  DateInputProps,
  'value' | 'onChange'
> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
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
          ref={field.ref}
          name={field.name}
          disabled={field.disabled}
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
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
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  error?: string;
}

export function DatePicker({
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  className,
  id,
  name,
  error,
}: DatePickerProps) {
  const { inputFormat } = useDateFormat();
  const [open, setOpen] = React.useState(false);
  const [displayValue, setDisplayValue] = React.useState('');
  const [textError, setTextError] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const formatPattern = DATE_INPUT_FORMATS[inputFormat];

  // safeParseISO avoids the UTC-midnight shift bug that `new Date(string)`
  // has for date-only ISO strings.
  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    return safeParseISO(value) ?? undefined;
  }, [value]);

  React.useEffect(() => {
    if (parsedDate) {
      setDisplayValue(format(parsedDate, formatPattern));
    } else {
      setDisplayValue('');
    }
    setTextError(false);
  }, [parsedDate, formatPattern]);

  const handleSelect = React.useCallback(
    (date: Date | undefined) => {
      if (date) {
        const iso = format(date, 'yyyy-MM-dd');
        onChange?.(iso);
        setDisplayValue(format(date, formatPattern));
        setTextError(false);
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
        return;
      }
    },
    [onChange],
  );

  const handleTextBlur = React.useCallback(() => {
    if (!displayValue.trim()) {
      onChange?.('');
      setTextError(false);
      onBlur?.();
      return;
    }

    const parsed = parseDateFromInput(displayValue, inputFormat);
    if (parsed && isValid(parsed)) {
      const iso = format(parsed, 'yyyy-MM-dd');
      onChange?.(iso);
      setDisplayValue(format(parsed, formatPattern));
      setTextError(false);
    } else {
      // Revert to the last known-good value and surface an error, matching
      // DateInput's behavior instead of silently leaving invalid text in place.
      if (parsedDate) {
        setDisplayValue(format(parsedDate, formatPattern));
      } else {
        setDisplayValue('');
      }
      setTextError(true);
    }
    onBlur?.();
  }, [displayValue, inputFormat, onChange, formatPattern, parsedDate, onBlur]);

  const hasError = !!error || textError;

  return (
    <div className={cn('relative flex flex-col', className)}>
      <div className="relative flex items-center">
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
          className={cn(
            'pr-8',
            hasError && 'border-destructive text-destructive focus-visible:ring-destructive',
          )}
          aria-invalid={hasError || undefined}
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
              captionLayout="dropdown"
              mode="single"
              selected={parsedDate}
              onSelect={handleSelect}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      {(error || textError) && (
        <p className="mt-1 text-xs text-destructive">
          {error ?? `Invalid date. Use ${formatPattern} format.`}
        </p>
      )}
    </div>
  );
}

export interface DatePickerFieldProps extends Omit<DatePickerProps, 'value' | 'onChange'> {
  value?: string;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  name?: string;
}

export function DatePickerField({ value, onChange, name, ...props }: DatePickerFieldProps) {
  const handleChange = React.useCallback(
    (iso: string) => {
      onChange?.({ target: { value: iso, name } });
    },
    [onChange, name],
  );

  return <DatePicker value={value} onChange={handleChange} name={name} {...props} />;
}
