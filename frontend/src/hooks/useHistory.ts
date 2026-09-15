import { useContext } from 'react';
import { HistoryContext } from '@/contexts/history-context';
import type { HistoryContextValue } from '@/types/history';

export function useHistory(): HistoryContextValue {
  const value = useContext(HistoryContext);
  if (value === null) {
    throw new Error('useHistory debe usarse dentro de <HistoryProvider>');
  }
  return value;
}
