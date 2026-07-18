import { format, formatDistanceToNow, isValid, parse, parseISO, set, startOfDay } from 'date-fns';

// =============================================================================
// DATE FORMAT DEFINITIONS
// =============================================================================

export const DATE_INPUT_FORMATS = {
  'dd/MM/yyyy': 'dd/MM/yyyy',
  'MM/dd/yyyy': 'MM/dd/yyyy',
  'yyyy-MM-dd': 'yyyy-MM-dd',
  'dd.MM.yyyy': 'dd.MM.yyyy',
  'MM.dd.yyyy': 'MM.dd.yyyy',
  'yyyy/MM/dd': 'yyyy/MM/dd',
} as const;

export type DateInputFormat = keyof typeof DATE_INPUT_FORMATS;

export const DATE_DISPLAY_FORMATS = {
  'dd MMM yyyy': 'dd MMM yyyy',
  'MMM d, yyyy': 'MMM d, yyyy',
  'dd/MM/yyyy': 'dd/MM/yyyy',
  'MM/dd/yyyy': 'MM/dd/yyyy',
  'yyyy-MM-dd': 'yyyy-MM-dd',
  'dd.MM.yyyy': 'dd.MM.yyyy',
  'd MMMM yyyy': 'd MMMM yyyy',
  'EEEE, d MMMM yyyy': 'EEEE, d MMMM yyyy',
} as const;

export type DateDisplayFormat = keyof typeof DATE_DISPLAY_FORMATS;

export const DEFAULT_INPUT_FORMAT: DateInputFormat = 'yyyy-MM-dd';
export const DEFAULT_DISPLAY_FORMAT: DateDisplayFormat = 'dd MMM yyyy';

// Labels for UI rendering
export const DATE_INPUT_FORMAT_LABELS: Record<DateInputFormat, string> = {
  'dd/MM/yyyy': 'DD/MM/YYYY',
  'MM/dd/yyyy': 'MM/DD/YYYY',
  'yyyy-MM-dd': 'YYYY-MM-DD',
  'dd.MM.yyyy': 'DD.MM.YYYY',
  'MM.dd.yyyy': 'MM.DD.YYYY',
  'yyyy/MM/dd': 'YYYY/MM/DD',
};

export const DATE_DISPLAY_FORMAT_LABELS: Record<DateDisplayFormat, string> = {
  'dd MMM yyyy': '18 Apr 2024',
  'MMM d, yyyy': 'Apr 18, 2024',
  'dd/MM/yyyy': '18/04/2024',
  'MM/dd/yyyy': '04/18/2024',
  'yyyy-MM-dd': '2024-04-18',
  'dd.MM.yyyy': '18.04.2024',
  'd MMMM yyyy': '18 April 2024',
  'EEEE, d MMMM yyyy': 'Thursday, 18 April 2024',
};

// =============================================================================
// SAFE PARSING
// =============================================================================

/**
 * Safely parse an ISO date/datetime string into a Date, WITHOUT the classic
 * `new Date('yyyy-MM-dd')` bug where date-only strings get interpreted as
 * UTC midnight (causing an off-by-one-day shift in timezones behind UTC).
 *
 * - Date-only strings ("2024-04-18") are parsed as LOCAL midnight.
 * - Full ISO datetime strings (with time / offset / "Z") are parsed as-is.
 *
 * Returns null if the value is empty or not a valid date.
 */
export function safeParseISO(
  value: string | Date | null | undefined,
): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

// =============================================================================
// FORMAT SEGMENTS — dynamic OTP-slot layout derived from a format pattern
// =============================================================================

export type DateFormatKey = 'yyyy' | 'MM' | 'dd' | 'HH' | 'mm';

export interface DateFormatDigits {
  type: 'digits';
  key: DateFormatKey;
  length: number;
}

export interface DateFormatSeparator {
  type: 'separator';
  char: string;
}

export type DateFormatToken = DateFormatDigits | DateFormatSeparator;

/**
 * Break a date input format (e.g. "dd/MM/yyyy", "yyyy-MM-dd") — optionally
 * extended with a time portion — into an ordered list of tokens: digit
 * groups (with their width) and literal separator characters.
 *
 * This is what lets a component like an OTP-style date input render the
 * right number of boxes, in the right order, with the right divider
 * characters, for whichever format/mode is active — instead of hardcoding
 * a single MM/DD/YYYY layout.
 */
