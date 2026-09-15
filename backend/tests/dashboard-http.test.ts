import express, {
  type RequestHandler,
} from 'express';

import pino from 'pino';

import request from 'supertest';

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  createErrorHandler,
} from '../src/middleware/error-handler.js';

import type {
  DashboardSnapshot,
} from '../src/progress/dashboard-service.js';

import {
  createDashboardRouter,
} from '../src/routes/dashboard.js';

const logger =
  pino({
    level:
      'silent',
  });

const authenticatedRequireAuth:
  RequestHandler =
    (
      request,
      _response,
      next,
    ) => {
      request.auth =
        Object.freeze({
          userId:
            'user-1',

          sessionId:
            'session-1',
        });

      next();
    };

const unauthorizedRequireAuth:
  RequestHandler =
    (
      _request,
      response,
    ) => {
      response
        .status(401)
        .json({
          error: {
            code:
              'UNAUTHORIZED',

            message:
              'Authentication required',
          },
        });
    };

function createTestApp(
  getDashboard:
    (
      userId: string,
    ) => Promise<DashboardSnapshot>,

  requireAuth:
    RequestHandler =
      authenticatedRequireAuth,
) {
  const app =
    express();

  app.use(
    createDashboardRouter({
      dashboardService: {
        getDashboard,
      },
      requireAuth,
    }),
  );

  app.use(
    createErrorHandler(
      logger,
    ),
  );

  return app;
}

function emptyDashboard():
  DashboardSnapshot {
  return {
    progress:
      [],

    recentCompletedSessions:
      [],

    review: {
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
    },

    badges: {
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
    },
  };
}

describe(
  'GET /dashboard',
  () => {
    it(
      'returns the authenticated users dashboard',
      async () => {
        const dashboard =
          emptyDashboard();

        const getDashboard =
          vi.fn()
            .mockResolvedValue(
              dashboard,
            );

        const response =
          await request(
            createTestApp(
              getDashboard,
            ),
          )
            .get(
              '/dashboard',
            );

        expect(
          response.status,
        ).toBe(
          200,
        );

        expect(
          response.body,
        ).toEqual({
          dashboard,
        });

        expect(
          getDashboard,
        ).toHaveBeenCalledOnce();

        expect(
          getDashboard,
        ).toHaveBeenCalledWith(
          'user-1',
        );
      },
    );

    it(
      'returns the uniform 401 when authentication rejects the request',
      async () => {
        const getDashboard =
          vi.fn<
            (
              userId:
                string,
            ) => Promise<
              DashboardSnapshot
            >
          >();

        const response =
          await request(
            createTestApp(
              getDashboard,
              unauthorizedRequireAuth,
            ),
          )
            .get(
              '/dashboard',
            );

        expect(
          response.status,
        ).toBe(
          401,
        );

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
          getDashboard,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'derives ownership exclusively from request.auth',
      async () => {
        const getDashboard =
          vi.fn()
            .mockResolvedValue(
              emptyDashboard(),
            );

        await request(
          createTestApp(
            getDashboard,
          ),
        )
          .get(
            '/dashboard?userId=attacker-controlled',
          )
          .expect(
            200,
          );

        expect(
          getDashboard,
        ).toHaveBeenCalledWith(
          'user-1',
        );

        expect(
          getDashboard,
        ).not.toHaveBeenCalledWith(
          'attacker-controlled',
        );
      },
    );

    it(
      'returns a safe 500 when the dashboard service fails unexpectedly',
      async () => {
        const response =
          await request(
            createTestApp(
              () =>
                Promise.reject(
                  new Error(
                    'private dashboard failure',
                  ),
                ),
            ),
          )
            .get(
              '/dashboard',
            );

        expect(
          response.status,
        ).toBe(
          500,
        );

        expect(
          response.body,
        ).toEqual({
          error: {
            code:
              'INTERNAL_SERVER_ERROR',

            message:
              'An unexpected error occurred',
          },
        });

        expect(
          response.text,
        ).not.toContain(
          'private dashboard failure',
        );
      },
    );
  },
);
