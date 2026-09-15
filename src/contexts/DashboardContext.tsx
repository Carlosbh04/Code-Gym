import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  DashboardContext,
  type DashboardContextValue,
} from '@/contexts/dashboard-context';

import {
  ApiError,
  getDashboard,
  type DashboardSnapshot,
} from '@/features/dashboard/dashboard-api';

import {
  useAuth,
} from '@/features/auth/AuthContext';

function errorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : String(error);
}

export function DashboardProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const {
    accessToken,
    status,
    refreshSession,
  } = useAuth();

  const [
    dashboard,
    setDashboard,
  ] = useState<DashboardSnapshot | null>(
    null,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const requestGeneration =
    useRef(0);

  const resetState =
    useCallback(() => {
      requestGeneration.current += 1;
      setDashboard(null);
      setIsLoading(false);
      setError(null);
    }, []);

  const loadDashboard =
    useCallback(
      async (
        token: string,
      ) => {
        try {
          return await getDashboard(
            token,
          );
        } catch (reason: unknown) {
          if (
            reason instanceof ApiError
            && reason.status === 401
          ) {
            const renewedAccessToken =
              await refreshSession();

            return getDashboard(
              renewedAccessToken,
            );
          }

          throw reason;
        }
      },
      [
        refreshSession,
      ],
    );

  const refresh =
    useCallback(async (): Promise<void> => {
      if (
        status !== 'authenticated'
        || accessToken === null
      ) {
        return;
      }

      const generation =
        ++requestGeneration.current;

      setIsLoading(true);

      try {
        const response =
          await loadDashboard(
            accessToken,
          );

        if (
          generation
          !== requestGeneration.current
        ) {
          return;
        }

        setDashboard(
          response.dashboard,
        );

        setError(null);
      } catch (reason: unknown) {
        if (
          generation
          !== requestGeneration.current
        ) {
          return;
        }

        setDashboard(null);

        setError(
          errorMessage(reason),
        );
      } finally {
        if (
          generation
          === requestGeneration.current
        ) {
          setIsLoading(false);
        }
      }
    }, [
      accessToken,
      loadDashboard,
      status,
    ]);

  useEffect(() => {
    if (
      status !== 'authenticated'
      || accessToken === null
    ) {
      return;
    }

    let active = true;

    const generation =
      ++requestGeneration.current;

    void loadDashboard(
      accessToken,
    )
      .then((response) => {
        if (
          !active
          || generation
            !== requestGeneration.current
        ) {
          return;
        }

        setDashboard(
          response.dashboard,
        );

        setError(null);
      })
      .catch((reason: unknown) => {
        if (
          !active
          || generation
            !== requestGeneration.current
        ) {
          return;
        }

        setDashboard(null);

        setError(
          errorMessage(reason),
        );
      })
      .finally(() => {
        if (
          active
          && generation
            === requestGeneration.current
        ) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;

      if (
        requestGeneration.current
        === generation
      ) {
        requestGeneration.current += 1;
      }
    };
  }, [
    accessToken,
    loadDashboard,
    status,
  ]);

  const effectiveLoading =
    status === 'authenticated'
    && accessToken !== null
    && dashboard === null
    && error === null
      ? true
      : isLoading;

  const value =
    useMemo<DashboardContextValue>(
      () => ({
        dashboard,
        isLoading:
          effectiveLoading,
        error,
        refresh,
        resetState,
      }),
      [
        dashboard,
        effectiveLoading,
        error,
        refresh,
        resetState,
      ],
    );

  return (
    <DashboardContext.Provider
      value={value}
    >
      {children}
    </DashboardContext.Provider>
  );
}
