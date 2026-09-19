import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  conceptIdSchema,
} from '../src/content/content-id.js';

import {
  PrismaLearningProgressRepository,
} from '../src/progress/learning-progress-repository.js';

describe(
  'PrismaLearningProgressRepository.findConceptGate',
  () => {
    it(
      'finds the nearest previous published concept by position instead of assuming position - 1',
      async () => {
        const concept =
          {
            findFirst:
              vi.fn()
                .mockResolvedValueOnce({
                  id:
                    'js-array-filter',

                  topicId:
                    'js-arrays',

                  position:
                    3,
                })
                .mockResolvedValueOnce({
                  id:
                    'js-array-transform',
                }),
          };

        const prisma =
          {
            concept,
          };

        const repository =
          new PrismaLearningProgressRepository(
            prisma as never,
          );

        const result =
          await repository.findConceptGate(
            conceptIdSchema.parse(
              'js-array-filter',
            ),
          );

        expect(
          result,
        ).toEqual({
          conceptId:
            'js-array-filter',

          topicId:
            'js-arrays',

          position:
            3,

          previousConceptId:
            'js-array-transform',
        });

        expect(
          concept.findFirst,
        ).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            where:
              expect.objectContaining({
                topicId:
                  'js-arrays',

                position: {
                  lt:
                    3,
                },
              }),

            orderBy: [
              {
                position:
                  'desc',
              },
              {
                id:
                  'desc',
              },
            ],
          }),
        );
      },
    );

    it(
      'returns null when concept is unpublished or does not exist',
      async () => {
        const prisma =
          {
            concept: {
              findFirst:
                vi.fn()
                  .mockResolvedValue(
                    null,
                  ),
            },
          };

        const repository =
          new PrismaLearningProgressRepository(
            prisma as never,
          );

        const result =
          await repository.findConceptGate(
            conceptIdSchema.parse(
              'js-array-hidden',
            ),
          );

        expect(
          result,
        ).toBe(
          null,
        );
      },
    );
  },
);

