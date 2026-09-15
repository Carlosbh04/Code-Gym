import {
  createContext,
} from 'react';

import type {
  RevealTrainingHintResponse,
  TrainingAnswerResult,
  TrainingRun,
} from '@/features/training/training-api';

export interface SubmitTrainingAnswerInput {
  readonly exerciseId: string;
  readonly answer: unknown;
  readonly durationMs: number;
}

export interface TrainingContextValue {
  startRun(
    sessionId: string,
  ): Promise<TrainingRun>;

  submitAnswer(
    runId: string,
    input: SubmitTrainingAnswerInput,
  ): Promise<TrainingAnswerResult>;

  revealHint(
    runId: string,
    exerciseId: string,
  ): Promise<RevealTrainingHintResponse['hint']>;
}

export const TrainingContext =
  createContext<TrainingContextValue | null>(
    null,
  );
