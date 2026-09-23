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
  LearningProgressRepository,
} from '../src/progress/learning-progress-repository.js';

import {
  LearningProgressService,
} from '../src/progress/learning-progress-service.js';

const conceptId =
  conceptIdSchema.parse(
    'js-array-iteration',
  );

const fixedNow =
  new Date(
    '2026-09-17T18:10:00.000Z',
  );

describe(
  'LearningProgressService theory clock',
  () => {
    it(
      'owns the theory completion timestamp inside the service',
      async () => {
        const completeTheory =
          vi.fn<
            LearningProgressRepository[
              'completeTheory'
            ]
          >()
            .mockResolvedValue({
              id:
                'learning-1',

              userId:
                'user-1',

              conceptId,

              theoryCompletedAt:
                fixedNow,

              quizPassedAt:
                null,

              practiceCompletedAt:
                null,

              checkpointCompletedAt:
                null,

              completedAt:
                null,

              createdAt:
                fixedNow,

              updatedAt:
                fixedNow,
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
              vi.fn()
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
                .mockResolvedValue({
                  conceptId,

                  topicId:
                    'js-arrays',

                  position:
                    0,

                  previousConceptId:
                    null,
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
                    4,

                  completedRequiredSessionCount:
                    0,

                  allCompleted:
                    false,
                }),

            completeTheory,

            markQuizPassed:
              vi.fn(),

            markPracticeCompleted:
              vi.fn(),

            markCheckpointAndConceptCompleted:
              vi.fn(),
          };

        const clock =
          vi.fn()
            .mockReturnValue(
              fixedNow,
            );

        const service =
          new LearningProgressService(
            repository,
            clock,
          );

        await service.completeTheory(
          'user-1',
          conceptId,
        );

        expect(
          clock,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          completeTheory,
        ).toHaveBeenCalledWith(
          'user-1',
          conceptId,
          fixedNow,
        );
      },
    );
  },
);
