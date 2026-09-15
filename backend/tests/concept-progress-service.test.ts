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
  ConceptProgressService,
} from '../src/progress/concept-progress-service.js';

const conceptId =
  conceptIdSchema.parse(
    'js-function-basics',
  );

const technologyId =
  technologyIdSchema.parse(
    'javascript',
  );

const practicedAt =
  new Date(
    '2026-09-12T08:00:00.000Z',
  );

const record:
  ConceptProgressRecord = {
    id:
      'progress-1',

    userId:
      'user-1',

    conceptId,

    technologyId,

    totalAttempts:
      10,

    correctAttempts:
      7,

    completedSessions:
      3,

    lastPracticedAt:
      practicedAt,

    createdAt:
      practicedAt,

    updatedAt:
      practicedAt,
  };

function createRepository(
  overrides:
    Partial<ConceptProgressRepository> = {},
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
          record,
        ),

    findByUserId:
      vi
        .fn<
          ConceptProgressRepository[
            'findByUserId'
          ]
        >()
        .mockResolvedValue([
          record,
        ]),

    ...overrides,
  };
}

describe(
  'ConceptProgressService (T224)',
  () => {
    it(
      'returns one owned concept projection with derived accuracy',
      async () => {
        const findByUserAndConceptId =
          vi
            .fn<
              ConceptProgressRepository[
                'findByUserAndConceptId'
              ]
            >()
            .mockResolvedValue(
              record,
            );

        const service =
          new ConceptProgressService(
            createRepository({
              findByUserAndConceptId,
            }),
          );

        const result =
          await service
            .getConceptProgress(
              'user-1',
              conceptId,
            );

        expect(
          findByUserAndConceptId,
        ).toHaveBeenCalledWith(
          'user-1',
          conceptId,
        );

        expect(
          result,
        ).toEqual({
          conceptId,

          technologyId,

          totalAttempts:
            10,

          correctAttempts:
            7,

          completedSessions:
            3,

          accuracy:
            0.7,

          lastPracticedAt:
            practicedAt
              .toISOString(),
        });
      },
    );

    it(
      'returns null when the user has no progress for the concept',
      async () => {
        const service =
          new ConceptProgressService(
            createRepository({
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
            }),
          );

        await expect(
          service
            .getConceptProgress(
              'user-1',
              conceptId,
            ),
        ).resolves.toBeNull();
      },
    );

    it(
      'lists only progress supplied for the requested owner',
      async () => {
        const findByUserId =
          vi
            .fn<
              ConceptProgressRepository[
                'findByUserId'
              ]
            >()
            .mockResolvedValue([
              record,
            ]);

        const service =
          new ConceptProgressService(
            createRepository({
              findByUserId,
            }),
          );

        const result =
          await service
            .listConceptProgress(
              'user-1',
            );

        expect(
          findByUserId,
        ).toHaveBeenCalledWith(
          'user-1',
        );

        expect(
          result,
        ).toHaveLength(
          1,
        );

        expect(
          result[0]?.accuracy,
        ).toBe(
          0.7,
        );
      },
    );

    it(
      'returns null accuracy when a stored aggregate has no attempts yet',
      async () => {
        const empty:
          ConceptProgressRecord = {
            ...record,

            totalAttempts:
              0,

            correctAttempts:
              0,

            completedSessions:
              0,
          };

        const service =
          new ConceptProgressService(
            createRepository({
              findByUserAndConceptId:
                vi
                  .fn<
                    ConceptProgressRepository[
                      'findByUserAndConceptId'
                    ]
                  >()
                  .mockResolvedValue(
                    empty,
                  ),
            }),
          );

        const result =
          await service
            .getConceptProgress(
              'user-1',
              conceptId,
            );

        expect(
          result?.accuracy,
        ).toBeNull();
      },
    );
  },
);
