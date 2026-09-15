import { useContext } from 'react';
import { ThemeContext } from '@/contexts/theme-context';
import type { ThemeContextValue } from '@/types/theme';

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  }
  return value;
}
