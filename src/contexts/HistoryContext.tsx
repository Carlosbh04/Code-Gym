import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  HistoryContext,
} from '@/contexts/history-context';

import {
  useAuth,
} from '@/features/auth/AuthContext';

import {
  ApiError,
  getHistoryAttempts,
  getHistoryCompletedSession,
} from '@/features/history/history-api';

import {
  adaptHistoryAttempts,
  adaptHistoryCompletedSession,
} from '@/features/history/history-adapters';

import {
  adaptCompletedSessions,
} from '@/features/dashboard/dashboard-adapters';

import {
  useDashboard,
} from '@/hooks/useDashboard';

import type {
  HistoryContextValue,
} from '@/types/history';

const DEFAULT_RECENT_LIMIT = 5;

export interface HistoryProviderProps {
  readonly recentLimit?: number;
  readonly children: ReactNode;
}

function errorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : String(error);
}

export function HistoryProvider({
  recentLimit = DEFAULT_RECENT_LIMIT,
  children,
}: HistoryProviderProps) {
  const {
    accessToken,
    status,
  } = useAuth();

  const {
    dashboard,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useDashboard();

  const [
    attemptsLoading,
    setAttemptsLoading,
  ] = useState(false);

  const [
    attemptsError,
    setAttemptsError,
  ] = useState<string | null>(
    null,
  );

  const requestGeneration =
    useRef(0);

  const recentCompletedSessions =
    useMemo(
      () =>
        adaptCompletedSessions(
          dashboard
            ?.recentCompletedSessions
            ?? [],
        ).slice(
          0,
          recentLimit,
        ),
      [
        dashboard,
        recentLimit,
      ],
    );

  const getCompletedSession =
    useCallback(
      async (
        sessionId: string,
      ) => {
        if (
          status !==
            'authenticated'
          || accessToken === null
        ) {
          throw new Error(
            'Authentication required',
          );
        }

        try {
          const response =
            await getHistoryCompletedSession(
              accessToken,
              sessionId,
            );

          return adaptHistoryCompletedSession(
            response.completedSession,
          );
        } catch (
          error: unknown
        ) {
          if (
            error instanceof ApiError
            && error.status === 404
          ) {
            return null;
          }

          throw error;
        }
      },
      [
        accessToken,
        status,
      ],
    );

  const getAttemptsBySession =
    useCallback(
      async (
        sessionId: string,
      ) => {
        if (
          status !==
            'authenticated'
          || accessToken === null
        ) {
          throw new Error(
            'Authentication required',
          );
        }

        const generation =
          requestGeneration.current;

        setAttemptsLoading(
          true,
        );

        try {
          const response =
            await getHistoryAttempts(
              accessToken,
              sessionId,
            );

          if (
            generation
            === requestGeneration.current
          ) {
            setAttemptsError(
              null,
            );
          }

          return adaptHistoryAttempts(
            response.attempts,
          );
        } catch (
          error: unknown
        ) {
          if (
            generation
            === requestGeneration.current
          ) {
            setAttemptsError(
              errorMessage(
                error,
              ),
            );
          }

          throw error;
        } finally {
          if (
            generation
            === requestGeneration.current
          ) {
            setAttemptsLoading(
              false,
            );
          }
        }
      },
      [
        accessToken,
        status,
      ],
    );

  const resetState =
    useCallback(() => {
      requestGeneration.current
        += 1;

      setAttemptsLoading(
        false,
      );

      setAttemptsError(
        null,
      );
    }, []);

  const value =
    useMemo<HistoryContextValue>(
      () => ({
        recentCompletedSessions,
        completedSessionsLoading:
          dashboardLoading,
        completedSessionsError:
          dashboardError,
        getCompletedSession,
        getAttemptsBySession,
        attemptsLoading,
        attemptsError,
        resetState,
      }),
      [
        recentCompletedSessions,
        dashboardLoading,
        dashboardError,
        getCompletedSession,
        getAttemptsBySession,
        attemptsLoading,
        attemptsError,
        resetState,
      ],
    );

  return (
    <HistoryContext.Provider
      value={value}
    >
      {children}
    </HistoryContext.Provider>
  );
}
