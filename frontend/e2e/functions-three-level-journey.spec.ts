import {
  request as playwrightRequest,
  type APIRequestContext,
} from '@playwright/test';

import {
  expect,
  test,
} from './fixtures';

import {
  completeE2ESession,
} from './helpers/progress';

import {
  authenticationScenarioKey,
  type E2EAuthenticationState,
} from './helpers/authentication';

const API_BASE_URL =
  'http://127.0.0.1:3100';

const CONCEPT_ID =
  'js-function-basics';

const TOPIC_URL =
  '/tech/javascript/js-functions';

type Answer = {
  readonly exerciseId:
    string;

  readonly answer:
    unknown;
};

type SessionContract = {
  readonly id:
    string;

  readonly answers:
    readonly Answer[];
};

const FOUNDATION = {
  quiz: {
    id:
      'js-functions-foundation-quiz-01',

    answers: [
      {
        exerciseId:
          'step-1',

        answer:
          'c',
      },
    ],
  },

  practices: [
    {
      id:
        'js-functions-coding-format-name-01',

      answers: [
        {
          exerciseId:
            'step-1',

          answer:
            'function nombreCompleto(nombre, apellido) {\n'
            + '  return `${nombre.trim()} ${apellido.trim()}`;\n'
            + '}',
        },
      ],
    },
    {
      id:
        'js-functions-default-parameters-01',

      answers: [
        {
          exerciseId:
            'step-1',

          answer:
            'b',
        },
        {
          exerciseId:
            'step-2',

          answer:
            'a',
        },
        {
          exerciseId:
            'step-3',

          answer: {
            line:
              2,

            errorType:
              'logico',
          },
        },
        {
          exerciseId:
            'step-4',

          answer:
            'function crearPedido(producto, cantidad = 1) {\n'
            + '  return { producto, cantidad };\n'
            + '}',
        },
      ],
    },
  ],

  checkpoint: {
    id:
      'js-functions-foundation-checkpoint-01',

    answers: [
      {
        exerciseId:
          'step-1',

        answer:
          'function calcular(precio, impuesto = 0) {\n'
          + '  return precio + impuesto;\n'
          + '}',
      },
    ],
  },
} as const;

const DEEPENING = {
  quiz: {
    id:
      'js-functions-deepening-quiz-01',

    answers: [
      {
        exerciseId:
          'step-1',

        answer:
          'c',
      },
    ],
  },

  practices: [
    {
      id:
        'js-functions-scope-hoisting-01',

      answers: [
        {
          exerciseId:
            'step-1',

          answer:
            'b',
        },
        {
          exerciseId:
            'step-2',

          answer:
            'a',
        },
        {
          exerciseId:
            'step-3',

          answer: {
            line:
              3,

            errorType:
              'scope',
          },
        },
        {
          exerciseId:
            'step-4',

          answer:
            'function nivel(puntos) {\n'
            + "  let rango = 'inicial';\n"
            + '\n'
            + '  if (puntos >= 100) {\n'
            + "    rango = 'avanzado';\n"
            + '  }\n'
            + '\n'
            + '  return rango;\n'
            + '}',
        },
      ],
    },
    {
      id:
        'js-functions-return-flow-01',

      answers: [
        {
          exerciseId:
            'step-1',

          answer:
            'b',
        },
        {
          exerciseId:
            'step-2',

          answer:
            'b',
        },
        {
          exerciseId:
            'step-3',

          answer: {
            line:
              5,

            errorType:
              'flujo',
          },
        },
        {
          exerciseId:
            'step-4',

          answer:
            'function validar(usuario) {\n'
            + '  const errores = [];\n'
            + '\n'
            + '  if (!usuario.nombre) {\n'
            + "    errores.push('falta el nombre');\n"
            + '  }\n'
            + '\n'
            + '  if (!usuario.email) {\n'
            + "    errores.push('falta el email');\n"
            + '  }\n'
            + '\n'
            + '  return errores;\n'
            + '}',
        },
      ],
    },
  ],

  checkpoint: {
    id:
      'js-functions-deepening-checkpoint-01',

    answers: [
      {
        exerciseId:
          'step-1',

        answer:
          'function clasificar(puntos) {\n'
          + "  let rango = 'inicial';\n"
          + '\n'
          + '  if (puntos >= 100) {\n'
          + "    rango = 'avanzado';\n"
          + '  }\n'
          + '\n'
          + '  return rango;\n'
          + '}',
      },
    ],
  },
} as const;

