import {
  test as base,
} from '@playwright/test';

import {
  authenticationScenarioKey,
  type AuthenticationScenario,
  type E2EAuthenticationState,
} from './helpers/authentication';

export {
  expect,
  type Page,
} from '@playwright/test';

interface TestFixtures {
  readonly authScenario:
    AuthenticationScenario;
  readonly authenticatePage: void;
}

export const test = base.extend<TestFixtures>({
  authScenario: [
    'default',
    {
      option: true,
    },
  ],

  authenticatePage: [
    async (
      {
        authScenario,
        page,
      },
      use,
      testInfo,
    ) => {
      const serialized =
        process.env.CODEGYM_E2E_AUTH;

      if (serialized === undefined) {
        throw new Error(
          'The E2E authentication setup did not run',
        );
      }

      const authentication = JSON.parse(
        serialized,
      ) as E2EAuthenticationState;
      const key = authenticationScenarioKey(
        testInfo.project.name,
        authScenario,
      );
      const accessToken = authentication[key];

      if (accessToken === undefined) {
        throw new Error(
          `No E2E authentication exists for ${key}`,
        );
      }

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

      await use();
    },
    {
      auto: true,
    },
  ],
});
