import {
  ApiError,
  apiRequest,
} from '@/lib/api/http-client';

export interface HistoryCompletedSession {
  readonly id: string;
  readonly sessionId: string;
  readonly technologyId: string;
  readonly topicId: string | null;
  readonly conceptId: string | null;
  readonly totalExercises: number;
  readonly correctExercises: number;
  readonly accuracy: number;
  readonly durationMs: number;
  readonly hintsUsed: number;
  readonly completedAt: string;
}

export interface HistoryAttempt {
  readonly id: string;
  readonly sessionId: string;
  readonly exerciseId: string;
  readonly conceptId: string | null;
  readonly technologyId: string;
  readonly isCorrect: boolean;
  readonly attemptedAt: string;
  readonly durationMs: number | null;
  readonly hintsUsed: number | null;
}

export interface HistoryCompletedSessionResponse {
  readonly completedSession: HistoryCompletedSession;
}

export interface HistoryAttemptsResponse {
  readonly attempts: readonly HistoryAttempt[];
}

export async function getHistoryCompletedSession(
  accessToken: string,
  sessionId: string,
): Promise<HistoryCompletedSessionResponse> {
  return apiRequest<HistoryCompletedSessionResponse>(
    `/history/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export async function getHistoryAttempts(
  accessToken: string,
  sessionId: string,
): Promise<HistoryAttemptsResponse> {
  return apiRequest<HistoryAttemptsResponse>(
    `/history/sessions/${encodeURIComponent(sessionId)}/attempts`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export {
  ApiError,
};
