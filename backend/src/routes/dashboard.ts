import {
  Router,
  type RequestHandler,
  type Response,
} from 'express';

import type {
  DashboardService,
} from '../progress/dashboard-service.js';

export interface DashboardRouterDependencies {
  readonly dashboardService:
    Pick<
      DashboardService,
      'getDashboard'
    >;

  readonly requireAuth:
    RequestHandler;
}

export function createDashboardRouter({
  dashboardService,
  requireAuth,
}: DashboardRouterDependencies): Router {
  const router =
    Router();

  router.get(
    '/dashboard',
    requireAuth,
    async (
      request,
      response,
      next,
    ) => {
      const auth =
        request.auth;

      if (
        auth === undefined
      ) {
        respondUnauthorized(
          response,
        );

        return;
      }

      try {
        const dashboard =
          await dashboardService
            .getDashboard(
              auth.userId,
            );

        response
          .status(200)
          .json({
            dashboard,
          });
      } catch (
        error
      ) {
        next(
          error,
        );
      }
    },
  );

  return router;
}

function respondUnauthorized(
  response: Response,
): void {
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
}
