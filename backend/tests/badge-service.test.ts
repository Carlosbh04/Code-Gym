import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  conceptIdSchema,
  technologyIdSchema,
} from '../src/content/content-id.js';

import type {
  ConceptProgressRecord,
  ConceptProgressRepository,
} from '../src/progress/concept-progress-repository.js';

import {
  BadgeService,
  InvalidBadgePolicyError,
} from '../src/progress/badge-service.js';

const technologyId =
  technologyIdSchema.parse(
    'javascript',
  );

function progress(
  concept:
    string,
  totalAttempts:
    number,
  correctAttempts:
    number,
  completedSessions:
    number,
): ConceptProgressRecord {
  const now =
    new Date(
      '2026-09-12T08:00:00.000Z',
    );

  return {
    id:
      `progress-${concept}`,

    userId:
      'user-1',

    conceptId:
      conceptIdSchema.parse(
        concept,
      ),

    technologyId,

    totalAttempts,

    correctAttempts,

    completedSessions,

    lastPracticedAt:
      now,

    createdAt:
      now,

    updatedAt:
      now,
  };
}

function repository(
  records:
    readonly ConceptProgressRecord[],
): ConceptProgressRepository {
  return {
    findByUserAndConceptId:
      vi
        .fn<
          ConceptProgressRepository[
            'findByUserAndConceptId'
          ]
        >()
        .mockResolvedValue(
          null,
        ),

    findByUserId:
      vi
        .fn<
          ConceptProgressRepository[
            'findByUserId'
          ]
        >()
        .mockResolvedValue(
          records,
        ),
  };
}

