import {
  createIsolatedE2EAccessToken,
} from './helpers/isolated-authentication';

import {
  request as playwrightRequest,
  type APIRequestContext,
} from '@playwright/test';

import {
  expect,
  test,
  type Page,
} from './fixtures';

import {
  completeE2ESession,
} from './helpers/progress';

const API_BASE_URL =
  'http://127.0.0.1:3100';

const CONCEPT_ID =
  'js-array-iteration';

const TOPIC_URL =
  '/tech/javascript/js-arrays';

const QUIZ_ID =
  'js-arrays-iteration-quiz-01';

const CODING_ID =
  'js-arrays-coding-transform-01';

const FILTER_ID =
  'js-arrays-filter-mutation-01';

const MAP_ID =
  'js-arrays-map-vs-foreach-01';

const REDUCE_ID =
  'js-arrays-reduce-accumulator-01';

const CHECKPOINT_ID =
  'js-arrays-iteration-checkpoint-01';

const CODING_ANSWERS = [
  {
    exerciseId: 'step-1',
    answer:
      'function aplicarDescuento(precios) {\n'
      + '  return precios.map((precio) => precio * 0.9);\n'
      + '}',
  },
] as const;

const FILTER_ANSWERS = [
  {
    exerciseId: 'step-1',
    answer: 'b',
  },
  {
    exerciseId: 'step-2',
    answer: 'b',
  },
  {
    exerciseId: 'step-3',
    answer: {
      line: 2,
      errorType:
        'conceptual',
    },
  },
  {
    exerciseId: 'step-4',
    answer:
      'function positivos(numeros) {\n'
      + '  return numeros.filter((numero) => numero > 0);\n'
      + '}',
  },
] as const;

const MAP_ANSWERS = [
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
      errorType:
        'conceptual',
    },
  },
  {
    exerciseId: 'step-4',
    answer:
      'function dobles(numeros) {\n'
      + '  return numeros.map((n) => n * 2);\n'
      + '}',
  },
] as const;

const REDUCE_ANSWERS = [
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
      line: 3,
      errorType:
        'flujo',
    },
  },
  {
    exerciseId: 'step-4',
    answer:
      'function sumar(numeros) {\n'
      + '  return numeros.reduce((acc, numero) => acc + numero, 0);\n'
      + '}',
  },
] as const;

async function createPedagogyUser(
  api: APIRequestContext,
): Promise<string> {
  void api;

  return createIsolatedE2EAccessToken(
    'arrays-learning-progression',
  );
}

async function getJson(
  api: APIRequestContext,
  accessToken: string,
  path: string,
) {
  const response =
    await api.get(
      path,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      },
    );

  expect(
    response.status(),
  ).toBe(
    200,
  );

  return await response.json() as {
    state: {
      completed: boolean;
      levelId?: string;
      nextLevelId?: string | null;
      stages?: {
        theory?: {
          status: string;
        };
        quiz?: {
          status: string;
        };
        practice?: {
          status: string;
        };
        checkpoint?: {
          status: string;
        };
      };
    };
  };
}

async function expectSessionUnavailable(
  api: APIRequestContext,
  accessToken: string,
  sessionId: string,
) {
  const response =
    await api.post(
      '/training/runs',
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
        data: {
          sessionId,
        },
      },
    );

  expect(
    response.status(),
  ).toBe(
    409,
  );

  await expect(
    response.json(),
  ).resolves.toMatchObject({
    error: {
      code:
        'TRAINING_SESSION_LOCKED',
    },
  });
}

async function answerChoiceSession(
  page: Page,
  answers: readonly string[],
) {
  for (
    let index = 0;
    index < answers.length;
    index += 1
  ) {
    await page
      .getByRole(
        'radio',
        {
          name:
            answers[
              index
            ],
          exact: true,
        },
      )
      .check();

    await page
      .getByRole(
        'button',
        {
          name:
            'Comprobar',
        },
      )
      .click();

    await expect(
      page.getByText(
        'Respuesta correcta',
      ),
    ).toBeVisible();

    const finalStep =
      index
      === answers.length - 1;

    await page
      .getByRole(
        'button',
        {
          name:
            finalStep
              ? 'Terminar sesión'
              : 'Siguiente paso',
        },
      )
      .click();
  }
}

