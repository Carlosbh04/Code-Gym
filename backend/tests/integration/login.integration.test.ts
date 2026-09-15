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
import { RefreshService } from '../../src/auth/refresh-service.js';
import { SessionManagementService } from '../../src/auth/session-management-service.js';
import { verifyRefreshTokenDigest } from '../../src/auth/refresh-token-service.js';
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
    'DB integration requires NODE_ENV=test and a DB_NAME ending in _test',
  );
}
const prisma = createPrismaClient(
  config.database,
);
const database =
  createDatabaseService(prisma);
const userRepository =
  new PrismaUserRepository(prisma);
const authSessionRepository =
  new PrismaAuthSessionRepository(prisma);
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
const refreshService =
  new RefreshService(
    authSessionRepository,
    accessTokenService,
    config.auth,
  );
const logoutService =
  new LogoutService(
    authSessionRepository,
  );
const currentUserService =
  new CurrentUserService(
    userRepository,
  );
const sessionManagementService =
  new SessionManagementService(
    authSessionRepository,
  );
const requireAuth =
  createRequireAuth({
    accessTokenService,
    authSessionRepository,
  });
const app = createApp({
  config,
  logger: pino({
    level: 'silent',
  }),
  databaseHealthCheck: () =>
    database.healthCheck(),
  registrationService,
  loginService,
  refreshService,
  logoutService,
  currentUserService,
  sessionManagementService,
  requireAuth,
});
const runId =
  randomUUID().replaceAll(
    '-',
    '',
  );
const cleanupEmails =
  new Set<string>();
function fixtureEmail(
  label: string,
): string {
  const email =
    `t208-${label}-${runId}@example.test`;
  cleanupEmails.add(
    email,
  );
  return email;
}
function extractRefreshToken(
  setCookieHeader:
    | string
    | string[]
    | undefined,
): string {
  if (
    setCookieHeader
    === undefined
  ) {
    throw new Error(
      'Expected refresh cookie',
    );
  }
  const cookie =
    Array.isArray(
      setCookieHeader,
    )
      ? setCookieHeader[0]
      : setCookieHeader;
  if (
    cookie === undefined
  ) {
    throw new Error(
      'Expected refresh cookie',
    );
  }
  const match =
    /^codegym_refresh=([^;]+)/.exec(
      cookie,
    );
  if (
    match?.[1] === undefined
  ) {
    throw new Error(
      'Expected codegym_refresh cookie',
    );
  }
  return match[1];
}
function asRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    throw new Error(
      `Expected ${label} to be an object`,
    );
  }

  return value as Record<string, unknown>;
}


