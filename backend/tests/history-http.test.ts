import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import express, {
  type RequestHandler,
} from 'express';

import request from 'supertest';

import {
  createHistoryRouter,
} from '../src/routes/history.js';

import type {
  AttemptService,
} from '../src/progress/attempt-service.js';

import type {
  CompletedSessionService,
} from '../src/progress/completed-session-service.js';

function authenticatedAs(
  userId: string,
): RequestHandler {
  return (
    request,
    _response,
    next,
  ) => {
    request.auth = Object.freeze({
      userId,
      sessionId:
        'auth-session-1',
    });

    next();
  };
}

const requireAuthWithoutContext:
  RequestHandler =
  (
    _request,
    _response,
    next,
  ) => {
    next();
  };

function createTestApp({
  attemptService,
  completedSessionService,
  requireAuth = authenticatedAs(
    'user-1',
  ),
}: {
  attemptService:
    Pick<
      AttemptService,
      | 'getAttemptsBySession'
      | 'getAttemptsByTrainingRun'
    >;

  completedSessionService:
    Pick<
      CompletedSessionService,
      | 'getCompletedSession'
      | 'getCompletedSessionHistoryTarget'
    >;

  requireAuth?: RequestHandler;
}) {
  const app =
    express();

  app.use(
    createHistoryRouter({
      attemptService,
      completedSessionService,
      requireAuth,
    }),
  );

  return app;
}

