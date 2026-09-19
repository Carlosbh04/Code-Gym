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
  CanonicalTrainingSessionMetadata,
  ContentRepository,
} from '../src/content/content-repository.js';

import type {
  LearningProgressService,
} from '../src/progress/learning-progress-service.js';

import {
  TrainingService,
  TrainingProgressionUnavailableError,
  TrainingSessionLockedError,
} from '../src/training/training-service.js';

import type {
  TrainingRepository,
} from '../src/training/training-repository.js';

import type {
  ContentVerifier,
} from '../src/content/content-verifier.js';

const conceptId =
  conceptIdSchema.parse(
    'js-array-iteration',
  );

function createRepository():
TrainingRepository {
  return {
    createRun:
      vi.fn()
        .mockResolvedValue({
          id:
            'run-1',

          userId:
            'user-1',

          sessionId:
            'js-arrays-coding-transform-01',

          technologyId:
            'javascript',

          topicId:
            'js-arrays',

          conceptId,

          status:
            'ACTIVE',

          totalExercises:
            1,

          answeredExercises:
            0,

          correctExercises:
            0,

          durationMs:
            0,

          hintsUsed:
            0,

          startedAt:
            new Date(
              '2026-09-17T00:00:00.000Z',
            ),

          completedAt:
            null,
        }),

    findOwnedRun:
      vi.fn(),

    revealNextHint:
      vi.fn(),

    recordScoredAnswerAndMaybeComplete:
      vi.fn(),
  } as unknown as TrainingRepository;
}

function createVerifier(
  sessionId:
    string,
): ContentVerifier {
  return {
    getSessionDefinition:
      vi.fn()
        .mockReturnValue({
          sessionId,

          technologyId:
            'javascript',

          topicId:
            'js-arrays',

          conceptId,

          status:
            'published',

          totalExercises:
            1,

          requiresCodeExecution:
            false,

          steps: [
            {
              id:
                'step-1',

              type:
                'multiple-choice',

              correctOptionIds:
                ['a'],

              hints:
                [],
            },
          ],
        }),
  } as unknown as ContentVerifier;
}

function metadata(
  overrides:
    Partial<
      CanonicalTrainingSessionMetadata
    > = {},
):
CanonicalTrainingSessionMetadata {
  return {
    id:
      'js-arrays-coding-transform-01',

    conceptId:
      'js-array-iteration',

    technologyId:
      'javascript',

    kind:
      'PRACTICE',

    levelId:
      'FOUNDATION',

    passingPercentage:
      null,

    requiredForProgression:
      true,

    position:
      1,

    progressionEnabled:
      true,

    status:
      'PUBLISHED',

    ...overrides,
  };
}

function createLearningService(
  canStart:
    boolean,
): Pick<
  LearningProgressService,
  | 'getLevelState'
  | 'reconcileTrainingCompletionForLevel'
  | 'canStartRequiredPracticeForLevel'
