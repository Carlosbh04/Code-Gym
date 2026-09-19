import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  ContentVerifier,
} from '../src/content/content-verifier.js';
import {
  exerciseIdSchema,
  contentSessionIdSchema,
  technologyIdSchema,
  topicIdSchema,
  conceptIdSchema,
} from '../src/content/content-id.js';
import {
  StaticVerifierManifestRepository,
} from '../src/content/verifier-manifest-repository.js';
import type {
  TrainingRepository,
  TrainingRunRecord,
} from '../src/training/training-repository.js';
import {
  TrainingCodeExecutionUnavailableError,
  TrainingProgressionUnavailableError,
  TrainingExerciseOutOfOrderError,
  TrainingHintsExhaustedError,
  TrainingRunClosedPublicError,
  TrainingRunNotFoundPublicError,
  TrainingService,
  VerifierExerciseNotFoundError,
} from '../src/training/training-service.js';

const startedAt =
  new Date('2026-09-12T08:00:00.000Z');
const attemptedAt =
  new Date('2026-09-12T08:01:00.000Z');

const manifest = {
  schemaVersion: 1,
  sessions: [
    {
      id: 'js-test-session-01',
      technologyId: 'javascript',
      topicId: 'js-functions',
      conceptId: 'js-function-basics',
      status: 'published',
      totalExercises: 2,
      steps: [
        {
          id: 'step-1',
          type: 'code-reading',
          correctOptionIds: ['b'],
          hints: ['Read the return value.', 'Compare the option identifiers.'],
        },
        {
          id: 'step-2',
          type: 'find-error',
          errorLines: [3],
          errorType: 'ReferenceError',
          hints: ['Inspect line three.'],
        },
      ],
    },
    {
      id: 'js-fix-session-01',
      technologyId: 'javascript',
      topicId: 'js-functions',
      conceptId: 'js-function-basics',
      status: 'published',
      totalExercises: 1,
      steps: [
        {
          id: 'step-1',
          type: 'fix-code',
          hints: ['Return the expected value.'],
          testCases: [
            {
              input: null,
              expected: 2,
              call: 'solution()',
              description: 'returns two',
            },
          ],
        },
      ],
    },
  ],
} as const;

const activeRun: TrainingRunRecord = {
  id: 'run-1',
  userId: 'user-1',
  sessionId: contentSessionIdSchema.parse('js-test-session-01'),
  technologyId: technologyIdSchema.parse('javascript'),
  topicId: topicIdSchema.parse('js-functions'),
  conceptId: conceptIdSchema.parse('js-function-basics'),
  status: 'ACTIVE',
  totalExercises: 2,
  answeredExercises: 0,
  correctExercises: 0,
  durationMs: 0,
  hintsUsed: 0,
  startedAt,
  completedAt: null,
};

function createVerifier(): ContentVerifier {
  return new ContentVerifier(
    new StaticVerifierManifestRepository(
      manifest,
    ),
  );
}

function createRepository(
  overrides:
    Partial<TrainingRepository> = {},
): TrainingRepository {
  return {
    createRun:
      vi.fn<TrainingRepository['createRun']>()
        .mockResolvedValue(activeRun),
    findOwnedRun:
      vi.fn<TrainingRepository['findOwnedRun']>()
        .mockResolvedValue(activeRun),
    revealNextHint:
      vi.fn<TrainingRepository['revealNextHint']>()
        .mockResolvedValue({
          index: 0,
          revealedAt: attemptedAt,
        }),
    recordScoredAnswerAndMaybeComplete:
      vi.fn<
        TrainingRepository[
          'recordScoredAnswerAndMaybeComplete'
        ]
      >()
        .mockResolvedValue({
          attempt: {
            id: 'attempt-1',
            exerciseId:
              exerciseIdSchema.parse('step-1'),
            isCorrect: true,
            attemptedAt,
            durationMs: 1200,
            hintsUsed: 0,
          },
          run: {
            ...activeRun,
            answeredExercises: 1,
            correctExercises: 1,
            durationMs: 1200,
          },
          completion: null,
        }),
    ...overrides,
  };
}

