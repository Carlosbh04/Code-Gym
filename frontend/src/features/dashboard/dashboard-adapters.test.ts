import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  adaptCompletedSession,
  adaptCompletedSessions,
  adaptConceptProgress,
} from './dashboard-adapters';

describe(
  'dashboard adapters',
  () => {
    it(
      'adapta progreso sin inventar campos legacy',
      () => {
        const result =
          adaptConceptProgress({
            conceptId:
              'js-arrays',
            technologyId:
              'javascript',
            totalAttempts: 10,
            correctAttempts: 8,
            completedSessions: 2,
            accuracy: 0.8,
            lastPracticedAt:
              '2026-09-12T12:00:00.000Z',
          });

        expect(result).toEqual({
          conceptId:
            'js-arrays',
          technologyId:
            'javascript',
          totalAttempts: 10,
          correctAttempts: 8,
          completedSessions: 2,
          accuracy: 0.8,
          lastPracticed:
            '2026-09-12T12:00:00.000Z',
        });

        expect(result)
          .not
          .toHaveProperty(
            'difficultyDistribution',
          );

        expect(result)
          .not
          .toHaveProperty(
            'recentErrors',
          );

        expect(result)
          .not
          .toHaveProperty(
            'schemaVersion',
          );

        expect(result)
          .not
          .toHaveProperty(
            'domain',
          );
      },
    );

    it(
      'convierte completion backend al modelo UI',
      () => {
        expect(
          adaptCompletedSession({
            id: 'completion-1',
            sessionId:
              'session-1',
            technologyId:
              'javascript',
            topicId: 'arrays',
            conceptId:
              'js-arrays',
            totalExercises: 4,
            correctExercises: 3,
            accuracy: 0.75,
            durationMs: 12000,
            hintsUsed: 1,
            completedAt:
              '2026-09-12T12:00:00.000Z',
          }),
        ).toEqual({
          id: 'completion-1',
          sessionId:
            'session-1',
          technologyId:
            'javascript',
          conceptId:
            'js-arrays',
          totalSteps: 4,
          correctSteps: 3,
          accuracy: 75,
          timeSpentMs: 12000,
          completedAt:
            '2026-09-12T12:00:00.000Z',
        });
      },
    );

    it(
      'no inventa conceptId para filas legacy',
      () => {
        const legacy = {
          id: 'legacy-1',
          sessionId:
            'legacy-session',
          technologyId:
            'javascript',
          topicId: null,
          conceptId: null,
          totalExercises: 4,
          correctExercises: 2,
          accuracy: 0.5,
          durationMs: 9000,
          hintsUsed: 0,
          completedAt:
            '2026-09-12T12:00:00.000Z',
        };

        expect(
          adaptCompletedSession(
            legacy,
          ),
        ).toBeNull();

        expect(
          adaptCompletedSessions([
            legacy,
          ]),
        ).toEqual([]);
      },
    );
  },
);
