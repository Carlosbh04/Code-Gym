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
  LearningLevelId,
  LearningLevelProgressRecord,
  LearningProgressRecord,
} from '../src/progress/learning-progress-repository.js';

import {
  LearningProgressService,
} from '../src/progress/learning-progress-service.js';

const conceptId =
  conceptIdSchema.parse(
    'js-variables-basics',
  );

const now =
  new Date(
    '2026-09-20T17:00:00.000Z',
  );

function levelRecord(
  levelId: LearningLevelId,
  overrides:
    Partial<LearningLevelProgressRecord>
    = {},
): LearningLevelProgressRecord {
  return {
    id:
      `variables-${levelId}`,
    userId:
      'variables-user',
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
      now,
    updatedAt:
      now,
    ...overrides,
  };
}

function aggregateRecord(
  completedAt:
    Date | null,
): LearningProgressRecord {
  return {
    id:
      'variables-aggregate',
    userId:
      'variables-user',
    conceptId,
    theoryCompletedAt:
      null,
    quizPassedAt:
      null,
    practiceCompletedAt:
      null,
    checkpointCompletedAt:
      null,
    completedAt,
    createdAt:
      now,
    updatedAt:
      now,
  };
}

describe(
  'Variables backend-authoritative progression contract',
  () => {
    it(
      'gates Foundation -> Deepening -> Mastery and completes Variables only at the final checkpoint',
      async () => {
        const records =
          new Map<
            LearningLevelId,
            LearningLevelProgressRecord
          >();

        let conceptCompletedAt:
          Date | null =
            null;

        const update = (
          levelId:
            LearningLevelId,
          changes:
            Partial<LearningLevelProgressRecord>,
        ) => {
          const next = {
            ...(
              records.get(
                levelId,
              )
              ?? levelRecord(
                levelId,
              )
            ),
            ...changes,
            updatedAt:
              now,
          };

          records.set(
            levelId,
            next,
          );

          return Promise.resolve(
            next,
          );
        };

        const repository = {
          findConceptGate:
            vi.fn()
              .mockResolvedValue({
                conceptId,
                topicId:
                  'js-fundamentals',
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
              .mockImplementation(
                () =>
                  Promise.resolve(
                    aggregateRecord(
                      conceptCompletedAt,
                    ),
                  ),
              ),
          getConfiguredLearningLevels:
            vi.fn()
              .mockResolvedValue([
                {
                  conceptId,
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
                  conceptId,
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
                  conceptId,
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
          getTheorySectionCountForLevel:
            vi.fn()
              .mockImplementation(
                (
                  _conceptId:
                    string,
                  levelId:
                    LearningLevelId,
                ) => Promise.resolve(
                  levelId === 'FOUNDATION'
                    ? 9
                    : 11,
                ),
              ),
          findLevelByUserAndConceptId:
            vi.fn()
              .mockImplementation(
                (
                  _userId:
                    string,
                  _conceptId:
                    string,
                  levelId:
                    LearningLevelId,
                ) => Promise.resolve(
                  records.get(
                    levelId,
                  )
                  ?? null,
                ),
              ),
          completeLevelTheory:
            vi.fn()
              .mockImplementation(
                (
                  _userId:
                    string,
                  _conceptId:
                    string,
                  levelId:
                    LearningLevelId,
                  completedAt:
                    Date,
                ) => update(
                  levelId,
                  {
                    theoryCompletedAt:
                      completedAt,
                  },
                ),
              ),
          markLevelQuizPassed:
            vi.fn()
              .mockImplementation(
                (
                  _userId:
                    string,
                  _conceptId:
                    string,
                  levelId:
                    LearningLevelId,
                  completedAt:
                    Date,
                ) => update(
                  levelId,
                  {
                    quizPassedAt:
                      completedAt,
                  },
                ),
              ),
          markLevelPracticeCompleted:
            vi.fn()
              .mockImplementation(
                (
                  _userId:
                    string,
                  _conceptId:
                    string,
                  levelId:
                    LearningLevelId,
                  completedAt:
                    Date,
                ) => update(
                  levelId,
                  {
                    practiceCompletedAt:
                      completedAt,
                  },
                ),
              ),
          markLevelCheckpointCompleted:
            vi.fn()
              .mockImplementation(
                (
                  _userId:
                    string,
                  _conceptId:
                    string,
                  levelId:
                    LearningLevelId,
                  completedAt:
                    Date,
                ) => update(
                  levelId,
                  {
                    checkpointCompletedAt:
                      completedAt,
                    completedAt,
                  },
                ),
              ),
          markConceptCompleted:
            vi.fn()
              .mockImplementation(
                (
                  _userId:
                    string,
                  _conceptId:
                    string,
                  completedAt:
                    Date,
                ) => {
                  conceptCompletedAt =
                    completedAt;

                  return Promise.resolve(
                    aggregateRecord(
                      completedAt,
                    ),
                  );
                },
              ),
          getPreviousRequiredPracticeStatusForLevel:
            vi.fn()
              .mockResolvedValue({
                previousSessionId:
                  null,
                completed:
                  true,
              }),
          getRequiredPracticeCompletionStatusForLevel:
            vi.fn()
              .mockResolvedValue({
                requiredSessionCount:
                  3,
                completedRequiredSessionCount:
                  3,
                allCompleted:
                  true,
              }),
        };

        const service =
          new LearningProgressService(
            repository as never,
            () => now,
          );

        await expect(
          service.completeLevelTheory(
            'variables-user',
            conceptId,
            'DEEPENING',
          ),
        ).rejects.toMatchObject({
          name:
            'LearningLevelLockedError',
        });

        await expect(
          service.markLevelQuizPassed(
            'variables-user',
            conceptId,
            'FOUNDATION',
            now,
          ),
        ).rejects.toMatchObject({
          name:
            'LearningStageLockedError',
        });

        const completeLevel =
          async (
            levelId:
              LearningLevelId,
          ) => {
            await service.completeLevelTheory(
              'variables-user',
              conceptId,
              levelId,
            );

            await expect(
              service.markLevelPracticeCompleted(
                'variables-user',
                conceptId,
                levelId,
                now,
              ),
            ).rejects.toMatchObject({
              name:
                'LearningStageLockedError',
            });

            await service.markLevelQuizPassed(
              'variables-user',
              conceptId,
              levelId,
              now,
            );

            await expect(
              service.markLevelCheckpointCompleted(
                'variables-user',
                conceptId,
                levelId,
                now,
              ),
            ).rejects.toMatchObject({
              name:
                'LearningStageLockedError',
            });

            await service.markLevelPracticeCompleted(
              'variables-user',
              conceptId,
              levelId,
              now,
            );

            return service
              .markLevelCheckpointCompleted(
                'variables-user',
                conceptId,
                levelId,
                now,
              );
          };

        const foundation =
          await completeLevel(
            'FOUNDATION',
          );

        expect(
          foundation.nextLevelId,
        ).toBe(
          'DEEPENING',
        );

        expect(
          (
            await service.getLevelState(
              'variables-user',
              conceptId,
              'DEEPENING',
            )
          ).locked,
        ).toBe(false);

        expect(
          (
            await service.getLevelState(
              'variables-user',
              conceptId,
              'MASTERY',
            )
          ).locked,
        ).toBe(true);

        expect(
          repository.markConceptCompleted,
        ).not.toHaveBeenCalled();

        const deepening =
          await completeLevel(
            'DEEPENING',
          );

        expect(
          deepening.nextLevelId,
        ).toBe(
          'MASTERY',
        );

        expect(
          (
            await service.getLevelState(
              'variables-user',
              conceptId,
              'MASTERY',
            )
          ).locked,
        ).toBe(false);

        expect(
          repository.markConceptCompleted,
        ).not.toHaveBeenCalled();

        const mastery =
          await completeLevel(
            'MASTERY',
          );

        expect(
          mastery.nextLevelId,
        ).toBeNull();

        expect(
          repository.markConceptCompleted,
        ).toHaveBeenCalledOnce();

        expect(
          conceptCompletedAt,
        ).toEqual(
          now,
        );
      },
    );

    it(
      'delegates required practice ordering to the authoritative repository',
      async () => {
        const previousStatus =
          vi.fn()
            .mockResolvedValueOnce({
              previousSessionId:
                'practice-1',
              completed:
                false,
            })
            .mockResolvedValueOnce({
              previousSessionId:
                'practice-1',
              completed:
                true,
            });

        const repository = {
          findConceptGate:
            vi.fn()
              .mockResolvedValue({
                conceptId,
                topicId:
                  'js-fundamentals',
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
                aggregateRecord(
                  null,
                ),
              ),
          getConfiguredLearningLevels:
            vi.fn()
              .mockResolvedValue([
                {
                  conceptId,
                  levelId:
                    'FOUNDATION',
                  name:
                    'Fundamentos',
                  description:
                    'Nivel base',
                  position:
                    0,
                },
              ]),
          findLevelByUserAndConceptId:
            vi.fn()
              .mockResolvedValue(
                levelRecord(
                  'FOUNDATION',
                  {
                    theoryCompletedAt:
                      now,
                    quizPassedAt:
                      now,
                  },
                ),
              ),
          getPreviousRequiredPracticeStatusForLevel:
            previousStatus,
        };

        const service =
          new LearningProgressService(
            repository as never,
          );

        await expect(
          service.canStartRequiredPracticeForLevel(
            'variables-user',
            conceptId,
            'FOUNDATION',
            2,
          ),
        ).resolves.toBe(false);

        await expect(
          service.canStartRequiredPracticeForLevel(
            'variables-user',
            conceptId,
            'FOUNDATION',
            2,
          ),
        ).resolves.toBe(true);
      },
    );
  },
);