test.describe(
  'Arrays — progresión pedagógica real',
  () => {
    test(
      'Fundamentos exige teoría, quiz, prácticas y checkpoint antes de desbloquear Profundización',
      async ({
        page,
      }) => {
        test.setTimeout(
          120_000,
        );

        const api =
          await playwrightRequest
            .newContext({
              baseURL:
                API_BASE_URL,
            });

        const accessToken =
          await createPedagogyUser(
            api,
          );

        await page.unroute(
          '**/auth/refresh',
        );

        await page.route(
          '**/auth/refresh',
          async (
            route,
          ) => {
            await route.fulfill({
              contentType:
                'application/json',
              status:
                200,
              body:
                JSON.stringify({
                  accessToken,
                }),
            });
          },
        );

        try {
          /*
           * ESTADO INICIAL
           */

          const initialConcept =
            await getJson(
              api,
              accessToken,
              `/learning/concepts/${CONCEPT_ID}/state`,
            );

          expect(
            initialConcept
              .state
              .completed,
          ).toBe(
            false,
          );

          const initialFoundation =
            await getJson(
              api,
              accessToken,
              `/learning/concepts/${CONCEPT_ID}/levels/foundation/state`,
            );

          expect(
            initialFoundation
              .state
              .completed,
          ).toBe(
            false,
          );

          expect(
            initialFoundation
              .state
              .stages
              ?.theory
              ?.status,
          ).toBe(
            'available',
          );

          expect(
            initialFoundation
              .state
              .stages
              ?.quiz
              ?.status,
          ).toBe(
            'locked',
          );

          expect(
            initialFoundation
              .state
              .stages
              ?.practice
              ?.status,
          ).toBe(
            'locked',
          );

          expect(
            initialFoundation
              .state
              .stages
              ?.checkpoint
              ?.status,
          ).toBe(
            'locked',
          );

          const prematureDeepening =
            await api.post(
              `/learning/concepts/${CONCEPT_ID}/levels/deepening/theory/complete`,
              {
                headers: {
                  Authorization:
                    `Bearer ${accessToken}`,
                },
              },
            );

          expect(
            prematureDeepening
              .status(),
          ).toBe(
            409,
          );

          await expect(
            prematureDeepening
              .json(),
          ).resolves.toMatchObject({
            error: {
              code:
                'LEARNING_LEVEL_LOCKED',
            },
          });

          /*
           * UI — THEORY
           */

          await page.goto(
            TOPIC_URL,
          );

          await expect(
            page.getByRole(
              'heading',
              {
                level: 1,
                name:
                  'Arrays',
              },
            ),
          ).toBeVisible();

          const stages =
            page.getByRole(
              'navigation',
              {
                name:
                  'Etapas del aprendizaje',
              },
            );

          const testStage =
            stages.getByRole(
              'button',
              {
                name:
                  /Test/,
              },
            );

          const practiceStage =
            stages.getByRole(
              'button',
              {
                name:
                  /Práctica/,
              },
            );

          const checkpointStage =
            stages.getByRole(
              'button',
              {
                name:
                  /Checkpoint/,
              },
            );

          await expect(
            testStage,
          ).toBeDisabled();

          await expect(
            practiceStage,
          ).toBeDisabled();

          await expect(
            checkpointStage,
          ).toBeDisabled();

          await page
            .getByRole(
              'button',
              {
                name:
                  'He entendido esto',
              },
            )
            .click();

          await expect(
            testStage,
          ).toBeEnabled();

          await expect(
            practiceStage,
          ).toBeDisabled();

          await expect(
            checkpointStage,
          ).toBeDisabled();

          const afterTheory =
            await getJson(
              api,
              accessToken,
              `/learning/concepts/${CONCEPT_ID}/levels/foundation/state`,
            );

          expect(
            afterTheory
              .state
              .stages
              ?.theory
              ?.status,
          ).toBe(
            'completed',
          );

          expect(
            afterTheory
              .state
              .stages
              ?.quiz
              ?.status,
          ).toBe(
            'available',
          );

          /*
           * UI — QUIZ
           */

          await testStage
            .click();

          await expect(
            page.getByRole(
              'heading',
              {
                name:
                  'Comprueba lo aprendido',
              },
            ),
          ).toBeVisible();

          await page
            .getByText(
              'Empezar test',
              {
                exact: true,
              },
            )
            .click();

          await expect(
            page,
          ).toHaveURL(
            `/practice/${QUIZ_ID}`,
          );

          await answerChoiceSession(
            page,
            [
              'undefined',
              '[2, 4, 6] y después [4, 8, 12]',
              'numeros.filter((numero) => numero > 10)',
              '60',
              'map',
            ],
          );

          await expect(
            page.getByRole(
              'heading',
              {
                name:
                  'Has desbloqueado la práctica',
              },
            ),
          ).toBeVisible();

          const afterQuiz =
            await getJson(
              api,
              accessToken,
              `/learning/concepts/${CONCEPT_ID}/levels/foundation/state`,
            );

          expect(
            afterQuiz
              .state
              .stages
              ?.quiz
              ?.status,
          ).toBe(
            'completed',
          );

          expect(
            afterQuiz
              .state
              .stages
              ?.practice
              ?.status,
          ).toBe(
            'available',
          );

          expect(
            afterQuiz
              .state
              .stages
              ?.checkpoint
              ?.status,
          ).toBe(
            'locked',
          );

          /*
           * PRACTICAS — GATE REAL
           *
           * No se escribe progreso directamente.
           * Cada sesión se ejecuta mediante
           * /training/runs + answers reales.
           */

          await expectSessionUnavailable(
            api,
            accessToken,
            FILTER_ID,
          );

          await completeE2ESession(
            api,
            accessToken,
            CODING_ID,
            CODING_ANSWERS,
          );

          await expectSessionUnavailable(
            api,
            accessToken,
            MAP_ID,
          );

          await completeE2ESession(
            api,
            accessToken,
            FILTER_ID,
            FILTER_ANSWERS,
          );

          await expectSessionUnavailable(
            api,
            accessToken,
            REDUCE_ID,
          );

          await completeE2ESession(
            api,
            accessToken,
            MAP_ID,
            MAP_ANSWERS,
          );

          await expectSessionUnavailable(
            api,
            accessToken,
            CHECKPOINT_ID,
          );

          await completeE2ESession(
            api,
            accessToken,
            REDUCE_ID,
            REDUCE_ANSWERS,
          );

          const afterPractices =
            await getJson(
              api,
              accessToken,
              `/learning/concepts/${CONCEPT_ID}/levels/foundation/state`,
            );

          expect(
            afterPractices
              .state
              .stages
              ?.practice
              ?.status,
          ).toBe(
            'completed',
          );

          expect(
            afterPractices
              .state
              .stages
              ?.checkpoint
              ?.status,
          ).toBe(
            'available',
          );

          const beforeCheckpointConcept =
            await getJson(
              api,
              accessToken,
              `/learning/concepts/${CONCEPT_ID}/state`,
            );

          expect(
            beforeCheckpointConcept
              .state
              .completed,
          ).toBe(
            false,
          );

          /*
           * UI — CHECKPOINT
           */

          await page.goto(
            TOPIC_URL,
          );

          const checkpointNav =
            page.getByRole(
              'navigation',
              {
                name:
                  'Etapas del aprendizaje',
              },
            );

          const checkpointButton =
            checkpointNav
              .getByRole(
                'button',
                {
                  name:
                    /Checkpoint/,
                },
              );

          await expect(
            checkpointButton,
          ).toBeEnabled();

          await checkpointButton
            .click();

          await expect(
            page.getByRole(
              'heading',
              {
                name:
                  'Demuestra que dominas este nivel',
              },
            ),
          ).toBeVisible();

          await page
            .getByText(
              'Empezar checkpoint',
              {
                exact: true,
              },
            )
            .click();

          await expect(
            page,
          ).toHaveURL(
            `/practice/${CHECKPOINT_ID}`,
          );

          await answerChoiceSession(
            page,
            [
              'numeros.map((numero) => numero * 2)',
              'undefined',
              'numeros.filter((numero) => numero % 2 === 0)',
              '60',
            ],
          );

          /*
           * FOUNDATION COMPLETADO
           */

          await expect(
            page.getByText(
              'Nivel completado',
              {
                exact: true,
              },
            ),
          ).toBeVisible();

          await expect(
            page.getByRole(
              'heading',
              {
                name:
                  'Has desbloqueado el siguiente nivel',
              },
            ),
          ).toBeVisible();

          await expect(
            page.getByRole(
              'link',
              {
                name:
                  'Volver al recorrido',
              },
            ),
          ).toBeVisible();

          const foundationDone =
            await getJson(
              api,
              accessToken,
              `/learning/concepts/${CONCEPT_ID}/levels/foundation/state`,
            );

          expect(
            foundationDone
              .state
              .completed,
          ).toBe(
            true,
          );

          expect(
            foundationDone
              .state
              .stages
              ?.checkpoint
              ?.status,
          ).toBe(
            'completed',
          );

          /*
           * EL CONCEPTO AUN NO ESTA COMPLETO
           */

          const conceptAfterFoundation =
            await getJson(
              api,
              accessToken,
              `/learning/concepts/${CONCEPT_ID}/state`,
            );

          expect(
            conceptAfterFoundation
              .state
              .completed,
          ).toBe(
            false,
          );

          /*
           * DEEPENING YA ESTA DESBLOQUEADO
           */

          const deepening =
            await getJson(
              api,
              accessToken,
              `/learning/concepts/${CONCEPT_ID}/levels/deepening/state`,
            );

          expect(
            deepening
              .state
              .completed,
          ).toBe(
            false,
          );

          expect(
            deepening
              .state
              .stages
              ?.theory
              ?.status,
          ).toBe(
            'available',
          );

          expect(
            deepening
              .state
              .stages
              ?.quiz
              ?.status,
          ).toBe(
            'locked',
          );

          await page
            .getByRole(
              'link',
              {
                name:
                  'Volver al recorrido',
              },
            )
            .click();

          await expect(
            page,
          ).toHaveURL(
            TOPIC_URL,
          );

          await expect(
            page.getByRole(
              'heading',
              {
                level: 1,
                name:
                  'Arrays',
              },
            ),
          ).toBeVisible();

          /*
           * FINAL:
           * Foundation complete.
           * Deepening active.
           * Aggregate concept incomplete.
           */
        } finally {
          await api.dispose();
        }
      },
    );
  },
);
