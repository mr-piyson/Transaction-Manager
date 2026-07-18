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
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useDateFormat } from '@/hooks/use-date-format';
import {
  DATE_INPUT_FORMATS,
  parseDateFromInput,
  safeParseISO,
  getDateFormatSegments,
  getSegmentTotalDigits,
  digitsToParts,
  dateToDigits,
  type DateFormatToken,
} from '@/lib/date';

// =============================================================================
// DateInput — compact OTP-style date (or datetime) input + calendar picker
//
// The digit boxes are generated dynamically from the org's date-format
// setting (dd/MM/yyyy, yyyy-MM-dd, MM.dd.yyyy, ...) and from `mode`, via
// getDateFormatSegments(). Nothing about box count, box order, or the
// divider characters is hardcoded — it all comes from the format pattern.
//
// Behaviour:
//   - User types digits directly into the OTP boxes
//   - As soon as the date portion parses to a real calendar date, the
//     calendar popover's visible month follows along
//   - Once every box is filled with a valid date (and time, in datetime
//     mode), the value commits
//   - On blur: if incomplete/invalid, the boxes revert to the last good
//     value and an error is shown; nothing invalid is ever committed
//   - Calendar selection / "Today" fill the boxes immediately
// =============================================================================

export interface DateInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'onBlur' | 'onFocus'
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

/**
 * Validate + parse a raw OTP digit string into a real Date, given the
 * token layout for the active format/mode.
 *
 * - `dateFilled`: the yyyy/MM/dd boxes are all full (regardless of time).
 * - `complete`: every required box for the mode is full AND numerically
 *   valid (month 1-12, day valid for that month/year — e.g. Feb 30 is
 *   rejected — hours 0-23, minutes 0-59).
 * - `date`: the resulting Date, only set when `complete` is true.
 */
