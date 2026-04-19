import { themeQuartz } from 'ag-grid-community';
import { useTheme } from 'next-themes';

export function useTableTheme() {
  const theme = useTheme();
  const dark = themeQuartz.withParams({
    backgroundColor: 'var(--popover)',
    foregroundColor: 'var(--foreground)',
    headerTextColor: 'var(--foreground)',
    headerBackgroundColor: 'var(--card)',
    oddRowBackgroundColor: '#131313',
    headerColumnResizeHandleColor: '#a1a1aa',
    wrapperBorderRadius: '0px',
    // borderColor: 'var(--border)',
    listItemHeight: '30px',
    columnBorder: {
      color: '#2b2b2b',
      width: '0px',
    },
  });

  const light = themeQuartz.withParams({
    backgroundColor: 'var(--popover)',
    foregroundColor: 'var(--foreground)',
    headerTextColor: 'var(--foreground)',
    headerBackgroundColor: 'var(--card)',
    oddRowBackgroundColor: '#f9f9f9',
    headerColumnResizeHandleColor: '#000000',
    // borderColor: 'var(--border)',
    wrapperBorderRadius: '0px',
    columnBorder: {
      color: '#cccccc',
      width: '0px',
    },
  });

  const tableTheme = theme.resolvedTheme === 'dark' ? dark : light;
  return tableTheme;
}
