import type {
  ConceptProgressRecord,
  ConceptProgressRepository,
} from './concept-progress-repository.js';

import {
  calculateAccuracy,
} from './user-progress-model.js';

export type BadgeId =
  | 'first-session'
  | 'five-sessions'
  | 'ten-sessions'
  | 'fifty-attempts'
  | 'hundred-attempts'
  | 'accuracy-80';

export interface BadgePolicy {
  readonly accuracyBadgeMinimumAttempts: number;
}

export interface BadgeDefinition {
  readonly id: BadgeId;
  readonly title: string;
  readonly description: string;
}

export interface BadgeStatus
  extends BadgeDefinition {
  readonly unlocked: boolean;
}

export interface BadgeSummary {
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly completedSessions: number;
  readonly accuracy: number | null;
}

export interface BadgeResult {
  readonly summary: BadgeSummary;
  readonly badges: readonly BadgeStatus[];
}

const badgeDefinitions:
  readonly BadgeDefinition[] =
    Object.freeze([
      Object.freeze({
        id:
          'first-session',

        title:
          'Primera sesión',

        description:
          'Completa tu primera sesión.',
      }),

      Object.freeze({
        id:
          'five-sessions',

        title:
          'En marcha',

        description:
          'Completa 5 sesiones.',
      }),

      Object.freeze({
        id:
          'ten-sessions',

        title:
          'Constancia',

        description:
          'Completa 10 sesiones.',
      }),

      Object.freeze({
        id:
          'fifty-attempts',

        title:
          '50 intentos',

        description:
          'Registra 50 intentos.',
      }),

      Object.freeze({
        id:
          'hundred-attempts',

        title:
          '100 intentos',

        description:
          'Registra 100 intentos.',
      }),

      Object.freeze({
        id:
          'accuracy-80',

        title:
          'Precisión 80 %',

        description:
          'Mantén al menos un 80 % de precisión con evidencia suficiente.',
      }),
    ]);

export class BadgeService {
  public constructor(
    private readonly repository:
      Pick<
        ConceptProgressRepository,
        'findByUserId'
      >,

    private readonly policy:
      BadgePolicy,
  ) {
    assertBadgePolicy(
      policy,
    );
  }

  public async getBadges(
    userId: string,
  ): Promise<BadgeResult> {
    const progress =
      await this.repository
        .findByUserId(
          userId,
        );

    const summary =
      buildSummary(
        progress,
      );

    const badges =
      badgeDefinitions.map(
        (
          definition,
        ): BadgeStatus =>
          Object.freeze({
            ...definition,

            unlocked:
              isUnlocked(
                definition.id,
                summary,
                this.policy,
              ),
          }),
      );

    return Object.freeze({
      summary:
        Object.freeze(
          summary,
        ),

      badges:
        Object.freeze(
          badges,
        ),
    });
  }
}

export class InvalidBadgePolicyError
  extends Error {
  public constructor() {
    super(
      'accuracyBadgeMinimumAttempts must be a positive safe integer',
    );

    this.name =
      'InvalidBadgePolicyError';
  }
}

function buildSummary(
  progress:
    readonly ConceptProgressRecord[],
): BadgeSummary {
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

        completedSessions:
          aggregate.completedSessions
          + record.completedSessions,
      }),
      {
        totalAttempts:
          0,

        correctAttempts:
          0,

        completedSessions:
          0,
      },
    );

  return {
    ...totals,

    accuracy:
      calculateAccuracy(
        totals.correctAttempts,
        totals.totalAttempts,
      ),
  };
}

function isUnlocked(
  badgeId: BadgeId,
  summary: BadgeSummary,
  policy: BadgePolicy,
): boolean {
  switch (
    badgeId
  ) {
    case 'first-session':
      return summary
        .completedSessions >= 1;

    case 'five-sessions':
      return summary
        .completedSessions >= 5;

    case 'ten-sessions':
      return summary
        .completedSessions >= 10;

    case 'fifty-attempts':
      return summary
        .totalAttempts >= 50;

    case 'hundred-attempts':
      return summary
        .totalAttempts >= 100;

    case 'accuracy-80':
      return summary
        .totalAttempts
        >= policy
          .accuracyBadgeMinimumAttempts
        && summary.accuracy !== null
        && summary.accuracy >= 0.8;
  }
}

function assertBadgePolicy(
  policy: BadgePolicy,
): void {
  if (
    !Number.isSafeInteger(
      policy
        .accuracyBadgeMinimumAttempts,
    )
    || policy
      .accuracyBadgeMinimumAttempts
      <= 0
  ) {
    throw new InvalidBadgePolicyError();
  }
}