describe('TrainingService (T229.4C)', () => {
  it('creates a run using only canonical verifier metadata', async () => {
    const createRun =
      vi.fn<TrainingRepository['createRun']>()
        .mockResolvedValue(activeRun);
    const service =
      new TrainingService(
        createRepository({ createRun }),
        createVerifier(),
        () => startedAt,
        undefined,
        {
          getLevelState:
            vi.fn()
              .mockResolvedValue({
                conceptId:
                  activeRun.conceptId,

                previousConceptId:
                  null,

                locked:
                  false,

                lockReason:
                  null,

                stages: {
                  theory: {
                    status:
                      'completed',

                    completedAt:
                      startedAt.toISOString(),
                  },

                  quiz: {
                    status:
                      'completed',

                    completedAt:
                      startedAt.toISOString(),
                  },

                  practice: {
                    status:
                      'available',

                    completedAt:
                      null,
                  },

                  checkpoint: {
                    status:
                      'locked',

                    completedAt:
                      null,
                  },
                },

                completed:
                  false,

                completedAt:
                  null,
              }),

          reconcileTrainingCompletionForLevel:
            vi.fn(),

          canStartRequiredPracticeForLevel:
            vi.fn()
              .mockResolvedValue(
                true,
              ),
        },
        {
          getCanonicalTrainingSessionMetadata:
            vi.fn()
              .mockResolvedValue({
                id:
                  activeRun.sessionId,

                conceptId:
                  activeRun.conceptId,

                technologyId:
                  activeRun.technologyId,

                kind:
                  'PRACTICE',

                passingPercentage:
                  null,

                requiredForProgression:
                  true,

                position:
                  0,

                progressionEnabled:
                  false,

                status:
                  'PUBLISHED',
              }),
        },
      );

    await service.startRun({
      userId: 'user-1',
      sessionId: 'js-test-session-01',
    });

    expect(createRun).toHaveBeenCalledWith({
      userId: 'user-1',
      sessionId: 'js-test-session-01',
      technologyId: 'javascript',
      topicId: 'js-functions',
      conceptId: 'js-function-basics',
      totalExercises: 2,
      startedAt,
    });
  });

  it('scores the answer on the backend and ignores client correctness because none is accepted', async () => {
    const record =
      vi.fn<
        TrainingRepository[
          'recordScoredAnswerAndMaybeComplete'
        ]
      >()
        .mockResolvedValue({
          attempt: {
            id: 'attempt-1',
            exerciseId:
              exerciseIdSchema.parse('step-1'),
            isCorrect: true,
            attemptedAt,
            durationMs: 1200,
            hintsUsed: 1,
          },
          run: {
            ...activeRun,
            answeredExercises: 1,
            correctExercises: 1,
            durationMs: 1200,
            hintsUsed: 1,
          },
          completion: null,
        });
    const service =
      new TrainingService(
        createRepository({
          recordScoredAnswerAndMaybeComplete:
            record,
        }),
        createVerifier(),
        () => attemptedAt,
      );

    const result =
      await service.submitAnswer({
        userId: 'user-1',
        runId: 'run-1',
        exerciseId: 'step-1',
        answer: 'b',
        durationMs: 1200,
      });

    expect(record).toHaveBeenCalledWith({
      userId: 'user-1',
      runId: 'run-1',
      exerciseId: 'step-1',
      exercisePosition: 0,
      isCorrect: true,
      durationMs: 1200,
      attemptedAt,
    });
    expect(result.attempt.isCorrect).toBe(true);
  });

  it('returns owner-scoped not found before verifying an answer', async () => {
    const service =
      new TrainingService(
        createRepository({
          findOwnedRun:
            vi.fn<TrainingRepository['findOwnedRun']>()
              .mockResolvedValue(null),
        }),
        createVerifier(),
      );

    await expect(
      service.submitAnswer({
        userId: 'user-2',
        runId: 'run-1',
        exerciseId: 'step-1',
        answer: 'b',
        durationMs: 1,
      }),
    ).rejects.toBeInstanceOf(
      TrainingRunNotFoundPublicError,
    );
  });

  it('returns only sanitized execution feedback for fix-code without leaking canonical tests', async () => {
    const fixRun: TrainingRunRecord = {
      ...activeRun,
      sessionId:
        contentSessionIdSchema.parse(
          'js-fix-session-01',
        ),
      totalExercises: 1,
    };

    const record =
      vi.fn<
        TrainingRepository[
          'recordScoredAnswerAndMaybeComplete'
        ]
      >()
        .mockResolvedValue({
          attempt: {
            id: 'attempt-fix-1',
            exerciseId:
              exerciseIdSchema.parse('step-1'),
            isCorrect: false,
            attemptedAt,
            durationMs: 900,
            hintsUsed: 0,
          },
          run: {
            ...fixRun,
            answeredExercises: 1,
            correctExercises: 0,
            durationMs: 900,
          },
          completion: null,
        });

    const execute =
      vi.fn()
        .mockResolvedValue({
          passed: false,
          reason: 'failed' as const,
        });

    const service =
      new TrainingService(
        createRepository({
          findOwnedRun:
            vi.fn<
              TrainingRepository[
                'findOwnedRun'
              ]
            >()
              .mockResolvedValue(
                fixRun,
              ),
          recordScoredAnswerAndMaybeComplete:
            record,
        }),
        createVerifier(),
        () => attemptedAt,
        {
          execute,
        },
        {
          getLevelState: vi.fn(),
          reconcileTrainingCompletionForLevel: vi.fn(),
          canStartRequiredPracticeForLevel: vi.fn(),
        },
        {
          getCanonicalTrainingSessionMetadata:
            vi.fn()
              .mockResolvedValue({
                id: fixRun.sessionId,
                conceptId: fixRun.conceptId,
                technologyId: fixRun.technologyId,
                kind: 'PRACTICE',
                passingPercentage: null,
                requiredForProgression: true,
                position: 0,
                progressionEnabled: false,
                status: 'PUBLISHED',
              }),
        },
      );

    const result =
      await service.submitAnswer({
        userId: 'user-1',
        runId: 'run-1',
        exerciseId: 'step-1',
        answer:
          'function solution() { return 3; }',
        durationMs: 900,
      });

    expect(execute).toHaveBeenCalledWith({
      code:
        'function solution() { return 3; }',
      testCases: [
        {
          input: null,
          expected: 2,
          call: 'solution()',
          description: 'returns two',
        },
      ],
    });

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        runId: 'run-1',
        exerciseId: 'step-1',
        isCorrect: false,
      }),
    );

    expect(result.execution).toEqual({
      passed: false,
      reason: 'failed',
    });

    const serialized =
      JSON.stringify(result);

    expect(serialized)
      .not.toContain('testCases');
    expect(serialized)
      .not.toContain('"input"');
    expect(serialized)
      .not.toContain('"expected"');
    expect(serialized)
      .not.toContain('"call"');
    expect(serialized)
      .not.toContain('returns two');
  });

  it('refuses to start a session that requires code execution until T229.5', async () => {
    const service =
      new TrainingService(
        createRepository(),
        createVerifier(),
      );

    await expect(
      service.startRun({
        userId: 'user-1',
        sessionId: 'js-fix-session-01',
      }),
    ).rejects.toBeInstanceOf(
      TrainingCodeExecutionUnavailableError,
    );
  });
  it(
    'rejects skipping directly to a later canonical exercise',
    async () => {
      const record =
        vi.fn<
          TrainingRepository[
            'recordScoredAnswerAndMaybeComplete'
          ]
        >();

      const service =
        new TrainingService(
          createRepository({
            recordScoredAnswerAndMaybeComplete:
              record,
          }),
          createVerifier(),
          () => attemptedAt,
        );

      await expect(
        service.submitAnswer({
          userId: 'user-1',
          runId: 'run-1',
          exerciseId: 'step-2',
          answer: {
            line: 3,
            errorType: 'ReferenceError',
          },
          durationMs: 100,
        }),
      ).rejects.toBeInstanceOf(
        TrainingExerciseOutOfOrderError,
      );

      expect(record)
        .not.toHaveBeenCalled();
    },
  );

  it(
    'fails closed before persisting a final answer when progression dependencies are unavailable',
    async () => {
      const runBeforeFinal: TrainingRunRecord = {
        ...activeRun,
        answeredExercises: 1,
        correctExercises: 1,
        durationMs: 1200,
      };

      const record =
        vi.fn<
          TrainingRepository[
            'recordScoredAnswerAndMaybeComplete'
          ]
        >();

      const service =
        new TrainingService(
          createRepository({
            findOwnedRun:
              vi.fn<
                TrainingRepository[
                  'findOwnedRun'
                ]
              >()
                .mockResolvedValue(
                  runBeforeFinal,
                ),

            recordScoredAnswerAndMaybeComplete:
              record,
          }),
          createVerifier(),
          () => attemptedAt,
        );

      await expect(
        service.submitAnswer({
          userId: 'user-1',
          runId: 'run-1',
          exerciseId: 'step-2',
          answer: {
            line: 3,
            errorType: 'ReferenceError',
          },
          durationMs: 500,
        }),
      ).rejects.toBeInstanceOf(
        TrainingProgressionUnavailableError,
      );

      expect(record)
        .not.toHaveBeenCalled();
    },
  );

  it(
    'accepts the second exercise only after one canonical answer exists',
    async () => {
      const runAfterFirst:
        TrainingRunRecord = {
          ...activeRun,
          answeredExercises: 1,
          correctExercises: 1,
          durationMs: 1200,
        };

      const record =
        vi.fn<
          TrainingRepository[
            'recordScoredAnswerAndMaybeComplete'
          ]
        >()
          .mockResolvedValue({
            attempt: {
              id: 'attempt-2',
              exerciseId:
                exerciseIdSchema.parse(
                  'step-2',
                ),
              isCorrect: true,
              attemptedAt,
              durationMs: 500,
              hintsUsed: 0,
            },
            run: {
              ...runAfterFirst,
              status: 'COMPLETED',
              answeredExercises: 2,
              correctExercises: 2,
              durationMs: 1700,
              completedAt:
                attemptedAt,
            },
            completion: {
              id: 'completion-1',
              completedAt:
                attemptedAt,
              totalExercises: 2,
              correctExercises: 2,
              durationMs: 1700,
              hintsUsed: 0,
            },
          });

      const service =
        new TrainingService(
          createRepository({
            findOwnedRun:
              vi.fn<
                TrainingRepository[
                  'findOwnedRun'
                ]
              >()
                .mockResolvedValue(
                  runAfterFirst,
                ),
            recordScoredAnswerAndMaybeComplete:
              record,
          }),
          createVerifier(),
          () => attemptedAt,
          undefined,
          {
            getLevelState: vi.fn(),
            reconcileTrainingCompletionForLevel: vi.fn(),
            canStartRequiredPracticeForLevel: vi.fn(),
          },
          {
            getCanonicalTrainingSessionMetadata:
              vi.fn()
                .mockResolvedValue({
                  id: runAfterFirst.sessionId,
                  conceptId: runAfterFirst.conceptId,
                  technologyId: runAfterFirst.technologyId,
                  kind: 'PRACTICE',
                  passingPercentage: null,
                  requiredForProgression: true,
                  position: 0,
                  progressionEnabled: false,
                  status: 'PUBLISHED',
                }),
          },
        );

      const result =
        await service.submitAnswer({
          userId: 'user-1',
          runId: 'run-1',
          exerciseId: 'step-2',
          answer: {
            line: 3,
            errorType: 'ReferenceError',
          },
          durationMs: 500,
        });

      expect(record)
        .toHaveBeenCalledWith({
          userId: 'user-1',
          runId: 'run-1',
          exerciseId: 'step-2',
          exercisePosition: 1,
          isCorrect: true,
          durationMs: 500,
          attemptedAt,
        });

      expect(
        result.attempt.exerciseId,
      ).toBe('step-2');

      expect(
        result.run.status,
      ).toBe('completed');
    },
  );

  it(
    'rejects replaying an earlier exercise after the run advanced',
    async () => {
      const runAfterFirst:
        TrainingRunRecord = {
          ...activeRun,
          answeredExercises: 1,
          correctExercises: 1,
          durationMs: 1200,
        };

      const record =
        vi.fn<
          TrainingRepository[
            'recordScoredAnswerAndMaybeComplete'
          ]
        >();

      const service =
        new TrainingService(
          createRepository({
            findOwnedRun:
              vi.fn<
                TrainingRepository[
                  'findOwnedRun'
                ]
              >()
                .mockResolvedValue(
                  runAfterFirst,
                ),
            recordScoredAnswerAndMaybeComplete:
              record,
          }),
          createVerifier(),
          () => attemptedAt,
        );

      await expect(
        service.submitAnswer({
          userId: 'user-1',
          runId: 'run-1',
          exerciseId: 'step-1',
          answer: 'b',
          durationMs: 100,
        }),
      ).rejects.toBeInstanceOf(
        TrainingExerciseOutOfOrderError,
      );

      expect(record)
        .not.toHaveBeenCalled();
    },
  );

  it(
    'does not execute private fix-code tests when the exercise is out of order',
    async () => {
      const execute =
        vi.fn();

      const record =
        vi.fn<
          TrainingRepository[
            'recordScoredAnswerAndMaybeComplete'
          ]
        >();

      const service =
        new TrainingService(
          createRepository({
            recordScoredAnswerAndMaybeComplete:
              record,
          }),
          createVerifier(),
          () => attemptedAt,
          {
            execute,
          },
        );

      await expect(
        service.submitAnswer({
          userId: 'user-1',
          runId: 'run-1',
          exerciseId: 'step-2',
          answer: {
            line: 3,
            errorType: 'ReferenceError',
          },
          durationMs: 100,
        }),
      ).rejects.toBeInstanceOf(
        TrainingExerciseOutOfOrderError,
      );

      expect(execute)
        .not.toHaveBeenCalled();

      expect(record)
        .not.toHaveBeenCalled();
    },
  );

  it('reveals only the next canonical private hint', async () => {
    const revealNextHint =
      vi.fn<TrainingRepository['revealNextHint']>()
        .mockResolvedValue({
          index: 1,
          revealedAt: attemptedAt,
        });
    const service = new TrainingService(
      createRepository({ revealNextHint }),
      createVerifier(),
      () => attemptedAt,
    );

    const result = await service.revealHint({
      userId: 'user-1',
      runId: 'run-1',
      exerciseId: 'step-1',
    });

    expect(result).toEqual({
      hint: {
        index: 1,
        text: 'Compare the option identifiers.',
        totalHints: 2,
      },
    });
    expect(JSON.stringify(result))
      .not.toContain('Read the return value.');
    expect(revealNextHint).toHaveBeenCalledWith({
      userId: 'user-1',
      runId: 'run-1',
      exerciseId: 'step-1',
      exercisePosition: 0,
      totalHints: 2,
      revealedAt: attemptedAt,
    });
  });

  it('preserves owner scope before attempting to reveal', async () => {
    const revealNextHint =
      vi.fn<TrainingRepository['revealNextHint']>();
    const service = new TrainingService(
      createRepository({
        findOwnedRun:
          vi.fn<TrainingRepository['findOwnedRun']>()
            .mockResolvedValue(null),
        revealNextHint,
      }),
      createVerifier(),
    );

    await expect(service.revealHint({
      userId: 'foreign-user',
      runId: 'run-1',
      exerciseId: 'step-1',
    })).rejects.toBeInstanceOf(
      TrainingRunNotFoundPublicError,
    );
    expect(revealNextHint).not.toHaveBeenCalled();
  });

  it('rejects reveals for closed, missing, and out-of-order exercises', async () => {
    const revealNextHint =
      vi.fn<TrainingRepository['revealNextHint']>();
    const closedService = new TrainingService(
      createRepository({
        findOwnedRun:
          vi.fn<TrainingRepository['findOwnedRun']>()
            .mockResolvedValue({
              ...activeRun,
              status: 'COMPLETED',
              completedAt: attemptedAt,
            }),
        revealNextHint,
      }),
      createVerifier(),
    );
    const service = new TrainingService(
      createRepository({ revealNextHint }),
      createVerifier(),
    );

    await expect(closedService.revealHint({
      userId: 'user-1',
      runId: 'run-1',
      exerciseId: 'step-1',
    })).rejects.toBeInstanceOf(
      TrainingRunClosedPublicError,
    );
    await expect(service.revealHint({
      userId: 'user-1',
      runId: 'run-1',
      exerciseId: 'missing-step',
    })).rejects.toBeInstanceOf(
      VerifierExerciseNotFoundError,
    );
    await expect(service.revealHint({
      userId: 'user-1',
      runId: 'run-1',
      exerciseId: 'step-2',
    })).rejects.toBeInstanceOf(
      TrainingExerciseOutOfOrderError,
    );
    expect(revealNextHint).not.toHaveBeenCalled();
  });

  it('propagates the stable exhausted-hints error', async () => {
    const service = new TrainingService(
      createRepository({
        revealNextHint:
          vi.fn<TrainingRepository['revealNextHint']>()
            .mockRejectedValue(
              new TrainingHintsExhaustedError(),
            ),
      }),
      createVerifier(),
    );

    await expect(service.revealHint({
      userId: 'user-1',
      runId: 'run-1',
      exerciseId: 'step-1',
    })).rejects.toBeInstanceOf(
      TrainingHintsExhaustedError,
    );
  });


});

