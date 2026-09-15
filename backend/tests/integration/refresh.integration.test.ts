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
    `t209-${label}-${runId}@example.test`;
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
    setCookieHeader ===
    undefined
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


function extractAccessToken(
  body: unknown,
): string {
  const record =
    asRecord(
      body,
      'refresh response body',
    );

  const accessToken =
    record.accessToken;

  if (
    typeof accessToken !== 'string'
  ) {
    throw new Error(
      'Expected accessToken response',
    );
  }

  return accessToken;
}


describe(
  'T209 refresh MySQL integration (explicit opt-in)',
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
                    't209-',
                  )
                  || !email.includes(
                    runId,
                  ),
              )
            ) {
              throw new Error(
                'Refusing unsafe T209 integration cleanup',
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
    it('rotates the refresh token in MySQL and issues a new access token', async () => {
      const email =
        fixtureEmail(
          'rotate',
        );
      const password =
        'correct horse battery staple';
      const registerResponse =
        await request(app)
          .post('/auth/register')
          .send({
            email,
            password,
          });
      expect(
        registerResponse.status,
      ).toBe(201);
      const loginResponse =
        await request(app)
          .post('/auth/login')
          .send({
            email,
            password,
          });
      expect(
        loginResponse.status,
      ).toBe(200);
      const originalRefreshToken =
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
      const beforeRotation =
        await prisma.authSession
          .findFirstOrThrow({
            where: {
              userId:
                user.id,
            },
          });
      expect(
        verifyRefreshTokenDigest(
          originalRefreshToken,
          beforeRotation.refreshTokenDigest,
        ),
      ).toBe(true);
      expect(
        beforeRotation.rotatedAt,
      ).toBeNull();
      const refreshResponse =
        await request(app)
          .post('/auth/refresh')
          .set(
            'Cookie',
            `codegym_refresh=${originalRefreshToken}`,
          );
      expect(
        refreshResponse.status,
      ).toBe(200);
      const refreshAccessToken =
        extractAccessToken(
          refreshResponse.body as unknown,
        );

      expect(
        typeof refreshAccessToken,
      ).toBe('string');
      expect(
        refreshResponse.body,
      ).not.toHaveProperty(
        'refreshToken',
      );
      const nextRefreshToken =
        extractRefreshToken(
          refreshResponse.headers[
            'set-cookie'
          ],
        );
      expect(
        nextRefreshToken,
      ).not.toBe(
        originalRefreshToken,
      );
      const afterRotation =
        await prisma.authSession
          .findUniqueOrThrow({
            where: {
              id:
                beforeRotation.id,
            },
          });
      expect(
        afterRotation.rotatedAt,
      ).not.toBeNull();
      expect(
        verifyRefreshTokenDigest(
          nextRefreshToken,
          afterRotation.refreshTokenDigest,
        ),
      ).toBe(true);
      expect(
        verifyRefreshTokenDigest(
          originalRefreshToken,
          afterRotation.refreshTokenDigest,
        ),
      ).toBe(false);
      const claims =
        await accessTokenService.verify(
          refreshAccessToken,
        );
      expect(
        claims.sub,
      ).toBe(user.id);
      expect(
        claims.sid,
      ).toBe(
        beforeRotation.id,
      );
    });
    it('rejects reuse of the old refresh token after rotation', async () => {
      const email =
        fixtureEmail(
          'reuse',
        );
      const password =
        'correct horse battery staple';
      await request(app)
        .post('/auth/register')
        .send({
          email,
          password,
        });
      const loginResponse =
        await request(app)
          .post('/auth/login')
          .send({
            email,
            password,
          });
      expect(
        loginResponse.status,
      ).toBe(200);
      const originalRefreshToken =
        extractRefreshToken(
          loginResponse.headers[
            'set-cookie'
          ],
        );
      const firstRefresh =
        await request(app)
          .post('/auth/refresh')
          .set(
            'Cookie',
            `codegym_refresh=${originalRefreshToken}`,
          );
      expect(
        firstRefresh.status,
      ).toBe(200);
      const reuseResponse =
        await request(app)
          .post('/auth/refresh')
          .set(
            'Cookie',
            `codegym_refresh=${originalRefreshToken}`,
          );
      expect(
        reuseResponse.status,
      ).toBe(401);
      expect(
        reuseResponse.body,
      ).toEqual({
        error: {
          code:
            'INVALID_REFRESH_SESSION',
          message:
            'Invalid refresh session',
        },
      });
      const cookie =
        reuseResponse.headers[
          'set-cookie'
        ];
      expect(
        cookie,
      ).toBeDefined();
    });
    it('allows only one concurrent rotation of the same refresh token', async () => {
      const email =
        fixtureEmail(
          'race',
        );
      const password =
        'correct horse battery staple';
      await request(app)
        .post('/auth/register')
        .send({
          email,
          password,
        });
      const loginResponse =
        await request(app)
          .post('/auth/login')
          .send({
            email,
            password,
          });
      expect(
        loginResponse.status,
      ).toBe(200);
      const refreshToken =
        extractRefreshToken(
          loginResponse.headers[
            'set-cookie'
          ],
        );
      const [
        first,
        second,
      ] =
        await Promise.all([
          request(app)
            .post('/auth/refresh')
            .set(
              'Cookie',
              `codegym_refresh=${refreshToken}`,
            ),
          request(app)
            .post('/auth/refresh')
            .set(
              'Cookie',
              `codegym_refresh=${refreshToken}`,
            ),
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
        200,
        401,
      ]);
    });
  },
);
