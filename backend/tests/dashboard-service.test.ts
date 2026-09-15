import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  DashboardService,
  InvalidDashboardHistoryLimitError,
} from '../src/progress/dashboard-service.js';

describe(
  'DashboardService (T228)',
  () => {
    it(
      'builds one authenticated-user dashboard snapshot',
      async () => {
        const progress = [
          {
            conceptId:
              'js-array-iteration',

            technologyId:
              'javascript',

            totalAttempts:
              10,

            correctAttempts:
              8,

            completedSessions:
              2,

            accuracy:
              0.8,

            lastPracticedAt:
              '2026-09-12T08:00:00.000Z',
          },
        ] as const;

        const recentCompletedSessions = [
          {
            id:
              'completion-1',

            sessionId:
              'js-arrays-map-vs-foreach-01',

            technologyId:
              'javascript',

            topicId:
              'js-arrays',

            conceptId:
              'js-array-iteration',

            totalExercises:
              5,

            correctExercises:
              4,

            accuracy:
              0.8,

            durationMs:
              60_000,

            hintsUsed:
              1,

            completedAt:
              '2026-09-12T08:00:00.000Z',
          },
        ] as const;

        const review = {
          overview: {
            totalAttempts:
              10,

            correctAttempts:
              8,

            accuracy:
              0.8,

            evidenceLevel:
              'sufficient' as const,
          },

          candidates:
            [],
        };

        const badges = {
          summary: {
            totalAttempts:
              10,

            correctAttempts:
              8,

            completedSessions:
              2,

            accuracy:
              0.8,
          },

          badges:
            [],
        };

        const listConceptProgress =
          vi.fn()
            .mockResolvedValue(
              progress,
            );

        const listRecentCompletedSessions =
          vi.fn()
            .mockResolvedValue(
              recentCompletedSessions,
            );

        const getReviewPlan =
          vi.fn()
            .mockResolvedValue(
              review,
            );

        const getBadges =
          vi.fn()
            .mockResolvedValue(
              badges,
            );

        const service =
          new DashboardService(
            {
              listConceptProgress,
            },
            {
              listRecentCompletedSessions,
            },
            {
              getReviewPlan,
            },
            {
              getBadges,
            },
            10,
          );

        const result =
          await service
            .getDashboard(
              'user-1',
            );

        expect(
          result,
        ).toEqual({
          progress,

          recentCompletedSessions,

          review,

          badges,
        });

        expect(
          listConceptProgress,
        ).toHaveBeenCalledWith(
          'user-1',
        );

        expect(
          listRecentCompletedSessions,
        ).toHaveBeenCalledWith(
          'user-1',
          10,
        );

        expect(
          getReviewPlan,
        ).toHaveBeenCalledWith(
          'user-1',
        );

        expect(
          getBadges,
        ).toHaveBeenCalledWith(
          'user-1',
        );
      },
    );

    it(
      'returns a valid empty dashboard',
      async () => {
        const service =
          new DashboardService(
            {
              listConceptProgress:
                vi.fn()
                  .mockResolvedValue(
                    [],
                  ),
            },
            {
              listRecentCompletedSessions:
                vi.fn()
                  .mockResolvedValue(
                    [],
                  ),
            },
            {
              getReviewPlan:
                vi.fn()
                  .mockResolvedValue({
                    overview: {
                      totalAttempts:
                        0,

                      correctAttempts:
                        0,

                      accuracy:
                        null,

                      evidenceLevel:
                        'none',
                    },

                    candidates:
                      [],
                  }),
            },
            {
              getBadges:
                vi.fn()
                  .mockResolvedValue({
                    summary: {
                      totalAttempts:
                        0,

                      correctAttempts:
                        0,

                      completedSessions:
                        0,

                      accuracy:
                        null,
                    },

                    badges:
                      [],
                  }),
            },
          );

        const result =
          await service
            .getDashboard(
              'user-empty',
            );

        expect(
          result.progress,
        ).toEqual(
          [],
        );

        expect(
          result
            .recentCompletedSessions,
        ).toEqual(
          [],
        );

        expect(
          result.review
            .overview
            .accuracy,
        ).toBeNull();

        expect(
          result.badges
            .summary
            .accuracy,
        ).toBeNull();
      },
    );

    it(
      'runs independent dashboard reads concurrently',
      async () => {
        const calls:
          string[] = [];

        let resolveProgress:
          (
            value:
              readonly [],
          ) => void =
            () => undefined;

        const progressPromise =
          new Promise<
            readonly []
          >(
            (
              resolve,
            ) => {
              resolveProgress =
                resolve;
            },
          );

        const service =
          new DashboardService(
            {
              listConceptProgress:
                vi.fn(
                  () => {
                    calls.push(
                      'progress',
                    );

                    return progressPromise;
                  },
                ),
            },
            {
              listRecentCompletedSessions:
                vi.fn(
                  () => {
                    calls.push(
                      'history',
                    );

                    return Promise.resolve(
                      [],
                    );
                  },
                ),
            },
            {
              getReviewPlan:
                vi.fn(
                  () => {
                    calls.push(
                      'review',
                    );

                    return Promise.resolve({
                      overview: {
                        totalAttempts:
                          0,

                        correctAttempts:
                          0,

                        accuracy:
                          null,

                        evidenceLevel:
                          'none' as const,
                      },

                      candidates:
                        [],
                    });
                  },
                ),
            },
            {
              getBadges:
                vi.fn(
                  () => {
                    calls.push(
                      'badges',
                    );

                    return Promise.resolve({
                      summary: {
                        totalAttempts:
                          0,

                        correctAttempts:
                          0,

                        completedSessions:
                          0,

                        accuracy:
                          null,
                      },

                      badges:
                        [],
                    });
                  },
                ),
            },
          );

        const dashboard =
          service
            .getDashboard(
              'user-1',
            );

        await Promise.resolve();

        expect(
          calls,
        ).toEqual([
          'progress',
          'history',
          'review',
          'badges',
        ]);

        resolveProgress(
          [],
        );

        await dashboard;
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
      'rejects invalid recent history limit %s',
      (
        limit,
      ) => {
        expect(
          () =>
            new DashboardService(
              {
                listConceptProgress:
                  vi.fn(),
              },
              {
                listRecentCompletedSessions:
                  vi.fn(),
              },
              {
                getReviewPlan:
                  vi.fn(),
              },
              {
                getBadges:
                  vi.fn(),
              },
              limit,
            ),
        ).toThrow(
          InvalidDashboardHistoryLimitError,
        );
      },
    );
  },
);
