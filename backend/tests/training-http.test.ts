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
import {
  createTrainingRouter,
} from '../src/routes/training.js';
import {
  TrainingExerciseOutOfOrderError,
  TrainingHintsExhaustedError,
  TrainingRunClosedPublicError,
  TrainingRunNotFoundPublicError,
  type TrainingAnswerResultView,
  type TrainingHintResultView,
  type TrainingRunView,
} from '../src/training/training-service.js';

const logger = pino({
  level: 'silent',
});

const authenticatedRequireAuth:
  RequestHandler = (
    request,
    _response,
    next,
  ) => {
    request.auth = Object.freeze({
      userId: 'user-1',
      sessionId: 'auth-session-1',
    });
    next();
  };

const run: TrainingRunView = {
  id: 'run-1',
  sessionId: 'js-test-session-01',
  technologyId: 'javascript',
  topicId: 'js-functions',
  conceptId: 'js-function-basics',
  status: 'active',
  totalExercises: 2,
  answeredExercises: 0,
  correctExercises: 0,
  durationMs: 0,
  hintsUsed: 0,
  startedAt: '2026-09-12T08:00:00.000Z',
  completedAt: null,
};

const result: TrainingAnswerResultView = {
  attempt: {
    id: 'attempt-1',
    exerciseId: 'step-1',
    isCorrect: true,
    attemptedAt: '2026-09-12T08:01:00.000Z',
    durationMs: 1200,
    hintsUsed: 0,
  },
  run: {
    ...run,
    answeredExercises: 1,
    correctExercises: 1,
    durationMs: 1200,
  },
  execution: null,
  completion: null,
};

function createApp(
  startRun:
    (input: {
      readonly userId: string;
      readonly sessionId: string;
    }) => Promise<TrainingRunView>,
  submitAnswer:
    (input: {
      readonly userId: string;
      readonly runId: string;
      readonly exerciseId: string;
      readonly answer: unknown;
      readonly durationMs: number;
    }) => Promise<TrainingAnswerResultView>,
  revealHint:
    (input: {
      readonly userId: string;
      readonly runId: string;
      readonly exerciseId: string;
    }) => Promise<TrainingHintResultView> =
      vi.fn(),
) {
  const app = express();
  app.use(express.json());
  app.use(
    createTrainingRouter({
      trainingService: {
        startRun,
        submitAnswer,
        revealHint,
      },
      requireAuth:
        authenticatedRequireAuth,
    }),
  );
  app.use(
    createErrorHandler(logger),
  );
  return app;
}

describe('training HTTP (T229.4C)', () => {
  it('creates an authenticated run without accepting owner or score fields', async () => {
    const startRun =
      vi.fn()
        .mockResolvedValue(run);
    const response =
      await request(
        createApp(
          startRun,
          vi.fn(),
        ),
      )
        .post('/training/runs')
        .send({
          sessionId: 'js-test-session-01',
        });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ run });
    expect(startRun).toHaveBeenCalledWith({
      userId: 'user-1',
      sessionId: 'js-test-session-01',
    });
  });

  it('rejects browser-controlled correctness and identity fields', async () => {
    const response =
      await request(
        createApp(
          vi.fn(),
          vi.fn(),
        ),
      )
        .post('/training/runs/run-1/answers')
        .send({
          exerciseId: 'step-1',
          answer: 'b',
          durationMs: 1200,
          isCorrect: true,
          userId: 'attacker',
        });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
  });

  it('derives owner from request.auth when submitting an answer', async () => {
    const submitAnswer =
      vi.fn()
        .mockResolvedValue(result);
    const response =
      await request(
        createApp(
          vi.fn(),
          submitAnswer,
        ),
      )
        .post('/training/runs/run-1/answers')
        .send({
          exerciseId: 'step-1',
          answer: 'b',
          durationMs: 1200,
        });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ result });
    expect(submitAnswer).toHaveBeenCalledWith({
      userId: 'user-1',
      runId: 'run-1',
      exerciseId: 'step-1',
      answer: 'b',
      durationMs: 1200,
    });
  });

  it('uses the same 404 for a run that is absent or belongs to someone else', async () => {
    const response =
      await request(
        createApp(
          vi.fn(),
          () => Promise.reject(
            new TrainingRunNotFoundPublicError(),
          ),
        ),
      )
        .post('/training/runs/run-foreign/answers')
        .send({
          exerciseId: 'step-1',
          answer: 'b',
          durationMs: 1,
        });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'TRAINING_RUN_NOT_FOUND',
        message: 'Training run was not found',
      },
    });
  });
  it(
    'returns a stable 409 when an exercise is submitted out of order',
    async () => {
      const response =
        await request(
          createApp(
            vi.fn(),
            () =>
              Promise.reject(
                new TrainingExerciseOutOfOrderError(),
              ),
          ),
        )
          .post(
            '/training/runs/run-1/answers',
          )
          .send({
            exerciseId: 'step-2',
            answer: {
              line: 3,
              errorType: 'ReferenceError',
            },
            durationMs: 1,
          });

      expect(response.status)
        .toBe(409);

      expect(response.body)
        .toEqual({
          error: {
            code:
              'TRAINING_EXERCISE_OUT_OF_ORDER',
            message:
              'Training exercise is out of order',
          },
        });
    },
  );

  it('reveals only the backend-selected hint using an owner-scoped request', async () => {
    const revealHint = vi.fn().mockResolvedValue({
      hint: {
        index: 0,
        text: 'Inspect the return statement.',
        totalHints: 2,
      },
    });
    const response = await request(
      createApp(vi.fn(), vi.fn(), revealHint),
    )
      .post('/training/runs/run-1/hints')
      .send({ exerciseId: 'step-1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      hint: {
        index: 0,
        text: 'Inspect the return statement.',
        totalHints: 2,
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('future');
    expect(revealHint).toHaveBeenCalledWith({
      userId: 'user-1',
      runId: 'run-1',
      exerciseId: 'step-1',
    });
  });

  it('rejects client-controlled hint index and counters', async () => {
    const revealHint = vi.fn();
    const response = await request(
      createApp(vi.fn(), vi.fn(), revealHint),
    )
      .post('/training/runs/run-1/hints')
      .send({
        exerciseId: 'step-1',
        hintIndex: 5,
        hintsUsed: 999,
      });

    expect(response.status).toBe(400);
    expect(revealHint).not.toHaveBeenCalled();
  });

  it.each([
    [
      new TrainingRunNotFoundPublicError(),
      404,
      'TRAINING_RUN_NOT_FOUND',
    ],
    [
      new TrainingRunClosedPublicError(),
      409,
      'TRAINING_RUN_CLOSED',
    ],
    [
      new TrainingExerciseOutOfOrderError(),
      409,
      'TRAINING_EXERCISE_OUT_OF_ORDER',
    ],
    [
      new TrainingHintsExhaustedError(),
      409,
      'TRAINING_HINTS_EXHAUSTED',
    ],
  ])('maps reveal failures to stable contracts', async (error, status, code) => {
    const response = await request(
      createApp(
        vi.fn(),
        vi.fn(),
        () => Promise.reject(error),
      ),
    )
      .post('/training/runs/run-1/hints')
      .send({ exerciseId: 'step-1' });

    expect(response.status).toBe(status);
    const body = response.body as {
      error: {
        code: string;
      };
    };

    expect(body.error.code).toBe(code);
  });


});
