import { themeQuartz } from 'ag-grid-community';
import { useTheme } from 'next-themes';

const baseCompactParams = {
  wrapperBorderRadius: '0px',
  headerColumnResizeHandleColor: 'transparent',
  columnBorder: { color: 'transparent', width: '0px' },
  fontSize: '12px',
  headerFontSize: '11px',
  listItemHeight: '34px',
  headerHeight: '34px',
  cellHorizontalPadding: '8px',
  cellVerticalPadding: '4px',
};

export function useTableTheme() {
  const theme = useTheme();

  const dark = themeQuartz.withParams({
    ...baseCompactParams,
    backgroundColor: 'var(--popover)',
    foregroundColor: 'var(--foreground)',
    headerTextColor: 'var(--foreground)',
    headerBackgroundColor: 'var(--card)',
    oddRowBackgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'var(--border)',
  });

  const light = themeQuartz.withParams({
    ...baseCompactParams,
    backgroundColor: 'var(--popover)',
    foregroundColor: 'var(--foreground)',
    headerTextColor: 'var(--foreground)',
    headerBackgroundColor: 'var(--card)',
    oddRowBackgroundColor: '#f9fafb',
    borderColor: 'var(--border)',
  });

  return theme.resolvedTheme === 'dark' ? dark : light;
}
