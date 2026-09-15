import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  conceptIdSchema,
  contentSessionIdSchema,
  exerciseIdSchema,
  technologyIdSchema,
} from '../src/content/content-id.js';

import type {
  AttemptRecord,
  AttemptRepository,
} from '../src/progress/attempt-repository.js';

import {
  AttemptService,
  InvalidAttemptReadLimitError,
} from '../src/progress/attempt-service.js';

import {
  ProgressInvariantError,
} from '../src/progress/user-progress-model.js';

const sessionId =
  contentSessionIdSchema.parse(
    'js-functions-return-flow-01',
  );

const exerciseId =
  exerciseIdSchema.parse(
    'step-1',
  );

const conceptId =
  conceptIdSchema.parse(
    'js-function-basics',
  );

const technologyId =
  technologyIdSchema.parse(
    'javascript',
  );

const attemptedAt =
  new Date(
    '2026-09-12T08:00:00.000Z',
  );

const record:
  AttemptRecord = {
    id:
      'attempt-1',

    userId:
      'user-1',

    sessionId,

    exerciseId,

    conceptId,

    technologyId,

    isCorrect:
      true,

    attemptedAt,

    durationMs:
      1_250,

    hintsUsed:
      1,
  };

function createRepository(
  overrides:
    Partial<AttemptRepository> = {},
): AttemptRepository {
  return {
    createAttempt:
      vi
        .fn<
          AttemptRepository[
            'createAttempt'
          ]
        >()
        .mockResolvedValue(
          record,
        ),

    findByUserAndSessionId:
      vi
        .fn<
          AttemptRepository[
            'findByUserAndSessionId'
          ]
        >()
        .mockResolvedValue([
          record,
        ]),

    findByUserAndTrainingRunId:
      vi.fn<
        AttemptRepository[
          'findByUserAndTrainingRunId'
        ]
      >()
        .mockResolvedValue([]),
    findRecentByUserId:
      vi
        .fn<
          AttemptRepository[
            'findRecentByUserId'
          ]
        >()
        .mockResolvedValue([
          record,
        ]),

    ...overrides,
  };
}

describe(
  'AttemptService (T225)',
  () => {
    it(
      'records a trusted immutable attempt using the backend clock',
      async () => {
        const createAttempt =
          vi
            .fn<
              AttemptRepository[
                'createAttempt'
              ]
            >()
            .mockResolvedValue(
              record,
            );

        const service =
          new AttemptService(
            createRepository({
              createAttempt,
            }),

            () => attemptedAt,
          );

        const result =
          await service
            .recordTrustedAttempt({
              userId:
                'user-1',

              sessionId,

              exerciseId,

              conceptId,

              technologyId,

              isCorrect:
                true,

              durationMs:
                1_250,

              hintsUsed:
                1,
            });

        expect(
          createAttempt,
        ).toHaveBeenCalledWith({
          userId:
            'user-1',

          sessionId,

          exerciseId,

          conceptId,

          technologyId,

          isCorrect:
            true,

          durationMs:
            1_250,

          hintsUsed:
            1,

          attemptedAt,
        });

        expect(
          result,
        ).toEqual({
          id:
            'attempt-1',

          sessionId,

          exerciseId,

          conceptId,

          technologyId,

          isCorrect:
            true,

          attemptedAt:
            attemptedAt
              .toISOString(),

          durationMs:
            1_250,

          hintsUsed:
            1,
        });
      },
    );

    it(
      'rejects invalid metrics before persistence',
      async () => {
        const createAttempt =
          vi
            .fn<
              AttemptRepository[
                'createAttempt'
              ]
            >()
            .mockResolvedValue(
              record,
            );

        const service =
          new AttemptService(
            createRepository({
              createAttempt,
            }),
          );

        await expect(
          service.recordTrustedAttempt({
            userId:
              'user-1',

            sessionId,

            exerciseId,

            conceptId,

            technologyId,

            isCorrect:
              false,

            durationMs:
              -1,

            hintsUsed:
              0,
          }),
        ).rejects.toBeInstanceOf(
          ProgressInvariantError,
        );

        expect(
          createAttempt,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'reads attempts only through the owner plus session lookup',
      async () => {
        const findByUserAndSessionId =
          vi
            .fn<
              AttemptRepository[
                'findByUserAndSessionId'
              ]
            >()
            .mockResolvedValue([
              record,
            ]);

        const service =
          new AttemptService(
            createRepository({
              findByUserAndSessionId,
            }),
          );

        const result =
          await service
            .getAttemptsBySession(
              'user-1',
              sessionId,
            );

        expect(
          findByUserAndSessionId,
        ).toHaveBeenCalledWith(
          'user-1',
          sessionId,
        );

        expect(
          result,
        ).toHaveLength(
          1,
        );
      },
    );

    it(
      'returns an empty list when the owner has no attempts for the session',
      async () => {
        const service =
          new AttemptService(
            createRepository({
              findByUserAndSessionId:
                vi
                  .fn<
                    AttemptRepository[
                      'findByUserAndSessionId'
                    ]
                  >()
                  .mockResolvedValue(
                    [],
                  ),
            }),
          );

        await expect(
          service
            .getAttemptsBySession(
              'user-1',
              sessionId,
            ),
        ).resolves.toEqual(
          [],
        );
      },
    );

    it(
      'lists recent attempts using only the supplied owner',
      async () => {
        const findRecentByUserId =
          vi
            .fn<
              AttemptRepository[
                'findRecentByUserId'
              ]
            >()
            .mockResolvedValue([
              record,
            ]);

        const service =
          new AttemptService(
            createRepository({
              findRecentByUserId,
            }),
          );

        const result =
          await service
            .listRecentAttempts(
              'user-1',
              10,
            );

        expect(
          findRecentByUserId,
        ).toHaveBeenCalledWith(
          'user-1',
          10,
        );

        expect(
          result,
        ).toHaveLength(
          1,
        );
      },
    );

    it.each([
      0,
      -1,
      1.5,
      101,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ])(
      'rejects invalid recent-attempt limit %s',
      async (
        limit,
      ) => {
        const findRecentByUserId =
          vi
            .fn<
              AttemptRepository[
                'findRecentByUserId'
              ]
            >()
            .mockResolvedValue([
              record,
            ]);

        const service =
          new AttemptService(
            createRepository({
              findRecentByUserId,
            }),
          );

        await expect(
          service
            .listRecentAttempts(
              'user-1',
              limit,
            ),
        ).rejects.toBeInstanceOf(
          InvalidAttemptReadLimitError,
        );

        expect(
          findRecentByUserId,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'preserves a null conceptId from legacy history',
      async () => {
        const service =
          new AttemptService(
            createRepository({
              findByUserAndSessionId:
                vi
                  .fn<
                    AttemptRepository[
                      'findByUserAndSessionId'
                    ]
                  >()
                  .mockResolvedValue([
                    {
                      ...record,

                      conceptId:
                        null,
                    },
                  ]),
            }),
          );

        const result =
          await service
            .getAttemptsBySession(
              'user-1',
              sessionId,
            );

        expect(
          result[0]?.conceptId,
        ).toBeNull();
      },
    );
  },
);
