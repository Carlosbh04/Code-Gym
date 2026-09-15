import {
  request,
  type FullConfig,
} from '@playwright/test';

import {
  AUTHENTICATION_SCENARIOS,
  authenticationScenarioKey,
  type E2EAuthenticationState,
} from './helpers/authentication';
import {
  seedCompletedSession,
  seedReviewProgress,
} from './helpers/progress';

const API_BASE_URL = 'http://127.0.0.1:3100';
const TEST_PASSWORD = 'CodeGym E2E password 2026!';

interface LoginResponse {
  readonly accessToken?: unknown;
}

export default async function globalSetup(
  config: FullConfig,
): Promise<void> {
  const api = await request.newContext({
    baseURL: API_BASE_URL,
  });
  const runId = `${Date.now()}-${process.pid}`;
  const authentication: Record<string, string> = {};

  try {
    for (const project of config.projects) {
      for (const scenario of AUTHENTICATION_SCENARIOS) {
        const projectSlug = project.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-');
        const email = `playwright-${runId}-${projectSlug}-${scenario}@codegym.test`;
        const registration = await api.post(
          '/auth/register',
          {
            data: {
              displayName: 'Carlos',
              email,
              password: TEST_PASSWORD,
            },
          },
        );

        if (registration.status() !== 201) {
          throw new Error(
            `Could not create the E2E user (${registration.status()}): ${await registration.text()}`,
          );
        }

        const login = await api.post(
          '/auth/login',
          {
            data: {
              email,
              password: TEST_PASSWORD,
            },
          },
        );

        if (!login.ok()) {
          throw new Error(
            `Could not authenticate the E2E user (${login.status()}): ${await login.text()}`,
          );
        }

        const body = await login.json() as LoginResponse;

        if (
          typeof body.accessToken !== 'string'
          || body.accessToken.length === 0
        ) {
          throw new Error(
            'The E2E login response did not contain an access token',
          );
        }

        const accessToken = body.accessToken;

        authentication[
          authenticationScenarioKey(
            project.name,
            scenario,
          )
        ] = accessToken;

        if (scenario === 'dashboard') {
          await seedCompletedSession(
            api,
            accessToken,
            3,
          );
        }

        if (scenario === 'review') {
          await seedReviewProgress(
            api,
            accessToken,
          );
        }

        if (
          scenario ===
            'technology-results'
        ) {
          await seedCompletedSession(
            api,
            accessToken,
            4,
          );
        }
      }
    }
  } finally {
    await api.dispose();
  }

  process.env.CODEGYM_E2E_AUTH =
    JSON.stringify(authentication);
}