export function getDateFormatSegments(
  inputFormat: DateInputFormat = DEFAULT_INPUT_FORMAT,
  mode: 'date' | 'datetime' = 'date',
): DateFormatToken[] {
  const pattern = DATE_INPUT_FORMATS[inputFormat];
  const tokens: DateFormatToken[] = [];
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (/[a-zA-Z]/.test(ch)) {
      let j = i;
      while (j < pattern.length && pattern[j] === ch) j++;
      const run = pattern.slice(i, j);
      const key: DateFormatKey = run.length === 4 ? 'yyyy' : ch === 'M' ? 'MM' : 'dd';
      tokens.push({ type: 'digits', key, length: run.length });
      i = j;
    } else {
      tokens.push({ type: 'separator', char: ch });
      i++;
    }
  }
  if (mode === 'datetime') {
    tokens.push({ type: 'separator', char: ' ' });
    tokens.push({ type: 'digits', key: 'HH', length: 2 });
    tokens.push({ type: 'separator', char: ':' });
    tokens.push({ type: 'digits', key: 'mm', length: 2 });
  }
  return tokens;
}

/** Total number of digit slots across all digit tokens (the OTP maxLength). */
export function getSegmentTotalDigits(tokens: DateFormatToken[]): number {
  return tokens.reduce((sum, t) => (t.type === 'digits' ? sum + t.length : sum), 0);
}

/**
 * Split a raw digit string (as typed into the OTP boxes) into its named
 * parts, based on the same token order used to lay out the boxes.
 */
export function digitsToParts(
  digits: string,
  tokens: DateFormatToken[],
): Partial<Record<DateFormatKey, string>> {
  const parts: Partial<Record<DateFormatKey, string>> = {};
  let pos = 0;
  for (const t of tokens) {
    if (t.type === 'digits') {
      parts[t.key] = digits.slice(pos, pos + t.length);
      pos += t.length;
    }
  }
  return parts;
}

/**
 * The inverse of digitsToParts: format a Date into the raw digit string
 * matching the given tokens' order (used to seed the OTP boxes from an
 * external Date — calendar selection, "Today", or a controlled value).
 */
export function dateToDigits(date: Date, tokens: DateFormatToken[]): string {
  return tokens
    .filter((t): t is DateFormatDigits => t.type === 'digits')
    .map((t) => format(date, t.key))
    .join('');
}

// =============================================================================
// FORMATTING FUNCTIONS
// =============================================================================

/**
 * Format a date using the org's display format setting.
 * Falls back to DEFAULT_DISPLAY_FORMAT if no format is provided.
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  displayFormat: DateDisplayFormat = DEFAULT_DISPLAY_FORMAT,
): string {
  if (!date) return 'N/A';
  const parsed = typeof date === 'string' ? safeParseISO(date) : new Date(date);
  if (!parsed || !isValid(parsed)) return 'Invalid Date';
  return format(parsed, DATE_DISPLAY_FORMATS[displayFormat]);
}

/**
 * Format a date with time using the org's display format.
 */
export function formatDateTime(
  date: Date | string | number | null | undefined,
  displayFormat: DateDisplayFormat = DEFAULT_DISPLAY_FORMAT,
): string {
  if (!date) return 'N/A';
  const parsed = typeof date === 'string' ? safeParseISO(date) : new Date(date);
  if (!parsed || !isValid(parsed)) return 'Invalid Date';
  const base = format(parsed, DATE_DISPLAY_FORMATS[displayFormat]);
  const time = format(parsed, 'HH:mm');
  return `${base} ${time}`;
}

/**
 * Format a date with seconds for fine-grained timestamps.
 */
export function formatDateTimeSeconds(
  date: Date | string | number | null | undefined,
  displayFormat: DateDisplayFormat = DEFAULT_DISPLAY_FORMAT,
): string {
  if (!date) return 'N/A';
  const parsed = typeof date === 'string' ? safeParseISO(date) : new Date(date);
  if (!parsed || !isValid(parsed)) return 'Invalid Date';
  const base = format(parsed, DATE_DISPLAY_FORMATS[displayFormat]);
  const time = format(parsed, 'HH:mm:ss');
  return `${base} ${time}`;
}

