import {
  Router,
  type RequestHandler,
  type Response,
} from 'express';

import {
  conceptIdSchema,
} from '../content/content-id.js';

import {
  LearningConceptLockedError,
  LearningConceptNotFoundError,
  LearningLevelLockedError,
  LearningLevelNotConfiguredError,
  LearningLevelTheoryUnavailableError,
  type LearningLevelStateView,
  type LearningProgressService,
} from '../progress/learning-progress-service.js';

export interface LearningRouterDependencies {
  readonly learningProgressService:
    Pick<
      LearningProgressService,
      | 'getState'
      | 'completeTheory'
      | 'getLevelState'
      | 'completeLevelTheory'
    >;

  readonly requireAuth:
    RequestHandler;
}

type PublicLearningLevelId =
  | 'foundation'
  | 'deepening'
  | 'mastery';

function toPublicLearningLevelId(
  levelId:
    LearningLevelStateView['levelId'],
): PublicLearningLevelId {
  switch (levelId) {
    case 'FOUNDATION':
      return 'foundation';

    case 'DEEPENING':
      return 'deepening';

    case 'MASTERY':
      return 'mastery';
  }
}

function toPublicLearningLevelState(
  state:
    LearningLevelStateView,
) {
  return {
    ...state,

    levelId:
      toPublicLearningLevelId(
        state.levelId,
      ),

    previousLevelId:
      state.previousLevelId === null
        ? null
        : toPublicLearningLevelId(
            state.previousLevelId,
          ),

    nextLevelId:
      state.nextLevelId === null
        ? null
        : toPublicLearningLevelId(
            state.nextLevelId,
          ),
  };
}

function parseLearningLevelId(
  value:
    | string
    | string[]
    | undefined,
):
  | 'FOUNDATION'
  | 'DEEPENING'
  | 'MASTERY'
  | null {
  if (
    Array.isArray(value)
  ) {
    return null;
  }

  switch (value) {
    case 'foundation':
      return 'FOUNDATION';

    case 'deepening':
      return 'DEEPENING';

    case 'mastery':
      return 'MASTERY';

    default:
      return null;
  }
}

