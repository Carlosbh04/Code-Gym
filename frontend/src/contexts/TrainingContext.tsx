import {
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

import {
  TrainingContext,
  type TrainingContextValue,
} from '@/contexts/training-context';

import {
  executeTrainingCodePreview,
  revealTrainingHint,
  startTrainingRun,
  submitTrainingAnswer,
} from '@/features/training/training-api';

import {
  useAuth,
} from '@/features/auth/AuthContext';

import {
  useDashboard,
} from '@/hooks/useDashboard';

export interface TrainingProviderProps {
  readonly children: ReactNode;
}

export function TrainingProvider({
  children,
}: TrainingProviderProps) {
  const {
    accessToken,
    isAuthenticated,
  } = useAuth();

  const {
    refresh: refreshDashboard,
  } = useDashboard();

  const requireAccessToken =
    useCallback((): string => {
      if (
        !isAuthenticated
        || accessToken === null
      ) {
        throw new Error(
          'Authentication is required for training',
        );
      }

      return accessToken;
    }, [
      accessToken,
      isAuthenticated,
    ]);

  const startRun =
    useCallback<
      TrainingContextValue['startRun']
    >(
      async (
        sessionId,
      ) => {
        const response =
          await startTrainingRun(
            requireAccessToken(),
            sessionId,
          );

        return response.run;
      },
      [
        requireAccessToken,
      ],
    );

  const submitAnswer =
    useCallback<
      TrainingContextValue['submitAnswer']
    >(
      async (
        runId,
        input,
      ) => {
        const response =
          await submitTrainingAnswer(
            requireAccessToken(),
            runId,
            input,
          );

        if (
          response.result
            .completion !== null
        ) {
          await refreshDashboard();
        }

        return response.result;
      },
      [
        refreshDashboard,
        requireAccessToken,
      ],
    );

  const executeCodePreview =
    useCallback<
      TrainingContextValue['executeCodePreview']
    >(
      async (
        runId,
        exerciseId,
        code,
      ) => {
        const response =
          await executeTrainingCodePreview(
            requireAccessToken(),
            runId,
            {
              exerciseId,
              code,
            },
          );

        return response.result.execution;
      },
      [
        requireAccessToken,
      ],
    );

  const revealHint =
    useCallback<
      TrainingContextValue['revealHint']
    >(
      async (
        runId,
        exerciseId,
      ) => {
        const response =
          await revealTrainingHint(
            requireAccessToken(),
            runId,
            exerciseId,
          );

        return response.hint;
      },
      [requireAccessToken],
    );

  const value =
    useMemo<TrainingContextValue>(
      () => ({
        startRun,
        revealHint,
        executeCodePreview,
        submitAnswer,
      }),
      [
        startRun,
        revealHint,
        executeCodePreview,
        submitAnswer,
      ],
    );

  return (
    <TrainingContext.Provider
      value={value}
    >
      {children}
    </TrainingContext.Provider>
  );
}
