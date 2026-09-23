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
  type LearningProgressRepository,
} from '../src/progress/learning-progress-repository.js';

import {
  LearningProgressService,
} from '../src/progress/learning-progress-service.js';

const conceptId =
  conceptIdSchema.parse(
    'js-array-iteration',
  );

const previousConceptId =
  conceptIdSchema.parse(
    'js-array-basics',
  );

const theoryAt =
  new Date(
    '2026-09-17T10:00:00.000Z',
  );

function persistedProgress(
  overrides:
    Record<string, unknown> = {},
) {
  return {
    id:
      'learning-1',

    userId:
      'user-1',

    conceptId,

    theoryCompletedAt:
      theoryAt,

    quizPassedAt:
      null,

    practiceCompletedAt:
      null,

    checkpointCompletedAt:
      null,

    completedAt:
      null,

    createdAt:
      theoryAt,

    updatedAt:
      theoryAt,

    ...overrides,
  };
}

describe(
  'learning projection self-heal',
  () => {
    it(
      'repairs quiz, practices and checkpoint from durable completions without changing theory',
      async () => {
        const updateMany =
          vi.fn()
            .mockResolvedValue({
              count:
                1,
            });

        const transaction = {
          conceptLearningLevel: {
            count:
              vi.fn()
                .mockResolvedValue(
                  1,
                ),
          },

          conceptLearningProgress: {
            findUnique:
              vi.fn()
                .mockResolvedValue(
                  persistedProgress(),
                ),

            updateMany,
          },

          exerciseSession: {
            findMany:
              vi.fn()
                .mockResolvedValue([
                  {
                    id:
                      'quiz-1',

                    kind:
                      'QUIZ',

                    passingPercentage:
                      100,

                    position:
                      0,
                  },

                  {
                    id:
                      'practice-1',

                    kind:
                      'PRACTICE',

                    passingPercentage:
                      null,

                    position:
                      1,
                  },

                  {
                    id:
                      'practice-2',

                    kind:
                      'PRACTICE',

                    passingPercentage:
                      null,

                    position:
                      2,
                  },

                  {
                    id:
                      'checkpoint-1',

                    kind:
                      'CHECKPOINT',

                    passingPercentage:
                      null,

                    position:
                      3,
                  },
                ]),
          },

          completedSession: {
            findMany:
              vi.fn()
                .mockResolvedValue([
                  {
                    sessionId:
                      'quiz-1',

                    totalExercises:
                      5,

                    correctExercises:
                      5,

                    completedAt:
                      new Date(
                        '2026-09-17T10:10:00.000Z',
                      ),
                  },

                  {
                    sessionId:
                      'practice-1',

                    totalExercises:
                      1,

                    correctExercises:
                      1,

                    completedAt:
                      new Date(
                        '2026-09-17T10:20:00.000Z',
                      ),
                  },

                  {
                    sessionId:
                      'practice-2',

                    totalExercises:
                      1,

                    correctExercises:
                      0,

                    completedAt:
                      new Date(
                        '2026-09-17T10:30:00.000Z',
                      ),
                  },

                  {
                    sessionId:
                      'checkpoint-1',

                    totalExercises:
                      4,

                    correctExercises:
                      4,

                    completedAt:
                      new Date(
                        '2026-09-17T10:40:00.000Z',
                      ),
                  },
                ]),
          },
        };

        const prisma = {
          $transaction:
            vi.fn(
              async (
                callback:
                  (
                    tx:
                      typeof transaction,
                  ) => Promise<void>,
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

        await repository
          .repairFromCompletedSessions(
            'user-1',
            conceptId,
          );

        expect(
          updateMany,
        ).toHaveBeenCalledWith({
          where: {
            userId:
              'user-1',

            conceptId,

            quizPassedAt:
              null,
          },

          data: {
            quizPassedAt:
              new Date(
                '2026-09-17T10:10:00.000Z',
              ),
          },
        });

        expect(
          updateMany,
        ).toHaveBeenCalledWith({
          where: {
            userId:
              'user-1',

            conceptId,

            practiceCompletedAt:
              null,
          },

          data: {
            practiceCompletedAt:
              new Date(
                '2026-09-17T10:30:00.000Z',
              ),
          },
        });

        expect(
          updateMany,
        ).toHaveBeenCalledWith({
          where: {
            userId:
              'user-1',

            conceptId,

            checkpointCompletedAt:
              null,
          },

          data: {
            checkpointCompletedAt:
              new Date(
                '2026-09-17T10:40:00.000Z',
              ),
          },
        });

        expect(
          updateMany,
        ).toHaveBeenCalledWith({
          where: {
            userId:
              'user-1',

            conceptId,

            completedAt:
              null,
          },

          data: {
            completedAt:
              new Date(
                '2026-09-17T10:40:00.000Z',
              ),
          },
        });
      },
    );

    it(
      'does not invent theory when no durable theory timestamp exists',
      async () => {
        const transaction = {
          conceptLearningLevel: {
            count:
              vi.fn()
                .mockResolvedValue(
                  1,
                ),
          },

          conceptLearningProgress: {
            findUnique:
              vi.fn()
                .mockResolvedValue(
                  persistedProgress({
                    theoryCompletedAt:
                      null,
                  }),
                ),

            updateMany:
              vi.fn(),
          },

          exerciseSession: {
            findMany:
              vi.fn(),
          },

          completedSession: {
            findMany:
              vi.fn(),
          },
        };

        const prisma = {
          $transaction:
            vi.fn(
              async (
                callback:
                  (
                    tx:
                      typeof transaction,
                  ) => Promise<void>,
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

        await repository
          .repairFromCompletedSessions(
            'user-1',
            conceptId,
          );

        expect(
          transaction
            .exerciseSession
            .findMany,
        ).not.toHaveBeenCalled();

        expect(
          transaction
            .conceptLearningProgress
            .updateMany,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'does not promote a failed quiz',
      async () => {
        const updateMany =
          vi.fn();

        const transaction = {
          conceptLearningLevel: {
            count:
              vi.fn()
                .mockResolvedValue(
                  1,
                ),
          },

          conceptLearningProgress: {
            findUnique:
              vi.fn()
                .mockResolvedValue(
                  persistedProgress(),
                ),

            updateMany,
          },

          exerciseSession: {
            findMany:
              vi.fn()
                .mockResolvedValue([
                  {
                    id:
                      'quiz-1',

                    kind:
                      'QUIZ',

                    passingPercentage:
                      100,

                    position:
                      0,
                  },
                ]),
          },

          completedSession: {
            findMany:
              vi.fn()
                .mockResolvedValue([
                  {
                    sessionId:
                      'quiz-1',

                    totalExercises:
                      5,

                    correctExercises:
                      4,

                    completedAt:
                      new Date(
                        '2026-09-17T10:10:00.000Z',
                      ),
                  },
                ]),
          },
        };

        const prisma = {
          $transaction:
            vi.fn(
              async (
                callback:
                  (
                    tx:
                      typeof transaction,
                  ) => Promise<void>,
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

        await repository
          .repairFromCompletedSessions(
            'user-1',
            conceptId,
          );

        expect(
          updateMany,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'repairs current and previous concept before evaluating the lock',
      async () => {
        const repair =
          vi.fn<
            LearningProgressRepository[
              'repairFromCompletedSessions'
            ]
          >()
            .mockResolvedValue(
              undefined,
            );

        const findBy =
          vi.fn<
            LearningProgressRepository[
              'findByUserAndConceptId'
            ]
          >()
            .mockResolvedValueOnce(
              null,
            )
            .mockResolvedValueOnce({
              id:
                'previous-learning',

              userId:
                'user-1',

              conceptId:
                previousConceptId,

              theoryCompletedAt:
                theoryAt,

              quizPassedAt:
                theoryAt,

              practiceCompletedAt:
                theoryAt,

              checkpointCompletedAt:
                theoryAt,

              completedAt:
                theoryAt,

              createdAt:
                theoryAt,

              updatedAt:
                theoryAt,
            });

        const repository:
          LearningProgressRepository = {
            getConfiguredLearningLevels:
      vi.fn().mockResolvedValue([]),

          getTheorySectionCountForLevel:
            vi.fn(),

          findLevelByUserAndConceptId:
            vi.fn(),

          getPreviousRequiredPracticeStatusForLevel:
            vi.fn(),

          getRequiredPracticeCompletionStatusForLevel:
            vi.fn(),

          completeLevelTheory:
            vi.fn(),

          markLevelQuizPassed:
            vi.fn(),

          markLevelPracticeCompleted:
            vi.fn(),

          markLevelCheckpointCompleted:
            vi.fn(),

          markConceptCompleted:
            vi.fn(),

          repairFromCompletedSessions:
              repair,

            findByUserAndConceptId:
              findBy,

            findConceptGate:
              vi.fn()
                .mockResolvedValue({
                  conceptId,

                  topicId:
                    'js-arrays',

                  position:
                    1,

                  previousConceptId,
                }),

            getPreviousRequiredPracticeStatus:
              vi.fn()
                .mockResolvedValue({
                  previousSessionId:
                    null,

                  completed:
                    true,
                }),

            getRequiredPracticeCompletionStatus:
              vi.fn()
                .mockResolvedValue({
                  requiredSessionCount:
                    1,

                  completedRequiredSessionCount:
                    0,

                  allCompleted:
                    false,
                }),

            completeTheory:
              vi.fn(),

            markQuizPassed:
              vi.fn(),

            markPracticeCompleted:
              vi.fn(),

            markCheckpointAndConceptCompleted:
              vi.fn(),
          };

        const service =
          new LearningProgressService(
            repository,
          );

        const state =
          await service.getState(
            'user-1',
            conceptId,
          );

        expect(
          repair,
        ).toHaveBeenNthCalledWith(
          1,
          'user-1',
          conceptId,
        );

        expect(
          repair,
        ).toHaveBeenNthCalledWith(
          2,
          'user-1',
          previousConceptId,
        );

        expect(
          state.locked,
        ).toBe(
          false,
        );
      },
    );
  },
);
