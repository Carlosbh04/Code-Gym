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
  ConceptGateRecord,
  LearningLevelProgressRecord,
  LearningProgressRecord,
  LearningProgressRepository,
} from '../src/progress/learning-progress-repository.js';

import {
  LearningConceptLockedError,
  LearningConceptNotFoundError,
  LearningProgressService,
  LearningStageLockedError,
} from '../src/progress/learning-progress-service.js';

const firstConceptId =
  conceptIdSchema.parse(
    'js-array-basics',
  );

const secondConceptId =
  conceptIdSchema.parse(
    'js-array-transform',
  );

const thirdConceptId =
  conceptIdSchema.parse(
    'js-array-filter',
  );

const firstTimestamp =
  new Date(
    '2026-09-17T10:00:00.000Z',
  );

const secondTimestamp =
  new Date(
    '2026-09-17T11:00:00.000Z',
  );

function createRecord(
  conceptId =
    firstConceptId,

  overrides:
    Partial<LearningProgressRecord>
    = {},
): LearningProgressRecord {
  return {
    id:
      `learning-${conceptId}`,

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
      null,

    createdAt:
      firstTimestamp,

    updatedAt:
      firstTimestamp,

    ...overrides,
  };
}

function createLevelRecord(
  conceptId:
    typeof firstConceptId,
  levelId:
    LearningLevelProgressRecord['levelId'],
  completedAt:
    Date | null,
): LearningLevelProgressRecord {
  return {
    id:
      `learning-${conceptId}-${levelId}`,
    userId:
      'user-1',
    conceptId,
    levelId,
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
      firstTimestamp,
    updatedAt:
      firstTimestamp,
  };
}

const canonicalLevels = [
  {
    conceptId:
      firstConceptId,
    levelId:
      'FOUNDATION' as const,
    name:
      'Foundation',
    description:
      'Base',
    position:
      0,
  },
  {
    conceptId:
      firstConceptId,
    levelId:
      'DEEPENING' as const,
    name:
      'Deepening',
    description:
      'Profundización',
    position:
      1,
  },
  {
    conceptId:
      firstConceptId,
    levelId:
      'MASTERY' as const,
    name:
      'Mastery',
    description:
      'Dominio',
    position:
      2,
  },
] as const;

function gate(
  conceptId:
    typeof firstConceptId,

  position:
    number,

  previousConceptId:
    typeof firstConceptId
    | null,
): ConceptGateRecord {
  return {
    conceptId,

    topicId:
      'js-arrays',

    position,

    previousConceptId,
  };
}

function createRepository(
  overrides:
    Partial<LearningProgressRepository>
    = {},
): LearningProgressRepository {
  return {
    getConfiguredLearningLevels:
      vi.fn<
        LearningProgressRepository[
          'getConfiguredLearningLevels'
        ]
      >()
        .mockResolvedValue([]),

    getTheorySectionCountForLevel:
      vi.fn<
        LearningProgressRepository[
          'getTheorySectionCountForLevel'
        ]
      >(),

    findLevelByUserAndConceptId:
      vi.fn<
        LearningProgressRepository[
          'findLevelByUserAndConceptId'
        ]
      >(),

    getPreviousRequiredPracticeStatusForLevel:
      vi.fn<
        LearningProgressRepository[
          'getPreviousRequiredPracticeStatusForLevel'
        ]
      >(),

    getRequiredPracticeCompletionStatusForLevel:
      vi.fn<
        LearningProgressRepository[
          'getRequiredPracticeCompletionStatusForLevel'
        ]
      >(),

    completeLevelTheory:
      vi.fn<
        LearningProgressRepository[
          'completeLevelTheory'
        ]
      >(),

    markLevelQuizPassed:
      vi.fn<
        LearningProgressRepository[
          'markLevelQuizPassed'
        ]
      >(),

    markLevelPracticeCompleted:
      vi.fn<
        LearningProgressRepository[
          'markLevelPracticeCompleted'
        ]
      >(),

    markLevelCheckpointCompleted:
      vi.fn<
        LearningProgressRepository[
          'markLevelCheckpointCompleted'
        ]
      >(),

    markConceptCompleted:
      vi.fn<
        LearningProgressRepository[
          'markConceptCompleted'
        ]
      >(),

    repairFromCompletedSessions:
      vi.fn<
        LearningProgressRepository[
          'repairFromCompletedSessions'
        ]
      >()
        .mockResolvedValue(
          undefined,
        ),

    findByUserAndConceptId:
      vi.fn()
        .mockResolvedValue(
          null,
        ),

    findConceptGate:
      vi.fn()
        .mockResolvedValue(
          gate(
            firstConceptId,
            0,
            null,
          ),
        ),

    getPreviousRequiredPracticeStatus:
      vi.fn<
        LearningProgressRepository[
          'getPreviousRequiredPracticeStatus'
        ]
      >()
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

    ...overrides,
  };
}

