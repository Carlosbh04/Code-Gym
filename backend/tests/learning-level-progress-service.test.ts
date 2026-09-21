import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  conceptIdSchema,
} from '../src/content/content-id.js';

import type {
  LearningLevelProgressRecord,
  LearningProgressRecord,
} from '../src/progress/learning-progress-repository.js';

import {
  LearningLevelTheoryUnavailableError,
  LearningProgressService,
} from '../src/progress/learning-progress-service.js';

const conceptId =
  conceptIdSchema.parse(
    'js-array-iteration',
  );

const completedAt =
  new Date(
    '2026-09-17T20:00:00.000Z',
  );

function aggregateRecord(
  completed:
    Date | null = null,
): LearningProgressRecord {
  return {
    id:
      'aggregate-1',
    userId:
      'user-1',
    conceptId,
    theoryCompletedAt:
      null,
    quizPassedAt:
      null,
    practiceCompletedAt:
      null,
    checkpointCompletedAt:
      null,
    completedAt:
      completed,
    createdAt:
      completedAt,
    updatedAt:
      completedAt,
  };
}

function levelRecord(
  levelId:
    'FOUNDATION'
    | 'DEEPENING'
    | 'MASTERY',
  overrides:
    Partial<LearningLevelProgressRecord>
    = {},
): LearningLevelProgressRecord {
  return {
    id:
      `level-${levelId}`,
    userId:
      'user-1',
    conceptId,
    levelId,
    theoryCompletedAt:
      null,
    quizPassedAt:
      null,
    practiceCompletedAt:
      null,
    checkpointCompletedAt:
      null,
    completedAt:
      null,
    createdAt:
      completedAt,
    updatedAt:
      completedAt,
    ...overrides,
  };
}

const configuredLevels = [
  {
    conceptId,
    levelId:
      'FOUNDATION' as const,
    name:
      'Fundamentos',
    description:
      'Nivel base',
    position:
      0,
  },
  {
    conceptId,
    levelId:
      'DEEPENING' as const,
    name:
      'Profundización',
    description:
      'Nivel intermedio',
    position:
      1,
  },
  {
    conceptId,
    levelId:
      'MASTERY' as const,
    name:
      'Dominio',
    description:
      'Nivel final',
    position:
      2,
  },
] as const;

function baseRepository() {
  return {
    findConceptGate:
      vi.fn()
        .mockResolvedValue({
          conceptId,
          topicId:
            'js-arrays',
          position:
            0,
          previousConceptId:
            null,
        }),

    repairFromCompletedSessions:
      vi.fn()
        .mockResolvedValue(
          undefined,
        ),

    findByUserAndConceptId:
      vi.fn()
        .mockResolvedValue(
          aggregateRecord(),
        ),

    getConfiguredLearningLevels:
      vi.fn()
        .mockResolvedValue(
          configuredLevels,
        ),

    getTheorySectionCountForLevel:
      vi.fn()
        .mockResolvedValue(
          1,
        ),

    findLevelByUserAndConceptId:
      vi.fn()
        .mockResolvedValue(
          null,
        ),

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

    getPreviousRequiredPracticeStatusForLevel:
      vi.fn(),

    getRequiredPracticeCompletionStatusForLevel:
      vi.fn(),
  };
}

