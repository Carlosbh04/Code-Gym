import {
  useMemo,
  type ReactNode,
} from 'react';

import {
  ProgressContext,
} from '@/contexts/progress-context';

import {
  adaptConceptProgress,
} from '@/features/dashboard/dashboard-adapters';

import {
  useDashboard,
} from '@/hooks/useDashboard';

import type {
  ProgressContextValue,
} from '@/types/progress';

export interface ProgressProviderProps {
  readonly children: ReactNode;
}

/**
 * Proyección read-only del progreso confirmado por el backend.
 *
 * Dashboard es la fuente autoritativa. Este contexto existe para mantener
 * estable la API de lectura usada por Home, Practice, Review y Dashboard.
 */
export function ProgressProvider({
  children,
}: ProgressProviderProps) {
  const {
    dashboard,
    isLoading,
    error,
  } = useDashboard();

  const progress = useMemo(
    () =>
      new Map(
        (dashboard?.progress ?? [])
          .map(adaptConceptProgress)
          .map((item) => [
            item.conceptId,
            item,
          ]),
      ),
    [dashboard],
  );

  const value =
    useMemo<ProgressContextValue>(
      () => ({
        progress,
        isLoading,
        error,
      }),
      [
        progress,
        isLoading,
        error,
      ],
    );

  return (
    <ProgressContext.Provider
      value={value}
    >
      {children}
    </ProgressContext.Provider>
  );
}