describe(
  'BadgeService (T227)',
  () => {
    it(
      'returns all badges locked for an empty user',
      async () => {
        const service =
          new BadgeService(
            repository(
              [],
            ),
            {
              accuracyBadgeMinimumAttempts:
                10,
            },
          );

        const result =
          await service
            .getBadges(
              'user-1',
            );

        expect(
          result.summary,
        ).toEqual({
          totalAttempts:
            0,

          correctAttempts:
            0,

          completedSessions:
            0,

          accuracy:
            null,
        });

        expect(
          result.badges.every(
            ({
              unlocked,
            }) =>
              !unlocked,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      'unlocks first-session after one completed session',
      async () => {
        const service =
          new BadgeService(
            repository([
              progress(
                'js-array-iteration',
                4,
                3,
                1,
              ),
            ]),
            {
              accuracyBadgeMinimumAttempts:
                10,
            },
          );

        const result =
          await service
            .getBadges(
              'user-1',
            );

        expect(
          getBadge(
            result,
            'first-session',
          ).unlocked,
        ).toBe(
          true,
        );

        expect(
          getBadge(
            result,
            'five-sessions',
          ).unlocked,
        ).toBe(
          false,
        );
      },
    );

    it(
      'unlocks session milestone badges from accumulated concept progress',
      async () => {
        const service =
          new BadgeService(
            repository([
              progress(
                'concept-a',
                20,
                15,
                4,
              ),

              progress(
                'concept-b',
                30,
                20,
                6,
              ),
            ]),
            {
              accuracyBadgeMinimumAttempts:
                10,
            },
          );

        const result =
          await service
            .getBadges(
              'user-1',
            );

        expect(
          result.summary
            .completedSessions,
        ).toBe(
          10,
        );

        expect(
          getBadge(
            result,
            'first-session',
          ).unlocked,
        ).toBe(
          true,
        );

        expect(
          getBadge(
            result,
            'five-sessions',
          ).unlocked,
        ).toBe(
          true,
        );

        expect(
          getBadge(
            result,
            'ten-sessions',
          ).unlocked,
        ).toBe(
          true,
        );
      },
    );

    it(
      'unlocks attempt milestone badges from accumulated attempts',
      async () => {
        const service =
          new BadgeService(
            repository([
              progress(
                'concept-a',
                60,
                40,
                3,
              ),

              progress(
                'concept-b',
                40,
                30,
                3,
              ),
            ]),
            {
              accuracyBadgeMinimumAttempts:
                10,
            },
          );

        const result =
          await service
            .getBadges(
              'user-1',
            );

        expect(
          result.summary
            .totalAttempts,
        ).toBe(
          100,
        );

        expect(
          getBadge(
            result,
            'fifty-attempts',
          ).unlocked,
        ).toBe(
          true,
        );

        expect(
          getBadge(
            result,
            'hundred-attempts',
          ).unlocked,
        ).toBe(
          true,
        );
      },
    );

    it(
      'unlocks accuracy-80 only when both accuracy and minimum evidence are satisfied',
      async () => {
        const enoughEvidence =
          new BadgeService(
            repository([
              progress(
                'concept-a',
                10,
                8,
                2,
              ),
            ]),
            {
              accuracyBadgeMinimumAttempts:
                10,
            },
          );

        const insufficientEvidence =
          new BadgeService(
            repository([
              progress(
                'concept-a',
                5,
                5,
                1,
              ),
            ]),
            {
              accuracyBadgeMinimumAttempts:
                10,
            },
          );

        expect(
          getBadge(
            await enoughEvidence
              .getBadges(
                'user-1',
              ),
            'accuracy-80',
          ).unlocked,
        ).toBe(
          true,
        );

        expect(
          getBadge(
            await insufficientEvidence
              .getBadges(
                'user-1',
              ),
            'accuracy-80',
          ).unlocked,
        ).toBe(
          false,
        );
      },
    );

    it(
      'keeps accuracy-80 locked when accuracy is below 80 percent',
      async () => {
        const service =
          new BadgeService(
            repository([
              progress(
                'concept-a',
                10,
                7,
                2,
              ),
            ]),
            {
              accuracyBadgeMinimumAttempts:
                10,
            },
          );

        const result =
          await service
            .getBadges(
              'user-1',
            );

        expect(
          result.summary.accuracy,
        ).toBe(
          0.7,
        );

        expect(
          getBadge(
            result,
            'accuracy-80',
          ).unlocked,
        ).toBe(
          false,
        );
      },
    );

    it(
      'derives global accuracy from accumulated counters',
      async () => {
        const service =
          new BadgeService(
            repository([
              progress(
                'concept-a',
                4,
                2,
                1,
              ),

              progress(
                'concept-b',
                6,
                5,
                1,
              ),
            ]),
            {
              accuracyBadgeMinimumAttempts:
                10,
            },
          );

        const result =
          await service
            .getBadges(
              'user-1',
            );

        expect(
          result.summary,
        ).toMatchObject({
          totalAttempts:
            10,

          correctAttempts:
            7,

          completedSessions:
            2,

          accuracy:
            0.7,
        });
      },
    );

    it.each([
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ])(
      'rejects invalid accuracyBadgeMinimumAttempts %s',
      (
        value,
      ) => {
        expect(
          () =>
            new BadgeService(
              repository(
                [],
              ),
              {
                accuracyBadgeMinimumAttempts:
                  value,
              },
            ),
        ).toThrow(
          InvalidBadgePolicyError,
        );
      },
    );
  },
);

function getBadge(
  result:
    Awaited<
      ReturnType<
        BadgeService[
          'getBadges'
        ]
      >
    >,
  badgeId:
    Parameters<
      typeof findBadge
    >[1],
) {
  const badge =
    findBadge(
      result,
      badgeId,
    );

  if (
    badge === undefined
  ) {
    throw new Error(
      `Missing badge ${badgeId}`,
    );
  }

  return badge;
}

function findBadge(
  result:
    Awaited<
      ReturnType<
        BadgeService[
          'getBadges'
        ]
      >
    >,
  badgeId:
    'first-session'
    | 'five-sessions'
    | 'ten-sessions'
    | 'fifty-attempts'
    | 'hundred-attempts'
    | 'accuracy-80',
) {
  return result.badges.find(
    ({
      id,
    }) =>
      id === badgeId,
  );
}