describe(
  'LearningProgressService',
  () => {
    it(
      'rejects a concept that does not exist or is not published',
      async () => {
        const service =
          new LearningProgressService(
            createRepository({
              findConceptGate:
                vi.fn()
                  .mockResolvedValue(
                    null,
                  ),
            }),
          );

        await expect(
          service.getState(
            'user-1',
            firstConceptId,
          ),
        ).rejects.toBeInstanceOf(
          LearningConceptNotFoundError,
        );
      },
    );

    it(
      'makes theory available for the first published concept',
      async () => {
        const service =
          new LearningProgressService(
            createRepository(),
          );

        const result =
          await service.getState(
            'user-1',
            firstConceptId,
          );

        expect(
          result.locked,
        ).toBe(
          false,
        );

        expect(
          result.previousConceptId,
        ).toBe(
          null,
        );

        expect(
          result.stages.theory.status,
        ).toBe(
          'available',
        );

        expect(
          result.stages.quiz.status,
        ).toBe(
          'locked',
        );
      },
    );

    it(
      'ignores a stale aggregate completion while a canonical level remains incomplete',
      async () => {
        const service =
          new LearningProgressService(
            createRepository({
              getConfiguredLearningLevels:
                vi.fn()
                  .mockResolvedValue(
                    canonicalLevels,
                  ),
              findByUserAndConceptId:
                vi.fn()
                  .mockResolvedValue(
                    createRecord(
                      firstConceptId,
                      {
                        completedAt:
                          firstTimestamp,
                      },
                    ),
                  ),
              findLevelByUserAndConceptId:
                vi.fn<
                  LearningProgressRepository[
                    'findLevelByUserAndConceptId'
                  ]
                >()
                  .mockImplementation(
                    (
                      _userId,
                      conceptId,
                      levelId,
                    ) =>
                      Promise.resolve(
                        levelId
                        === 'FOUNDATION'
                          ? createLevelRecord(
                              conceptId,
                              levelId,
                              firstTimestamp,
                            )
                          : null,
                      ),
                  ),
            }),
          );

        const result =
          await service.getState(
            'user-1',
            firstConceptId,
          );

        expect(
          result.completed,
        ).toBe(
          false,
        );

        expect(
          result.completedAt,
        ).toBe(
          null,
        );

        expect(
          result.status,
        ).toBe(
          'in_progress',
        );
      },
    );

    it(
      'completes a canonical concept only after foundation, deepening and mastery are complete',
      async () => {
        const service =
          new LearningProgressService(
            createRepository({
              getConfiguredLearningLevels:
                vi.fn()
                  .mockResolvedValue(
                    canonicalLevels,
                  ),
              findLevelByUserAndConceptId:
                vi.fn<
                  LearningProgressRepository[
                    'findLevelByUserAndConceptId'
                  ]
                >()
                  .mockImplementation(
                    (
                      _userId,
                      conceptId,
                      levelId,
                    ) =>
                      Promise.resolve(
                        createLevelRecord(
                          conceptId,
                          levelId,
                          secondTimestamp,
                        ),
                      ),
                  ),
            }),
          );

        const result =
          await service.getState(
            'user-1',
            firstConceptId,
          );

        expect(
          result.completed,
        ).toBe(
          true,
        );

        expect(
          result.completedAt,
        ).toBe(
          secondTimestamp.toISOString(),
        );

        expect(
          result.status,
        ).toBe(
          'completed',
        );
      },
    );

    it(
      'locks an entire later concept while previous concept is incomplete',
      async () => {
        const service =
          new LearningProgressService(
            createRepository({
              findConceptGate:
                vi.fn()
                  .mockResolvedValue(
                    gate(
                      secondConceptId,
                      1,
                      firstConceptId,
                    ),
                  ),

              findByUserAndConceptId:
                vi.fn()
                  .mockImplementation(
                    (
                      _userId,
                      conceptId,
                    ) => Promise.resolve().then(() => {
                      if (
                        conceptId
                        === firstConceptId
                      ) {
                        return createRecord(
                          firstConceptId,
                        );
                      }

                      return null;
                    }),
                  ),
            }),
          );

        const result =
          await service.getState(
            'user-1',
            secondConceptId,
          );

        expect(
          result,
        ).toMatchObject({
          conceptId:
            secondConceptId,

          previousConceptId:
            firstConceptId,

          locked:
            true,

          lockReason:
            'previous-concept-incomplete',

          stages: {
            theory: {
              status:
                'locked',
            },

            quiz: {
              status:
                'locked',
            },

            practice: {
              status:
                'locked',
            },

            checkpoint: {
              status:
                'locked',
            },
          },
        });
      },
    );

    it(
      'keeps the next concept locked when the previous aggregate is stale but mastery is incomplete',
      async () => {
        const service =
          new LearningProgressService(
            createRepository({
              findConceptGate:
                vi.fn()
                  .mockResolvedValue(
                    gate(
                      secondConceptId,
                      0,
                      firstConceptId,
                    ),
                  ),
              getConfiguredLearningLevels:
                vi.fn<
                  LearningProgressRepository[
                    'getConfiguredLearningLevels'
                  ]
                >()
                  .mockImplementation(
                    conceptId =>
                      Promise.resolve(
                        conceptId
                        === firstConceptId
                          ? canonicalLevels
                          : [],
                      ),
                  ),
              findByUserAndConceptId:
                vi.fn()
                  .mockImplementation(
                    (
                      _userId,
                      conceptId,
                    ) =>
                      Promise.resolve(
                        conceptId
                        === firstConceptId
                          ? createRecord(
                              firstConceptId,
                              {
                                completedAt:
                                  firstTimestamp,
                              },
                            )
                          : null,
                      ),
                  ),
              findLevelByUserAndConceptId:
                vi.fn<
                  LearningProgressRepository[
                    'findLevelByUserAndConceptId'
                  ]
                >()
                  .mockImplementation(
                    (
                      _userId,
                      conceptId,
                      levelId,
                    ) =>
                      Promise.resolve(
                        levelId
                        === 'FOUNDATION'
                          ? createLevelRecord(
                              conceptId,
                              levelId,
                              firstTimestamp,
                            )
                          : null,
                      ),
                  ),
            }),
          );

        const result =
          await service.getState(
            'user-1',
            secondConceptId,
          );

        expect(
          result.locked,
        ).toBe(
          true,
        );
      },
    );

    it(
      'unlocks a later concept when previous concept is completed',
      async () => {
        const service =
          new LearningProgressService(
            createRepository({
              findConceptGate:
                vi.fn()
                  .mockResolvedValue(
                    gate(
                      secondConceptId,
                      1,
                      firstConceptId,
                    ),
                  ),

              findByUserAndConceptId:
                vi.fn()
                  .mockImplementation(
                    (
                      _userId,
                      conceptId,
                    ) => Promise.resolve().then(() => {
                      if (
                        conceptId
                        === firstConceptId
                      ) {
                        return createRecord(
                          firstConceptId,
                          {
                            completedAt:
                              firstTimestamp,
                          },
                        );
                      }

                      return null;
                    }),
                  ),
            }),
          );

        const result =
          await service.getState(
            'user-1',
            secondConceptId,
          );

        expect(
          result.locked,
        ).toBe(
          false,
        );

        expect(
          result.stages.theory.status,
        ).toBe(
          'available',
        );
      },
    );

    it(
      'does not allow completing theory in a concept whose prerequisite is incomplete',
      async () => {
        const completeTheory =
          vi.fn<
            LearningProgressRepository[
              'completeTheory'
            ]
          >();

        const service =
          new LearningProgressService(
            createRepository({
              findConceptGate:
                vi.fn()
                  .mockResolvedValue(
                    gate(
                      secondConceptId,
                      1,
                      firstConceptId,
                    ),
                  ),

              findByUserAndConceptId:
                vi.fn()
                  .mockResolvedValue(
                    null,
                  ),

              completeTheory,
            }),
          );

        await expect(
          service.completeTheory(
            'user-1',
            secondConceptId,
          ),
        ).rejects.toBeInstanceOf(
          LearningConceptLockedError,
        );

        expect(
          completeTheory,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'completes theory and exposes quiz',
      async () => {
        const completeTheory =
          vi.fn<
            LearningProgressRepository[
              'completeTheory'
            ]
          >()
            .mockResolvedValue(
              createRecord(
                firstConceptId,
                {
                  theoryCompletedAt:
                    firstTimestamp,
                },
              ),
            );

        const service =
          new LearningProgressService(
            createRepository({
              completeTheory,
            }),
          );

        const result =
          await service.completeTheory(
            'user-1',
            firstConceptId,
          );

        expect(
          result.stages.theory.status,
        ).toBe(
          'completed',
        );

        expect(
          result.stages.quiz.status,
        ).toBe(
          'available',
        );
      },
    );

    it(
      'rejects quiz before theory',
      async () => {
        const service =
          new LearningProgressService(
            createRepository(),
          );

        await expect(
          service.markQuizPassed(
            'user-1',
            firstConceptId,
            secondTimestamp,
          ),
        ).rejects.toBeInstanceOf(
          LearningStageLockedError,
        );
      },
    );

    it(
      'allows quiz after theory and unlocks practice',
      async () => {
        const markQuizPassed =
          vi.fn<
            LearningProgressRepository[
              'markQuizPassed'
            ]
          >()
            .mockResolvedValue(
              createRecord(
                firstConceptId,
                {
                  theoryCompletedAt:
                    firstTimestamp,

                  quizPassedAt:
                    secondTimestamp,
                },
              ),
            );

        const service =
          new LearningProgressService(
            createRepository({
              findByUserAndConceptId:
                vi.fn()
                  .mockResolvedValue(
                    createRecord(
                      firstConceptId,
                      {
                        theoryCompletedAt:
                          firstTimestamp,
                      },
                    ),
                  ),

              markQuizPassed,
            }),
          );

        const result =
          await service.markQuizPassed(
            'user-1',
            firstConceptId,
            secondTimestamp,
          );

        expect(
          result.stages.quiz.status,
        ).toBe(
          'completed',
        );

        expect(
          result.stages.practice.status,
        ).toBe(
          'available',
        );
      },
    );

    it(
      'rejects practice before quiz passes',
      async () => {
        const service =
          new LearningProgressService(
            createRepository({
              findByUserAndConceptId:
                vi.fn()
                  .mockResolvedValue(
                    createRecord(
                      firstConceptId,
                      {
                        theoryCompletedAt:
                          firstTimestamp,
                      },
                    ),
                  ),
            }),
          );

        await expect(
          service.markPracticeCompleted(
            'user-1',
            firstConceptId,
            secondTimestamp,
          ),
        ).rejects.toBeInstanceOf(
          LearningStageLockedError,
        );
      },
    );

    it(
      'rejects checkpoint before practice is complete',
      async () => {
        const service =
          new LearningProgressService(
            createRepository({
              findByUserAndConceptId:
                vi.fn()
                  .mockResolvedValue(
                    createRecord(
                      firstConceptId,
                      {
                        theoryCompletedAt:
                          firstTimestamp,

                        quizPassedAt:
                          firstTimestamp,
                      },
                    ),
                  ),
            }),
          );

        await expect(
          service.markCheckpointCompleted(
            'user-1',
            firstConceptId,
            secondTimestamp,
          ),
        ).rejects.toMatchObject({
          stage:
            'checkpoint',

          requiredStage:
            'practice',
        });
      },
    );

    it(
      'checkpoint completion completes the concept',
      async () => {
        const finalRecord =
          createRecord(
            firstConceptId,
            {
              theoryCompletedAt:
                firstTimestamp,

              quizPassedAt:
                firstTimestamp,

              practiceCompletedAt:
                firstTimestamp,

              checkpointCompletedAt:
                secondTimestamp,

              completedAt:
                secondTimestamp,
            },
          );

        const service =
          new LearningProgressService(
            createRepository({
              findByUserAndConceptId:
                vi.fn()
                  .mockResolvedValue(
                    createRecord(
                      firstConceptId,
                      {
                        theoryCompletedAt:
                          firstTimestamp,

                        quizPassedAt:
                          firstTimestamp,

                        practiceCompletedAt:
                          firstTimestamp,
                      },
                    ),
                  ),

              markCheckpointAndConceptCompleted:
                vi.fn()
                  .mockResolvedValue(
                    finalRecord,
                  ),
            }),
          );

        const result =
          await service
            .markCheckpointCompleted(
              'user-1',
              firstConceptId,
              secondTimestamp,
            );

        expect(
          result.stages.checkpoint.status,
        ).toBe(
          'completed',
        );

        expect(
          result.completed,
        ).toBe(
          true,
        );

        expect(
          result.completedAt,
        ).toBe(
          secondTimestamp.toISOString(),
        );
      },
    );

    it(
      'uses only the immediately previous published concept returned by the repository gate',
      async () => {
        const findByUserAndConceptId =
          vi.fn<
            LearningProgressRepository[
              'findByUserAndConceptId'
            ]
          >()
            .mockImplementation(
              (
                _userId,
                conceptId,
              ) => Promise.resolve().then(() => {
                if (
                  conceptId
                  === secondConceptId
                ) {
                  return createRecord(
                    secondConceptId,
                    {
                      completedAt:
                        firstTimestamp,
                    },
                  );
                }

                return null;
              }),
            );

        const service =
          new LearningProgressService(
            createRepository({
              findConceptGate:
                vi.fn()
                  .mockResolvedValue(
                    gate(
                      thirdConceptId,
                      3,
                      secondConceptId,
                    ),
                  ),

              findByUserAndConceptId,
            }),
          );

        const result =
          await service.getState(
            'user-1',
            thirdConceptId,
          );

        expect(
          result.locked,
        ).toBe(
          false,
        );

        expect(
          result.previousConceptId,
        ).toBe(
          secondConceptId,
        );
      },
    );
  },
);

describe(
  'LearningProgressService training reconciliation',
  () => {
    it(
      'does not pass a failed quiz',
      async () => {
        const markQuizPassed =
          vi.fn();

        const repository =
          createRepository({
            findByUserAndConceptId:
              vi.fn()
                .mockResolvedValue(
                  createRecord(
                    firstConceptId,
                    {
                      theoryCompletedAt:
                        firstTimestamp,
                    },
                  ),
                ),

            markQuizPassed,
          });

        const service =
          new LearningProgressService(
            repository,
          );

        const result =
          await service
            .reconcileTrainingCompletion(
              'user-1',
              {
                conceptId:
                  firstConceptId,

                kind:
                  'QUIZ',

                passingPercentage:
                  80,

                requiredForProgression:
                  true,

                totalExercises:
                  10,

                correctExercises:
                  7,

                completedAt:
                  secondTimestamp,
              },
            );

        expect(
          markQuizPassed,
        ).not.toHaveBeenCalled();

        expect(
          result.stages.practice.status,
        ).toBe(
          'locked',
        );
      },
    );

    it(
      'passes quiz at the exact threshold',
      async () => {
        const markQuizPassed =
          vi.fn<
            LearningProgressRepository[
              'markQuizPassed'
            ]
          >()
            .mockResolvedValue(
              createRecord(
                firstConceptId,
                {
                  theoryCompletedAt:
                    firstTimestamp,

                  quizPassedAt:
                    secondTimestamp,
                },
              ),
            );

        const repository =
          createRepository({
            findByUserAndConceptId:
              vi.fn()
                .mockResolvedValue(
                  createRecord(
                    firstConceptId,
                    {
                      theoryCompletedAt:
                        firstTimestamp,
                    },
                  ),
                ),

            markQuizPassed,

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
          });

        const service =
          new LearningProgressService(
            repository,
          );

        await service
          .reconcileTrainingCompletion(
            'user-1',
            {
              conceptId:
                firstConceptId,

              kind:
                'QUIZ',

              passingPercentage:
                80,

              requiredForProgression:
                true,

              totalExercises:
                5,

              correctExercises:
                4,

              completedAt:
                secondTimestamp,
            },
          );

        expect(
          markQuizPassed,
        ).toHaveBeenCalled();
      },
    );

    it(
      'auto-completes practice after quiz when no required practices exist',
      async () => {
        const markPracticeCompleted =
          vi.fn()
            .mockResolvedValue(
              createRecord(
                firstConceptId,
                {
                  theoryCompletedAt:
                    firstTimestamp,

                  quizPassedAt:
                    secondTimestamp,

                  practiceCompletedAt:
                    secondTimestamp,
                },
              ),
            );

        const repository =
          createRepository({
            findByUserAndConceptId:
              vi.fn()
                .mockResolvedValue(
                  createRecord(
                    firstConceptId,
                    {
                      theoryCompletedAt:
                        firstTimestamp,

                      quizPassedAt:
                        secondTimestamp,
                    },
                  ),
                ),

            markQuizPassed:
              vi.fn()
                .mockResolvedValue(
                  createRecord(
                    firstConceptId,
                    {
                      theoryCompletedAt:
                        firstTimestamp,

                      quizPassedAt:
                        secondTimestamp,
                    },
                  ),
                ),

            markPracticeCompleted,

            getRequiredPracticeCompletionStatus:
              vi.fn()
                .mockResolvedValue({
                  requiredSessionCount:
                    0,

                  completedRequiredSessionCount:
                    0,

                  allCompleted:
                    true,
                }),
          });

        const service =
          new LearningProgressService(
            repository,
          );

        await service
          .reconcileTrainingCompletion(
            'user-1',
            {
              conceptId:
                firstConceptId,

              kind:
                'QUIZ',

              passingPercentage:
                70,

              requiredForProgression:
                true,

              totalExercises:
                10,

              correctExercises:
                10,

              completedAt:
                secondTimestamp,
            },
          );

        expect(
          markPracticeCompleted,
        ).toHaveBeenCalled();
      },
    );

    it(
      'does not complete practice until every required practice is completed',
      async () => {
        const markPracticeCompleted =
          vi.fn();

        const repository =
          createRepository({
            findByUserAndConceptId:
              vi.fn()
                .mockResolvedValue(
                  createRecord(
                    firstConceptId,
                    {
                      theoryCompletedAt:
                        firstTimestamp,

                      quizPassedAt:
                        firstTimestamp,
                    },
                  ),
                ),

            markPracticeCompleted,

            getRequiredPracticeCompletionStatus:
              vi.fn()
                .mockResolvedValue({
                  requiredSessionCount:
                    3,

                  completedRequiredSessionCount:
                    2,

                  allCompleted:
                    false,
                }),
          });

        const service =
          new LearningProgressService(
            repository,
          );

        await service
          .reconcileTrainingCompletion(
            'user-1',
            {
              conceptId:
                firstConceptId,

              kind:
                'PRACTICE',

              passingPercentage:
                null,

              requiredForProgression:
                true,

              totalExercises:
                2,

              correctExercises:
                1,

              completedAt:
                secondTimestamp,
            },
          );

        expect(
          markPracticeCompleted,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'completes practice once all required practices are completed',
      async () => {
        const markPracticeCompleted =
          vi.fn()
            .mockResolvedValue(
              createRecord(
                firstConceptId,
                {
                  theoryCompletedAt:
                    firstTimestamp,

                  quizPassedAt:
                    firstTimestamp,

                  practiceCompletedAt:
                    secondTimestamp,
                },
              ),
            );

        const repository =
          createRepository({
            findByUserAndConceptId:
              vi.fn()
                .mockResolvedValue(
                  createRecord(
                    firstConceptId,
                    {
                      theoryCompletedAt:
                        firstTimestamp,

                      quizPassedAt:
                        firstTimestamp,
                    },
                  ),
                ),

            markPracticeCompleted,

            getRequiredPracticeCompletionStatus:
              vi.fn()
                .mockResolvedValue({
                  requiredSessionCount:
                    3,

                  completedRequiredSessionCount:
                    3,

                  allCompleted:
                    true,
                }),
          });

        const service =
          new LearningProgressService(
            repository,
          );

        await service
          .reconcileTrainingCompletion(
            'user-1',
            {
              conceptId:
                firstConceptId,

              kind:
                'PRACTICE',

              passingPercentage:
                null,

              requiredForProgression:
                true,

              totalExercises:
                1,

              correctExercises:
                0,

              completedAt:
                secondTimestamp,
            },
          );

        expect(
          markPracticeCompleted,
        ).toHaveBeenCalled();
      },
    );

    it(
      'completes concept after required checkpoint',
      async () => {
        const checkpoint =
          vi.fn()
            .mockResolvedValue(
              createRecord(
                firstConceptId,
                {
                  theoryCompletedAt:
                    firstTimestamp,

                  quizPassedAt:
                    firstTimestamp,

                  practiceCompletedAt:
                    firstTimestamp,

                  checkpointCompletedAt:
                    secondTimestamp,

                  completedAt:
                    secondTimestamp,
                },
              ),
            );

        const repository =
          createRepository({
            findByUserAndConceptId:
              vi.fn()
                .mockResolvedValue(
                  createRecord(
                    firstConceptId,
                    {
                      theoryCompletedAt:
                        firstTimestamp,

                      quizPassedAt:
                        firstTimestamp,

                      practiceCompletedAt:
                        firstTimestamp,
                    },
                  ),
                ),

            markCheckpointAndConceptCompleted:
              checkpoint,
          });

        const service =
          new LearningProgressService(
            repository,
          );

        const result =
          await service
            .reconcileTrainingCompletion(
              'user-1',
              {
                conceptId:
                  firstConceptId,

                kind:
                  'CHECKPOINT',

                passingPercentage:
                  null,

                requiredForProgression:
                  true,

                totalExercises:
                  1,

                correctExercises:
                  1,

                completedAt:
                  secondTimestamp,
              },
            );

        expect(
          result.completed,
        ).toBe(
          true,
        );

        expect(
          checkpoint,
        ).toHaveBeenCalled();
      },
    );
  },
);

describe(
  'LearningProgressService strict checkpoint',
  () => {
    it(
      'does not complete the concept when checkpoint has any incorrect answer',
      async () => {
        const completeCheckpoint =
          vi.fn();

        const repository =
          createRepository({
            findByUserAndConceptId:
              vi.fn()
                .mockResolvedValue(
                  createRecord(
                    firstConceptId,
                    {
                      theoryCompletedAt:
                        firstTimestamp,

                      quizPassedAt:
                        firstTimestamp,

                      practiceCompletedAt:
                        firstTimestamp,
                    },
                  ),
                ),

            markCheckpointAndConceptCompleted:
              completeCheckpoint,
          });

        const service =
          new LearningProgressService(
            repository,
          );

        const result =
          await service
            .reconcileTrainingCompletion(
              'user-1',
              {
                conceptId:
                  firstConceptId,

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

                completedAt:
                  secondTimestamp,
              },
            );

        expect(
          completeCheckpoint,
        ).not.toHaveBeenCalled();

        expect(
          result.completed,
        ).toBe(
          false,
        );

        expect(
          result.stages.checkpoint.status,
        ).toBe(
          'available',
        );
      },
    );

    it(
      'completes the concept only with a perfect checkpoint',
      async () => {
        const completeCheckpoint =
          vi.fn()
            .mockResolvedValue(
              createRecord(
                firstConceptId,
                {
                  theoryCompletedAt:
                    firstTimestamp,

                  quizPassedAt:
                    firstTimestamp,

                  practiceCompletedAt:
                    firstTimestamp,

                  checkpointCompletedAt:
                    secondTimestamp,

                  completedAt:
                    secondTimestamp,
                },
              ),
            );

        const repository =
          createRepository({
            findByUserAndConceptId:
              vi.fn()
                .mockResolvedValue(
                  createRecord(
                    firstConceptId,
                    {
                      theoryCompletedAt:
                        firstTimestamp,

                      quizPassedAt:
                        firstTimestamp,

                      practiceCompletedAt:
                        firstTimestamp,
                    },
                  ),
                ),

            markCheckpointAndConceptCompleted:
              completeCheckpoint,
          });

        const service =
          new LearningProgressService(
            repository,
          );

        const result =
          await service
            .reconcileTrainingCompletion(
              'user-1',
              {
                conceptId:
                  firstConceptId,

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

                completedAt:
                  secondTimestamp,
              },
            );

        expect(
          completeCheckpoint,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          result.completed,
        ).toBe(
          true,
        );
      },
    );
  },
);
