import {
  Router,
  type RequestHandler,
  type Response,
} from 'express';

import {
  contentSessionIdSchema,
} from '../content/content-id.js';

import type {
  AttemptService,
} from '../progress/attempt-service.js';

import type {
  CompletedSessionService,
} from '../progress/completed-session-service.js';

export interface HistoryRouterDependencies {
  readonly attemptService:
    Pick<
      AttemptService,
      | 'getAttemptsBySession'
      | 'getAttemptsByTrainingRun'
    >;

  readonly completedSessionService:
    Pick<
      CompletedSessionService,
      | 'getCompletedSession'
      | 'getCompletedSessionHistoryTarget'
    >;

  readonly requireAuth:
    RequestHandler;
}

export function createHistoryRouter({
  attemptService,
  completedSessionService,
  requireAuth,
}: HistoryRouterDependencies): Router {
  const router =
    Router();

  router.get(
    '/history/sessions/:sessionId',
    requireAuth,
    async (
      request,
      response,
      next,
    ) => {
      const auth =
        request.auth;

      if (auth === undefined) {
        respondUnauthorized(
          response,
        );

        return;
      }

      const parsedSessionId =
        contentSessionIdSchema.safeParse(
          request.params.sessionId,
        );

      if (!parsedSessionId.success) {
        respondNotFound(
          response,
        );

        return;
      }

      try {
        const completedSession =
          await completedSessionService
            .getCompletedSession(
              auth.userId,
              parsedSessionId.data,
            );

        if (
          completedSession === null
        ) {
          respondNotFound(
            response,
          );

          return;
        }

        response
          .status(200)
          .json({
            completedSession,
          });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/history/sessions/:sessionId/attempts',
    requireAuth,
    async (
      request,
      response,
      next,
    ) => {
      const auth =
        request.auth;

      if (auth === undefined) {
        respondUnauthorized(
          response,
        );

        return;
      }

      const parsedSessionId =
        contentSessionIdSchema.safeParse(
          request.params.sessionId,
        );

      if (!parsedSessionId.success) {
        respondNotFound(
          response,
        );

        return;
      }

      try {
        const historyTarget =
          await completedSessionService
            .getCompletedSessionHistoryTarget(
              auth.userId,
              parsedSessionId.data,
            );

        if (historyTarget === null) {
          respondNotFound(
            response,
          );

          return;
        }

        const attempts =
          historyTarget.trainingRunId === null
            ? await attemptService
                .getAttemptsBySession(
                  auth.userId,
                  parsedSessionId.data,
                )
            : await attemptService
                .getAttemptsByTrainingRun(
                  auth.userId,
                  historyTarget.trainingRunId,
                );

        response
          .status(200)
          .json({
            attempts,
          });
      } catch (error) {
        next(error);
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

function respondNotFound(
  response: Response,
): void {
  response
    .status(404)
    .json({
      error: {
        code:
          'HISTORY_SESSION_NOT_FOUND',
        message:
          'History session not found',
      },
    });
}
