'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  DATE_DISPLAY_FORMATS,
  DATE_INPUT_FORMATS,
  DEFAULT_DISPLAY_FORMAT,
  DEFAULT_INPUT_FORMAT,
  formatDate as fmtDate,
  formatDateTime as fmtDateTime,
  formatDateTimeSeconds as fmtDateTimeSec,
  formatDateAgo as fmtDateAgo,
  formatDateForInput as fmtDateForInput,
  formatShortDate as fmtShortDate,
  parseDateFromInput,
  toDateInputValue,
  toDateTimeInputValue,
  type DateDisplayFormat,
  type DateInputFormat,
} from '@/lib/date';

type DateFormatContextValue = {
  inputFormat: DateInputFormat;
  displayFormat: DateDisplayFormat;
  formatDate: (date: Date | string | number | null | undefined) => string;
  formatDateTime: (date: Date | string | number | null | undefined) => string;
  formatDateTimeSeconds: (date: Date | string | number | null | undefined) => string;
  formatDateAgo: (date: Date | string | null | undefined) => string;
  formatDateForInput: (date: Date | string | number | null | undefined) => string;
  formatShortDate: (date: Date | string | number | null | undefined) => string;
  toDateInputValue: (date: Date | string | number | null | undefined) => string;
  toDateTimeInputValue: (date: Date | string | number | null | undefined) => string;
  parseDateFromInput: (value: string) => Date | null;
};

const DateFormatContext = createContext<DateFormatContextValue | null>(null);

export function DateFormatProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = trpc.settings.getSettings.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const inputFormat = useMemo<DateInputFormat>(() => {
    const val = settings?.['date.inputFormat'];
    if (val && val in DATE_INPUT_FORMATS) return val as DateInputFormat;
    return DEFAULT_INPUT_FORMAT;
  }, [settings]);

  const displayFormat = useMemo<DateDisplayFormat>(() => {
    const val = settings?.['date.displayFormat'];
    if (val && val in DATE_DISPLAY_FORMATS) return val as DateDisplayFormat;
    return DEFAULT_DISPLAY_FORMAT;
  }, [settings]);

  const formatDate = useCallback(
    (date: Date | string | number | null | undefined) => fmtDate(date, displayFormat),
    [displayFormat],
  );

  const formatDateTime = useCallback(
    (date: Date | string | number | null | undefined) => fmtDateTime(date, displayFormat),
    [displayFormat],
  );

  const formatDateTimeSeconds = useCallback(
    (date: Date | string | number | null | undefined) => fmtDateTimeSec(date, displayFormat),
    [displayFormat],
  );

  const formatDateAgo = useCallback(
    (date: Date | string | null | undefined) => fmtDateAgo(date),
    [],
  );

  const formatDateForInputFn = useCallback(
    (date: Date | string | number | null | undefined) => fmtDateForInput(date, inputFormat),
    [inputFormat],
  );

  const formatShortDateFn = useCallback(
    (date: Date | string | number | null | undefined) => fmtShortDate(date),
    [],
  );

  const toDateInputValueFn = useCallback(
    (date: Date | string | number | null | undefined) => toDateInputValue(date),
    [],
  );

  const toDateTimeInputValueFn = useCallback(
    (date: Date | string | number | null | undefined) => toDateTimeInputValue(date),
    [],
  );

  const parseDateFromInputFn = useCallback(
    (value: string) => parseDateFromInput(value, inputFormat),
    [inputFormat],
  );

  const value = useMemo<DateFormatContextValue>(
    () => ({
      inputFormat,
      displayFormat,
      formatDate,
      formatDateTime,
      formatDateTimeSeconds,
      formatDateAgo,
      formatDateForInput: formatDateForInputFn,
      formatShortDate: formatShortDateFn,
      toDateInputValue: toDateInputValueFn,
      toDateTimeInputValue: toDateTimeInputValueFn,
      parseDateFromInput: parseDateFromInputFn,
    }),
    [
      inputFormat,
      displayFormat,
      formatDate,
      formatDateTime,
      formatDateTimeSeconds,
      formatDateAgo,
      formatDateForInputFn,
      formatShortDateFn,
      toDateInputValueFn,
      toDateTimeInputValueFn,
      parseDateFromInputFn,
    ],
  );

  return <DateFormatContext.Provider value={value}>{children}</DateFormatContext.Provider>;
}

export function useDateFormat() {
  const ctx = useContext(DateFormatContext);
  if (!ctx) {
    throw new Error('useDateFormat must be used within a <DateFormatProvider />');
  }
  return ctx;
}
