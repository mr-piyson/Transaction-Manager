// date.ts
import { format, formatDistanceToNow, isValid } from 'date-fns';

// 1. Define your app-wide standard formats here
export const APP_DATE_FORMATS = {
  // Existing
  display: 'MMM d, yyyy',
  table: 'dd/MM/yyyy',
  timestamp: 'MMM d, yyyy HH:mm',
  iso: 'yyyy-MM-dd',
  full: 'EEEE, MMMM d, yyyy',
  short: 'MM/dd/yyyy',
  time12: 'hh:mm a',
  time24: 'HH:mm',
  datetime12: 'MMM d, yyyy hh:mm a',
  datetime24: 'yyyy-MM-dd HH:mm:ss',
  compact: 'yyyyMMdd',
  fileSafe: 'yyyy-MM-dd_HH-mm-ss',
  relativeFriendly: 'EEE, MMM d',
  monthYear: 'MMMM yyyy',
  dayMonth: 'd MMM',
  weekdayShort: 'EEE',
  weekdayFull: 'EEEE',
} as const;

export type FormatKey = keyof typeof APP_DATE_FORMATS;

/**
 * Universal formatter that accepts Prisma Dates, strings, or numbers.
 */
export function Dates(date: Date | string | number | null, type: FormatKey = 'display'): string {
  if (!date) return 'N/A';

  const parsedDate = new Date(date);

  if (!isValid(parsedDate)) {
    console.error('Invalid date passed to formatAppDate:', date);
    return 'Invalid Date';
  }

  return format(parsedDate, APP_DATE_FORMATS[type]);
}

/**
 * Relative time formatter (e.g., "2 hours ago")
 */
export function DatesAgo(date: Date | string | null): string {
  if (!date) return '';
  const parsedDate = new Date(date);
  if (!isValid(parsedDate)) return '';

  return formatDistanceToNow(parsedDate, { addSuffix: true });
}
