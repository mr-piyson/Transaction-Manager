import { format, formatDistanceToNow, isValid } from 'date-fns';

// 1. Define your app-wide standard formats here
export const APP_DATE_FORMATS = {
  display: 'MMM d, yyyy', // e.g., Oct 24, 2026
  table: 'dd/MM/yyyy', // e.g., 24/10/2026
  timestamp: 'MMM d, yyyy HH:mm', // e.g., Oct 24, 2026 14:30
  iso: 'yyyy-MM-dd', // For input type="date"
} as const;

type FormatKey = keyof typeof APP_DATE_FORMATS;

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