describe(
  'PrismaLearningProgressRepository learning levels',
  () => {
    it(
      'searches the previous required practice only inside the requested learning level',
      async () => {
        const exerciseSession = {
          findFirst:
            vi.fn()
              .mockResolvedValue({
                id:
                  'foundation-practice-01',
              }),
        };

        const completedSession = {
          findFirst:
            vi.fn()
              .mockResolvedValue({
                id:
                  'completed-01',
              }),
        };

        const prisma = {
          exerciseSession,
          completedSession,
        };

        const repository =
          new PrismaLearningProgressRepository(
            prisma as never,
          );

        const conceptId =
          conceptIdSchema.parse(
            'js-array-iteration',
          );

        const result =
          await repository
            .getPreviousRequiredPracticeStatusForLevel(
              'user-1',
              conceptId,
              'FOUNDATION',
              4,
            );

        expect(
          result,
        ).toEqual({
          previousSessionId:
            'foundation-practice-01',
          completed:
            true,
        });

        expect(
          exerciseSession.findFirst,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          exerciseSession.findFirst,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            where:
              expect.objectContaining({
                conceptId,
                levelId:
                  'FOUNDATION',
                kind:
                  'PRACTICE',
                requiredForProgression:
                  true,
                position: {
                  lt:
                    4,
                },
              }),
          }),
        );

        expect(
          completedSession.findFirst,
        ).toHaveBeenCalledWith({
          where: {
            userId:
              'user-1',
            sessionId:
              'foundation-practice-01',
          },
          select: {
            id:
              true,
          },
        });
      },
    );

    it(
      'counts required practices only from the requested learning level',
      async () => {
        const exerciseSession = {
          findMany:
            vi.fn()
              .mockResolvedValue([
                {
                  id:
                    'foundation-practice-01',
                },
                {
                  id:
                    'foundation-practice-02',
                },
              ]),
        };

        const completedSession = {
          findMany:
            vi.fn()
              .mockResolvedValue([
                {
                  sessionId:
                    'foundation-practice-01',
                },
              ]),
        };

        const prisma = {
          exerciseSession,
          completedSession,
        };

        const repository =
          new PrismaLearningProgressRepository(
            prisma as never,
          );

        const conceptId =
          conceptIdSchema.parse(
            'js-array-iteration',
          );

        const result =
          await repository
            .getRequiredPracticeCompletionStatusForLevel(
              'user-1',
              conceptId,
              'FOUNDATION',
            );

        expect(
          result,
        ).toEqual({
          requiredSessionCount:
            2,
          completedRequiredSessionCount:
            1,
          allCompleted:
            false,
        });

        expect(
          exerciseSession.findMany,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          exerciseSession.findMany,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            where:
              expect.objectContaining({
                conceptId,
                levelId:
                  'FOUNDATION',
                kind:
                  'PRACTICE',
                requiredForProgression:
                  true,
              }),
          }),
        );

        expect(
          completedSession.findMany,
        ).toHaveBeenCalledWith({
          where: {
            userId:
              'user-1',
            sessionId: {
              in: [
                'foundation-practice-01',
                'foundation-practice-02',
              ],
            },
          },
          select: {
            sessionId:
              true,
          },
        });
      },
    );

    it(
      'completes a learning level checkpoint without completing the aggregate concept',
      async () => {
        const completedAt =
          new Date(
            '2026-09-17T19:00:00.000Z',
          );

        const persistedLevelProgress = {
          id:
            'level-progress-01',
          userId:
            'user-1',
          conceptId:
            'js-array-iteration',
          levelId:
            'FOUNDATION' as const,
          theoryCompletedAt:
            completedAt,
          quizPassedAt:
            completedAt,
          practiceCompletedAt:
            completedAt,
          checkpointCompletedAt:
            completedAt,
          completedAt,
          createdAt:
            completedAt,
          updatedAt:
            completedAt,
        };

        const conceptLearningLevelProgress = {
          upsert:
            vi.fn()
              .mockResolvedValue(
                persistedLevelProgress,
              ),
          updateMany:
            vi.fn()
              .mockResolvedValue({
                count:
                  1,
              }),
          findUniqueOrThrow:
            vi.fn()
              .mockResolvedValue(
                persistedLevelProgress,
              ),
        };

        const conceptLearningProgress = {
          upsert:
            vi.fn(),
          updateMany:
            vi.fn(),
          findUniqueOrThrow:
            vi.fn(),
        };

        type TransactionMock = {
          conceptLearningLevelProgress:
            typeof conceptLearningLevelProgress;
          conceptLearningProgress:
            typeof conceptLearningProgress;
        };

        const transaction:
          TransactionMock = {
            conceptLearningLevelProgress,
            conceptLearningProgress,
          };

        const prisma = {
          conceptLearningLevelProgress,
          conceptLearningProgress,
          $transaction:
            vi.fn(
              async (
                callback:
                  (
                    transaction:
                      TransactionMock,
                  ) =>
                    Promise<unknown>,
              ) =>
                callback(
                  transaction,
                ),
            ),
        };

        const repository =
          new PrismaLearningProgressRepository(
            prisma as never,
          );

        const conceptId =
          conceptIdSchema.parse(
            'js-array-iteration',
          );

        const result =
          await repository
            .markLevelCheckpointCompleted(
              'user-1',
              conceptId,
              'FOUNDATION',
              completedAt,
            );

        expect(
          result.levelId,
        ).toBe(
          'FOUNDATION',
        );

        expect(
          result.completedAt,
        ).toBe(
          completedAt,
        );

        expect(
          conceptLearningLevelProgress
            .upsert,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          conceptLearningLevelProgress
            .updateMany,
        ).toHaveBeenCalledTimes(
          2,
        );

        expect(
          conceptLearningProgress
            .upsert,
        ).not.toHaveBeenCalled();

        expect(
          conceptLearningProgress
            .updateMany,
        ).not.toHaveBeenCalled();

        expect(
          conceptLearningProgress
            .findUniqueOrThrow,
        ).not.toHaveBeenCalled();
      },
    );
  },
);

