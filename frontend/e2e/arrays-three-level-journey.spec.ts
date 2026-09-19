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
} from './fixtures';

import {
  completeE2ESession,
} from './helpers/progress';

const API_BASE_URL =
  'http://127.0.0.1:3100';

const CONCEPT_ID =
  'js-array-iteration';

type Answer = {
  readonly exerciseId:
    string;
  readonly answer:
    unknown;
};

const FOUNDATION = {
  quiz: {
    id:
      'js-arrays-iteration-quiz-01',

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
        answer:
          'b',
      },
      {
        exerciseId:
          'step-4',
        answer:
          'b',
      },
      {
        exerciseId:
          'step-5',
        answer:
          'c',
      },
    ],
  },

  practices: [
    {
      id:
        'js-arrays-coding-transform-01',

      answers: [
        {
          exerciseId:
            'step-1',
          answer:
            'function aplicarDescuento(precios) {\n'
            + '  return precios.map((precio) => precio * 0.9);\n'
            + '}',
        },
      ],
    },

    {
      id:
        'js-arrays-filter-mutation-01',

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
              2,
            errorType:
              'conceptual',
          },
        },
        {
          exerciseId:
            'step-4',
          answer:
            'function positivos(numeros) {\n'
            + '  return numeros.filter((numero) => numero > 0);\n'
            + '}',
        },
      ],
    },

    {
      id:
        'js-arrays-map-vs-foreach-01',

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
              'conceptual',
          },
        },
        {
          exerciseId:
            'step-4',
          answer:
            'function dobles(numeros) {\n'
            + '  return numeros.map((n) => n * 2);\n'
            + '}',
        },
      ],
    },

    {
      id:
        'js-arrays-reduce-accumulator-01',

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
              'flujo',
          },
        },
        {
          exerciseId:
            'step-4',
          answer:
            'function sumar(numeros) {\n'
            + '  return numeros.reduce((acc, numero) => acc + numero, 0);\n'
            + '}',
        },
      ],
    },
  ],

  checkpoint: {
    id:
      'js-arrays-iteration-checkpoint-01',

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
          'c',
      },
      {
        exerciseId:
          'step-3',
        answer:
          'b',
      },
      {
        exerciseId:
          'step-4',
        answer:
          'b',
      },
    ],
  },
} as const;

const DEEPENING = {
  quiz: {
    id:
      'js-arrays-deepening-quiz-01',

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
        answer:
          'b',
      },
      {
        exerciseId:
          'step-4',
        answer:
          'c',
      },
      {
        exerciseId:
          'step-5',
        answer:
          'c',
      },
    ],
  },

  practices: [
    {
      id:
        'js-arrays-deepening-mutation-01',

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
              3,
            errorType:
              'conceptual',
          },
        },
        {
          exerciseId:
            'step-4',
          answer:
            'b',
        },
      ],
    },

    {
      id:
        'js-arrays-deepening-references-01',

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
          answer:
            'b',
        },
        {
          exerciseId:
            'step-4',
          answer: {
            line:
              3,
            errorType:
              'conceptual',
          },
        },
      ],
    },

    {
      id:
        'js-arrays-deepening-callback-effects-01',

      answers: [
        {
          exerciseId:
            'step-1',
          answer:
            'c',
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
              3,
            errorType:
              'conceptual',
          },
        },
        {
          exerciseId:
            'step-4',
          answer:
            'a',
        },
      ],
    },

    {
      id:
        'js-arrays-deepening-chaining-01',

      answers: [
        {
          exerciseId:
            'step-1',
          answer:
            'a',
        },
        {
          exerciseId:
            'step-2',
          answer:
            'c',
        },
        {
          exerciseId:
            'step-3',
          answer:
            'a',
        },
        {
          exerciseId:
            'step-4',
          answer: {
            line:
              3,
            errorType:
              'conceptual',
          },
        },
      ],
    },
  ],

  checkpoint: {
    id:
      'js-arrays-deepening-checkpoint-01',

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
        answer:
          'a',
      },
      {
        exerciseId:
          'step-4',
        answer:
          'c',
      },
    ],
  },
} as const;

const MASTERY = {
  quiz: {
    id:
      'js-arrays-mastery-quiz-01',

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
          'c',
      },
      {
        exerciseId:
          'step-3',
        answer:
          'a',
      },
      {
        exerciseId:
          'step-4',
        answer:
          'b',
      },
      {
        exerciseId:
          'step-5',
        answer:
          'c',
      },
    ],
  },

  practices: [
    {
      id:
        'js-arrays-mastery-object-accumulator-01',

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
            'c',
        },
        {
          exerciseId:
            'step-3',
          answer: {
            line:
              3,
            errorType:
              'flow',
          },
        },
        {
          exerciseId:
            'step-4',
          answer:
            'a',
        },
      ],
    },

    {
      id:
        'js-arrays-mastery-grouping-01',

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
            'c',
        },
        {
          exerciseId:
            'step-3',
          answer:
            'a',
        },
        {
          exerciseId:
            'step-4',
          answer: {
            line:
              4,
            errorType:
              'conceptual',
          },
        },
      ],
    },

    {
      id:
        'js-arrays-mastery-frequency-01',

      answers: [
        {
          exerciseId:
            'step-1',
          answer:
            'c',
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
              'conceptual',
          },
        },
        {
          exerciseId:
            'step-4',
          answer:
            'a',
        },
      ],
    },

    {
      id:
        'js-arrays-mastery-integrated-01',

      answers: [
        {
          exerciseId:
            'step-1',
          answer:
            'a',
        },
        {
          exerciseId:
            'step-2',
          answer:
            'c',
        },
        {
          exerciseId:
            'step-3',
          answer:
            'b',
        },
        {
          exerciseId:
            'step-4',
          answer: {
            line:
              6,
            errorType:
              'flow',
          },
        },
      ],
    },
  ],

  checkpoint: {
    id:
      'js-arrays-mastery-checkpoint-01',

    answers: [
      {
        exerciseId:
          'step-1',
        answer:
          'c',
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
        answer:
          'a',
      },
      {
        exerciseId:
          'step-4',
        answer: {
          line:
            3,
          errorType:
            'conceptual',
        },
      },
      {
        exerciseId:
          'step-5',
        answer:
          'c',
      },
    ],
  },
} as const;

