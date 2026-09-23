import {
  spawnSync,
} from 'node:child_process';

import {
  fileURLToPath,
} from 'node:url';

interface IsolatedAuthenticationResult {
  readonly accessToken?:
    unknown;

  readonly userId?:
    unknown;

  readonly sessionId?:
    unknown;
}

const BACKEND_ROOT =
  fileURLToPath(
    new URL(
      '../../../backend/',
      import.meta.url,
    ),
  );

export function createIsolatedE2EAccessToken(
  label:
    string,
  targetConceptId?:
    string,
): string {
  const result =
    spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        'scripts/e2e/create-isolated-auth-user.ts',
        label,
      ],
      {
        cwd:
          BACKEND_ROOT,

        env: {
          ...process.env,

          NODE_ENV:
            'test',

          DB_NAME:
            'codegym_test',
        },

        encoding:
          'utf8',
      },
    );

  if (
    result.error
    !== undefined
  ) {
    throw result.error;
  }

  if (
    result.status
    !== 0
  ) {
    throw new Error(
      [
        'Could not create isolated E2E authentication.',
        `exit=${String(result.status)}`,
        `stderr=${result.stderr.trim()}`,
      ].join(
        ' ',
      ),
    );
  }

  let parsed:
    IsolatedAuthenticationResult;

  try {
    parsed =
      JSON.parse(
        result.stdout,
      ) as
        IsolatedAuthenticationResult;
  } catch {
    throw new Error(
      `Invalid isolated E2E authentication response: ${result.stdout}`,
    );
  }

  if (
    typeof parsed.accessToken
      !== 'string'
    || parsed.accessToken.length
      === 0
  ) {
    throw new Error(
      'Isolated E2E authentication did not return an access token',
    );
  }

  if (
    targetConceptId !== undefined
  ) {
    if (
      typeof parsed.userId
      !== 'string'
      || parsed.userId.length
      === 0
    ) {
      throw new Error(
        'Isolated E2E authentication did not return a user id',
      );
    }

    const seed =
      spawnSync(
        process.execPath,
        [
          '--import',
          'tsx',
          'scripts/e2e/seed-learning-prerequisites.ts',
          parsed.userId,
          targetConceptId,
        ],
        {
          cwd:
            BACKEND_ROOT,

          env: {
            ...process.env,

            NODE_ENV:
              'test',

            DB_NAME:
              'codegym_test',
          },

          encoding:
            'utf8',
        },
      );

    if (
      seed.error !== undefined
    ) {
      throw seed.error;
    }

    if (
      seed.status !== 0
    ) {
      throw new Error(
        [
          'Could not seed isolated E2E learning prerequisites.',
          `exit=${String(seed.status)}`,
          `stderr=${seed.stderr.trim()}`,
        ].join(
          ' ',
        ),
      );
    }
  }

  return parsed.accessToken;
}
