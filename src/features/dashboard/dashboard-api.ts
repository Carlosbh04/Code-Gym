import {
  ApiError,
  apiRequest,
} from '@/lib/api/http-client';

export type DashboardEvidenceLevel =
  | 'none'
  | 'initial'
  | 'sufficient';

export type DashboardReviewReason =
  | 'low-accuracy'
  | 'low-evidence';

export type DashboardBadgeId =
  | 'first-session'
  | 'five-sessions'
  | 'ten-sessions'
  | 'fifty-attempts'
  | 'hundred-attempts'
  | 'accuracy-80';

export interface DashboardConceptProgress {
  readonly conceptId: string;
  readonly technologyId: string;
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly completedSessions: number;
  readonly accuracy: number | null;
  readonly lastPracticedAt: string;
}

export interface DashboardCompletedSession {
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

export interface DashboardReviewOverview {
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly accuracy: number | null;
  readonly evidenceLevel: DashboardEvidenceLevel;
}

export interface DashboardReviewCandidate {
  readonly conceptId: string;
  readonly technologyId: string;
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly completedSessions: number;
  readonly accuracy: number;
  readonly evidenceLevel: DashboardEvidenceLevel;
  readonly lastPracticedAt: string;
  readonly reason: DashboardReviewReason;
}

export interface DashboardReviewPlan {
  readonly overview: DashboardReviewOverview;
  readonly candidates: readonly DashboardReviewCandidate[];
}

export interface DashboardBadgeSummary {
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly completedSessions: number;
  readonly accuracy: number | null;
}

export interface DashboardBadgeStatus {
  readonly id: DashboardBadgeId;
  readonly title: string;
  readonly description: string;
  readonly unlocked: boolean;
}

export interface DashboardBadgeResult {
  readonly summary: DashboardBadgeSummary;
  readonly badges: readonly DashboardBadgeStatus[];
}

export interface DashboardSnapshot {
  readonly progress: readonly DashboardConceptProgress[];
  readonly recentCompletedSessions: readonly DashboardCompletedSession[];
  readonly review: DashboardReviewPlan;
  readonly badges: DashboardBadgeResult;
}

export interface DashboardResponse {
  readonly dashboard: DashboardSnapshot;
}

export async function getDashboard(
  accessToken: string,
): Promise<DashboardResponse> {
  return apiRequest<DashboardResponse>(
    '/dashboard',
    {
      method: 'GET',
      accessToken,
      cache: 'no-store',
    },
  );
}

export {
  ApiError,
};
