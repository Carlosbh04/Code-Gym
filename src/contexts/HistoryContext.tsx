import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { HistoryContext } from '@/contexts/history-context';
import type { Attempt, CompletedSession } from '@/types/progress';
import type {
  IAttemptRepository,
  ICompletedSessionRepository,
} from '@/types/repository';

const DEFAULT_RECENT_LIMIT = 5;

export interface HistoryProviderProps {
  attemptRepository: IAttemptRepository;
  completedSessionRepository: ICompletedSessionRepository;
  recentLimit?: number;
  children: ReactNode;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Fachada de lectura del historial para UI (T055, D002, D004).
 *
 * Solo las sesiones recientes se cargan al montar. Los attempts permanecen
 * detrás de una consulta por sessionId para no leer un historial que el
 * Dashboard inicial no necesita.
 */
export function HistoryProvider({
  attemptRepository,
  completedSessionRepository,
  recentLimit = DEFAULT_RECENT_LIMIT,
  children,
}: HistoryProviderProps) {
  const [recentCompletedSessions, setRecentCompletedSessions] = useState<
    CompletedSession[]
  >([]);
  const [completedSessionsLoading, setCompletedSessionsLoading] = useState(true);
  const [completedSessionsError, setCompletedSessionsError] = useState<
    string | null
  >(null);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsError, setAttemptsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => {
        if (active) setCompletedSessionsLoading(true);
        return completedSessionRepository.getRecent(recentLimit);
      })
      .then((sessions) => {
        if (!active) return;
        setRecentCompletedSessions(sessions);
        setCompletedSessionsError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setRecentCompletedSessions([]);
        setCompletedSessionsError(errorMessage(error));
      })
      .finally(() => {
        if (active) setCompletedSessionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [completedSessionRepository, recentLimit]);

  const getAttemptsBySession = useCallback(
    async (sessionId: string): Promise<Attempt[]> => {
      setAttemptsLoading(true);
      try {
        const attempts = await attemptRepository.getAttemptsBySession(sessionId);
        setAttemptsError(null);
        return attempts;
      } catch (error: unknown) {
        setAttemptsError(errorMessage(error));
        throw error;
      } finally {
        setAttemptsLoading(false);
      }
    },
    [attemptRepository],
  );

  const value = useMemo(
    () => ({
      recentCompletedSessions,
      completedSessionsLoading,
      completedSessionsError,
      getAttemptsBySession,
      attemptsLoading,
      attemptsError,
    }),
    [
      recentCompletedSessions,
      completedSessionsLoading,
      completedSessionsError,
      getAttemptsBySession,
      attemptsLoading,
      attemptsError,
    ],
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}
