import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  conceptIdSchema,
  contentSessionIdSchema,
  technologyIdSchema,
  topicIdSchema,
} from '../src/content/content-id.js';

import type {
  CompletedSessionRecord,
  CompletedSessionRepository,
  RecordedCompletion,
} from '../src/progress/completed-session-repository.js';

import type {
  ConceptProgressRecord,
} from '../src/progress/concept-progress-repository.js';

import {
  CompletedSessionService,
  InvalidCompletedSessionReadLimitError,
} from '../src/progress/completed-session-service.js';

import {
  ProgressInvariantError,
} from '../src/progress/user-progress-model.js';

const sessionId =
  contentSessionIdSchema.parse(
    'js-functions-return-flow-01',
  );

const technologyId =
  technologyIdSchema.parse(
    'javascript',
  );

const topicId =
  topicIdSchema.parse(
    'js-functions',
  );

const conceptId =
  conceptIdSchema.parse(
    'js-function-basics',
  );

const completedAt =
  new Date(
    '2026-09-12T07:00:00.000Z',
  );

const completedSession:
  CompletedSessionRecord = {
    id:
      'completion-1',

    userId:
      'user-1',

    trainingRunId:
      null,
    sessionId,

    technologyId,

    topicId,

    conceptId,

    totalExercises:
      4,

    correctExercises:
      3,

    durationMs:
      32_000,

    hintsUsed:
      1,

    completedAt,
  };

const conceptProgress:
  ConceptProgressRecord = {
    id:
      'progress-1',

    userId:
      'user-1',

    conceptId,

    technologyId,

    totalAttempts:
      12,

    correctAttempts:
      9,

    completedSessions:
      3,

    lastPracticedAt:
      completedAt,

    createdAt:
      completedAt,

    updatedAt:
      completedAt,
  };

const recorded:
  RecordedCompletion = {
    completedSession,
    conceptProgress,
  };

function createRepository(
  overrides:
    Partial<CompletedSessionRepository> = {},
): CompletedSessionRepository {
  return {
    createCompletedSessionAndUpdateProgress:
      vi
        .fn<
          CompletedSessionRepository[
            'createCompletedSessionAndUpdateProgress'
          ]
        >()
        .mockResolvedValue(
          recorded,
        ),

    findLatestByUserAndSessionId:
      vi
        .fn<
          CompletedSessionRepository[
            'findLatestByUserAndSessionId'
          ]
        >()
        .mockResolvedValue(
          completedSession,
        ),

    findRecentByUserId:
      vi
        .fn<
          CompletedSessionRepository[
            'findRecentByUserId'
          ]
        >()
        .mockResolvedValue([
          completedSession,
        ]),

    ...overrides,
  };
}

