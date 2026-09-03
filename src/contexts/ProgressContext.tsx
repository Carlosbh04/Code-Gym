import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ProgressContext } from '@/contexts/progress-context';
import type { ConceptProgress, ProgressContextValue } from '@/types/progress';
import type { IProgressRepository } from '@/types/repository';

export interface ProgressProviderProps {
  repository: IProgressRepository;
  children: ReactNode;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function hasDifficultyCounts(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;

  const counts = value as { total?: unknown; correct?: unknown };
  return (
    typeof counts.total === 'number' &&
    Number.isFinite(counts.total) &&
    typeof counts.correct === 'number' &&
    Number.isFinite(counts.correct)
  );
}

/** Una creación exige todos los campos; no rellena parciales con defaults. */
function isCompleteProgress(
  value: Partial<ConceptProgress>,
): value is ConceptProgress {
  const distribution = value.difficultyDistribution;

  return (
    typeof value.conceptId === 'string' &&
    typeof value.domain === 'number' &&
    Number.isFinite(value.domain) &&
    typeof value.totalAttempts === 'number' &&
    Number.isFinite(value.totalAttempts) &&
    typeof value.correctAttempts === 'number' &&
    Number.isFinite(value.correctAttempts) &&
    typeof distribution === 'object' &&
    distribution !== null &&
    hasDifficultyCounts(distribution.beginner) &&
    hasDifficultyCounts(distribution.intermediate) &&
    hasDifficultyCounts(distribution.advanced) &&
    Array.isArray(value.recentErrors) &&
    typeof value.lastPracticed === 'string' &&
    typeof value.schemaVersion === 'number' &&
    Number.isFinite(value.schemaVersion)
  );
}

/**
 * Estado de progreso de la aplicación (§18, T049).
 *
 * Depende únicamente de `IProgressRepository`: no conoce claves, JSON ni
 * `localStorage`. La implementación concreta se inyecta desde la raíz de
 * composición conforme a D002.
 */
export function ProgressProvider({
  repository,
  children,
}: ProgressProviderProps) {
  const [progress, setProgress] = useState<Map<string, ConceptProgress>>(
    () => new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    repository
      .getAllProgress()
      .then((stored) => {
        if (!active) return;
        setProgress(new Map(stored.map((item) => [item.conceptId, item])));
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        // Un fallo real no se convierte en "sin progreso": el mapa permanece
        // vacío, pero `error` conserva la diferencia semántica para la UI.
        setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [repository]);

  const updateProgress = useCallback(
    async (
      conceptId: string,
      update: Partial<ConceptProgress>,
    ): Promise<void> => {
      const current = progress.get(conceptId);
      const candidate: Partial<ConceptProgress> = {
        ...current,
        ...update,
        conceptId,
      };

      // D018 aporta los valores iniciales desde el coordinador. Este contexto
      // únicamente comprueba que estén todos: no inventa defaults ocultos.
      if (current === undefined && !isCompleteProgress(candidate)) {
        const reason = new Error(
          `No existe progreso para el concepto ${conceptId} y la actualización es incompleta`,
        );
        setError(reason.message);
        throw reason;
      }

      const next = candidate as ConceptProgress;

      try {
        await repository.updateProgress(conceptId, next);
        setProgress((previous) => {
          const updated = new Map(previous);
          updated.set(conceptId, next);
          return updated;
        });
        setError(null);
      } catch (reason: unknown) {
        setError(errorMessage(reason));
        throw reason;
      }
    },
    [progress, repository],
  );

  const getConceptDomain = useCallback(
    (conceptId: string): number => progress.get(conceptId)?.domain ?? 0,
    [progress],
  );
  const resetState = useCallback(() => { setProgress(new Map()); setError(null); }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({ progress, updateProgress, getConceptDomain, resetState, isLoading, error }),
    [progress, updateProgress, getConceptDomain, resetState, isLoading, error],
  );

  return (
    <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
  );
}
