import { randomUUID } from 'node:crypto';

import pino from 'pino';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import { createApp } from '../../src/app.js';
import { AccessTokenService } from '../../src/auth/access-token-service.js';
import { PrismaAuthSessionRepository } from '../../src/auth/auth-session-repository.js';
import { CurrentUserService } from '../../src/auth/current-user-service.js';
import { LoginService } from '../../src/auth/login-service.js';
import { LogoutService } from '../../src/auth/logout-service.js';
import { ProfileService } from '../../src/auth/profile-service.js';
import { RefreshService } from '../../src/auth/refresh-service.js';
import { SessionManagementService } from '../../src/auth/session-management-service.js';
import { PrismaUserRepository } from '../../src/auth/user-repository.js';
import { UserService } from '../../src/auth/user-service.js';
import { loadConfig } from '../../src/config/load-config.js';
import { createDatabaseService } from '../../src/database/database-service.js';
import { createPrismaClient } from '../../src/database/prisma.js';
import { createRequireAuth } from '../../src/middleware/require-auth.js';

const config = loadConfig();

if (
  !config.isTest
  || !config.database.name.endsWith('_test')
) {
  throw new Error(
    'Profile integration requires NODE_ENV=test and a DB_NAME ending in _test',
  );
}

const prisma =
  createPrismaClient(
    config.database,
  );
const database =
  createDatabaseService(
    prisma,
  );
const userRepository =
  new PrismaUserRepository(
    prisma,
  );
const authSessionRepository =
  new PrismaAuthSessionRepository(
    prisma,
  );
const accessTokenService =
  new AccessTokenService(
    config.auth,
  );
const registrationService =
  new UserService(
    userRepository,
  );
const loginService =
  new LoginService(
    userRepository,
    authSessionRepository,
    accessTokenService,
    config.auth,
  );
const app =
  createApp({
    config,
    logger: pino({
      level: 'silent',
    }),
    databaseHealthCheck: () =>
      database.healthCheck(),
    registrationService,
    loginService,
  loginFailureKeySecret:
    config.rateLimitKeySecret,
    refreshService:
      new RefreshService(
        authSessionRepository,
        accessTokenService,
        config.auth,
      ),
    logoutService:
      new LogoutService(
        authSessionRepository,
      ),
    currentUserService:
      new CurrentUserService(
        userRepository,
      ),
    profileService:
      new ProfileService(
        userRepository,
      ),
    sessionManagementService:
      new SessionManagementService(
        authSessionRepository,
      ),
    requireAuth:
      createRequireAuth({
    accessTokenService,
    authSessionRepository,
    idleSessionTimeoutSeconds:
      config.auth.idleSessionTimeoutSeconds,
  }),
  });

const runId =
  randomUUID().replaceAll(
    '-',
    '',
  );
const cleanupEmails =
  new Set<string>();
const password =
  'correct horse battery staple';

function fixtureEmail(
  label: string,
): string {
  const email =
    `profile-edit-${label}-${runId}@example.test`;

  cleanupEmails.add(
    email,
  );

  return email;
}

function accessTokenFrom(
  body: unknown,
): string {
  if (
    typeof body !== 'object'
    || body === null
    || !('accessToken' in body)
    || typeof body.accessToken !== 'string'
  ) {
    throw new Error(
      'Expected login access token',
    );
  }

  return body.accessToken;
}

describe(
  'PATCH /auth/me MySQL integration',
  () => {
    beforeAll(
      async () =>
        database.connect(),
      20_000,
    );

    afterAll(
      async () => {
        try {
          const emails = [
            ...cleanupEmails,
          ];

          if (
            emails.some(
              (email) =>
                !email.startsWith(
                  'profile-edit-',
                )
                || !email.includes(
                  runId,
                ),
            )
          ) {
            throw new Error(
              'Refusing unsafe profile integration cleanup',
            );
          }

          const users =
            await prisma.user.findMany({
              where: {
                email: {
                  in: emails,
                },
              },
              select: {
                id: true,
              },
            });
          const userIds =
            users.map(
              ({ id }) =>
                id,
            );

          if (userIds.length > 0) {
            await prisma.authSession.deleteMany({
              where: {
                userId: {
                  in: userIds,
                },
              },
            });
          }

          await prisma.user.deleteMany({
            where: {
              email: {
                in: emails,
              },
            },
          });
        } finally {
          await database.disconnect();
        }
      },
      20_000,
    );

    it('persists A displayName while leaving B unchanged', async () => {
      const emailA =
        fixtureEmail(
          'a',
        );
      const emailB =
        fixtureEmail(
          'b',
        );

      const registerA =
        await request(app)
          .post(
            '/auth/register',
          )
          .send({
            email:
              emailA,
            password,
            displayName:
              'Original A',
          });
      const registerB =
        await request(app)
          .post(
            '/auth/register',
          )
          .send({
            email:
              emailB,
            password,
            displayName:
              'Original B',
          });

      expect(
        registerA.status,
      ).toBe(201);
      expect(
        registerB.status,
      ).toBe(201);

      const loginA =
        await request(app)
          .post(
            '/auth/login',
          )
          .send({
            email:
              emailA,
            password,
            remember: false,
          });

      expect(
        loginA.status,
      ).toBe(200);

      const response =
        await request(app)
          .patch(
            '/auth/me',
          )
          .set(
            'Authorization',
            `Bearer ${accessTokenFrom(loginA.body as unknown)}`,
          )
          .send({
            displayName:
              '   Carlos Hernández   ',
          });

      expect(
        response.status,
      ).toBe(200);
      expect(
        response.body,
      ).toMatchObject({
        user: {
          email:
            emailA,
          displayName:
            'Carlos Hernández',
        },
      });
      expect(
        JSON.stringify(
          response.body,
        ),
      ).not.toContain(
        'passwordHash',
      );

      const [
        storedA,
        storedB,
      ] =
        await Promise.all([
          prisma.user.findUniqueOrThrow({
            where: {
              email:
                emailA,
            },
            select: {
              displayName:
                true,
            },
          }),
          prisma.user.findUniqueOrThrow({
            where: {
              email:
                emailB,
            },
            select: {
              displayName:
                true,
            },
          }),
        ]);

      expect(
        storedA.displayName,
      ).toBe(
        'Carlos Hernández',
      );
      expect(
        storedB.displayName,
      ).toBe(
        'Original B',
      );
    });
  },
);
