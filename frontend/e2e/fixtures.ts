import {
  request as playwrightRequest,
  test as base,
} from '@playwright/test';

import {
  authenticationScenarioTargetConcept,
  type AuthenticationScenario,
} from './helpers/authentication';

import {
  createIsolatedE2EAccessToken,
} from './helpers/isolated-authentication';

import {
  ensureFoundationPrerequisites,
  seedCompletedSession,
  seedReviewProgress,
} from './helpers/progress';

export {
  expect,
  type Page,
} from '@playwright/test';

const API_BASE_URL =
  'http://127.0.0.1:3100';

interface TestOptions {
  readonly authScenario:
    AuthenticationScenario;

  readonly authTargetConceptId:
    string | undefined;
}

interface TestFixtures {
  readonly accessToken:
    string;
}

export const test = base.extend<
  TestOptions
  & TestFixtures
>({
  authScenario: [
    'clean',
    {
      option: true,
    },
  ],

  authTargetConceptId: [
    undefined,
    {
      option: true,
    },
  ],

  // E2E_ACCESS_TOKEN_FIXTURE_TIMEOUT
  //
  // Crear la identidad aislada implica arrancar infraestructura
  // Node/Prisma de test. Ese tiempo pertenece al setup del fixture,
  // no al tiempo funcional del test ni al timeout de la aplicación.
  accessToken: [
    async (
    {
      authScenario,
      authTargetConceptId,
    },
    use,
    testInfo,
  ) => {
    const targetConceptId =
      authTargetConceptId
      ?? authenticationScenarioTargetConcept(
        authScenario,
      )
      ?? undefined;

    const accessToken =
      createIsolatedE2EAccessToken(
        [
          testInfo.project.name,
          authScenario,
          String(
            testInfo.workerIndex,
          ),
          testInfo.testId,
        ].join(
          '-',
        ),
        targetConceptId,
      );

    const api =
      await playwrightRequest
        .newContext({
          baseURL:
            API_BASE_URL,
        });

    try {
      if (
        authScenario === 'main-flow'
        || authScenario
          === 'arrays-access'
        || authScenario
          === 'topic-recovery'
      ) {
        await ensureFoundationPrerequisites(
          api,
          accessToken,
        );
      }

      if (
        authScenario === 'dashboard'
      ) {
        await seedCompletedSession(
          api,
          accessToken,
          3,
        );
      }

      if (
        authScenario === 'review-progress'
      ) {
        await seedReviewProgress(
          api,
          accessToken,
        );
      }

      if (
        authScenario
        === 'technology-results'
      ) {
        await seedCompletedSession(
          api,
          accessToken,
          4,
        );
      }

      await use(
        accessToken,
      );
    } finally {
      await api.dispose();
    }
    },
    {
      timeout:
        90_000,
    },
  ],

  page: async (
    {
      accessToken,
      page,
    },
    use,
  ) => {
    await page.route(
      '**/auth/refresh',
      async (route) => {
        await route.fulfill({
          contentType: 'application/json',
          status: 200,
          body: JSON.stringify({
            accessToken:
              accessToken,
          }),
        });
      },
    );

    await use(
      page,
    );
  },
});
