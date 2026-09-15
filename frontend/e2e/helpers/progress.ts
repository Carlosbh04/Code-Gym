import type {
  APIRequestContext,
  APIResponse,
} from '@playwright/test';

const SESSION_ID =
  'js-arrays-map-vs-foreach-01';

const CORRECT_ANSWERS = [
  {
    exerciseId: 'step-1',
    answer: 'b',
  },
  {
    exerciseId: 'step-2',
    answer: 'a',
  },
  {
    exerciseId: 'step-3',
    answer: {
      line: 2,
      errorType: 'conceptual',
    },
  },
  {
    exerciseId: 'step-4',
    answer:
      'function dobles(numeros) {\n  return numeros.map((numero) => numero * 2);\n}',
  },
] as const;

const INCORRECT_ANSWERS = [
  {
    exerciseId: 'step-1',
    answer: 'a',
  },
  {
    exerciseId: 'step-2',
    answer: 'b',
  },
  {
    exerciseId: 'step-3',
    answer: {
      line: 1,
      errorType: 'logico',
    },
  },
  {
    exerciseId: 'step-4',
    answer:
      'function dobles(numeros) {\n  return numeros;\n}',
  },
] as const;

interface TrainingRunResponse {
  readonly run?: {
    readonly id?: unknown;
  };
}

async function expectSuccessfulResponse(
  response: APIResponse,
  action: string,
): Promise<void> {
  if (response.ok()) {
    return;
  }

  throw new Error(
    `${action} failed (${response.status()}): ${await response.text()}`,
  );
}

async function startRun(
  request: APIRequestContext,
  accessToken: string,
): Promise<string> {
  const response = await request.post(
    '/training/runs',
    {
      data: {
        sessionId: SESSION_ID,
      },
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    },
  );

  await expectSuccessfulResponse(
    response,
    'Starting an E2E training run',
  );

  const body =
    await response.json() as TrainingRunResponse;
  const runId = body.run?.id;

  if (
    typeof runId !== 'string'
    || runId.length === 0
  ) {
    throw new Error(
      'The E2E training run did not return an id',
    );
  }

  return runId;
}

async function submitAnswers(
  request: APIRequestContext,
  accessToken: string,
  runId: string,
  answers: readonly {
    readonly exerciseId: string;
    readonly answer: unknown;
  }[],
): Promise<void> {
  for (const [index, answer] of answers.entries()) {
    const response = await request.post(
      `/training/runs/${encodeURIComponent(runId)}/answers`,
      {
        data: {
          exerciseId:
            answer.exerciseId,
          answer:
            answer.answer,
          durationMs:
            10_000 + index * 1_000,
          hintsUsed: 0,
        },
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      },
    );

    await expectSuccessfulResponse(
      response,
      `Submitting E2E answer ${index + 1}`,
    );
  }
}

export async function seedCompletedSession(
  request: APIRequestContext,
  accessToken: string,
  correctAnswers: number,
): Promise<void> {
  if (
    !Number.isSafeInteger(correctAnswers)
    || correctAnswers < 0
    || correctAnswers > CORRECT_ANSWERS.length
  ) {
    throw new Error(
      'correctAnswers must be between 0 and 4',
    );
  }

  const runId = await startRun(
    request,
    accessToken,
  );
  const answers = CORRECT_ANSWERS.map(
    (answer, index) =>
      index < correctAnswers
        ? answer
        : INCORRECT_ANSWERS[index],
  );

  await submitAnswers(
    request,
    accessToken,
    runId,
    answers,
  );
}

export async function seedReviewProgress(
  request: APIRequestContext,
  accessToken: string,
): Promise<void> {
  await seedCompletedSession(
    request,
    accessToken,
    2,
  );

  await seedCompletedSession(
    request,
    accessToken,
    2,
  );
}
