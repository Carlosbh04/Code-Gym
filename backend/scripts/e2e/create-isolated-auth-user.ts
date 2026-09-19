import {
  randomBytes,
  randomUUID,
} from 'node:crypto';

import {
  AccessTokenService,
} from '../../src/auth/access-token-service.js';

import {
  PrismaAuthSessionRepository,
} from '../../src/auth/auth-session-repository.js';

import {
  loadConfig,
} from '../../src/config/load-config.js';

import {
  createPrismaClient,
} from '../../src/database/prisma.js';

interface Result {
  readonly accessToken:
    string;

  readonly userId:
    string;

  readonly sessionId:
    string;
}

function assertTestDatabase(
  config:
    ReturnType<typeof loadConfig>,
): void {
  if (
    !config.isTest
    || !config.database.name
      .endsWith(
        '_test',
      )
  ) {
    throw new Error(
      'Isolated E2E auth requires NODE_ENV=test and a database ending in _test',
    );
  }

  if (
    config.database.name
    === 'codegym'
  ) {
    throw new Error(
      'Refusing to create an isolated E2E identity in the development/production database',
    );
  }
}

function normalizeLabel(
  input:
    string | undefined,
): string {
  const normalized =
    (
      input
      ?? 'isolated'
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9-]+/g,
        '-',
      )
      .replace(
        /^-+|-+$/g,
        '',
      )
      .slice(
        0,
        48,
      );

  return (
    normalized.length > 0
      ? normalized
      : 'isolated'
  );
}

async function main():
Promise<void> {
  const config =
    loadConfig();

  assertTestDatabase(
    config,
  );

  const prisma =
    createPrismaClient(
      config.database,
    );

  try {
    const label =
      normalizeLabel(
        process.argv[2],
      );

    const nonce =
      randomUUID()
        .replaceAll(
          '-',
          '',
        );

    const user =
      await prisma.user.create({
        data: {
          email:
            `playwright-${label}-${nonce}@codegym.test`,

          displayName:
            'Carlos',
        },

        select: {
          id:
            true,
        },
      });

    const authSessions =
      new PrismaAuthSessionRepository(
        prisma,
      );

    const session =
      await authSessions
        .createSession({
          userId:
            user.id,

          refreshTokenDigest:
            randomBytes(
              32,
            ),

          expiresAt:
            new Date(
              Date.now()
              + 60 * 60 * 1_000,
            ),

          remembered:
            false,
        });

    const accessTokens =
      new AccessTokenService(
        config.auth,
      );

    const accessToken =
      await accessTokens.sign({
        userId:
          user.id,

        sessionId:
          session.id,
      });

    const result:
      Result = {
        accessToken,

        userId:
          user.id,

        sessionId:
          session.id,
      };

    process.stdout.write(
      JSON.stringify(
        result,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

await main();
