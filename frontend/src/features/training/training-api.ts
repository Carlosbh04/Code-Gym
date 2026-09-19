import {
  ApiError,
  apiRequest,
} from '@/lib/api/http-client';
import type {
  RevealedHint,
} from '@/types/exercise';

export type TrainingRunStatus =
  | 'active'
  | 'completed';

export interface TrainingRun {
  readonly id: string;
  readonly sessionId: string;
  readonly technologyId: string;
  readonly topicId: string;
  readonly conceptId: string;
  readonly status: TrainingRunStatus;
  readonly totalExercises: number;
  readonly answeredExercises: number;
  readonly correctExercises: number;
  readonly durationMs: number;
  readonly hintsUsed: number;
  readonly startedAt: string;
  readonly completedAt: string | null;
}

export interface TrainingAttempt {
  readonly id: string;
  readonly exerciseId: string;
  readonly isCorrect: boolean;
  readonly attemptedAt: string;
  readonly durationMs: number;
  readonly hintsUsed: number;
}

export type TrainingExecutionReason =
  | 'passed'
  | 'failed'
  | 'syntax-error'
  | 'runtime-error'
  | 'timeout';

export interface TrainingExecutionFeedback {
  readonly passed: boolean;
  readonly reason: TrainingExecutionReason;
}

export interface TrainingVerificationFeedback {
  readonly functionalCorrect: boolean;
  readonly pedagogicalRequirementsMet: boolean;
  readonly overallPassed: boolean;
  readonly feedback: readonly string[];
}

export interface TrainingCompletion {
  readonly id: string;
  readonly completedAt: string;
  readonly totalExercises: number;
  readonly correctExercises: number;
  readonly durationMs: number;
  readonly hintsUsed: number;
  readonly accuracy: number;
}

export interface TrainingAnswerResult {
  readonly verification:
    TrainingVerificationFeedback | null;
  readonly attempt: TrainingAttempt;
  readonly run: TrainingRun;
  readonly execution:
    TrainingExecutionFeedback | null;
  readonly completion:
    TrainingCompletion | null;
}

export interface StartTrainingRunResponse {
  readonly run: TrainingRun;
}

export interface SubmitTrainingAnswerResponse {
  readonly result: TrainingAnswerResult;
}

export interface SubmitTrainingAnswerInput {
  readonly exerciseId: string;
  readonly answer: unknown;
  readonly durationMs: number;
}

export interface RevealTrainingHintResponse {
  readonly hint: RevealedHint & {
    readonly totalHints: number;
  };
}

export async function startTrainingRun(
  accessToken: string,
  sessionId: string,
): Promise<StartTrainingRunResponse> {
  return apiRequest<StartTrainingRunResponse>(
    '/training/runs',
    {
      method: 'POST',
      accessToken,
      body: {
        sessionId,
      },
    },
  );
}

export async function submitTrainingAnswer(
  accessToken: string,
  runId: string,
  input: SubmitTrainingAnswerInput,
): Promise<SubmitTrainingAnswerResponse> {
  return apiRequest<SubmitTrainingAnswerResponse>(
    `/training/runs/${encodeURIComponent(runId)}/answers`,
    {
      method: 'POST',
      accessToken,
      body: {
        exerciseId:
          input.exerciseId,
        answer:
          input.answer,
        durationMs:
          input.durationMs,
      },
    },
  );
}

export async function revealTrainingHint(
  accessToken: string,
  runId: string,
  exerciseId: string,
): Promise<RevealTrainingHintResponse> {
  return apiRequest<RevealTrainingHintResponse>(
    `/training/runs/${encodeURIComponent(runId)}/hints`,
    {
      method: 'POST',
      accessToken,
      body: {
        exerciseId,
      },
    },
  );
}

export {
  ApiError,
};
