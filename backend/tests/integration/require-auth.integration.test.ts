import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import { AccessTokenService } from '../../src/auth/access-token-service.js';
import { PrismaAuthSessionRepository } from '../../src/auth/auth-session-repository.js';
import { CurrentUserService } from '../../src/auth/current-user-service.js';
import { LoginService } from '../../src/auth/login-service.js';
import { LogoutService } from '../../src/auth/logout-service.js';
import { RefreshService } from '../../src/auth/refresh-service.js';
import { SessionManagementService } from '../../src/auth/session-management-service.js';
import { digestRefreshToken } from '../../src/auth/refresh-token-service.js';
import { PrismaUserRepository } from '../../src/auth/user-repository.js';
import { UserService } from '../../src/auth/user-service.js';
import { loadConfig } from '../../src/config/load-config.js';
import { createDatabaseService } from '../../src/database/database-service.js';
import { createPrismaClient } from '../../src/database/prisma.js';
import { createRequireAuth } from '../../src/middleware/require-auth.js';
import { createAuthRouter } from '../../src/routes/auth.js';
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
  express();
app.use(
  express.json({
    limit: '100kb',
    strict: true,
  }),
);
app.use(
  createAuthRouter({
    registrationService,
    loginService,
    refreshService,
    logoutService,
    currentUserService,
    sessionManagementService,
    requireAuth,
    config,
    loginFailureKeySecret:
      config.rateLimitKeySecret,
  }),
);
app.get(
  '/_test/protected',
  requireAuth,
  (
    request,
    response,
  ) => {
    response.status(200).json({
      auth:
        request.auth,
    });
  },
);
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
    `t211-${label}-${runId}@example.test`;
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
  const match =
    cookie === undefined
      ? null
      : /^codegym_refresh=([^;]+)/.exec(
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
  responseText: string,
): string {
  const body: unknown =
    JSON.parse(
      responseText,
    );
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
describe(
  'T211 require-auth MySQL integration (explicit opt-in)',
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
                    't211-',
                  )
                  || !email.includes(
                    runId,
                  ),
              )
            ) {
              throw new Error(
                'Refusing unsafe T211 integration cleanup',
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
    it('accepts the active access token and rejects that same token after logout revokes its exact session', async () => {
      const email =
        fixtureEmail(
          'logout-invalidation',
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
          loginResponse.text,
        );
      const refreshToken =
        extractRefreshToken(
          loginResponse.headers[
            'set-cookie'
          ],
        );
      const user =
        await prisma.user
          .findUniqueOrThrow({
            where: {
              email,
            },
            select: {
              id: true,
            },
          });
      const session =
        await prisma.authSession
          .findUniqueOrThrow({
            where: {
              refreshTokenDigest:
                new Uint8Array(
                  digestRefreshToken(
                    refreshToken,
                  ),
                ),
            },
            select: {
              id: true,
              userId: true,
              revokedAt:
                true,
            },
          });
      expect(
        session.userId,
      ).toBe(
        user.id,
      );
      expect(
        session.revokedAt,
      ).toBeNull();
      const beforeLogout =
        await request(app)
          .get(
            '/_test/protected',
          )
          .set(
            'Authorization',
            `Bearer ${accessToken}`,
          );
      expect(
        beforeLogout.status,
      ).toBe(200);
      expect(
        beforeLogout.body,
      ).toEqual({
        auth: {
          userId:
            user.id,
          sessionId:
            session.id,
        },
      });
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
      const revokedSession =
        await prisma.authSession
          .findUniqueOrThrow({
            where: {
              id:
                session.id,
            },
            select: {
              userId: true,
              revokedAt:
                true,
            },
          });
      expect(
        revokedSession.userId,
      ).toBe(
        user.id,
      );
      expect(
        revokedSession.revokedAt,
      ).not.toBeNull();
      const afterLogout =
        await request(app)
          .get(
            '/_test/protected',
          )
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
  },
);