function evaluateDigits(
  digits: string,
  tokens: DateFormatToken[],
  mode: 'date' | 'datetime',
): { date: Date | null; complete: boolean; dateFilled: boolean } {
  const parts = digitsToParts(digits, tokens);
  const yyyy = parts.yyyy ?? '';
  const MM = parts.MM ?? '';
  const dd = parts.dd ?? '';
  const HH = parts.HH ?? '';
  const mm = parts.mm ?? '';

  const dateFilled = yyyy.length === 4 && MM.length === 2 && dd.length === 2;
  if (!dateFilled) return { date: null, complete: false, dateFilled: false };

  const year = Number(yyyy);
  const month = Number(MM);
  const day = Number(dd);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { date: null, complete: false, dateFilled: true };
  }

  let hours = 0;
  let minutes = 0;
  if (mode === 'datetime') {
    const timeFilled = HH.length === 2 && mm.length === 2;
    if (!timeFilled) return { date: null, complete: false, dateFilled: true };
    hours = Number(HH);
    minutes = Number(mm);
    if (hours > 23 || minutes > 59) {
      return { date: null, complete: false, dateFilled: true };
    }
  }

  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  // Catches roll-over from invalid day-in-month combos (e.g. Feb 30 → Mar 2)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { date: null, complete: false, dateFilled: true };
  }

  return { date, complete: true, dateFilled: true };
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
  const [digits, setDigits] = React.useState('');
  const [textError, setTextError] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // True while an OTP box has focus. Stops the external-value sync effect
  // from rewriting the boxes out from under the user's own keystrokes.
  const isFocusedRef = React.useRef(false);
  const digitsRef = React.useRef(digits);
  digitsRef.current = digits;

  // ---- Stable refs (avoid stale closures) ----
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const onBlurRef = React.useRef(onBlur);
  onBlurRef.current = onBlur;

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

  // Dynamic box layout: derived from the org's date format + mode, not
  // hardcoded. e.g. "dd/MM/yyyy" → [dd][dd] / [MM][MM] / [yyyy]x4;
  // "yyyy-MM-dd" in datetime mode → [yyyy]x4 - [MM][MM] - [dd][dd] (space) [HH][HH] : [mm][mm].
  const tokens = React.useMemo(() => getDateFormatSegments(inputFormat, mode), [inputFormat, mode]);
  const totalDigits = React.useMemo(() => getSegmentTotalDigits(tokens), [tokens]);

  // Derived parsed date from controlled value. Uses safeParseISO instead
  // of `new Date(string)` to avoid the classic bug where date-only ISO
  // strings ("2024-04-18") are interpreted as UTC midnight, shifting the
  // displayed day in timezones behind UTC.
  const parsedDate = React.useMemo(() => {
    if (!controlledValue) return undefined;
    return safeParseISO(controlledValue) ?? undefined;
  }, [controlledValue]);

  // The month/page the calendar is currently showing. Controlled
  // separately from `selected` because react-day-picker does NOT
  // re-navigate its visible page just because `selected` changes
  // externally (e.g. the user typing a new month/year) — it only reads
  // `selected` to highlight a day. We have to drive `month` ourselves.
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(() => parsedDate ?? new Date());

  // Keep the calendar's visible page in sync with the current date,
  // whatever the source (typing, calendar click, "Today", parent
  // setValue). Not gated on focus — navigating the calendar page
  // doesn't fight with anything the user is typing.
  React.useEffect(() => {
    if (parsedDate) setCalendarMonth(parsedDate);
  }, [parsedDate]);

  // Sync the OTP boxes when the controlled value changes from OUTSIDE
  // (calendar selection, "Today", parent setValue) — but never while the
  // user is actively typing, or we'd fight their keystrokes.
  React.useEffect(() => {
    if (isFocusedRef.current) return;
    setDigits(parsedDate ? dateToDigits(parsedDate, tokens) : '');
    setTextError(false);
  }, [parsedDate, tokens]);

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

  // ---- Commit helper: pushes a fully-valid Date out through onChange,
  // as an ISO datetime string in datetime mode or a yyyy-MM-dd string
  // in date mode. ----
  const commitDate = React.useCallback(
    (date: Date) => {
      onChangeRef.current?.(mode === 'datetime' ? date.toISOString() : format(date, 'yyyy-MM-dd'));
    },
    [mode],
  );

  // ---- OTP typing ----
  const handleOtpChange = React.useCallback(
    (val: string) => {
      setDigits(val);
      setTextError(false);

      if (!val) {
        onChangeRef.current?.('');
        return;
      }

      const info = evaluateDigits(val, tokens, mode);
      if (info.date) {
        // Let the calendar preview/navigate as soon as the date portion
        // parses, even if (in datetime mode) time isn't finished yet.
        setCalendarMonth(info.date);
      }
      if (info.complete && info.date) {
        commitDate(info.date);
      }
    },
    [tokens, mode, commitDate],
  );

  // ---- OTP focus/blur ----
  const handleOtpFocus = React.useCallback(() => {
    isFocusedRef.current = true;
  }, []);

  const handleOtpBlur = React.useCallback(() => {
    isFocusedRef.current = false;
    const val = digitsRef.current;

    if (!val) {
      onChangeRef.current?.('');
      setTextError(false);
      onBlurRef.current?.();
      return;
    }

    const info = evaluateDigits(val, tokens, mode);
    if (info.complete && info.date) {
      commitDate(info.date);
      setDigits(dateToDigits(info.date, tokens));
      setTextError(false);
    } else {
      // Incomplete or invalid → revert to the last committed value
      // (never leave garbage in the boxes) and flag the error.
      setDigits(parsedDate ? dateToDigits(parsedDate, tokens) : '');
      setTextError(true);
    }
    onBlurRef.current?.();
  }, [tokens, mode, parsedDate, commitDate]);

  // ---- Calendar selection ----
  const handleSelect = React.useCallback(
    (day: Date | undefined) => {
      if (day) {
        let finalDate = day;
        if (mode === 'datetime') {
          // Preserve whatever time-of-day is already typed/committed
          // instead of resetting to midnight when just picking a day.
          const parts = digitsToParts(digitsRef.current, tokens);
          const HH = parts.HH ?? '';
          const mm = parts.mm ?? '';
          let hours = 0;
          let minutes = 0;
          if (HH.length === 2 && mm.length === 2 && Number(HH) <= 23 && Number(mm) <= 59) {
            hours = Number(HH);
            minutes = Number(mm);
          } else if (parsedDate) {
            hours = parsedDate.getHours();
            minutes = parsedDate.getMinutes();
          }
          finalDate = set(day, { hours, minutes, seconds: 0, milliseconds: 0 });
        }
        commitDate(finalDate);
        setDigits(dateToDigits(finalDate, tokens));
        setTextError(false);
      }
      setOpen(false);
    },
    [tokens, mode, parsedDate, commitDate],
  );

  // ---- Clear button ----
  const handleClear = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeRef.current?.('');
    setDigits('');
    setTextError(false);
  }, []);

  // ---- Today button ----
  const handleToday = React.useCallback(() => {
    const now = new Date();
    commitDate(now);
    setDigits(dateToDigits(now, tokens));
    setTextError(false);
    setOpen(false);
  }, [tokens, commitDate]);

  const hasError = !!error || textError;

  // Build the OTP boxes + divider chips dynamically from `tokens`.
  let slotIndex = 0;
  const otpElements: React.ReactNode[] = tokens.map((token, i) => {
    if (token.type === 'separator') {
      if (token.char === ' ') {
        return <div key={`sep-${i}`} className="w-2" aria-hidden="true" />;
      }
      return (
        <div
          key={`sep-${i}`}
          className="flex h-9 w-4 items-center justify-center border-y border-r border-input bg-background text-muted-foreground/40 text-xs select-none font-mono"
        >
          {token.char}
        </div>
      );
    }
    const prevToken = tokens[i - 1];
    const afterDivider = prevToken?.type === 'separator' && prevToken.char !== ' ';
    const el = (
      <InputOTPSlot
        key={`slot-${slotIndex}`}
        index={slotIndex}
        className={cn(
          'h-9 w-9 font-mono text-sm placeholder:text-muted-foreground/30',
          afterDivider && 'border-l-0',
          hasError && 'border-destructive text-destructive',
        )}
      />
    );
    slotIndex += 1;
    return el;
  });

  return (
    <div className={cn('relative flex flex-col gap-1.5', className)}>
      <div className="relative flex items-center gap-1">
        <InputOTP
          ref={mergedRef}
          id={id}
          name={name}
          maxLength={totalDigits}
          value={digits}
          onChange={handleOtpChange}
          onFocus={handleOtpFocus}
          onBlur={handleOtpBlur}
          pattern="^[0-9]*$"
          disabled={disabled}
          aria-label={placeholder ?? formatPattern}
          aria-invalid={hasError || undefined}
          containerClassName={cn(disabled && 'opacity-50')}
          {...rest}
        >
          <InputOTPGroup className="shadow-sm">{otpElements}</InputOTPGroup>
        </InputOTP>

        {showRequired && <span className="text-destructive text-xs leading-none">*</span>}

        {digits && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Clear date"
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
              className="h-9 w-9 shrink-0"
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
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              autoFocus
            />
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
        <p className="text-xs text-destructive">
          {error ?? `Enter a valid ${mode === 'datetime' ? 'date and time' : 'date'}.`}
        </p>
      )}
    </div>
  );
});

// =============================================================================
// DateInputField — react-hook-form Controller wrapper
//
// Does NOT spread {...field} onto DateInput. Each prop is passed explicitly
// so DateInput's own onBlur (validation + revert) is never silently
// overwritten by the Controller's onBlur. DateInput declares `onBlur`
// explicitly in its own props (never left to fall into ...rest), and calls
// it itself after running internal validation — so RHF's touched-tracking
// and the revert/error behavior compose correctly.
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
// (free-text input, unaffected by the OTP rewrite above)
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
            <Calendar mode="single" selected={parsedDate} onSelect={handleSelect} autoFocus />
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