export function createLearningRouter({
  learningProgressService,
  requireAuth,
}: LearningRouterDependencies): Router {
  const router =
    Router();

  router.get(
    '/learning/concepts/:conceptId/state',

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

      const parsedConceptId =
        conceptIdSchema.safeParse(
          request.params.conceptId,
        );

      if (!parsedConceptId.success) {
        respondError(
          response,
          400,
          'INVALID_CONCEPT_ID',
          'Concept id is invalid',
        );

        return;
      }

      try {
        const state =
          await learningProgressService
            .getState(
              auth.userId,
              parsedConceptId.data,
            );

        response
          .status(200)
          .json({
            state,
          });
      } catch (error) {
        if (
          error instanceof
            LearningConceptNotFoundError
        ) {
          respondError(
            response,
            404,
            'LEARNING_CONCEPT_NOT_FOUND',
            'Learning concept was not found',
          );

          return;
        }

        next(error);
      }
    },
  );

  router.post(
    '/learning/concepts/:conceptId/theory/complete',

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

      const parsedConceptId =
        conceptIdSchema.safeParse(
          request.params.conceptId,
        );

      if (!parsedConceptId.success) {
        respondError(
          response,
          400,
          'INVALID_CONCEPT_ID',
          'Concept id is invalid',
        );

        return;
      }

      try {
        const state =
          await learningProgressService
            .completeTheory(
              auth.userId,
              parsedConceptId.data,
            );

        response
          .status(200)
          .json({
            state,
          });
      } catch (error) {
        if (
          error instanceof
            LearningConceptNotFoundError
        ) {
          respondError(
            response,
            404,
            'LEARNING_CONCEPT_NOT_FOUND',
            'Learning concept was not found',
          );

          return;
        }

        if (
          error instanceof
            LearningConceptLockedError
        ) {
          respondError(
            response,
            409,
            'LEARNING_CONCEPT_LOCKED',
            'Previous learning concept must be completed first',
          );

          return;
        }

        next(error);
      }
    },
  );

  router.get(
    '/learning/concepts/:conceptId/levels/:levelId/state',
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

      const parsedConceptId =
        conceptIdSchema.safeParse(
          request.params.conceptId,
        );

      if (!parsedConceptId.success) {
        respondError(
          response,
          400,
          'INVALID_CONCEPT_ID',
          'Concept id is invalid',
        );

        return;
      }

      const levelId =
        parseLearningLevelId(
          request.params.levelId,
        );

      if (levelId === null) {
        respondError(
          response,
          400,
          'INVALID_LEARNING_LEVEL_ID',
          'Learning level id is invalid',
        );

        return;
      }

      try {
        const state =
          await learningProgressService
            .getLevelState(
              auth.userId,
              parsedConceptId.data,
              levelId,
            );

        response
          .status(200)
          .json({
            state:
              toPublicLearningLevelState(
                state,
              ),
          });
      } catch (error) {
        if (
          error instanceof
            LearningConceptNotFoundError
        ) {
          respondError(
            response,
            404,
            'LEARNING_CONCEPT_NOT_FOUND',
            'Learning concept was not found',
          );

          return;
        }

        if (
          error instanceof
            LearningLevelNotConfiguredError
        ) {
          respondError(
            response,
            404,
            'LEARNING_LEVEL_NOT_CONFIGURED',
            'Learning level is not configured for this concept',
          );

          return;
        }

        next(error);
      }
    },
  );

  router.post(
    '/learning/concepts/:conceptId/levels/:levelId/theory/complete',
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

      const parsedConceptId =
        conceptIdSchema.safeParse(
          request.params.conceptId,
        );

      if (!parsedConceptId.success) {
        respondError(
          response,
          400,
          'INVALID_CONCEPT_ID',
          'Concept id is invalid',
        );

        return;
      }

      const levelId =
        parseLearningLevelId(
          request.params.levelId,
        );

      if (levelId === null) {
        respondError(
          response,
          400,
          'INVALID_LEARNING_LEVEL_ID',
          'Learning level id is invalid',
        );

        return;
      }

      try {
        const state =
          await learningProgressService
            .completeLevelTheory(
              auth.userId,
              parsedConceptId.data,
              levelId,
            );

        response
          .status(200)
          .json({
            state:
              toPublicLearningLevelState(
                state,
              ),
          });
      } catch (error) {
        if (
          error instanceof
            LearningConceptNotFoundError
        ) {
          respondError(
            response,
            404,
            'LEARNING_CONCEPT_NOT_FOUND',
            'Learning concept was not found',
          );

          return;
        }

        if (
          error instanceof
            LearningLevelNotConfiguredError
        ) {
          respondError(
            response,
            404,
            'LEARNING_LEVEL_NOT_CONFIGURED',
            'Learning level is not configured for this concept',
          );

          return;
        }

        if (
          error instanceof
            LearningConceptLockedError
        ) {
          respondError(
            response,
            409,
            'LEARNING_CONCEPT_LOCKED',
            'Previous learning concept must be completed first',
          );

          return;
        }

        if (
          error instanceof
            LearningLevelLockedError
        ) {
          respondError(
            response,
            409,
            'LEARNING_LEVEL_LOCKED',
            'Previous learning level must be completed first',
          );

          return;
        }

        if (
          error instanceof
            LearningLevelTheoryUnavailableError
        ) {
          respondError(
            response,
            422,
            'LEARNING_LEVEL_THEORY_UNAVAILABLE',
            'Learning level has no theory content available',
          );

          return;
        }

        next(error);
      }
    },
  );

  return router;
}

function respondUnauthorized(
  response: Response,
): void {
  respondError(
    response,
    401,
    'UNAUTHORIZED',
    'Authentication is required',
  );
}

function respondError(
  response: Response,
  status:
    number,
  code:
    string,
  message:
    string,
): void {
  response
    .status(
      status,
    )
    .json({
      error: {
        code,
        message,
      },
    });
}
