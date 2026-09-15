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
  InvalidReviewPolicyError,
  ReviewService,
  type ReviewPolicy,
} from '../src/progress/review-service.js';

const technologyId =
  technologyIdSchema.parse(
    'javascript',
  );

const policy:
  ReviewPolicy = {
    sufficientEvidenceAttempts:
      8,

    targetAccuracy:
      0.8,

    maximumCandidates:
      4,
  };

function progress(
  concept:
    string,
  totalAttempts:
    number,
  correctAttempts:
    number,
  lastPracticedAt:
    string,
): ConceptProgressRecord {
  const conceptId =
    conceptIdSchema.parse(
      concept,
    );

  const date =
    new Date(
      lastPracticedAt,
    );

  return {
    id:
      `progress-${concept}`,

    userId:
      'user-1',

    conceptId,

    technologyId,

    totalAttempts,

    correctAttempts,

    completedSessions:
      1,

    lastPracticedAt:
      date,

    createdAt:
      date,

    updatedAt:
      date,
  };
}

function createRepository(
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
  'ReviewService (T226)',
  () => {
    it(
      'builds a global overview from server-owned progress counters',
      async () => {
        const service =
          new ReviewService(
            createRepository([
              progress(
                'js-array-iteration',
                4,
                2,
                '2026-09-05T10:00:00.000Z',
              ),

              progress(
                'js-function-basics',
                6,
                5,
                '2026-09-06T10:00:00.000Z',
              ),
            ]),
            policy,
          );

        const result =
          await service
            .getReviewPlan(
              'user-1',
            );

        expect(
          result.overview,
        ).toEqual({
          totalAttempts:
            10,

          correctAttempts:
            7,

          accuracy:
            0.7,

          evidenceLevel:
            'sufficient',
        });
      },
    );

    it(
      'includes weak accuracy and low evidence concepts but excludes consolidated concepts',
      async () => {
        const service =
          new ReviewService(
            createRepository([
              progress(
                'js-array-iteration',
                10,
                5,
                '2026-09-05T10:00:00.000Z',
              ),

              progress(
                'js-function-basics',
                4,
                4,
                '2026-09-04T10:00:00.000Z',
              ),

              progress(
                'js-promise-flow',
                10,
                9,
                '2026-09-03T10:00:00.000Z',
              ),
            ]),
            policy,
          );

        const result =
          await service
            .getReviewPlan(
              'user-1',
            );

        expect(
          result.candidates.map(
            ({
              conceptId,
              reason,
            }) => ({
              conceptId,
              reason,
            }),
          ),
        ).toEqual([
          {
            conceptId:
              conceptIdSchema.parse(
                'js-array-iteration',
              ),

            reason:
              'low-accuracy',
          },
          {
            conceptId:
              conceptIdSchema.parse(
                'js-function-basics',
              ),

            reason:
              'low-evidence',
          },
        ]);
      },
    );

    it(
      'orders candidates by accuracy, evidence, oldest practice and concept id',
      async () => {
        const service =
          new ReviewService(
            createRepository([
              progress(
                'js-promise-flow',
                6,
                3,
                '2026-09-05T10:00:00.000Z',
              ),

              progress(
                'js-function-basics',
                4,
                2,
                '2026-09-06T10:00:00.000Z',
              ),

              progress(
                'js-array-iteration',
                4,
                2,
                '2026-09-01T10:00:00.000Z',
              ),
            ]),
            policy,
          );

        const result =
          await service
            .getReviewPlan(
              'user-1',
            );

        expect(
          result.candidates.map(
            ({
              conceptId,
            }) =>
              conceptId,
          ),
        ).toEqual([
          conceptIdSchema.parse(
            'js-array-iteration',
          ),

          conceptIdSchema.parse(
            'js-function-basics',
          ),

          conceptIdSchema.parse(
            'js-promise-flow',
          ),
        ]);
      },
    );

    it(
      'limits candidates using the policy',
      async () => {
        const service =
          new ReviewService(
            createRepository([
              progress(
                'concept-a',
                4,
                1,
                '2026-09-01T00:00:00.000Z',
              ),

              progress(
                'concept-b',
                4,
                2,
                '2026-09-02T00:00:00.000Z',
              ),

              progress(
                'concept-c',
                4,
                3,
                '2026-09-03T00:00:00.000Z',
              ),
            ]),
            {
              ...policy,

              maximumCandidates:
                2,
            },
          );

        const result =
          await service
            .getReviewPlan(
              'user-1',
            );

        expect(
          result.candidates,
        ).toHaveLength(
          2,
        );
      },
    );

    it(
      'returns a real empty state when no progress exists',
      async () => {
        const service =
          new ReviewService(
            createRepository(
              [],
            ),
            policy,
          );

        await expect(
          service
            .getReviewPlan(
              'user-1',
            ),
        ).resolves.toEqual({
          overview: {
            totalAttempts:
              0,

            correctAttempts:
              0,

            accuracy:
              null,

            evidenceLevel:
              'none',
          },

          candidates:
            [],
        });
      },
    );

    it(
      'does not produce a review candidate from a zero-attempt aggregate',
      async () => {
        const service =
          new ReviewService(
            createRepository([
              progress(
                'js-array-iteration',
                0,
                0,
                '2026-09-01T00:00:00.000Z',
              ),
            ]),
            policy,
          );

        const result =
          await service
            .getReviewPlan(
              'user-1',
            );

        expect(
          result.candidates,
        ).toEqual(
          [],
        );
      },
    );

    it.each([
      {
        sufficientEvidenceAttempts:
          0,

        targetAccuracy:
          0.8,

        maximumCandidates:
          4,
      },
      {
        sufficientEvidenceAttempts:
          1.5,

        targetAccuracy:
          0.8,

        maximumCandidates:
          4,
      },
      {
        sufficientEvidenceAttempts:
          8,

        targetAccuracy:
          0,

        maximumCandidates:
          4,
      },
      {
        sufficientEvidenceAttempts:
          8,

        targetAccuracy:
          1.1,

        maximumCandidates:
          4,
      },
      {
        sufficientEvidenceAttempts:
          8,

        targetAccuracy:
          Number.NaN,

        maximumCandidates:
          4,
      },
      {
        sufficientEvidenceAttempts:
          8,

        targetAccuracy:
          0.8,

        maximumCandidates:
          0,
      },
      {
        sufficientEvidenceAttempts:
          8,

        targetAccuracy:
          0.8,

        maximumCandidates:
          101,
      },
    ])(
      'rejects invalid review policy %#',
      (
        invalid,
      ) => {
        expect(
          () =>
            new ReviewService(
              createRepository(
                [],
              ),
              invalid,
            ),
        ).toThrow(
          InvalidReviewPolicyError,
        );
      },
    );
  },
);