describe(
  'LearningProgressService learning levels',
  () => {
    it(
      'makes foundation theory available when the concept itself is unlocked',
      async () => {
        const repository =
          baseRepository();

        const service =
          new LearningProgressService(
            repository as never,
          );

        const state =
          await service.getLevelState(
            'user-1',
            conceptId,
            'FOUNDATION',
          );

        expect(
          state,
        ).toMatchObject({
          levelId:
            'FOUNDATION',
          previousLevelId:
            null,
          nextLevelId:
            'DEEPENING',
          locked:
            false,
          lockReason:
            null,
          stages: {
            theory: {
              status:
                'available',
            },
            quiz: {
              status:
                'locked',
            },
          },
          completed:
            false,
        });
      },
    );

    it(
      'locks deepening while foundation is incomplete',
      async () => {
        const repository =
          baseRepository();

        repository
          .findLevelByUserAndConceptId
          .mockImplementation(
            (
              _userId:
                string,
              _conceptId:
                string,
              levelId:
                string,
            ) => Promise.resolve(
              levelId === 'FOUNDATION'
                ? levelRecord(
                    'FOUNDATION',
                  )
                : null),
          );

        const service =
          new LearningProgressService(
            repository as never,
          );

        const state =
          await service.getLevelState(
            'user-1',
            conceptId,
            'DEEPENING',
          );

        expect(
          state,
        ).toMatchObject({
          levelId:
            'DEEPENING',
          previousLevelId:
            'FOUNDATION',
          nextLevelId:
            'MASTERY',
          locked:
            true,
          lockReason:
            'previous-level-incomplete',
          stages: {
            theory: {
              status:
                'locked',
            },
          },
        });
      },
    );

    it(
      'completes foundation checkpoint without completing the aggregate concept',
      async () => {
        const repository =
          baseRepository();

        const beforeCheckpoint =
          levelRecord(
            'FOUNDATION',
            {
              theoryCompletedAt:
                completedAt,
              quizPassedAt:
                completedAt,
              practiceCompletedAt:
                completedAt,
            },
          );

        const afterCheckpoint =
          levelRecord(
            'FOUNDATION',
            {
              theoryCompletedAt:
                completedAt,
              quizPassedAt:
                completedAt,
              practiceCompletedAt:
                completedAt,
              checkpointCompletedAt:
                completedAt,
              completedAt,
            },
          );

        repository
          .findLevelByUserAndConceptId
          .mockResolvedValue(
            beforeCheckpoint,
          );

        repository
          .markLevelCheckpointCompleted
          .mockResolvedValue(
            afterCheckpoint,
          );

        const service =
          new LearningProgressService(
            repository as never,
          );

        const state =
          await service
            .markLevelCheckpointCompleted(
              'user-1',
              conceptId,
              'FOUNDATION',
              completedAt,
            );

        expect(
          state.completed,
        ).toBe(
          true,
        );

        expect(
          state.nextLevelId,
        ).toBe(
          'DEEPENING',
        );

        expect(
          repository
            .markConceptCompleted,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'completes the aggregate concept when the final configured level checkpoint completes',
      async () => {
        const repository =
          baseRepository();

        repository
          .findLevelByUserAndConceptId
          .mockImplementation(
            (
              _userId:
                string,
              _conceptId:
                string,
              levelId:
                string,
            ) => Promise.resolve().then(() => {
              if (
                levelId === 'DEEPENING'
              ) {
                return levelRecord(
                  'DEEPENING',
                  {
                    completedAt,
                    checkpointCompletedAt:
                      completedAt,
                  },
                );
              }

              if (
                levelId === 'MASTERY'
              ) {
                return levelRecord(
                  'MASTERY',
                  {
                    theoryCompletedAt:
                      completedAt,
                    quizPassedAt:
                      completedAt,
                    practiceCompletedAt:
                      completedAt,
                  },
                );
              }

              return null;
            }),
          );

        repository
          .markLevelCheckpointCompleted
          .mockResolvedValue(
            levelRecord(
              'MASTERY',
              {
                theoryCompletedAt:
                  completedAt,
                quizPassedAt:
                  completedAt,
                practiceCompletedAt:
                  completedAt,
                checkpointCompletedAt:
                  completedAt,
                completedAt,
              },
            ),
          );

        repository
          .markConceptCompleted
          .mockResolvedValue(
            aggregateRecord(
              completedAt,
            ),
          );

        const service =
          new LearningProgressService(
            repository as never,
          );

        const state =
          await service
            .markLevelCheckpointCompleted(
              'user-1',
              conceptId,
              'MASTERY',
              completedAt,
            );

        expect(
          state.nextLevelId,
        ).toBe(
          null,
        );

        expect(
          repository
            .markConceptCompleted,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          repository
            .markConceptCompleted,
        ).toHaveBeenCalledWith(
          'user-1',
          conceptId,
          completedAt,
        );
      },
    );
  },
);

describe(
  'LearningProgressService level theory availability',
  () => {
    it(
      'completes foundation theory when the level has theory content',
      async () => {
        const repository =
          baseRepository();

        const persisted =
          levelRecord(
            'FOUNDATION',
            {
              theoryCompletedAt:
                completedAt,
            },
          );

        repository
          .completeLevelTheory
          .mockResolvedValue(
            persisted,
          );

        const service =
          new LearningProgressService(
            repository as never,
            () => completedAt,
          );

        const state =
          await service
            .completeLevelTheory(
              'user-1',
              conceptId,
              'FOUNDATION',
            );

        expect(
          repository
            .getTheorySectionCountForLevel,
        ).toHaveBeenCalledWith(
          conceptId,
          'FOUNDATION',
        );

        expect(
          repository
            .completeLevelTheory,
        ).toHaveBeenCalledWith(
          'user-1',
          conceptId,
          'FOUNDATION',
          completedAt,
        );

        expect(
          state.stages.theory.status,
        ).toBe(
          'completed',
        );
      },
    );

    it(
      'rejects theory completion when an unlocked level has no theory content',
      async () => {
        const repository =
          baseRepository();

        repository
          .findLevelByUserAndConceptId
          .mockImplementation(
            (
              _userId:
                string,
              _conceptId:
                string,
              requestedLevelId:
                string,
            ) => Promise.resolve(
              requestedLevelId
              === 'FOUNDATION'
                ? levelRecord(
                    'FOUNDATION',
                    {
                      completedAt,
                      checkpointCompletedAt:
                        completedAt,
                    },
                  )
                : null),
          );

        repository
          .getTheorySectionCountForLevel
          .mockResolvedValue(
            0,
          );

        const service =
          new LearningProgressService(
            repository as never,
            () => completedAt,
          );

        await expect(
          service.completeLevelTheory(
            'user-1',
            conceptId,
            'DEEPENING',
          ),
        ).rejects.toBeInstanceOf(
          LearningLevelTheoryUnavailableError,
        );

        expect(
          repository
            .getTheorySectionCountForLevel,
        ).toHaveBeenCalledWith(
          conceptId,
          'DEEPENING',
        );

        expect(
          repository
            .completeLevelTheory,
        ).not.toHaveBeenCalled();
      },
    );
  },
);

describe(
  'LearningProgressService level training reconciliation',
  () => {
    it(
      'does not pass a failed level quiz',
      async () => {
        const repository =
          baseRepository();

        repository
          .findLevelByUserAndConceptId
          .mockResolvedValue(
            levelRecord(
              'FOUNDATION',
              {
                theoryCompletedAt:
                  completedAt,
              },
            ),
          );

        const service =
          new LearningProgressService(
            repository as never,
          );

        const state =
          await service
            .reconcileTrainingCompletionForLevel(
              'user-1',
              {
                conceptId,
                levelId:
                  'FOUNDATION',
                kind:
                  'QUIZ',
                passingPercentage:
                  100,
                requiredForProgression:
                  true,
                totalExercises:
                  5,
                correctExercises:
                  4,
                completedAt,
              },
            );

        expect(
          repository
            .markLevelQuizPassed,
        ).not.toHaveBeenCalled();

        expect(
          state.stages.quiz.status,
        ).toBe(
          'available',
        );
      },
    );

    it(
      'auto-completes practice stage when a passed level quiz has no required practices',
      async () => {
        const repository =
          baseRepository();

        const theoryRecord =
          levelRecord(
            'FOUNDATION',
            {
              theoryCompletedAt:
                completedAt,
            },
          );

        const quizRecord =
          levelRecord(
            'FOUNDATION',
            {
              theoryCompletedAt:
                completedAt,
              quizPassedAt:
                completedAt,
            },
          );

        const practiceRecord =
          levelRecord(
            'FOUNDATION',
            {
              theoryCompletedAt:
                completedAt,
              quizPassedAt:
                completedAt,
              practiceCompletedAt:
                completedAt,
            },
          );

        repository
          .findLevelByUserAndConceptId
          .mockResolvedValueOnce(
            theoryRecord,
          )
          .mockResolvedValueOnce(
            quizRecord,
          );

        repository
          .markLevelQuizPassed
          .mockResolvedValue(
            quizRecord,
          );

        repository
          .getRequiredPracticeCompletionStatusForLevel
          .mockResolvedValue({
            requiredSessionCount:
              0,
            completedRequiredSessionCount:
              0,
            allCompleted:
              true,
          });

        repository
          .markLevelPracticeCompleted
          .mockResolvedValue(
            practiceRecord,
          );

        const service =
          new LearningProgressService(
            repository as never,
          );

        const state =
          await service
            .reconcileTrainingCompletionForLevel(
              'user-1',
              {
                conceptId,
                levelId:
                  'FOUNDATION',
                kind:
                  'QUIZ',
                passingPercentage:
                  100,
                requiredForProgression:
                  true,
                totalExercises:
                  5,
                correctExercises:
                  5,
                completedAt,
              },
            );

        expect(
          repository
            .markLevelQuizPassed,
        ).toHaveBeenCalledWith(
          'user-1',
          conceptId,
          'FOUNDATION',
          completedAt,
        );

        expect(
          repository
            .getRequiredPracticeCompletionStatusForLevel,
        ).toHaveBeenCalledWith(
          'user-1',
          conceptId,
          'FOUNDATION',
        );

        expect(
          repository
            .markLevelPracticeCompleted,
        ).toHaveBeenCalledWith(
          'user-1',
          conceptId,
          'FOUNDATION',
          completedAt,
        );

        expect(
          state.stages.practice.status,
        ).toBe(
          'completed',
        );
      },
    );

    it(
      'reconciles a foundation checkpoint without completing the aggregate concept',
      async () => {
        const repository =
          baseRepository();

        const beforeCheckpoint =
          levelRecord(
            'FOUNDATION',
            {
              theoryCompletedAt:
                completedAt,
              quizPassedAt:
                completedAt,
              practiceCompletedAt:
                completedAt,
            },
          );

        const completedLevel =
          levelRecord(
            'FOUNDATION',
            {
              theoryCompletedAt:
                completedAt,
              quizPassedAt:
                completedAt,
              practiceCompletedAt:
                completedAt,
              checkpointCompletedAt:
                completedAt,
              completedAt,
            },
          );

        repository
          .findLevelByUserAndConceptId
          .mockResolvedValue(
            beforeCheckpoint,
          );

        repository
          .markLevelCheckpointCompleted
          .mockResolvedValue(
            completedLevel,
          );

        const service =
          new LearningProgressService(
            repository as never,
          );

        const state =
          await service
            .reconcileTrainingCompletionForLevel(
              'user-1',
              {
                conceptId,
                levelId:
                  'FOUNDATION',
                kind:
                  'CHECKPOINT',
                passingPercentage:
                  null,
                requiredForProgression:
                  true,
                totalExercises:
                  4,
                correctExercises:
                  4,
                completedAt,
              },
            );

        expect(
          repository
            .markLevelCheckpointCompleted,
        ).toHaveBeenCalledWith(
          'user-1',
          conceptId,
          'FOUNDATION',
          completedAt,
        );

        expect(
          repository
            .markConceptCompleted,
        ).not.toHaveBeenCalled();

        expect(
          state.completed,
        ).toBe(
          true,
        );

        expect(
          state.nextLevelId,
        ).toBe(
          'DEEPENING',
        );
      },
    );

    it(
      'reconciles final mastery checkpoint and completes the aggregate concept',
      async () => {
        const repository =
          baseRepository();

        repository
          .findLevelByUserAndConceptId
          .mockImplementation(
            (
              _userId:
                string,
              _conceptId:
                string,
              levelId:
                string,
            ) => Promise.resolve().then(() => {
              if (
                levelId === 'DEEPENING'
              ) {
                return levelRecord(
                  'DEEPENING',
                  {
                    completedAt,
                    checkpointCompletedAt:
                      completedAt,
                  },
                );
              }

              if (
                levelId === 'MASTERY'
              ) {
                return levelRecord(
                  'MASTERY',
                  {
                    theoryCompletedAt:
                      completedAt,
                    quizPassedAt:
                      completedAt,
                    practiceCompletedAt:
                      completedAt,
                  },
                );
              }

              return null;
            }),
          );

        repository
          .markLevelCheckpointCompleted
          .mockResolvedValue(
            levelRecord(
              'MASTERY',
              {
                theoryCompletedAt:
                  completedAt,
                quizPassedAt:
                  completedAt,
                practiceCompletedAt:
                  completedAt,
                checkpointCompletedAt:
                  completedAt,
                completedAt,
              },
            ),
          );

        repository
          .markConceptCompleted
          .mockResolvedValue(
            aggregateRecord(
              completedAt,
            ),
          );

        const service =
          new LearningProgressService(
            repository as never,
          );

        const state =
          await service
            .reconcileTrainingCompletionForLevel(
              'user-1',
              {
                conceptId,
                levelId:
                  'MASTERY',
                kind:
                  'CHECKPOINT',
                passingPercentage:
                  null,
                requiredForProgression:
                  true,
                totalExercises:
                  4,
                correctExercises:
                  4,
                completedAt,
              },
            );

        expect(
          repository
            .markConceptCompleted,
        ).toHaveBeenCalledWith(
          'user-1',
          conceptId,
          completedAt,
        );

        expect(
          state.completed,
        ).toBe(
          true,
        );

        expect(
          state.nextLevelId,
        ).toBe(
          null,
        );
      },
    );
  },
);

describe(
  'LearningProgressService complete three-level journey',
  () => {
    it(
      'enforces Foundation -> Deepening -> Mastery and completes the concept only after the final checkpoint',
      async () => {
        type LevelId =
          | 'FOUNDATION'
          | 'DEEPENING'
          | 'MASTERY';

        const repository =
          baseRepository();

        let aggregate =
          aggregateRecord();

        const levels =
          new Map<
            LevelId,
            LearningLevelProgressRecord
          >();

        const completedPractices =
          new Map<
            LevelId,
            number
          >([
            [
              'FOUNDATION',
              0,
            ],
            [
              'DEEPENING',
              0,
            ],
            [
              'MASTERY',
              0,
            ],
          ]);

        repository
          .findByUserAndConceptId
          .mockImplementation(
            () => Promise.resolve(
              aggregate),
          );

        repository
          .findLevelByUserAndConceptId
          .mockImplementation(
            (
              _userId:
                string,
              _conceptId:
                string,
              levelId:
                string,
            ) => Promise.resolve(
              levels.get(
                levelId as LevelId,
              )
              ?? null),
          );

        repository
          .getTheorySectionCountForLevel
          .mockResolvedValue(
            18,
          );

        repository
          .completeLevelTheory
          .mockImplementation(
            (
              _userId:
                string,
              _conceptId:
                string,
              levelId:
                string,
              at:
                Date,
            ) => Promise.resolve().then(() => {
              const typedLevel =
                levelId as LevelId;

              const current =
                levels.get(
                  typedLevel,
                )
                ?? levelRecord(
                  typedLevel,
                );

              const next = {
                ...current,

                theoryCompletedAt:
                  at,

                updatedAt:
                  at,
              };

              levels.set(
                typedLevel,
                next,
              );

              return next;
            }),
          );

        repository
          .markLevelQuizPassed
          .mockImplementation(
            (
              _userId:
                string,
              _conceptId:
                string,
              levelId:
                string,
              at:
                Date,
            ) => Promise.resolve().then(() => {
              const typedLevel =
                levelId as LevelId;

              const current =
                levels.get(
                  typedLevel,
                );

              if (
                current === undefined
              ) {
                throw new Error(
                  `Missing level ${typedLevel}`,
                );
              }

              const next = {
                ...current,

                quizPassedAt:
                  at,

                updatedAt:
                  at,
              };

              levels.set(
                typedLevel,
                next,
              );

              return next;
            }),
          );

        repository
          .getRequiredPracticeCompletionStatusForLevel
          .mockImplementation(
            (
              _userId:
                string,
              _conceptId:
                string,
              levelId:
                string,
            ) => Promise.resolve().then(() => {
              const completed =
                completedPractices.get(
                  levelId as LevelId,
                )
                ?? 0;

              return {
                requiredSessionCount:
                  4,

                completedRequiredSessionCount:
                  completed,

                allCompleted:
                  completed === 4,
              };
            }),
          );

        repository
          .markLevelPracticeCompleted
          .mockImplementation(
            (
              _userId:
                string,
              _conceptId:
                string,
              levelId:
                string,
              at:
                Date,
            ) => Promise.resolve().then(() => {
              const typedLevel =
                levelId as LevelId;

              const current =
                levels.get(
                  typedLevel,
                );

              if (
                current === undefined
              ) {
                throw new Error(
                  `Missing level ${typedLevel}`,
                );
              }

              const next = {
                ...current,

                practiceCompletedAt:
                  at,

                updatedAt:
                  at,
              };

              levels.set(
                typedLevel,
                next,
              );

              return next;
            }),
          );

        repository
          .markLevelCheckpointCompleted
          .mockImplementation(
            (
              _userId:
                string,
              _conceptId:
                string,
              levelId:
                string,
              at:
                Date,
            ) => Promise.resolve().then(() => {
              const typedLevel =
                levelId as LevelId;

              const current =
                levels.get(
                  typedLevel,
                );

              if (
                current === undefined
              ) {
                throw new Error(
                  `Missing level ${typedLevel}`,
                );
              }

              const next = {
                ...current,

                checkpointCompletedAt:
                  at,

                completedAt:
                  at,

                updatedAt:
                  at,
              };

              levels.set(
                typedLevel,
                next,
              );

              return next;
            }),
          );

        repository
          .markConceptCompleted
          .mockImplementation(
            (
              _userId:
                string,
              _conceptId:
                string,
              at:
                Date,
            ) => Promise.resolve().then(() => {
              aggregate =
                aggregateRecord(
                  at,
                );

              return aggregate;
            }),
          );

        const service =
          new LearningProgressService(
            repository as never,
            () =>
              completedAt,
          );

        const assertConceptIncomplete =
          () => {
            expect(
              aggregate.completedAt,
            ).toBeNull();
          };

        const passQuiz =
          async (
            levelId:
              LevelId,
          ) => {
            const state =
              await service
                .reconcileTrainingCompletionForLevel(
                  'user-1',
                  {
                    conceptId,
                    levelId,
                    kind:
                      'QUIZ',
                    passingPercentage:
                      100,
                    requiredForProgression:
                      true,
                    totalExercises:
                      5,
                    correctExercises:
                      5,
                    completedAt,
                  },
                );

            expect(
              state.stages.quiz.status,
            ).toBe(
              'completed',
            );

            expect(
              state.stages.practice.status,
            ).toBe(
              'available',
            );
          };

        const completeFourPractices =
          async (
            levelId:
              LevelId,
          ) => {
            for (
              let index = 1;
              index <= 4;
              index += 1
            ) {
              completedPractices.set(
                levelId,
                index,
              );

              const state =
                await service
                  .reconcileTrainingCompletionForLevel(
                    'user-1',
                    {
                      conceptId,
                      levelId,
                      kind:
                        'PRACTICE',
                      passingPercentage:
                        null,
                      requiredForProgression:
                        true,
                      totalExercises:
                        4,
                      correctExercises:
                        4,
                      completedAt,
                    },
                  );

              if (
                index < 4
              ) {
                expect(
                  state.stages.practice.status,
                ).toBe(
                  'available',
                );

                expect(
                  state.stages.checkpoint.status,
                ).toBe(
                  'locked',
                );
              } else {
                expect(
                  state.stages.practice.status,
                ).toBe(
                  'completed',
                );

                expect(
                  state.stages.checkpoint.status,
                ).toBe(
                  'available',
                );
              }
            }
          };

        const passCheckpoint =
          async (
            levelId:
              LevelId,
            totalExercises:
              number,
          ) =>
            service
              .reconcileTrainingCompletionForLevel(
                'user-1',
                {
                  conceptId,
                  levelId,
                  kind:
                    'CHECKPOINT',
                  passingPercentage:
                    null,
                  requiredForProgression:
                    true,
                  totalExercises,
                  correctExercises:
                    totalExercises,
                  completedAt,
                },
              );

        /*
         * INITIAL STATE
         *
         * Foundation open.
         * Deepening locked.
         * Mastery locked.
         */
        const initialFoundation =
          await service.getLevelState(
            'user-1',
            conceptId,
            'FOUNDATION',
          );

        expect(
          initialFoundation.locked,
        ).toBe(
          false,
        );

        expect(
          initialFoundation.stages.theory.status,
        ).toBe(
          'available',
        );

        const initialDeepening =
          await service.getLevelState(
            'user-1',
            conceptId,
            'DEEPENING',
          );

        expect(
          initialDeepening,
        ).toMatchObject({
          locked:
            true,

          lockReason:
            'previous-level-incomplete',

          previousLevelId:
            'FOUNDATION',

          nextLevelId:
            'MASTERY',
        });

        const initialMastery =
          await service.getLevelState(
            'user-1',
            conceptId,
            'MASTERY',
          );

        expect(
          initialMastery.locked,
        ).toBe(
          true,
        );

        /*
         * BYPASS PROTECTION:
         * Deepening theory cannot be completed yet.
         */
        await expect(
          service.completeLevelTheory(
            'user-1',
            conceptId,
            'DEEPENING',
          ),
        ).rejects.toMatchObject({
          name:
            'LearningLevelLockedError',
        });

        assertConceptIncomplete();

        /*
         * FOUNDATION — THEORY
         */
        const foundationTheory =
          await service.completeLevelTheory(
            'user-1',
            conceptId,
            'FOUNDATION',
          );

        expect(
          foundationTheory.stages.theory.status,
        ).toBe(
          'completed',
        );

        expect(
          foundationTheory.stages.quiz.status,
        ).toBe(
          'available',
        );

        /*
         * FOUNDATION — FAILED QUIZ
         * Must not unlock practices.
         */
        const failedFoundationQuiz =
          await service
            .reconcileTrainingCompletionForLevel(
              'user-1',
              {
                conceptId,
                levelId:
                  'FOUNDATION',
                kind:
                  'QUIZ',
                passingPercentage:
                  100,
                requiredForProgression:
                  true,
                totalExercises:
                  5,
                correctExercises:
                  4,
                completedAt,
              },
            );

        expect(
          failedFoundationQuiz.stages.quiz.status,
        ).toBe(
          'available',
        );

        expect(
          failedFoundationQuiz.stages.practice.status,
        ).toBe(
          'locked',
        );

        expect(
          repository
            .markLevelQuizPassed,
        ).not.toHaveBeenCalled();

        /*
         * FOUNDATION — QUIZ + 4 PRACTICES
         */
        await passQuiz(
          'FOUNDATION',
        );

        await completeFourPractices(
          'FOUNDATION',
        );

        /*
         * FOUNDATION — FAILED CHECKPOINT
         * Must not unlock Deepening.
         */
        const failedFoundationCheckpoint =
          await service
            .reconcileTrainingCompletionForLevel(
              'user-1',
              {
                conceptId,
                levelId:
                  'FOUNDATION',
                kind:
                  'CHECKPOINT',
                passingPercentage:
                  null,
                requiredForProgression:
                  true,
                totalExercises:
                  4,
                correctExercises:
                  3,
                completedAt,
              },
            );

        expect(
          failedFoundationCheckpoint.completed,
        ).toBe(
          false,
        );

        assertConceptIncomplete();

        expect(
          (
            await service.getLevelState(
              'user-1',
              conceptId,
              'DEEPENING',
            )
          ).locked,
        ).toBe(
          true,
        );

        /*
         * FOUNDATION — PASS CHECKPOINT
         */
        const completedFoundation =
          await passCheckpoint(
            'FOUNDATION',
            4,
          );

        expect(
          completedFoundation.completed,
        ).toBe(
          true,
        );

        expect(
          completedFoundation.nextLevelId,
        ).toBe(
          'DEEPENING',
        );

        expect(
          repository
            .markConceptCompleted,
        ).not.toHaveBeenCalled();

        assertConceptIncomplete();

        const deepeningUnlocked =
          await service.getLevelState(
            'user-1',
            conceptId,
            'DEEPENING',
          );

        expect(
          deepeningUnlocked.locked,
        ).toBe(
          false,
        );

        expect(
          deepeningUnlocked.stages.theory.status,
        ).toBe(
          'available',
        );

        /*
         * Mastery must still be locked.
         */
        await expect(
          service.completeLevelTheory(
            'user-1',
            conceptId,
            'MASTERY',
          ),
        ).rejects.toMatchObject({
          name:
            'LearningLevelLockedError',
        });

        /*
         * DEEPENING — FULL FLOW
         */
        await service.completeLevelTheory(
          'user-1',
          conceptId,
          'DEEPENING',
        );

        await passQuiz(
          'DEEPENING',
        );

        await completeFourPractices(
          'DEEPENING',
        );

        const completedDeepening =
          await passCheckpoint(
            'DEEPENING',
            4,
          );

        expect(
          completedDeepening.completed,
        ).toBe(
          true,
        );

        expect(
          completedDeepening.nextLevelId,
        ).toBe(
          'MASTERY',
        );

        /*
         * Deepening checkpoint MUST NOT complete concept.
         */
        expect(
          repository
            .markConceptCompleted,
        ).not.toHaveBeenCalled();

        assertConceptIncomplete();

        const masteryUnlocked =
          await service.getLevelState(
            'user-1',
            conceptId,
            'MASTERY',
          );

        expect(
          masteryUnlocked.locked,
        ).toBe(
          false,
        );

        expect(
          masteryUnlocked.stages.theory.status,
        ).toBe(
          'available',
        );

        /*
         * MASTERY — FULL FLOW
         */
        await service.completeLevelTheory(
          'user-1',
          conceptId,
          'MASTERY',
        );

        await passQuiz(
          'MASTERY',
        );

        await completeFourPractices(
          'MASTERY',
        );

        /*
         * Concept still incomplete BEFORE final checkpoint.
         */
        assertConceptIncomplete();

        expect(
          repository
            .markConceptCompleted,
        ).not.toHaveBeenCalled();

        /*
         * MASTERY — FAILED CHECKPOINT
         * Real Mastery checkpoint has five exercises.
         */
        const failedMasteryCheckpoint =
          await service
            .reconcileTrainingCompletionForLevel(
              'user-1',
              {
                conceptId,
                levelId:
                  'MASTERY',
                kind:
                  'CHECKPOINT',
                passingPercentage:
                  null,
                requiredForProgression:
                  true,
                totalExercises:
                  5,
                correctExercises:
                  4,
                completedAt,
              },
            );

        expect(
          failedMasteryCheckpoint.completed,
        ).toBe(
          false,
        );

        assertConceptIncomplete();

        /*
         * FINAL MASTERY CHECKPOINT
         */
        const completedMastery =
          await passCheckpoint(
            'MASTERY',
            5,
          );

        expect(
          completedMastery.completed,
        ).toBe(
          true,
        );

        expect(
          completedMastery.nextLevelId,
        ).toBeNull();

        expect(
          repository
            .markConceptCompleted,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          repository
            .markConceptCompleted,
        ).toHaveBeenCalledWith(
          'user-1',
          conceptId,
          completedAt,
        );

        expect(
          aggregate.completedAt,
        ).toEqual(
          completedAt,
        );

        const finalConcept =
          await service.getState(
            'user-1',
            conceptId,
          );

        expect(
          finalConcept.completed,
        ).toBe(
          true,
        );

        /*
         * Final state of all three levels.
         */
        for (
          const levelId
          of [
            'FOUNDATION',
            'DEEPENING',
            'MASTERY',
          ] as const
        ) {
          const state =
            await service.getLevelState(
              'user-1',
              conceptId,
              levelId,
            );

          expect(
            state.completed,
          ).toBe(
            true,
          );

          expect(
            state.stages.theory.status,
          ).toBe(
            'completed',
          );

          expect(
            state.stages.quiz.status,
          ).toBe(
            'completed',
          );

          expect(
            state.stages.practice.status,
          ).toBe(
            'completed',
          );

          expect(
            state.stages.checkpoint.status,
          ).toBe(
            'completed',
          );
        }
      },
    );
  },
);
