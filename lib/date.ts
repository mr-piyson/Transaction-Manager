import { format, formatDistanceToNow, isValid, parse, set, startOfDay } from 'date-fns';

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
  const parsed = new Date(date);
  if (!isValid(parsed)) return 'Invalid Date';
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
  const parsed = new Date(date);
  if (!isValid(parsed)) return 'Invalid Date';
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
  const parsed = new Date(date);
  if (!isValid(parsed)) return 'Invalid Date';
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
  const parsed = new Date(date);
  if (!isValid(parsed)) return '';
  return format(parsed, 'yyyy-MM-dd');
}

/**
 * Format a date for a datetime-local input field.
 */
export function toDateTimeInputValue(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  const parsed = new Date(date);
  if (!isValid(parsed)) return '';
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
  const parsed = new Date(date);
  if (!isValid(parsed)) return '';
  return format(parsed, DATE_INPUT_FORMATS[inputFormat]);
}

/**
 * Relative time formatter (e.g., "2 hours ago").
 */
export function formatDateAgo(date: Date | string | null | undefined): string {
  if (!date) return '';
  const parsed = new Date(date);
  if (!isValid(parsed)) return '';
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
  const parsed = new Date(date);
  if (!isValid(parsed)) return 'Invalid Date';
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
  const parsed = new Date(date);
  if (!isValid(parsed)) return '';
  const dateStr = format(parsed, DATE_INPUT_FORMATS[inputFormat]);
  const timeStr = format(parsed, 'HH:mm');
  return `${dateStr} ${timeStr}`;
}

// Re-export the old API name for backward compatibility during migration
export const Dates = formatDate;
export const DatesAgo = formatDateAgo;