async function createUser(
  api: APIRequestContext,
): Promise<string> {
  void api;

  return createIsolatedE2EAccessToken(
    'arrays-three-level-journey',
  );
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
    state: {
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
    response.status(),
  ).toBe(
    200,
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
  session: {
    readonly id:
      string;
    readonly answers:
      readonly Answer[];
  },
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
  sessions: readonly {
    readonly id:
      string;
    readonly answers:
      readonly Answer[];
  }[],
): Promise<void> {
  for (
    const session
    of sessions
  ) {
    await completeSession(
      api,
      accessToken,
      session,
    );
  }
}

test(
  'Arrays completa Foundation -> Deepening -> Mastery y solo entonces completa el concepto',
  async () => {
    test.setTimeout(
      120_000,
    );

    const api =
      await playwrightRequest
        .newContext({
          baseURL:
            API_BASE_URL,
        });

    try {
      const accessToken =
        await createUser(
          api,
        );

      /*
       * INITIAL
       */

      const initial =
        await getState(
          api,
          accessToken,
          `/learning/concepts/${CONCEPT_ID}/state`,
        );

      expect(
        initial.state.completed,
      ).toBe(
        false,
      );

      await expectLocked(
        api,
        accessToken,
        DEEPENING.quiz.id,
      );

      await expectLocked(
        api,
        accessToken,
        MASTERY.quiz.id,
      );

      /*
       * FOUNDATION
       */

      await completeTheory(
        api,
        accessToken,
        'foundation',
      );

      await completeSession(
        api,
        accessToken,
        FOUNDATION.quiz,
      );

      await completePractices(
        api,
        accessToken,
        FOUNDATION.practices,
      );

      await completeSession(
        api,
        accessToken,
        FOUNDATION.checkpoint,
      );

      const foundation =
        await getState(
          api,
          accessToken,
          `/learning/concepts/${CONCEPT_ID}/levels/foundation/state`,
        );

      expect(
        foundation.state.completed,
      ).toBe(
        true,
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

      const deepeningInitial =
        await getState(
          api,
          accessToken,
          `/learning/concepts/${CONCEPT_ID}/levels/deepening/state`,
        );

      expect(
        deepeningInitial
          .state
          .stages
          ?.theory
          ?.status,
      ).toBe(
        'available',
      );

      expect(
        deepeningInitial
          .state
          .stages
          ?.quiz
          ?.status,
      ).toBe(
        'locked',
      );

      /*
       * DEEPENING
       */

      await completeTheory(
        api,
        accessToken,
        'deepening',
      );

      await completeSession(
        api,
        accessToken,
        DEEPENING.quiz,
      );

      await expectLocked(
        api,
        accessToken,
        DEEPENING.practices[
          1
        ].id,
      );

      await completePractices(
        api,
        accessToken,
        DEEPENING.practices,
      );

      await completeSession(
        api,
        accessToken,
        DEEPENING.checkpoint,
      );

      const deepening =
        await getState(
          api,
          accessToken,
          `/learning/concepts/${CONCEPT_ID}/levels/deepening/state`,
        );

      expect(
        deepening.state.completed,
      ).toBe(
        true,
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

      const masteryInitial =
        await getState(
          api,
          accessToken,
          `/learning/concepts/${CONCEPT_ID}/levels/mastery/state`,
        );

      expect(
        masteryInitial
          .state
          .stages
          ?.theory
          ?.status,
      ).toBe(
        'available',
      );

      expect(
        masteryInitial
          .state
          .stages
          ?.quiz
          ?.status,
      ).toBe(
        'locked',
      );

      /*
       * MASTERY
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

      await expectLocked(
        api,
        accessToken,
        MASTERY.practices[
          1
        ].id,
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
        beforeFinalCheckpoint
          .state
          .completed,
      ).toBe(
        false,
      );

      await completeSession(
        api,
        accessToken,
        MASTERY.checkpoint,
      );

      /*
       * FINAL AUTHORITATIVE STATE
       */

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

      const finalConcept =
        await getState(
          api,
          accessToken,
          `/learning/concepts/${CONCEPT_ID}/state`,
        );

      expect(
        finalConcept
          .state
          .completed,
      ).toBe(
        true,
      );

      expect(
        finalConcept
          .state
          .nextLevelId
          ?? null,
      ).toBe(
        null,
      );
    } finally {
      await api.dispose();
    }
  },
);