describe(
  'history HTTP',
  () => {
    it(
      'lee completion usando exclusivamente el owner autenticado',
      async () => {
        const getCompletedSession =
          vi.fn().mockResolvedValue({
            id: 'completion-1',
            sessionId:
              'js-arrays-map-vs-foreach-01',
            technologyId:
              'javascript',
            topicId:
              'js-arrays',
            conceptId:
              'js-array-iteration',
            totalExercises: 4,
            correctExercises: 3,
            accuracy: 0.75,
            durationMs: 12000,
            hintsUsed: 1,
            completedAt:
              '2026-09-12T12:00:00.000Z',
          });

        const getAttemptsBySession =
          vi.fn();

        const app =
          createTestApp({
            attemptService: {
              getAttemptsBySession,
              getAttemptsByTrainingRun:
                vi.fn(),
            },
            completedSessionService: {
              getCompletedSession,
              getCompletedSessionHistoryTarget:
                vi.fn(),
            },
          });

        const response =
          await request(app)
            .get(
              '/history/sessions/js-arrays-map-vs-foreach-01',
            );

        expect(
          response.status,
        ).toBe(200);

        expect(
          getCompletedSession,
        ).toHaveBeenCalledExactlyOnceWith(
          'user-1',
          'js-arrays-map-vs-foreach-01',
        );

        expect(
          response.body,
        ).toEqual({
          completedSession: {
            id: 'completion-1',
            sessionId:
              'js-arrays-map-vs-foreach-01',
            technologyId:
              'javascript',
            topicId:
              'js-arrays',
            conceptId:
              'js-array-iteration',
            totalExercises: 4,
            correctExercises: 3,
            accuracy: 0.75,
            durationMs: 12000,
            hintsUsed: 1,
            completedAt:
              '2026-09-12T12:00:00.000Z',
          },
        });
      },
    );

    it(
      'lee attempts del TrainingRun de la última completion del owner',
      async () => {
        const getAttemptsBySession =
          vi.fn();

        const getAttemptsByTrainingRun =
          vi.fn().mockResolvedValue([
            {
              id: 'attempt-2',
              sessionId:
                'js-arrays-map-vs-foreach-01',
              exerciseId:
                'step-1',
              conceptId:
                'js-array-iteration',
              technologyId:
                'javascript',
              isCorrect: true,
              attemptedAt:
                '2026-09-12T12:00:00.000Z',
              durationMs: 2000,
              hintsUsed: 0,
            },
          ]);

        const getCompletedSession =
          vi.fn();

        const getCompletedSessionHistoryTarget =
          vi.fn().mockResolvedValue({
            completedSession: {
              id: 'completion-2',
              sessionId:
                'js-arrays-map-vs-foreach-01',
              technologyId:
                'javascript',
              topicId:
                'js-arrays',
              conceptId:
                'js-array-iteration',
              totalExercises: 1,
              correctExercises: 1,
              accuracy: 1,
              durationMs: 2000,
              hintsUsed: 0,
              completedAt:
                '2026-09-12T12:00:00.000Z',
            },
            trainingRunId:
              'training-run-2',
          });

        const app =
          createTestApp({
            attemptService: {
              getAttemptsBySession,
              getAttemptsByTrainingRun,
            },
            completedSessionService: {
              getCompletedSession,
              getCompletedSessionHistoryTarget,
            },
          });

        const response =
          await request(app)
            .get(
              '/history/sessions/js-arrays-map-vs-foreach-01/attempts',
            );

        expect(
          response.status,
        ).toBe(200);

        expect(
          getCompletedSessionHistoryTarget,
        ).toHaveBeenCalledExactlyOnceWith(
          'user-1',
          'js-arrays-map-vs-foreach-01',
        );

        expect(
          getAttemptsByTrainingRun,
        ).toHaveBeenCalledExactlyOnceWith(
          'user-1',
          'training-run-2',
        );

        expect(
          getAttemptsBySession,
        ).not.toHaveBeenCalled();

        expect(
          response.body,
        ).toEqual({
          attempts: [
            {
              id: 'attempt-2',
              sessionId:
                'js-arrays-map-vs-foreach-01',
              exerciseId:
                'step-1',
              conceptId:
                'js-array-iteration',
              technologyId:
                'javascript',
              isCorrect: true,
              attemptedAt:
                '2026-09-12T12:00:00.000Z',
              durationMs: 2000,
              hintsUsed: 0,
            },
          ],
        });
      },
    );

    it(
      'mantiene fallback por sessionId para completion legacy sin trainingRunId',
      async () => {
        const getAttemptsBySession =
          vi.fn().mockResolvedValue([]);

        const getAttemptsByTrainingRun =
          vi.fn();

        const getCompletedSession =
          vi.fn();

        const getCompletedSessionHistoryTarget =
          vi.fn().mockResolvedValue({
            completedSession: {
              id: 'legacy-completion',
              sessionId:
                'js-arrays-map-vs-foreach-01',
              technologyId:
                'javascript',
              topicId:
                'js-arrays',
              conceptId:
                'js-array-iteration',
              totalExercises: 1,
              correctExercises: 1,
              accuracy: 1,
              durationMs: 1000,
              hintsUsed: 0,
              completedAt:
                '2026-09-12T11:00:00.000Z',
            },
            trainingRunId: null,
          });

        const app =
          createTestApp({
            attemptService: {
              getAttemptsBySession,
              getAttemptsByTrainingRun,
            },
            completedSessionService: {
              getCompletedSession,
              getCompletedSessionHistoryTarget,
            },
          });

        const response =
          await request(app)
            .get(
              '/history/sessions/js-arrays-map-vs-foreach-01/attempts',
            );

        expect(
          response.status,
        ).toBe(200);

        expect(
          getAttemptsBySession,
        ).toHaveBeenCalledExactlyOnceWith(
          'user-1',
          'js-arrays-map-vs-foreach-01',
        );

        expect(
          getAttemptsByTrainingRun,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'devuelve 404 genérico para sessionId inválido sin consultar servicios',
      async () => {
        const getAttemptsBySession =
          vi.fn();

        const getCompletedSession =
          vi.fn();

        const app =
          createTestApp({
            attemptService: {
              getAttemptsBySession,
              getAttemptsByTrainingRun:
                vi.fn(),
            },
            completedSessionService: {
              getCompletedSession,
              getCompletedSessionHistoryTarget:
                vi.fn(),
            },
          });

        const response =
          await request(app)
            .get(
              '/history/sessions/INVALID_ID',
            );

        expect(
          response.status,
        ).toBe(404);

        expect(
          response.body,
        ).toEqual({
          error: {
            code:
              'HISTORY_SESSION_NOT_FOUND',
            message:
              'History session not found',
          },
        });

        expect(
          getCompletedSession,
        ).not.toHaveBeenCalled();

        expect(
          getAttemptsBySession,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'devuelve el mismo 404 cuando la completion no existe',
      async () => {
        const getCompletedSession =
          vi.fn().mockResolvedValue(
            null,
          );

        const app =
          createTestApp({
            attemptService: {
              getAttemptsBySession:
                vi.fn(),
              getAttemptsByTrainingRun:
                vi.fn(),
            },
            completedSessionService: {
              getCompletedSession,
              getCompletedSessionHistoryTarget:
                vi.fn(),
            },
          });

        const response =
          await request(app)
            .get(
              '/history/sessions/js-arrays-map-vs-foreach-01',
            );

        expect(
          response.status,
        ).toBe(404);

        expect(
          response.body,
        ).toEqual({
          error: {
            code:
              'HISTORY_SESSION_NOT_FOUND',
            message:
              'History session not found',
          },
        });
      },
    );

    it(
      'devuelve 401 si requireAuth no establece request.auth',
      async () => {
        const getAttemptsBySession =
          vi.fn();

        const getCompletedSession =
          vi.fn();

        const app =
          createTestApp({
            attemptService: {
              getAttemptsBySession,
              getAttemptsByTrainingRun:
                vi.fn(),
            },
            completedSessionService: {
              getCompletedSession,
              getCompletedSessionHistoryTarget:
                vi.fn(),
            },
            requireAuth:
              requireAuthWithoutContext,
          });

        const response =
          await request(app)
            .get(
              '/history/sessions/js-arrays-map-vs-foreach-01',
            );

        expect(
          response.status,
        ).toBe(401);

        expect(
          response.body,
        ).toEqual({
          error: {
            code:
              'UNAUTHORIZED',
            message:
              'Authentication required',
          },
        });

        expect(
          getCompletedSession,
        ).not.toHaveBeenCalled();

        expect(
          getAttemptsBySession,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
