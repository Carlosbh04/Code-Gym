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
    idleSessionTimeoutSeconds:
      config.auth.idleSessionTimeoutSeconds,
  });
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
const password =
  'correct horse battery staple';
function fixtureEmail(
  label: string,
): string {
  const email =
    `t212-${label}-${runId}@example.test`;
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
function extractAccessToken(
  body: unknown,
): string {
  if (
    typeof body !== 'object'
    || body === null
    || !(
      'accessToken'
      in body
    )
    || typeof body.accessToken
      !== 'string'
  ) {
    throw new Error(
      'Expected accessToken response',
    );
  }
  return body.accessToken;
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
  'T212 GET /auth/me MySQL integration (explicit opt-in)',
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
                    't212-',
                  )
                  || !email.includes(
                    runId,
                  ),
              )
            ) {
              throw new Error(
                'Refusing unsafe T212 integration cleanup',
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
    it('returns the authenticated user from MySQL using a real active access token and session', async () => {
      const email =
        fixtureEmail(
          'success',
        );
      const registerResponse =
        await request(app)
          .post(
            '/auth/register',
          )
          .send({
            email,
            password,
            displayName:
              'T212 User',
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
            email,
            password,
            remember: false,
          });
      expect(
        loginResponse.status,
      ).toBe(200);
      const accessToken =
        extractAccessToken(
          loginResponse.body,
        );
      const response =
        await request(app)
          .get('/auth/me')
          .set(
            'Authorization',
            `Bearer ${accessToken}`,
          );
      expect(
        response.status,
      ).toBe(200);
      const responseBody =
        asRecord(
          response.body as unknown,
          'current user response body',
        );

      const responseUser =
        asRecord(
          responseBody.user,
          'current user',
        );
      expect(
        responseUser,
      ).toMatchObject({
        email,
        displayName:
          'T212 User',
      });
      expect(
        responseUser.id,
      ).toMatch(
        /^[a-z0-9]{24}$/,
      );
      expect(
        typeof responseUser
          .createdAt,
      ).toBe(
        'string',
      );
      expect(
        typeof responseUser
          .updatedAt,
      ).toBe(
        'string',
      );
      expect(
        responseUser,
      ).not.toHaveProperty(
        'password',
      );
      expect(
        responseUser,
      ).not.toHaveProperty(
        'passwordHash',
      );
      expect(
        responseUser,
      ).not.toHaveProperty(
        'refreshToken',
      );
      expect(
        responseUser,
      ).not.toHaveProperty(
        'refreshTokenDigest',
      );
      expect(
        responseUser,
      ).not.toHaveProperty(
        'authSessions',
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
      expect(
        responseUser.id,
      ).toBe(
        storedUser.id,
      );
    });
    it('rejects the old access token after logout revokes its database session', async () => {
      const email =
        fixtureEmail(
          'logout',
        );
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
      const loginResponse =
        await request(app)
          .post(
            '/auth/login',
          )
          .send({
            email,
            password,
            remember: false,
          });
      expect(
        loginResponse.status,
      ).toBe(200);
      const accessToken =
        extractAccessToken(
          loginResponse.body,
        );
      const refreshToken =
        extractRefreshToken(
          loginResponse.headers[
            'set-cookie'
          ],
        );
      const beforeLogout =
        await request(app)
          .get('/auth/me')
          .set(
            'Authorization',
            `Bearer ${accessToken}`,
          );
      expect(
        beforeLogout.status,
      ).toBe(200);
      const logoutResponse =
        await request(app)
          .post(
            '/auth/logout',
          )
          .set(
            'Cookie',
            `codegym_refresh=${refreshToken}`,
          );
      expect(
        logoutResponse.status,
      ).toBe(204);
      const afterLogout =
        await request(app)
          .get('/auth/me')
          .set(
            'Authorization',
            `Bearer ${accessToken}`,
          );
      expect(
        afterLogout.status,
      ).toBe(401);
      expect(
        afterLogout.body,
      ).toEqual({
        error: {
          code:
            'UNAUTHORIZED',
          message:
            'Authentication required',
        },
      });
    });
    it('rejects GET /auth/me when no access token is supplied', async () => {
      const response =
        await request(app)
          .get('/auth/me');
      expect(
        response.status,
      ).toBe(401);
      expect(
        response.body,
      ).toEqual({
        error: {
          code:
            'UNAUTHORIZED',
          message:
            'Authentication required',
        },
      });
    });
  },
);
