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

      // T049 no define valores iniciales para los campos obligatorios. Crear
      // aquí dominio, métricas o fecha sería anticipar las reglas de T050.
      if (current === undefined) {
        const reason = new Error(`No existe progreso para el concepto ${conceptId}`);
        setError(reason.message);
        throw reason;
      }

      const next: ConceptProgress = { ...current, ...update, conceptId };

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

  const value = useMemo<ProgressContextValue>(
    () => ({ progress, updateProgress, getConceptDomain, isLoading, error }),
    [progress, updateProgress, getConceptDomain, isLoading, error],
  );

  return (
    <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
  );
}
