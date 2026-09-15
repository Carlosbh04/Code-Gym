import type {
  ConceptId,
  TechnologyId,
} from '../content/content-id.js';

import type {
  ConceptProgressRecord,
  ConceptProgressRepository,
} from './concept-progress-repository.js';

import {
  calculateAccuracy,
} from './user-progress-model.js';

export type ReviewEvidenceLevel =
  | 'none'
  | 'initial'
  | 'sufficient';

export type ReviewReason =
  | 'low-accuracy'
  | 'low-evidence';

export interface ReviewPolicy {
  /**
   * Number of accumulated attempts required before evidence is considered
   * sufficient.
   *
   * T226 deliberately does not hardcode the frontend value because the exact
   * getEvidenceLevel threshold is not part of the backend contract yet.
   */
  readonly sufficientEvidenceAttempts: number;

  /**
   * Accuracy ratio in the range (0, 1].
   *
   * Example: the current frontend uses 80 %, represented here as 0.8.
   */
  readonly targetAccuracy: number;

  readonly maximumCandidates: number;
}

export interface ReviewOverview {
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly accuracy: number | null;
  readonly evidenceLevel: ReviewEvidenceLevel;
}

export interface ReviewCandidate {
  readonly conceptId: ConceptId;
  readonly technologyId: TechnologyId;
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly completedSessions: number;
  readonly accuracy: number;
  readonly evidenceLevel: ReviewEvidenceLevel;
  readonly lastPracticedAt: string;
  readonly reason: ReviewReason;
}

export interface ReviewPlan {
  readonly overview: ReviewOverview;
  readonly candidates:
    readonly ReviewCandidate[];
}

export class ReviewService {
  public constructor(
    private readonly repository:
      Pick<
        ConceptProgressRepository,
        'findByUserId'
      >,

    private readonly policy:
      ReviewPolicy,
  ) {
    assertReviewPolicy(
      policy,
    );
  }

  public async getReviewPlan(
    userId: string,
  ): Promise<ReviewPlan> {
    const progress =
      await this.repository
        .findByUserId(
          userId,
        );

    const totals =
      progress.reduce(
        (
          aggregate,
          record,
        ) => ({
          totalAttempts:
            aggregate.totalAttempts
            + record.totalAttempts,

          correctAttempts:
            aggregate.correctAttempts
            + record.correctAttempts,
        }),
        {
          totalAttempts:
            0,

          correctAttempts:
            0,
        },
      );

    const candidates =
      progress
        .flatMap(
          (
            record,
          ): ReviewCandidate[] =>
            toReviewCandidate(
              record,
              this.policy,
            ),
        )
        .sort(
          compareCandidates,
        )
        .slice(
          0,
          this.policy
            .maximumCandidates,
        );

    return Object.freeze({
      overview:
        Object.freeze({
          totalAttempts:
            totals.totalAttempts,

          correctAttempts:
            totals.correctAttempts,

          accuracy:
            calculateAccuracy(
              totals.correctAttempts,
              totals.totalAttempts,
            ),

          evidenceLevel:
            getEvidenceLevel(
              totals.totalAttempts,
              this.policy
                .sufficientEvidenceAttempts,
            ),
        }),

      candidates:
        Object.freeze(
          candidates,
        ),
    });
  }
}

export class InvalidReviewPolicyError
  extends Error {
  public constructor(
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      'InvalidReviewPolicyError';
  }
}

function toReviewCandidate(
  record: ConceptProgressRecord,
  policy: ReviewPolicy,
): ReviewCandidate[] {
  if (
    record.totalAttempts === 0
  ) {
    return [];
  }

  const accuracy =
    calculateAccuracy(
      record.correctAttempts,
      record.totalAttempts,
    );

  if (
    accuracy === null
  ) {
    return [];
  }

  const evidenceLevel =
    getEvidenceLevel(
      record.totalAttempts,
      policy
        .sufficientEvidenceAttempts,
    );

  const hasTargetAccuracy =
    accuracy
    >= policy.targetAccuracy;

  const hasSufficientEvidence =
    evidenceLevel
    === 'sufficient';

  if (
    hasTargetAccuracy
    && hasSufficientEvidence
  ) {
    return [];
  }

  return [
    Object.freeze({
      conceptId:
        record.conceptId,

      technologyId:
        record.technologyId,

      totalAttempts:
        record.totalAttempts,

      correctAttempts:
        record.correctAttempts,

      completedSessions:
        record.completedSessions,

      accuracy,

      evidenceLevel,

      lastPracticedAt:
        record.lastPracticedAt
          .toISOString(),

      reason:
        hasTargetAccuracy
          ? 'low-evidence'
          : 'low-accuracy',
    }),
  ];
}

function getEvidenceLevel(
  totalAttempts: number,
  sufficientEvidenceAttempts: number,
): ReviewEvidenceLevel {
  if (
    totalAttempts === 0
  ) {
    return 'none';
  }

  if (
    totalAttempts
    < sufficientEvidenceAttempts
  ) {
    return 'initial';
  }

  return 'sufficient';
}

function compareCandidates(
  left: ReviewCandidate,
  right: ReviewCandidate,
): number {
  const byAccuracy =
    left.accuracy
    - right.accuracy;

  if (
    byAccuracy !== 0
  ) {
    return byAccuracy;
  }

  const byEvidence =
    left.totalAttempts
    - right.totalAttempts;

  if (
    byEvidence !== 0
  ) {
    return byEvidence;
  }

  const byLastPracticed =
    left.lastPracticedAt
      .localeCompare(
        right.lastPracticedAt,
      );

  if (
    byLastPracticed !== 0
  ) {
    return byLastPracticed;
  }

  return left.conceptId
    .localeCompare(
      right.conceptId,
    );
}

function assertReviewPolicy(
  policy: ReviewPolicy,
): void {
  if (
    !Number.isSafeInteger(
      policy
        .sufficientEvidenceAttempts,
    )
    || policy
      .sufficientEvidenceAttempts
      <= 0
  ) {
    throw new InvalidReviewPolicyError(
      'sufficientEvidenceAttempts must be a positive safe integer',
    );
  }

  if (
    !Number.isFinite(
      policy.targetAccuracy,
    )
    || policy.targetAccuracy
      <= 0
    || policy.targetAccuracy
      > 1
  ) {
    throw new InvalidReviewPolicyError(
      'targetAccuracy must be greater than 0 and at most 1',
    );
  }

  if (
    !Number.isSafeInteger(
      policy.maximumCandidates,
    )
    || policy.maximumCandidates
      < 1
    || policy.maximumCandidates
      > 100
  ) {
    throw new InvalidReviewPolicyError(
      'maximumCandidates must be an integer between 1 and 100',
    );
  }
}