describe(
  'CompletedSessionService (T223/T224)',
  () => {
    it(
      'records completion and aggregate through one trusted repository operation',
      async () => {
        const create =
          vi
            .fn<
              CompletedSessionRepository[
                'createCompletedSessionAndUpdateProgress'
              ]
            >()
            .mockResolvedValue(
              recorded,
            );

        const service =
          new CompletedSessionService(
            createRepository({
              createCompletedSessionAndUpdateProgress:
                create,
            }),

            () => completedAt,
          );

        const result =
          await service
            .recordTrustedCompletion({
              userId:
                'user-1',

              sessionId,

              technologyId,

              topicId,

              conceptId,

              totalExercises:
                4,

              correctExercises:
                3,

              durationMs:
                32_000,

              hintsUsed:
                1,
            });

        expect(
          create,
        ).toHaveBeenCalledWith({
          userId:
            'user-1',

          sessionId,

          technologyId,

          topicId,

          conceptId,

          totalExercises:
            4,

          correctExercises:
            3,

          durationMs:
            32_000,

          hintsUsed:
            1,

          completedAt,
        });

        expect(
          result.completedSession.accuracy,
        ).toBe(
          0.75,
        );

        expect(
          result.conceptProgress,
        ).toMatchObject({
          conceptId,

          totalAttempts:
            12,

          correctAttempts:
            9,

          completedSessions:
            3,

          accuracy:
            0.75,
        });
      },
    );

    it(
      'rejects impossible completion metrics before touching persistence',
      async () => {
        const create =
          vi
            .fn<
              CompletedSessionRepository[
                'createCompletedSessionAndUpdateProgress'
              ]
            >()
            .mockResolvedValue(
              recorded,
            );

        const service =
          new CompletedSessionService(
            createRepository({
              createCompletedSessionAndUpdateProgress:
                create,
            }),
          );

        await expect(
          service.recordTrustedCompletion({
            userId:
              'user-1',

            sessionId,

            technologyId,

            topicId,

            conceptId,

            totalExercises:
              2,

            correctExercises:
              3,

            durationMs:
              1,

            hintsUsed:
              0,
          }),
        ).rejects.toBeInstanceOf(
          ProgressInvariantError,
        );

        expect(
          create,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'loads only through the ownership-scoped repository lookup',
      async () => {
        const findLatest =
          vi
            .fn<
              CompletedSessionRepository[
                'findLatestByUserAndSessionId'
              ]
            >()
            .mockResolvedValue(
              completedSession,
            );

        const service =
          new CompletedSessionService(
            createRepository({
              findLatestByUserAndSessionId:
                findLatest,
            }),
          );

        const result =
          await service
            .getCompletedSession(
              'user-1',
              sessionId,
            );

        expect(
          findLatest,
        ).toHaveBeenCalledWith(
          'user-1',
          sessionId,
        );

        expect(
          result?.id,
        ).toBe(
          'completion-1',
        );
      },
    );

    it(
      'returns null for an absent owned completion',
      async () => {
        const service =
          new CompletedSessionService(
            createRepository({
              findLatestByUserAndSessionId:
                vi
                  .fn<
                    CompletedSessionRepository[
                      'findLatestByUserAndSessionId'
                    ]
                  >()
                  .mockResolvedValue(
                    null,
                  ),
            }),
          );

        await expect(
          service.getCompletedSession(
            'user-1',
            sessionId,
          ),
        ).resolves.toBeNull();
      },
    );

    it(
      'lists recent completions for the supplied owner',
      async () => {
        const findRecent =
          vi
            .fn<
              CompletedSessionRepository[
                'findRecentByUserId'
              ]
            >()
            .mockResolvedValue([
              completedSession,
            ]);

        const service =
          new CompletedSessionService(
            createRepository({
              findRecentByUserId:
                findRecent,
            }),
          );

        const result =
          await service
            .listRecentCompletedSessions(
              'user-1',
              10,
            );

        expect(
          findRecent,
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
      'rejects invalid recent-list limit %s',
      async (
        limit,
      ) => {
        const findRecent =
          vi
            .fn<
              CompletedSessionRepository[
                'findRecentByUserId'
              ]
            >()
            .mockResolvedValue([
              completedSession,
            ]);

        const service =
          new CompletedSessionService(
            createRepository({
              findRecentByUserId:
                findRecent,
            }),
          );

        await expect(
          service
            .listRecentCompletedSessions(
              'user-1',
              limit,
            ),
        ).rejects.toBeInstanceOf(
          InvalidCompletedSessionReadLimitError,
        );

        expect(
          findRecent,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'does not invent conceptId for a legacy historical completion',
      async () => {
        const service =
          new CompletedSessionService(
            createRepository({
              findLatestByUserAndSessionId:
                vi
                  .fn<
                    CompletedSessionRepository[
                      'findLatestByUserAndSessionId'
                    ]
                  >()
                  .mockResolvedValue({
                    ...completedSession,

                    conceptId:
                      null,
                  }),
            }),
          );

        const result =
          await service
            .getCompletedSession(
              'user-1',
              sessionId,
            );

        expect(
          result?.conceptId,
        ).toBeNull();
      },
    );
  },
);