const MASTERY = {
  quiz: {
    id:
      'js-functions-mastery-quiz-01',

    answers: [
      {
        exerciseId:
          'step-1',

        answer:
          'b',
      },
    ],
  },

  practices: [
    {
      id:
        'js-functions-mastery-contracts-01',

      answers: [
        {
          exerciseId:
            'step-1',

          answer:
            'function configurar(reintentos = 3, silencioso = true) {\n'
            + '  return { reintentos, silencioso };\n'
            + '}',
        },
      ],
    },
    {
      id:
        'js-functions-mastery-consistent-return-01',

      answers: [
        {
          exerciseId:
            'step-1',

          answer:
            'function buscarUsuario(usuarios, id) {\n'
            + '  const usuario = usuarios.find((item) => item.id === id);\n'
            + '\n'
            + '  if (usuario === undefined) {\n'
            + '    return null;\n'
            + '  }\n'
            + '\n'
            + '  return usuario;\n'
            + '}',
        },
      ],
    },
  ],

  checkpoint: {
    id:
      'js-functions-mastery-checkpoint-01',

    answers: [
      {
        exerciseId:
          'step-1',

        answer:
          "function crearPerfil(nombre = 'Invitado', edad = 18) {\n"
          + '  return { nombre, edad };\n'
          + '}',
      },
    ],
  },
} as const;

function getPreparedAccessToken(
  projectName: string,
): string {
  const serialized =
    process.env.CODEGYM_E2E_AUTH;

  if (
    serialized === undefined
  ) {
    throw new Error(
      'The E2E authentication setup did not run',
    );
  }

  const authentication =
    JSON.parse(
      serialized,
    ) as E2EAuthenticationState;

  const key =
    authenticationScenarioKey(
      projectName,
      'default',
    );

  const accessToken =
    authentication[
      key
    ];

  if (
    typeof accessToken
    !== 'string'
    || accessToken.length
    === 0
  ) {
    throw new Error(
      `No prepared E2E authentication exists for ${key}`,
    );
  }

  return accessToken;
}

async function getState(
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
    readonly state: {
      readonly completed:
        boolean;

      readonly nextLevelId?:
        string | null;

      readonly stages?: {
        readonly theory?: {
          readonly status:
            string;
        };

        readonly quiz?: {
          readonly status:
            string;
        };

        readonly practice?: {
          readonly status:
            string;
        };

        readonly checkpoint?: {
          readonly status:
            string;
        };
      };
    };
  };
}

async function completeTheory(
  api: APIRequestContext,
  accessToken: string,
  levelId: string,
): Promise<void> {
  const response =
    await api.post(
      `/learning/concepts/${CONCEPT_ID}/levels/${levelId}/theory/complete`,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      },
    );

  expect(
    response.ok(),
  ).toBe(
    true,
  );
}

