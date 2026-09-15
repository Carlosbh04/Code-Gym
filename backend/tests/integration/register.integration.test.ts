import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import pino from 'pino';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import {
  createApp,
  type AppDependencies,
} from '../../src/app.js';
import { CurrentUserService } from '../../src/auth/current-user-service.js';
import type { LoginService } from '../../src/auth/login-service.js';
import type { LogoutService } from '../../src/auth/logout-service.js';
import { verifyPassword } from '../../src/auth/password-service.js';
import type { RefreshService } from '../../src/auth/refresh-service.js';
import { PrismaUserRepository } from '../../src/auth/user-repository.js';
import { UserService } from '../../src/auth/user-service.js';
import { loadConfig } from '../../src/config/load-config.js';
import { createDatabaseService } from '../../src/database/database-service.js';
import { createPrismaClient } from '../../src/database/prisma.js';
const config = loadConfig();
if (
  !config.isTest
  || !config.database.name.endsWith('_test')
) {
  throw new Error(
    'DB integration requires NODE_ENV=test and a DB_NAME ending in _test',
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
const runId =
  randomUUID().replaceAll(
    '-',
    '',
  );
const cleanupEmails =
  new Set<string>();
const unusedLoginService = {
  login: () =>
    Promise.reject(
      new Error(
        'Login is not exercised by T207 register integration tests',
      ),
    ),
} as unknown as LoginService;
const unusedRefreshService = {
  refresh: () =>
    Promise.reject(
      new Error(
        'Refresh is not exercised by T207 register integration tests',
      ),
    ),
} as unknown as RefreshService;
const unusedLogoutService = {
  logout: () =>
    Promise.reject(
      new Error(
        'Logout is not exercised by T207 register integration tests',
      ),
    ),
} as unknown as LogoutService;
const unusedCurrentUserService =
  new CurrentUserService(
    userRepository,
  );
const unusedSessionManagementService:
  AppDependencies['sessionManagementService'] = {
    listSessions: () =>
      Promise.reject(
        new Error(
          'Session management is not exercised by register integration tests',
        ),
      ),
    revokeSession: () =>
      Promise.reject(
        new Error(
          'Session management is not exercised by register integration tests',
        ),
      ),
    revokeOtherSessions: () =>
      Promise.reject(
        new Error(
          'Session management is not exercised by register integration tests',
        ),
      ),
  };
const unusedRequireAuth: RequestHandler = (
  _request,
  _response,
  next,
) => {
  next();
};
const app = createApp({
  config,
  logger: pino({
    level: 'silent',
  }),
  databaseHealthCheck: () =>
    database.healthCheck(),
  registrationService:
    new UserService(
      userRepository,
    ),
  loginService:
    unusedLoginService,
  refreshService:
    unusedRefreshService,
  logoutService:
    unusedLogoutService,
  currentUserService:
    unusedCurrentUserService,
  sessionManagementService:
    unusedSessionManagementService,
  requireAuth:
    unusedRequireAuth,
});
function fixtureEmail(
  label: string,
): string {
  const email =
    `t207-${label}-${runId}@example.test`;
  cleanupEmails.add(
    email,
  );
  return email;
}
describe(
  'T207 register MySQL integration (explicit opt-in)',
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
            emails.length > 0
          ) {
            if (
              emails.some(
                (email) =>
                  !email.startsWith(
                    't207-',
                  )
                  || !email.includes(
                    runId,
                  ),
              )
            ) {
              throw new Error(
                'Refusing unsafe T207 integration cleanup',
              );
            }
            await prisma.user.deleteMany({
              where: {
                email: {
                  in: emails,
                },
              },
            });
          }
        } finally {
          await database.disconnect();
        }
      },
      20_000,
    );
    it('registers through HTTP, persists canonical email and an verifiable Argon hash, and creates no session', async () => {
      const email =
        fixtureEmail(
          'create',
        );
      const password =
        'correct horse battery staple';
      const health =
        await request(app)
          .get('/health');
      const databaseHealth =
        await request(app)
          .get('/health/db');
      const response =
        await request(app)
          .post(
            '/auth/register',
          )
          .send({
            email:
              `  ${email.toUpperCase()}  `,
            password,
            displayName:
              '  T207 User  ',
          });
      const responseBody =
        response.body as {
          user: Record<
            string,
            unknown
          >;
        };
      expect(
        health.status,
      ).toBe(200);
      expect(
        databaseHealth.status,
      ).toBe(200);
      expect(
        response.status,
      ).toBe(201);
      expect(
        responseBody.user,
      ).toMatchObject({
        email,
        displayName:
          'T207 User',
      });
      expect(
        responseBody.user.id,
      ).toMatch(
        /^[a-z0-9]{24}$/,
      );
      expect(
        typeof responseBody
          .user.createdAt,
      ).toBe(
        'string',
      );
      expect(
        typeof responseBody
          .user.updatedAt,
      ).toBe(
        'string',
      );
      expect(
        response.headers[
          'set-cookie'
        ],
      ).toBeUndefined();
      expect(
        responseBody.user,
      ).not.toHaveProperty(
        'password',
      );
      expect(
        responseBody.user,
      ).not.toHaveProperty(
        'passwordHash',
      );
      expect(
        responseBody.user,
      ).not.toHaveProperty(
        'authSession',
      );
      expect(
        responseBody.user,
      ).not.toHaveProperty(
        'refreshToken',
      );
      const stored =
        await prisma.user
          .findUniqueOrThrow({
            where: {
              email,
            },
            select: {
              id: true,
              email: true,
              passwordHash:
                true,
            },
          });
      expect(
        stored.email,
      ).toBe(
        email,
      );
      expect(
        stored.passwordHash,
      ).toMatch(
        /^\$argon2id\$/,
      );
      expect(
        stored.passwordHash,
      ).not.toContain(
        password,
      );

      if (stored.passwordHash === null) {
        throw new Error('Registered password user unexpectedly has no password hash');
      }

      await expect(
        verifyPassword(
          stored.passwordHash,
          password,
        ),
      ).resolves.toBe(
        true,
      );
      expect(
        await prisma.authSession.count({
          where: {
            userId:
              stored.id,
          },
        }),
      ).toBe(0);
      const credentialColumns =
        await prisma.$queryRaw<
          Array<{
            columnName: string;
          }>
        >`
          SELECT COLUMN_NAME AS columnName
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
            AND COLUMN_NAME IN (
              'password',
              'plaintext_password',
              'password_hash'
            )
          ORDER BY COLUMN_NAME
        `;
      expect(
        credentialColumns.map(
          ({ columnName }) =>
            columnName,
        ),
      ).toEqual([
        'password_hash',
      ]);
    });
    it('maps a duplicate canonical email variant to the safe 409 contract', async () => {
      const email =
        fixtureEmail(
          'duplicate',
        );
      const password =
        'correct horse battery staple';
      const first =
        await request(app)
          .post(
            '/auth/register',
          )
          .send({
            email:
              ` ${email.toUpperCase()} `,
            password,
          });
      const duplicate =
        await request(app)
          .post(
            '/auth/register',
          )
          .send({
            email,
            password,
            displayName:
              'Different Name',
          });
      expect(
        first.status,
      ).toBe(201);
      expect(
        duplicate.status,
      ).toBe(409);
      expect(
        duplicate.body,
      ).toEqual({
        error: {
          code:
            'EMAIL_ALREADY_EXISTS',
          message:
            'An account with this email already exists',
        },
      });
      expect(
        duplicate.text,
      ).not.toContain(
        'P2002',
      );
      expect(
        duplicate.text,
      ).not.toContain(
        'users_email_key',
      );
      expect(
        await prisma.user.count({
          where: {
            email,
          },
        }),
      ).toBe(1);
    });
    it('lets exactly one concurrent registration win the database unique race and creates no AuthSession', async () => {
      const email =
        fixtureEmail(
          'race',
        );
      const password =
        'correct horse battery staple';
      const [
        first,
        second,
      ] =
        await Promise.all([
          request(app)
            .post(
              '/auth/register',
            )
            .send({
              email:
                email.toUpperCase(),
              password,
              displayName:
                'First racer',
            }),
          request(app)
            .post(
              '/auth/register',
            )
            .send({
              email:
                `  ${email}  `,
              password,
              displayName:
                'Second racer',
            }),
        ]);
      expect(
        [
          first.status,
          second.status,
        ].sort(
          (
            left,
            right,
          ) =>
            left - right,
        ),
      ).toEqual([
        201,
        409,
      ]);
      expect(
        await prisma.user.count({
          where: {
            email,
          },
        }),
      ).toBe(1);
      const winner =
        await prisma.user
          .findUniqueOrThrow({
            where: {
              email,
            },
            select: {
              id: true,
              passwordHash:
                true,
            },
          });
      expect(
        winner.passwordHash,
      ).not.toBeNull();

      if (winner.passwordHash === null) {
        throw new Error('Winning registered user unexpectedly has no password hash');
      }

      await expect(
        verifyPassword(
          winner.passwordHash,
          password,
        ),
      ).resolves.toBe(
        true,
      );
      expect(
        await prisma.authSession.count({
          where: {
            userId:
              winner.id,
          },
        }),
      ).toBe(0);
    });
  },
);