> {
  return {
    getLevelState:
      vi.fn()
        .mockResolvedValue({
          conceptId,

          levelId:
            'FOUNDATION',

          previousLevelId:
            null,

          nextLevelId:
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
                '2026-09-17T00:00:00.000Z',
            },

            quiz: {
              status:
                'completed',

              completedAt:
                '2026-09-17T00:01:00.000Z',
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
          canStart,
        ),
  };
}

function createContentRepository(
  value:
    CanonicalTrainingSessionMetadata,
): Pick<
  ContentRepository,
  'getCanonicalTrainingSessionMetadata'
> {
  return {
    getCanonicalTrainingSessionMetadata:
      vi.fn()
        .mockResolvedValue(
          value,
        ),
  };
}

describe(
  'training learning sequential gate',
  () => {
    it(
      'fails closed when learning dependencies are missing',
      async () => {
        const service =
          new TrainingService(
            createRepository(),
            createVerifier(
              'js-arrays-coding-transform-01',
            ),
          );

        await expect(
          service.startRun({
            userId:
              'user-1',

            sessionId:
              'js-arrays-coding-transform-01',
          }),
        ).rejects.toBeInstanceOf(
          TrainingProgressionUnavailableError,
        );
      },
    );

    it(
      'exports a dedicated locked error',
      () => {
        const error =
          new TrainingSessionLockedError(
            'PRACTICE',
          );

        expect(
          error.name,
        ).toBe(
          'TrainingSessionLockedError',
        );

        expect(
          error.kind,
        ).toBe(
          'PRACTICE',
        );
      },
    );

    it(
      'allows the first required practice after quiz',
      async () => {
        const learning =
          createLearningService(
            true,
          );

        const service =
          new TrainingService(
            createRepository(),
            createVerifier(
              'js-arrays-coding-transform-01',
            ),
            () =>
              new Date(
                '2026-09-17T00:02:00.000Z',
              ),
            undefined,
            learning,
            createContentRepository(
              metadata({
                id:
                  'js-arrays-coding-transform-01',

                position:
                  1,
              }),
            ),
          );

        await expect(
          service.startRun({
            userId:
              'user-1',

            sessionId:
              'js-arrays-coding-transform-01',
          }),
        ).resolves.toBeDefined();

        expect(
          learning.canStartRequiredPracticeForLevel,
        ).toHaveBeenCalledWith(
          'user-1',
          conceptId,
          'FOUNDATION',
          1,
        );
      },
    );

    it(
      'blocks practice 2 when practice 1 is incomplete',
      async () => {
        const learning =
          createLearningService(
            false,
          );

        const service =
          new TrainingService(
            createRepository(),
            createVerifier(
              'js-arrays-filter-mutation-01',
            ),
            () =>
              new Date(
                '2026-09-17T00:03:00.000Z',
              ),
            undefined,
            learning,
            createContentRepository(
              metadata({
                id:
                  'js-arrays-filter-mutation-01',

                position:
                  2,
              }),
            ),
          );

        await expect(
          service.startRun({
            userId:
              'user-1',

            sessionId:
              'js-arrays-filter-mutation-01',
          }),
        ).rejects.toBeInstanceOf(
          TrainingSessionLockedError,
        );
      },
    );

    it(
      'allows practice 2 once practice 1 is complete',
      async () => {
        const learning =
          createLearningService(
            true,
          );

        const service =
          new TrainingService(
            createRepository(),
            createVerifier(
              'js-arrays-filter-mutation-01',
            ),
            () =>
              new Date(
                '2026-09-17T00:04:00.000Z',
              ),
            undefined,
            learning,
            createContentRepository(
              metadata({
                id:
                  'js-arrays-filter-mutation-01',

                position:
                  2,
              }),
            ),
          );

        await expect(
          service.startRun({
            userId:
              'user-1',

            sessionId:
              'js-arrays-filter-mutation-01',
          }),
        ).resolves.toBeDefined();
      },
    );

    it(
      'blocks direct API skip to practice 4',
      async () => {
        const learning =
          createLearningService(
            false,
          );

        const service =
          new TrainingService(
            createRepository(),
            createVerifier(
              'js-arrays-reduce-accumulator-01',
            ),
            () =>
              new Date(
                '2026-09-17T00:05:00.000Z',
              ),
            undefined,
            learning,
            createContentRepository(
              metadata({
                id:
                  'js-arrays-reduce-accumulator-01',

                position:
                  4,
              }),
            ),
          );

        await expect(
          service.startRun({
            userId:
              'user-1',

            sessionId:
              'js-arrays-reduce-accumulator-01',
          }),
        ).rejects.toBeInstanceOf(
          TrainingSessionLockedError,
        );

        expect(
          learning.canStartRequiredPracticeForLevel,
        ).toHaveBeenCalledWith(
          'user-1',
          conceptId,
          'FOUNDATION',
          4,
        );
      },
    );

    it(
      'legacy sessions bypass staged level state',
      async () => {
        const learning =
          createLearningService(
            true,
          );

        const service =
          new TrainingService(
            createRepository(),
            createVerifier(
              'js-arrays-coding-transform-01',
            ),
            () =>
              new Date(
                '2026-09-17T00:06:00.000Z',
              ),
            undefined,
            learning,
            createContentRepository(
              metadata({
                id:
                  'js-arrays-coding-transform-01',

                progressionEnabled:
                  false,
              }),
            ),
          );

        await expect(
          service.startRun({
            userId:
              'user-1',

            sessionId:
              'js-arrays-coding-transform-01',
          }),
        ).resolves.toBeDefined();

        expect(
          learning.getLevelState,
        ).not.toHaveBeenCalled();

        expect(
          learning.canStartRequiredPracticeForLevel,
        ).not.toHaveBeenCalled();
      },
    );

  },
);
