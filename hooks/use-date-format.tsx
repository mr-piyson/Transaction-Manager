// date-format.tsx
'use client';

import React, { createContext, useContext, useState } from 'react';

export type DateFormatType = 'dd/mm/yyyy' | 'yyyy-mm-dd' | 'date';

type DateFormatContextType = {
  format: DateFormatType;
  setFormat: (format: DateFormatType) => void;

  formatDate: (date: Date | string | number | null) => string;
  formatDateTime: (date: Date | string | number | null) => string;
  formatDateAgo: (date: Date | string | number | null) => string;
};

const DateFormatContext = createContext<DateFormatContextType | undefined>(undefined);

export const DateFormatProvider = ({
  children,
  defaultFormat = 'date',
}: {
  children: React.ReactNode;
  defaultFormat?: DateFormatType;
}) => {
  const [format, setFormat] = useState<DateFormatType>(defaultFormat);

  const formatDate = (date: Date | string | number | null): string => {
    if (!date) return 'N/A';
    if (typeof date !== 'string' || typeof date !== 'number') {
      date = new Date(date);
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    if (format === 'dd/mm/yyyy') return `${day}/${month}/${year}`;
    if (format === 'yyyy-mm-dd') return `${year}-${month}-${day}`;
    return date.toDateString();
  };

  const formatDateTime = (date: Date | string | number | null): string => {
    if (!date) return 'N/A';
    if (typeof date !== 'string' || typeof date !== 'number') {
      date = new Date(date);
    }
    const base = formatDate(date);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${base} ${hours}:${minutes}:${seconds}`;
  };

  const formatDateAgo = (date: Date | string | number | null): string => {
    if (!date) return 'N/A';
    if (typeof date !== 'string' || typeof date !== 'number') {
      date = new Date(date);
    }
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 2) return `${diffInDays}d ago`;

    return formatDate(date);
  };

  return (
    <DateFormatContext.Provider
      value={{
        format,
        setFormat,
        formatDate,
        formatDateTime,
        formatDateAgo,
      }}
    >
      {children}
    </DateFormatContext.Provider>
  );
};

export const useDateFormat = () => {
  const context = useContext(DateFormatContext);
  if (!context) {
    throw new Error('useDateFormat must be used within DateFormatProvider');
  }
  return context;
};
