import {
  createContext,
} from 'react';

import type {
  RevealTrainingHintResponse,
  TrainingAnswerResult,
  TrainingExecutionFeedback,
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

  executeCodePreview(
    runId: string,
    exerciseId: string,
    code: string,
  ): Promise<TrainingExecutionFeedback>;

  revealHint(
    runId: string,
    exerciseId: string,
  ): Promise<RevealTrainingHintResponse['hint']>;
}

export const TrainingContext =
  createContext<TrainingContextValue | null>(
    null,
  );