describe('TrainingService · code preview', () => {
  it('executes the current fix-code step without recording an attempt', async () => {
    const repository = {
      findOwnedRun: vi.fn().mockResolvedValue({
        id: 'run-preview',
        userId: 'user-1',
        sessionId: 'session-preview',
        technologyId: 'javascript',
        topicId: 'topic-preview',
        conceptId: 'concept-preview',
        status: 'ACTIVE',
        totalExercises: 1,
        answeredExercises: 0,
        correctExercises: 0,
        durationMs: 0,
        hintsUsed: 0,
        startedAt: new Date('2026-09-19T12:00:00.000Z'),
        completedAt: null,
      }),
      recordScoredAnswerAndMaybeComplete: vi.fn(),
    };

    const publicTestCases = Object.freeze([
      Object.freeze({
        args: [[1, 2, 3, 4]],
        expected: [2, 4],
      }),
    ]);

    const contentVerifier = {
      getSessionDefinition: vi.fn().mockReturnValue({
        sessionId: 'session-preview',
        technologyId: 'javascript',
        topicId: 'topic-preview',
        conceptId: 'concept-preview',
        status: 'published',
        totalExercises: 1,
        requiresCodeExecution: true,
        exerciseIds: ['step-preview'],
        exercises: [
          {
            id: 'step-preview',
            hints: [],
          },
        ],
      }),
      prepareCodePreview: vi.fn().mockReturnValue({
        sessionId: 'session-preview',
        exerciseId: 'step-preview',
        technologyId: 'javascript',
        topicId: 'topic-preview',
        conceptId: 'concept-preview',
        status: 'published',
        totalExercises: 1,
        kind: 'code-preview',
        exerciseType: 'fix-code',
        userCode:
          'function obtenerPares(numeros) { return numeros.filter((n) => n % 2 === 0); }',
        testCases: publicTestCases,
      }),
      verifyAnswer: vi.fn(),
    };

    const codeExecutionService = {
      execute: vi.fn().mockResolvedValue({
        passed: true,
        reason: 'passed',
      }),
    };

    const service =
      new TrainingService(
        repository as never,
        contentVerifier as never,
        () =>
          new Date(
            '2026-09-19T12:00:00.000Z',
          ),
        codeExecutionService,
      );

    const result =
      await service.executeCodePreview({
        userId: 'user-1',
        runId: 'run-preview',
        exerciseId: 'step-preview',
        code:
          'function obtenerPares(numeros) { return numeros.filter((n) => n % 2 === 0); }',
      });

    expect(result).toEqual({
      execution: {
        passed: true,
        reason: 'passed',
      },
    });

    expect(
      codeExecutionService.execute,
    ).toHaveBeenCalledWith({
      code:
        'function obtenerPares(numeros) { return numeros.filter((n) => n % 2 === 0); }',
      testCases:
        publicTestCases,
    });

    expect(
      repository
        .recordScoredAnswerAndMaybeComplete,
    ).not.toHaveBeenCalled();

    expect(
      contentVerifier.verifyAnswer,
    ).not.toHaveBeenCalled();
  });

  it('rejects previewing a step that is not the current exercise', async () => {
    const repository = {
      findOwnedRun: vi.fn().mockResolvedValue({
        id: 'run-preview',
        userId: 'user-1',
        sessionId: 'session-preview',
        technologyId: 'javascript',
        topicId: 'topic-preview',
        conceptId: 'concept-preview',
        status: 'ACTIVE',
        totalExercises: 2,
        answeredExercises: 0,
        correctExercises: 0,
        durationMs: 0,
        hintsUsed: 0,
        startedAt: new Date('2026-09-19T12:00:00.000Z'),
        completedAt: null,
      }),
      recordScoredAnswerAndMaybeComplete: vi.fn(),
    };

    const contentVerifier = {
      getSessionDefinition: vi.fn().mockReturnValue({
        sessionId: 'session-preview',
        technologyId: 'javascript',
        topicId: 'topic-preview',
        conceptId: 'concept-preview',
        status: 'published',
        totalExercises: 2,
        requiresCodeExecution: true,
        exerciseIds: [
          'step-current',
          'step-later',
        ],
        exercises: [],
      }),
      prepareCodePreview: vi.fn(),
      verifyAnswer: vi.fn(),
    };

    const codeExecutionService = {
      execute: vi.fn(),
    };

    const service =
      new TrainingService(
        repository as never,
        contentVerifier as never,
        undefined,
        codeExecutionService as never,
      );

    await expect(
      service.executeCodePreview({
        userId: 'user-1',
        runId: 'run-preview',
        exerciseId: 'step-later',
        code: 'const value = 1;',
      }),
    ).rejects.toBeInstanceOf(
      TrainingExerciseOutOfOrderError,
    );

    expect(
      codeExecutionService.execute,
    ).not.toHaveBeenCalled();

    expect(
      repository
        .recordScoredAnswerAndMaybeComplete,
    ).not.toHaveBeenCalled();
  });
});