/**
 * Format a date for an <input> field's value (always ISO YYYY-MM-DD).
 * Used when setting default values for date inputs.
 */
export function toDateInputValue(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  const parsed = typeof date === 'string' ? safeParseISO(date) : new Date(date);
  if (!parsed || !isValid(parsed)) return '';
  return format(parsed, 'yyyy-MM-dd');
}

/**
 * Format a date for a datetime-local input field.
 */
export function toDateTimeInputValue(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  const parsed = typeof date === 'string' ? safeParseISO(date) : new Date(date);
  if (!parsed || !isValid(parsed)) return '';
  return format(parsed, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Parse a user-typed date string according to the input format and return a Date.
 * Returns null if the string doesn't match the format.
 */
export function parseDateFromInput(
  value: string,
  inputFormat: DateInputFormat = DEFAULT_INPUT_FORMAT,
): Date | null {
  if (!value.trim()) return null;
  const pattern = DATE_INPUT_FORMATS[inputFormat];
  const parsed = parse(value, pattern, startOfDay(new Date()));
  if (!isValid(parsed)) return null;
  return parsed;
}

/**
 * Format a Date into a string matching the input format.
 * Used to display dates in text inputs when the calendar selects a date.
 */
export function formatDateForInput(
  date: Date | string | number | null | undefined,
  inputFormat: DateInputFormat = DEFAULT_INPUT_FORMAT,
): string {
  if (!date) return '';
  const parsed = typeof date === 'string' ? safeParseISO(date) : new Date(date);
  if (!parsed || !isValid(parsed)) return '';
  return format(parsed, DATE_INPUT_FORMATS[inputFormat]);
}

/**
 * Relative time formatter (e.g., "2 hours ago").
 */
export function formatDateAgo(date: Date | string | null | undefined): string {
  if (!date) return '';
  const parsed = typeof date === 'string' ? safeParseISO(date) : new Date(date);
  if (!parsed || !isValid(parsed)) return '';
  const distance = formatDistanceToNow(parsed, { addSuffix: true });
  return distance.replace('about ', '');
}

/**
 * Format only the short date (no year) for compact displays.
 * Uses the month/day order from the input format.
 */
export function formatShortDate(
  date: Date | string | number | null | undefined,
): string {
  if (!date) return 'N/A';
  const parsed = typeof date === 'string' ? safeParseISO(date) : new Date(date);
  if (!parsed || !isValid(parsed)) return 'Invalid Date';
  return format(parsed, 'dd MMM');
}

/**
 * Parse a user-typed datetime string (date + optional HH:mm) according to the input format.
 * Returns null if the date part doesn't match the format.
 */
export function parseDateTimeFromInput(
  value: string,
  inputFormat: DateInputFormat = DEFAULT_INPUT_FORMAT,
): Date | null {
  if (!value.trim()) return null;
  const [datePart, timePart] = value.split(/[\sT]+/, 2);
  const date = parseDateFromInput(datePart, inputFormat);
  if (!date) return null;
  if (timePart) {
    const [h, m] = timePart.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      return set(date, { hours: h, minutes: m, seconds: 0, milliseconds: 0 });
    }
  }
  return date;
}

/**
 * Format a Date into a datetime string matching the input format + HH:mm.
 * Used for datetime-local style inputs.
 */
export function formatDateTimeForInput(
  date: Date | string | number | null | undefined,
  inputFormat: DateInputFormat = DEFAULT_INPUT_FORMAT,
): string {
  if (!date) return '';
  const parsed = typeof date === 'string' ? safeParseISO(date) : new Date(date);
  if (!parsed || !isValid(parsed)) return '';
  const dateStr = format(parsed, DATE_INPUT_FORMATS[inputFormat]);
  const timeStr = format(parsed, 'HH:mm');
  return `${dateStr} ${timeStr}`;
}

// Re-export the old API name for backward compatibility during migration
export const Dates = formatDate;
export const DatesAgo = formatDateAgo;