describe(
  'T208 login MySQL integration (explicit opt-in)',
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
                    't208-',
                  )
                  || !email.includes(
                    runId,
                  ),
              )
            ) {
              throw new Error(
                'Refusing unsafe T208 integration cleanup',
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
            if (
              userIds.length > 0
            ) {
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
          }
        } finally {
          await database.disconnect();
        }
      },
      20_000,
    );
    it('logs in a registered user, creates AuthSession, returns a valid access token and sends refresh token only as cookie', async () => {
      const email =
        fixtureEmail(
          'success',
        );
      const password =
        'correct horse battery staple';
      const registerResponse =
        await request(app)
          .post(
            '/auth/register',
          )
          .send({
            email,
            password,
            displayName:
              'T208 User',
          });
      expect(
        registerResponse.status,
      ).toBe(201);
      const loginResponse =
        await request(app)
          .post(
            '/auth/login',
          )
          .send({
            email:
              `  ${email.toUpperCase()}  `,
            password,
          });
      expect(
        loginResponse.status,
      ).toBe(200);
      const loginBody =
        asRecord(
          loginResponse.body as unknown,
          'login response body',
        );

      const loginUser =
        asRecord(
          loginBody.user,
          'login response user',
        );

      const accessToken =
        loginBody.accessToken;

      expect(
        loginUser,
      ).toMatchObject({
        email,
        displayName:
          'T208 User',
      });

      expect(
        typeof accessToken,
      ).toBe(
        'string',
      );

      expect(
        loginBody,
      ).not.toHaveProperty(
        'refreshToken',
      );
      const refreshToken =
        extractRefreshToken(
          loginResponse.headers[
            'set-cookie'
          ],
        );
      expect(
        refreshToken,
      ).toMatch(
        /^[A-Za-z0-9_-]{43}$/,
      );
      const storedUser =
        await prisma.user
          .findUniqueOrThrow({
            where: {
              email,
            },
            select: {
              id: true,
            },
          });
      const sessions =
        await prisma.authSession.findMany({
          where: {
            userId:
              storedUser.id,
          },
          orderBy: {
            createdAt:
              'asc',
          },
        });
      expect(
        sessions,
      ).toHaveLength(1);
      const session =
        sessions[0];
      expect(
        session,
      ).toBeDefined();
      if (
        session === undefined
      ) {
        throw new Error(
          'Expected auth session',
        );
      }
      expect(
        session.revokedAt,
      ).toBeNull();
      expect(
        session.rotatedAt,
      ).toBeNull();
      expect(
        session.expiresAt
          .getTime(),
      ).toBeGreaterThan(
        session.createdAt
          .getTime(),
      );
      expect(
        verifyRefreshTokenDigest(
          refreshToken,
          session.refreshTokenDigest,
        ),
      ).toBe(true);
      if (
        typeof accessToken !== 'string'
      ) {
        throw new Error(
          'Expected login access token',
        );
      }

      const claims =
        await accessTokenService.verify(
          accessToken,
        );
      expect(
        claims.sub,
      ).toBe(
        storedUser.id,
      );
      expect(
        claims.sid,
      ).toBe(
        session.id,
      );
    });
    it('returns the same safe 401 for a wrong password and creates no AuthSession', async () => {
      const email =
        fixtureEmail(
          'wrong-password',
        );
      const password =
        'correct horse battery staple';
      const registerResponse =
        await request(app)
          .post(
            '/auth/register',
          )
          .send({
            email,
            password,
          });
      expect(
        registerResponse.status,
      ).toBe(201);
      const storedUser =
        await prisma.user
          .findUniqueOrThrow({
            where: {
              email,
            },
            select: {
              id: true,
            },
          });
      const loginResponse =
        await request(app)
          .post(
            '/auth/login',
          )
          .send({
            email,
            password:
              'this password is incorrect',
          });
      expect(
        loginResponse.status,
      ).toBe(401);
      expect(
        loginResponse.body,
      ).toEqual({
        error: {
          code:
            'INVALID_CREDENTIALS',
          message:
            'Invalid email or password',
        },
      });
      expect(
        loginResponse.headers[
          'set-cookie'
        ],
      ).toBeUndefined();
      expect(
        await prisma.authSession.count({
          where: {
            userId:
              storedUser.id,
          },
        }),
      ).toBe(0);
    });
    it('returns the same safe 401 for an unknown email and creates no user or AuthSession', async () => {
      const email =
        fixtureEmail(
          'missing-user',
        );
      const loginResponse =
        await request(app)
          .post(
            '/auth/login',
          )
          .send({
            email,
            password:
              'correct horse battery staple',
          });
      expect(
        loginResponse.status,
      ).toBe(401);
      expect(
        loginResponse.body,
      ).toEqual({
        error: {
          code:
            'INVALID_CREDENTIALS',
          message:
            'Invalid email or password',
        },
      });
      expect(
        loginResponse.headers[
          'set-cookie'
        ],
      ).toBeUndefined();
      const missingUser =
        await prisma.user.findUnique({
          where: {
            email,
          },
          select: {
            id: true,
            authSessions: {
              select: {
                id: true,
              },
            },
          },
        });
      expect(
        missingUser,
      ).toBeNull();
    });
  },
);