describe(
  'PrismaLearningProgressRepository legacy repair compatibility',
  () => {
    it(
      'does not project legacy aggregate progress for a multi-level concept',
      async () => {
        const conceptLearningLevel = {
          count:
            vi.fn()
              .mockResolvedValue(
                3,
              ),
        };

        const conceptLearningProgress = {
          findUnique:
            vi.fn(),
        };

        const exerciseSession = {
          findMany:
            vi.fn(),
        };

        const completedSession = {
          findMany:
            vi.fn(),
        };

        type TransactionMock = {
          conceptLearningLevel:
            typeof conceptLearningLevel;
          conceptLearningProgress:
            typeof conceptLearningProgress;
          exerciseSession:
            typeof exerciseSession;
          completedSession:
            typeof completedSession;
        };

        const transaction:
          TransactionMock = {
            conceptLearningLevel,
            conceptLearningProgress,
            exerciseSession,
            completedSession,
          };

        const prisma = {
          $transaction:
            vi.fn(
              async (
                callback:
                  (
                    transaction:
                      TransactionMock,
                  ) =>
                    Promise<unknown>,
              ) =>
                callback(
                  transaction,
                ),
            ),
        };

        const repository =
          new PrismaLearningProgressRepository(
            prisma as never,
          );

        const conceptId =
          conceptIdSchema.parse(
            'js-array-iteration',
          );

        await repository
          .repairFromCompletedSessions(
            'user-1',
            conceptId,
          );

        expect(
          conceptLearningLevel.count,
        ).toHaveBeenCalledWith({
          where: {
            conceptId,
          },
        });

        expect(
          conceptLearningProgress
            .findUnique,
        ).not.toHaveBeenCalled();

        expect(
          exerciseSession.findMany,
        ).not.toHaveBeenCalled();

        expect(
          completedSession.findMany,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'keeps the legacy repair path available for a single-level concept',
      async () => {
        const conceptLearningLevel = {
          count:
            vi.fn()
              .mockResolvedValue(
                1,
              ),
        };

        const conceptLearningProgress = {
          findUnique:
            vi.fn()
              .mockResolvedValue(
                null,
              ),
        };

        type TransactionMock = {
          conceptLearningLevel:
            typeof conceptLearningLevel;
          conceptLearningProgress:
            typeof conceptLearningProgress;
        };

        const transaction:
          TransactionMock = {
            conceptLearningLevel,
            conceptLearningProgress,
          };

        const prisma = {
          $transaction:
            vi.fn(
              async (
                callback:
                  (
                    transaction:
                      TransactionMock,
                  ) =>
                    Promise<unknown>,
              ) =>
                callback(
                  transaction,
                ),
            ),
        };

        const repository =
          new PrismaLearningProgressRepository(
            prisma as never,
          );

        const conceptId =
          conceptIdSchema.parse(
            'js-array-map',
          );

        await repository
          .repairFromCompletedSessions(
            'user-1',
            conceptId,
          );

        expect(
          conceptLearningLevel.count,
        ).toHaveBeenCalledWith({
          where: {
            conceptId,
          },
        });

        expect(
          conceptLearningProgress
            .findUnique,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          conceptLearningProgress
            .findUnique,
        ).toHaveBeenCalledWith({
          where: {
            userId_conceptId: {
              userId:
                'user-1',
              conceptId,
            },
          },
        });
      },
    );
  },
);

describe(
  'PrismaLearningProgressRepository configured learning levels',
  () => {
    it(
      'returns configured levels in pedagogical position order',
      async () => {
        const conceptLearningLevel = {
          findMany:
            vi.fn()
              .mockResolvedValue([
                {
                  conceptId:
                    'js-array-iteration',
                  levelId:
                    'FOUNDATION',
                  name:
                    'Fundamentos',
                  description:
                    'Nivel base',
                  position:
                    0,
                },
                {
                  conceptId:
                    'js-array-iteration',
                  levelId:
                    'DEEPENING',
                  name:
                    'Profundización',
                  description:
                    'Nivel intermedio',
                  position:
                    1,
                },
                {
                  conceptId:
                    'js-array-iteration',
                  levelId:
                    'MASTERY',
                  name:
                    'Dominio',
                  description:
                    'Nivel final',
                  position:
                    2,
                },
              ]),
        };

        const prisma = {
          conceptLearningLevel,
        };

        const repository =
          new PrismaLearningProgressRepository(
            prisma as never,
          );

        const conceptId =
          conceptIdSchema.parse(
            'js-array-iteration',
          );

        const levels =
          await repository
            .getConfiguredLearningLevels(
              conceptId,
            );

        expect(
          levels.map(
            level =>
              level.levelId,
          ),
        ).toEqual([
          'FOUNDATION',
          'DEEPENING',
          'MASTERY',
        ]);

        expect(
          levels.map(
            level =>
              level.position,
          ),
        ).toEqual([
          0,
          1,
          2,
        ]);

        expect(
          conceptLearningLevel.findMany,
        ).toHaveBeenCalledWith({
          where: {
            conceptId,
          },
          orderBy: [
            {
              position:
                'asc',
            },
            {
              levelId:
                'asc',
            },
          ],
          select: {
            conceptId:
              true,
            levelId:
              true,
            name:
              true,
            description:
              true,
            position:
              true,
          },
        });
      },
    );

    it(
      'supports a legacy concept configured with only foundation',
      async () => {
        const conceptLearningLevel = {
          findMany:
            vi.fn()
              .mockResolvedValue([
                {
                  conceptId:
                    'js-variables-basics',
                  levelId:
                    'FOUNDATION',
                  name:
                    'Fundamentos',
                  description:
                    'Nivel base del concepto.',
                  position:
                    0,
                },
              ]),
        };

        const repository =
          new PrismaLearningProgressRepository(
            {
              conceptLearningLevel,
            } as never,
          );

        const levels =
          await repository
            .getConfiguredLearningLevels(
              conceptIdSchema.parse(
                'js-variables-basics',
              ),
            );

        expect(
          levels,
        ).toHaveLength(
          1,
        );

        expect(
          levels[0]?.levelId,
        ).toBe(
          'FOUNDATION',
        );

        expect(
          levels[0]?.position,
        ).toBe(
          0,
        );
      },
    );
  },
);