async function expectLocked(
  api: APIRequestContext,
  accessToken: string,
  sessionId: string,
): Promise<void> {
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

async function completeSession(
  api: APIRequestContext,
  accessToken: string,
  session: SessionContract,
): Promise<void> {
  await completeE2ESession(
    api,
    accessToken,
    session.id,
    session.answers,
  );
}

async function completePractices(
  api: APIRequestContext,
  accessToken: string,
  practices:
    readonly SessionContract[],
): Promise<void> {
  for (
    const practice
    of practices
  ) {
    await completeSession(
      api,
      accessToken,
      practice,
    );
  }
}

async function assertLevelInitial(
  api: APIRequestContext,
  accessToken: string,
  levelId: string,
): Promise<void> {
  const state =
    await getState(
      api,
      accessToken,
      `/learning/concepts/${CONCEPT_ID}/levels/${levelId}/state`,
    );

  expect(
    state.state.completed,
  ).toBe(
    false,
  );

  expect(
    state.state.stages?.theory?.status,
  ).toBe(
    'available',
  );

  expect(
    state.state.stages?.quiz?.status,
  ).toBe(
    'locked',
  );

  expect(
    state.state.stages?.practice?.status,
  ).toBe(
    'locked',
  );

  expect(
    state.state.stages?.checkpoint?.status,
  ).toBe(
    'locked',
  );
}

async function completeLevel(
  api: APIRequestContext,
  accessToken: string,
  levelId: string,
  contract: {
    readonly quiz:
      SessionContract;

    readonly practices:
      readonly SessionContract[];

    readonly checkpoint:
      SessionContract;
  },
): Promise<void> {
  await completeTheory(
    api,
    accessToken,
    levelId,
  );

  const afterTheory =
    await getState(
      api,
      accessToken,
      `/learning/concepts/${CONCEPT_ID}/levels/${levelId}/state`,
    );

  expect(
    afterTheory.state.stages?.theory?.status,
  ).toBe(
    'completed',
  );

  expect(
    afterTheory.state.stages?.quiz?.status,
  ).toBe(
    'available',
  );

  await expectLocked(
    api,
    accessToken,
    contract.practices[
      0
    ].id,
  );

  await completeSession(
    api,
    accessToken,
    contract.quiz,
  );

  const afterQuiz =
    await getState(
      api,
      accessToken,
      `/learning/concepts/${CONCEPT_ID}/levels/${levelId}/state`,
    );

  expect(
    afterQuiz.state.stages?.quiz?.status,
  ).toBe(
    'completed',
  );

  expect(
    afterQuiz.state.stages?.practice?.status,
  ).toBe(
    'available',
  );

  await expectLocked(
    api,
    accessToken,
    contract.checkpoint.id,
  );

  await completePractices(
    api,
    accessToken,
    contract.practices,
  );

  const afterPractice =
    await getState(
      api,
      accessToken,
      `/learning/concepts/${CONCEPT_ID}/levels/${levelId}/state`,
    );

  expect(
    afterPractice.state.stages?.practice?.status,
  ).toBe(
    'completed',
  );

  expect(
    afterPractice.state.stages?.checkpoint?.status,
  ).toBe(
    'available',
  );

  await completeSession(
    api,
    accessToken,
    contract.checkpoint,
  );

  const completed =
    await getState(
      api,
      accessToken,
      `/learning/concepts/${CONCEPT_ID}/levels/${levelId}/state`,
    );

  expect(
    completed.state.completed,
  ).toBe(
    true,
  );

  expect(
    completed.state.stages?.checkpoint?.status,
  ).toBe(
    'completed',
  );
}

test.use({
  authScenario:
    'default',
});

test(
  'Functions completa Foundation -> Deepening -> Mastery y solo entonces completa el concepto',
  async ({
    page,
  }, testInfo) => {
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
      getPreparedAccessToken(
        testInfo.project.name,
      );

    try {
      /*
       * ESTADO INICIAL
       */

      const initialConcept =
        await getState(
          api,
          accessToken,
          `/learning/concepts/${CONCEPT_ID}/state`,
        );

      expect(
        initialConcept.state.completed,
      ).toBe(
        false,
      );

      await assertLevelInitial(
        api,
        accessToken,
        'foundation',
      );

      /*
       * Un nivel posterior no puede saltarse.
       */

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
        prematureDeepening.status(),
      ).toBe(
        409,
      );

      await expect(
        prematureDeepening.json(),
      ).resolves.toMatchObject({
        error: {
          code:
            'LEARNING_LEVEL_LOCKED',
        },
      });

      /*
       * UI inicial: Foundation.
       */

      await page.goto(
        TOPIC_URL,
      );

      await expect(
        page.getByRole(
          'heading',
          {
            level:
              1,

            name:
              'Functions',
          },
        ),
      ).toBeVisible();

      await expect(
        page.getByRole(
          'navigation',
          {
            name:
              'Etapas del aprendizaje',
          },
        ),
      ).toBeVisible();

      await expect(
        page.getByText(
          'Fundamentos de una función',
          {
            exact:
              true,
          },
        ),
      ).toBeVisible();

      /*
       * FOUNDATION
       */

      await completeLevel(
        api,
        accessToken,
        'foundation',
        FOUNDATION,
      );

      const afterFoundation =
        await getState(
          api,
          accessToken,
          `/learning/concepts/${CONCEPT_ID}/state`,
        );

      expect(
        afterFoundation.state.completed,
      ).toBe(
        false,
      );

      /*
       * DEEPENING AHORA DISPONIBLE.
       */

      await assertLevelInitial(
        api,
        accessToken,
        'deepening',
      );

      await page.reload();

      await expect(
        page.getByText(
          'Profundización',
          {
            exact:
              true,
          },
        ).first(),
      ).toBeVisible();

      await expect(
        page.getByText(
          'Ámbito de bloque y ámbito de función',
          {
            exact:
              true,
          },
        ),
      ).toBeVisible();

      /*
       * Aún no debe poder entrar en Mastery.
       */

      const prematureMastery =
        await api.post(
          `/learning/concepts/${CONCEPT_ID}/levels/mastery/theory/complete`,
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          },
        );

      expect(
        prematureMastery.status(),
      ).toBe(
        409,
      );

      await expect(
        prematureMastery.json(),
      ).resolves.toMatchObject({
        error: {
          code:
            'LEARNING_LEVEL_LOCKED',
        },
      });

      /*
       * DEEPENING
       */

      await completeLevel(
        api,
        accessToken,
        'deepening',
        DEEPENING,
      );

      const afterDeepening =
        await getState(
          api,
          accessToken,
          `/learning/concepts/${CONCEPT_ID}/state`,
        );

      expect(
        afterDeepening.state.completed,
      ).toBe(
        false,
      );

      /*
       * MASTERY DISPONIBLE.
       */

      await assertLevelInitial(
        api,
        accessToken,
        'mastery',
      );

      await page.reload();

      await expect(
        page.getByText(
          'Dominio',
          {
            exact:
              true,
          },
        ).first(),
      ).toBeVisible();

      await expect(
        page.getByText(
          'Una función tiene un contrato',
          {
            exact:
              true,
          },
        ),
      ).toBeVisible();

      /*
       * Antes del checkpoint final el concepto
       * debe seguir incompleto.
       */

      await completeTheory(
        api,
        accessToken,
        'mastery',
      );

      await completeSession(
        api,
        accessToken,
        MASTERY.quiz,
      );

      await completePractices(
        api,
        accessToken,
        MASTERY.practices,
      );

      const beforeFinalCheckpoint =
        await getState(
          api,
          accessToken,
          `/learning/concepts/${CONCEPT_ID}/state`,
        );

      expect(
        beforeFinalCheckpoint.state.completed,
      ).toBe(
        false,
      );

      const masteryBeforeCheckpoint =
        await getState(
          api,
          accessToken,
          `/learning/concepts/${CONCEPT_ID}/levels/mastery/state`,
        );

      expect(
        masteryBeforeCheckpoint
          .state
          .stages
          ?.checkpoint
          ?.status,
      ).toBe(
        'available',
      );

      expect(
        masteryBeforeCheckpoint
          .state
          .completed,
      ).toBe(
        false,
      );

      /*
       * CHECKPOINT FINAL.
       */

      await completeSession(
        api,
        accessToken,
        MASTERY.checkpoint,
      );

      const mastery =
        await getState(
          api,
          accessToken,
          `/learning/concepts/${CONCEPT_ID}/levels/mastery/state`,
        );

      expect(
        mastery.state.completed,
      ).toBe(
        true,
      );

      expect(
        mastery
          .state
          .stages
          ?.checkpoint
          ?.status,
      ).toBe(
        'completed',
      );

      /*
       * ÚNICAMENTE AHORA EL CONCEPTO
       * PUEDE QUEDAR COMPLETO.
       */

      const finalConcept =
        await getState(
          api,
          accessToken,
          `/learning/concepts/${CONCEPT_ID}/state`,
        );

      expect(
        finalConcept.state.completed,
      ).toBe(
        true,
      );

      expect(
        finalConcept.state.nextLevelId
        ?? null,
      ).toBe(
        null,
      );
    } finally {
      await api.dispose();
    }
  },
);
