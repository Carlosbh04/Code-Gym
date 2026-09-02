import { useContext } from 'react';
import { ProgressContext } from '@/contexts/progress-context';
import type { ProgressContextValue } from '@/types/progress';

/** Acceso público al progreso de la aplicación (§15, §18, T049). */
export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext);

  if (value === null) {
    throw new Error('useProgress debe usarse dentro de <ProgressProvider>');
  }

  return value;
}
