import type {
  APIRequestContext,
  APIResponse,
} from '@playwright/test';

const SESSION_ID =
  'js-arrays-map-vs-foreach-01';

const FOUNDATION_CONCEPT_ID =
  'js-array-iteration';

const FOUNDATION_LEVEL_ID =
  'foundation';

const FOUNDATION_QUIZ_SESSION_ID =
  "js-arrays-iteration-quiz-01";

const FOUNDATION_CODING_SESSION_ID =
  "js-arrays-coding-transform-01";

const FOUNDATION_FILTER_SESSION_ID =
  "js-arrays-filter-mutation-01";

const FOUNDATION_QUIZ_ANSWERS = [
  {
    exerciseId: "step-1",
    answer: "b",
  },
  {
    exerciseId: "step-2",
    answer: "a",
  },
  {
    exerciseId: "step-3",
    answer: "b",
  },
  {
    exerciseId: "step-4",
    answer: "b",
  },
  {
    exerciseId: "step-5",
    answer: "c",
  },
] as const;

const FOUNDATION_CODING_ANSWERS = [
  {
    exerciseId: "step-1",
    answer: "function aplicarDescuento(precios) {\n  return precios.map((precio) => precio * 0.9);\n}",
  },
] as const;

const FOUNDATION_FILTER_ANSWERS = [
  {
    exerciseId: "step-1",
    answer: "b",
  },
  {
    exerciseId: "step-2",
    answer: "b",
  },
  {
    exerciseId: "step-3",
    answer: {
      line: 2,
      errorType: "conceptual",
    },
  },
  {
    exerciseId: "step-4",
    answer: "function usuariosActivos(usuarios) {\n  return usuarios.filter((u) => u.activo);\n}",
  },
] as const;

const preparedFoundationTokens =
  new Set<string>();

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
  sessionId: string = SESSION_ID,
): Promise<string> {
  const response = await request.post(
    '/training/runs',
    {
      data: {
        sessionId,
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


async function completeFoundationTheory(
  request: APIRequestContext,
  accessToken: string,
): Promise<void> {
  const response = await request.post(
    `/learning/concepts/${encodeURIComponent(
      FOUNDATION_CONCEPT_ID,
    )}/levels/${encodeURIComponent(
      FOUNDATION_LEVEL_ID,
    )}/theory/complete`,
    {
      data: {},
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    },
  );

  await expectSuccessfulResponse(
    response,
    'Completing Foundation theory for E2E',
  );
}

async function completeCanonicalSession(
  request: APIRequestContext,
  accessToken: string,
  sessionId: string,
  answers: readonly {
    readonly exerciseId: string;
    readonly answer: unknown;
  }[],
): Promise<void> {
  const runId = await startRun(
    request,
    accessToken,
    sessionId,
  );

  await submitAnswers(
    request,
    accessToken,
    runId,
    answers,
  );
}

export async function ensureFoundationPrerequisites(
  request: APIRequestContext,
  accessToken: string,
): Promise<void> {
  if (
    preparedFoundationTokens.has(
      accessToken,
    )
  ) {
    return;
  }

  await completeFoundationTheory(
    request,
    accessToken,
  );

  await completeCanonicalSession(
    request,
    accessToken,
    FOUNDATION_QUIZ_SESSION_ID,
    FOUNDATION_QUIZ_ANSWERS,
  );

  await completeCanonicalSession(
    request,
    accessToken,
    FOUNDATION_CODING_SESSION_ID,
    FOUNDATION_CODING_ANSWERS,
  );

  await completeCanonicalSession(
    request,
    accessToken,
    FOUNDATION_FILTER_SESSION_ID,
    FOUNDATION_FILTER_ANSWERS,
  );

  preparedFoundationTokens.add(
    accessToken,
  );
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

  await ensureFoundationPrerequisites(
    request,
    accessToken,
  );

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

export async function completeE2ESession(
  api: APIRequestContext,
  accessToken: string,
  sessionId: string,
  answers: readonly {
    readonly exerciseId: string;
    readonly answer: unknown;
  }[],
): Promise<void> {
  await completeCanonicalSession(
    api,
    accessToken,
    sessionId,
    answers,
  );
}
