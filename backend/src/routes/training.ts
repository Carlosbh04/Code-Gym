import {
  Router,
  type RequestHandler,
  type Response,
} from 'express';
import { z } from 'zod';
import {
  contentSessionIdSchema,
  exerciseIdSchema,
} from '../content/content-id.js';
import {
  DuplicateTrainingAnswerError,
  TrainingRunClosedError,
  TrainingRunNotFoundError,
} from '../training/training-repository.js';
import {
  InvalidTrainingAnswerMetadataError,
  InvalidVerifierAnswerError,
  TrainingCodeExecutionUnavailableError,
  TrainingContentMismatchError,
  TrainingExerciseOutOfOrderError,
  TrainingHintsExhaustedError,
  TrainingRunClosedPublicError,
  TrainingRunNotFoundPublicError,
  TrainingSessionLockedError,
  TrainingProgressionUnavailableError,
  TrainingSessionUnavailableError,
  VerifierExerciseNotFoundError,
  type TrainingService,
} from '../training/training-service.js';
import {
  VerifierSessionNotFoundError,
} from '../content/content-verifier.js';
import {
  validateRequest,
} from '../middleware/validate-request.js';

const startRunBodySchema =
  z.object({
    sessionId:
      contentSessionIdSchema,
  }).strict();

const answerParamsSchema =
  z.object({
    runId:
      z.string()
        .min(1)
        .max(30),
  }).strict();

const answerBodySchema =
  z.object({
    exerciseId:
      exerciseIdSchema,
    answer:
      z.unknown(),
    durationMs:
      z.number()
        .int()
        .nonnegative(),
  }).strict();

const revealHintBodySchema =
  z.object({
    exerciseId:
      exerciseIdSchema,
  }).strict();

const executeCodeBodySchema =
  z.object({
    exerciseId:
      exerciseIdSchema,
    code:
      z.string()
        .trim()
        .min(1),
  }).strict();

export interface TrainingRouterDependencies {
  readonly trainingService:
    Pick<
      TrainingService,
      | 'startRun'
      | 'revealHint'
      | 'executeCodePreview'
      | 'submitAnswer'
    >;
  readonly requireAuth:
    RequestHandler;
}

