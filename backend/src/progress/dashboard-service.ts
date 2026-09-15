import type {
  BadgeResult,
  BadgeService,
} from './badge-service.js';

import type {
  CompletedSessionService,
  CompletedSessionView,
} from './completed-session-service.js';

import type {
  ConceptProgressService,
  ConceptProgressView,
} from './concept-progress-service.js';

import type {
  ReviewPlan,
  ReviewService,
} from './review-service.js';

export interface DashboardSnapshot {
  readonly progress:
    readonly ConceptProgressView[];

  readonly recentCompletedSessions:
    readonly CompletedSessionView[];

  readonly review:
    ReviewPlan;

  readonly badges:
    BadgeResult;
}

export class DashboardService {
  public constructor(
    private readonly conceptProgressService:
      Pick<
        ConceptProgressService,
        'listConceptProgress'
      >,

    private readonly completedSessionService:
      Pick<
        CompletedSessionService,
        'listRecentCompletedSessions'
      >,

    private readonly reviewService:
      Pick<
        ReviewService,
        'getReviewPlan'
      >,

    private readonly badgeService:
      Pick<
        BadgeService,
        'getBadges'
      >,

    private readonly recentCompletedSessionsLimit:
      number = 10,
  ) {
    assertRecentCompletedSessionsLimit(
      recentCompletedSessionsLimit,
    );
  }

  public async getDashboard(
    userId: string,
  ): Promise<DashboardSnapshot> {
    const [
      progress,
      recentCompletedSessions,
      review,
      badges,
    ] =
      await Promise.all([
        this.conceptProgressService
          .listConceptProgress(
            userId,
          ),

        this.completedSessionService
          .listRecentCompletedSessions(
            userId,
            this.recentCompletedSessionsLimit,
          ),

        this.reviewService
          .getReviewPlan(
            userId,
          ),

        this.badgeService
          .getBadges(
            userId,
          ),
      ]);

    return Object.freeze({
      progress:
        Object.freeze([
          ...progress,
        ]),

      recentCompletedSessions:
        Object.freeze([
          ...recentCompletedSessions,
        ]),

      review,

      badges,
    });
  }
}

export class InvalidDashboardHistoryLimitError
  extends Error {
  public constructor() {
    super(
      'Dashboard recent-completed-session limit must be an integer between 1 and 100',
    );

    this.name =
      'InvalidDashboardHistoryLimitError';
  }
}

function assertRecentCompletedSessionsLimit(
  limit: number,
): void {
  if (
    !Number.isSafeInteger(
      limit,
    )
    || limit < 1
    || limit > 100
  ) {
    throw new InvalidDashboardHistoryLimitError();
  }
}