export function createTrainingRouter({
  trainingService,
  requireAuth,
}: TrainingRouterDependencies): Router {
  const router = Router();

  router.post(
    '/training/runs',
    requireAuth,
    validateRequest({
      body: startRunBodySchema,
    }),
    async (
      request,
      response,
      next,
    ) => {
      const auth = request.auth;

      if (auth === undefined) {
        respondUnauthorized(response);
        return;
      }

      const body =
        startRunBodySchema.parse(
          request.body,
        );

      try {
        const run =
          await trainingService.startRun({
            userId: auth.userId,
            sessionId: body.sessionId,
          });

        response
          .status(201)
          .json({
            run,
          });
      } catch (error) {
        if (
          error instanceof
            VerifierSessionNotFoundError
        ) {
          respondError(
            response,
            404,
            'TRAINING_SESSION_NOT_FOUND',
            'Training session was not found',
          );
          return;
        }

        if (
          error instanceof
            TrainingProgressionUnavailableError
        ) {
          respondError(
            response,
            503,
            'TRAINING_PROGRESSION_UNAVAILABLE',
            'Training progression is temporarily unavailable',
          );

          return;
        }

        if (
          error instanceof
            TrainingSessionLockedError
        ) {
          respondError(
            response,
            409,
            'TRAINING_SESSION_LOCKED',
            'Training session is locked by learning progression',
          );

          return;
        }

        if (
          error instanceof
            TrainingSessionUnavailableError
        ) {
          respondError(
            response,
            409,
            'TRAINING_SESSION_UNAVAILABLE',
            'Training session is unavailable',
          );
          return;
        }

        if (
          error instanceof
            TrainingCodeExecutionUnavailableError
        ) {
          respondError(
            response,
            409,
            'CODE_EXECUTION_UNAVAILABLE',
            'Code execution is not available yet',
          );
          return;
        }

        next(error);
      }
    },
  );

  router.post(
    '/training/runs/:runId/hints',
    requireAuth,
    validateRequest({
      params: answerParamsSchema,
      body: revealHintBodySchema,
    }),
    async (
      request,
      response,
      next,
    ) => {
      const auth = request.auth;

      if (auth === undefined) {
        respondUnauthorized(response);
        return;
      }

      const params =
        answerParamsSchema.parse(
          request.params,
        );
      const body =
        revealHintBodySchema.parse(
          request.body,
        );

      try {
        const result =
          await trainingService.revealHint({
            userId: auth.userId,
            runId: params.runId,
            exerciseId:
              body.exerciseId,
          });

        response
          .status(200)
          .json(result);
      } catch (error) {
        if (
          error instanceof
            TrainingRunNotFoundPublicError
          || error instanceof
            TrainingRunNotFoundError
        ) {
          respondError(
            response,
            404,
            'TRAINING_RUN_NOT_FOUND',
            'Training run was not found',
          );
          return;
        }

        if (
          error instanceof
            TrainingRunClosedPublicError
          || error instanceof
            TrainingRunClosedError
        ) {
          respondError(
            response,
            409,
            'TRAINING_RUN_CLOSED',
            'Training run is closed',
          );
          return;
        }

        if (
          error instanceof
            TrainingExerciseOutOfOrderError
        ) {
          respondError(
            response,
            409,
            'TRAINING_EXERCISE_OUT_OF_ORDER',
            'Training exercise is out of order',
          );
          return;
        }

        if (
          error instanceof
            VerifierExerciseNotFoundError
        ) {
          respondError(
            response,
            404,
            'TRAINING_EXERCISE_NOT_FOUND',
            'Training exercise was not found',
          );
          return;
        }

        if (
          error instanceof
            TrainingHintsExhaustedError
        ) {
          respondError(
            response,
            409,
            'TRAINING_HINTS_EXHAUSTED',
            'No training hints remain',
          );
          return;
        }

        if (
          error instanceof
            TrainingContentMismatchError
        ) {
          next(error);
          return;
        }

        next(error);
      }
    },
  );

  router.post(
    '/training/runs/:runId/execute',
    requireAuth,
    validateRequest({
      params: answerParamsSchema,
      body: executeCodeBodySchema,
    }),
    async (
      request,
      response,
      next,
    ) => {
      const auth = request.auth;

      if (auth === undefined) {
        respondUnauthorized(response);
        return;
      }

      const params =
        answerParamsSchema.parse(
          request.params,
        );

      const body =
        executeCodeBodySchema.parse(
          request.body,
        );

      try {
        const result =
          await trainingService.executeCodePreview({
            userId:
              auth.userId,
            runId:
              params.runId,
            exerciseId:
              body.exerciseId,
            code:
              body.code,
          });

        response
          .status(200)
          .json({
            result,
          });
      } catch (error) {
        if (
          error instanceof
            TrainingRunNotFoundPublicError
          || error instanceof
            TrainingRunNotFoundError
        ) {
          respondError(
            response,
            404,
            'TRAINING_RUN_NOT_FOUND',
            'Training run was not found',
          );
          return;
        }

        if (
          error instanceof
            TrainingRunClosedPublicError
          || error instanceof
            TrainingRunClosedError
        ) {
          respondError(
            response,
            409,
            'TRAINING_RUN_CLOSED',
            'Training run is closed',
          );
          return;
        }

        if (
          error instanceof
            TrainingExerciseOutOfOrderError
        ) {
          respondError(
            response,
            409,
            'TRAINING_EXERCISE_OUT_OF_ORDER',
            'Training exercise is out of order',
          );
          return;
        }

        if (
          error instanceof
            VerifierExerciseNotFoundError
        ) {
          respondError(
            response,
            404,
            'TRAINING_EXERCISE_NOT_FOUND',
            'Training exercise was not found',
          );
          return;
        }

        if (
          error instanceof
            InvalidVerifierAnswerError
          || error instanceof
            InvalidTrainingAnswerMetadataError
        ) {
          respondError(
            response,
            400,
            'INVALID_TRAINING_CODE',
            'Training code is invalid',
          );
          return;
        }

        if (
          error instanceof
            TrainingCodeExecutionUnavailableError
        ) {
          respondError(
            response,
            409,
            'CODE_EXECUTION_UNAVAILABLE',
            'Code execution is not available yet',
          );
          return;
        }

        if (
          error instanceof
            TrainingContentMismatchError
        ) {
          next(error);
          return;
        }

        next(error);
      }
    },
  );

  router.post(
    '/training/runs/:runId/answers',
    requireAuth,
    validateRequest({
      params: answerParamsSchema,
      body: answerBodySchema,
    }),
    async (
      request,
      response,
      next,
    ) => {
      const auth = request.auth;

      if (auth === undefined) {
        respondUnauthorized(response);
        return;
      }

      const params =
        answerParamsSchema.parse(
          request.params,
        );
      const body =
        answerBodySchema.parse(
          request.body,
        );

      try {
        const result =
          await trainingService.submitAnswer({
            userId: auth.userId,
            runId: params.runId,
            exerciseId:
              body.exerciseId,
            answer:
              body.answer,
            durationMs:
              body.durationMs,
          });

        response
          .status(200)
          .json({
            result,
          });
      } catch (error) {
        if (
          error instanceof
            TrainingRunNotFoundPublicError
          || error instanceof
            TrainingRunNotFoundError
        ) {
          respondError(
            response,
            404,
            'TRAINING_RUN_NOT_FOUND',
            'Training run was not found',
          );
          return;
        }

        if (
          error instanceof
            TrainingRunClosedPublicError
          || error instanceof
            TrainingRunClosedError
        ) {
          respondError(
            response,
            409,
            'TRAINING_RUN_CLOSED',
            'Training run is closed',
          );
          return;
        }

        if (
          error instanceof
            TrainingExerciseOutOfOrderError
        ) {
          respondError(
            response,
            409,
            'TRAINING_EXERCISE_OUT_OF_ORDER',
            'Training exercise is out of order',
          );
          return;
        }

        if (
          error instanceof
            DuplicateTrainingAnswerError
        ) {
          respondError(
            response,
            409,
            'ANSWER_ALREADY_SUBMITTED',
            'Exercise was already answered in this training run',
          );
          return;
        }

        if (
          error instanceof
            VerifierExerciseNotFoundError
        ) {
          respondError(
            response,
            404,
            'TRAINING_EXERCISE_NOT_FOUND',
            'Training exercise was not found',
          );
          return;
        }

        if (
          error instanceof
            InvalidVerifierAnswerError
          || error instanceof
            InvalidTrainingAnswerMetadataError
        ) {
          respondError(
            response,
            400,
            'INVALID_TRAINING_ANSWER',
            'Training answer is invalid',
          );
          return;
        }

        if (
          error instanceof
            TrainingCodeExecutionUnavailableError
        ) {
          respondError(
            response,
            409,
            'CODE_EXECUTION_UNAVAILABLE',
            'Code execution is not available yet',
          );
          return;
        }

        if (
          error instanceof
            TrainingContentMismatchError
        ) {
          next(error);
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
    'Authentication required',
  );
}

function respondError(
  response: Response,
  status: number,
  code: string,
  message: string,
): void {
  response
    .status(status)
    .json({
      error: {
        code,
        message,
      },
    });
}
