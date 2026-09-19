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
import { digestRefreshToken } from '../../src/auth/refresh-token-service.js';
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
const app = createApp({
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
    `t210-${label}-${runId}@example.test`;
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
function expectClearedRefreshCookie(
  setCookieHeader:
    | string
    | string[]
    | undefined,
): void {
  const cookie =
    Array.isArray(
      setCookieHeader,
    )
      ? setCookieHeader[0]
      : setCookieHeader;
  expect(
    cookie,
  ).toBeDefined();
  expect(
    cookie,
  ).toContain(
    'codegym_refresh=;',
  );
  expect(
    cookie,
  ).toContain(
    'Path=/auth',
  );
  expect(
    cookie,
  ).toContain(
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  );
  expect(
    cookie,
  ).toContain(
    'HttpOnly',
  );
  expect(
    cookie,
  ).toContain(
    'SameSite=Strict',
  );
}
async function register(
  email: string,
): Promise<string> {
  const response =
    await request(app)
      .post('/auth/register')
      .send({
        email,
        password,
      });
  expect(
    response.status,
  ).toBe(201);
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
  return user.id;
}
async function login(
  email: string,
): Promise<{
  refreshToken: string;
  sessionId: string;
}> {
  const response =
    await request(app)
      .post('/auth/login')
      .send({
        email,
        password,
      });
  expect(
    response.status,
  ).toBe(200);
  const refreshToken =
    extractRefreshToken(
      response.headers[
        'set-cookie'
      ],
    );
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
        },
      });
  return {
    refreshToken,
    sessionId:
      session.id,
  };
}
describe(
  'T210 logout MySQL integration (explicit opt-in)',
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
                    't210-',
                  )
                  || !email.includes(
                    runId,
                  ),
              )
            ) {
              throw new Error(
                'Refusing unsafe T210 integration cleanup',
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
    it('revokes the exact session, clears the cookie, and rejects its old token on refresh', async () => {
      const email =
        fixtureEmail(
          'revoke',
        );
      const userId =
        await register(
          email,
        );
      const {
        refreshToken,
        sessionId,
      } =
        await login(
          email,
        );
      const beforeLogout =
        await prisma.authSession
          .findUniqueOrThrow({
            where: {
              id:
                sessionId,
            },
            select: {
              userId: true,
              refreshTokenDigest:
                true,
              revokedAt: true,
            },
          });
      expect(
        beforeLogout.userId,
      ).toBe(
        userId,
      );
      expect(
        beforeLogout
          .refreshTokenDigest,
      ).toEqual(
        new Uint8Array(
          digestRefreshToken(
            refreshToken,
          ),
        ),
      );
      expect(
        beforeLogout.revokedAt,
      ).toBeNull();
      const logoutResponse =
        await request(app)
          .post('/auth/logout')
          .set(
            'Cookie',
            `codegym_refresh=${refreshToken}`,
          );
      expect(
        logoutResponse.status,
      ).toBe(204);
      expect(
        logoutResponse.text,
      ).toBe('');
      expectClearedRefreshCookie(
        logoutResponse.headers[
          'set-cookie'
        ],
      );
      const afterLogout =
        await prisma.authSession
          .findUniqueOrThrow({
            where: {
              id:
                sessionId,
            },
            select: {
              refreshTokenDigest:
                true,
              revokedAt:
                true,
            },
          });
      expect(
        afterLogout
          .refreshTokenDigest,
      ).toEqual(
        new Uint8Array(
          digestRefreshToken(
            refreshToken,
          ),
        ),
      );
      expect(
        afterLogout.revokedAt,
      ).not.toBeNull();
      const refreshResponse =
        await request(app)
          .post('/auth/refresh')
          .set(
            'Cookie',
            `codegym_refresh=${refreshToken}`,
          );
      expect(
        refreshResponse.status,
      ).toBe(401);
      expect(
        refreshResponse.body,
      ).toEqual({
        error: {
          code:
            'INVALID_REFRESH_SESSION',
          message:
            'Invalid refresh session',
        },
      });
    });
    it('returns 204 and clears the cookie when no refresh cookie exists', async () => {
      const response =
        await request(app)
          .post(
            '/auth/logout',
          );
      expect(
        response.status,
      ).toBe(204);
      expect(
        response.text,
      ).toBe('');
      expectClearedRefreshCookie(
        response.headers[
          'set-cookie'
        ],
      );
    });
    it('allows repeated logout with the same token without changing the first revocation', async () => {
      const email =
        fixtureEmail(
          'repeat',
        );
      await register(
        email,
      );
      const {
        refreshToken,
        sessionId,
      } =
        await login(
          email,
        );
      const first =
        await request(app)
          .post('/auth/logout')
          .set(
            'Cookie',
            `codegym_refresh=${refreshToken}`,
          );
      const afterFirst =
        await prisma.authSession
          .findUniqueOrThrow({
            where: {
              id:
                sessionId,
            },
            select: {
              revokedAt:
                true,
            },
          });
      const second =
        await request(app)
          .post('/auth/logout')
          .set(
            'Cookie',
            `codegym_refresh=${refreshToken}`,
          );
      const afterSecond =
        await prisma.authSession
          .findUniqueOrThrow({
            where: {
              id:
                sessionId,
            },
            select: {
              revokedAt:
                true,
            },
          });
      expect(
        first.status,
      ).toBe(204);
      expect(
        second.status,
      ).toBe(204);
      expect(
        afterFirst.revokedAt,
      ).not.toBeNull();
      expect(
        afterSecond.revokedAt,
      ).toEqual(
        afterFirst.revokedAt,
      );
    });
    it('does not revoke another active session belonging to the same user', async () => {
      const email =
        fixtureEmail(
          'isolation',
        );
      await register(
        email,
      );
      const firstSession =
        await login(
          email,
        );
      const secondSession =
        await login(
          email,
        );
      expect(
        secondSession.sessionId,
      ).not.toBe(
        firstSession.sessionId,
      );
      const logoutResponse =
        await request(app)
          .post('/auth/logout')
          .set(
            'Cookie',
            `codegym_refresh=${firstSession.refreshToken}`,
          );
      expect(
        logoutResponse.status,
      ).toBe(204);
      const [
        firstStoredSession,
        secondStoredSession,
      ] =
        await Promise.all([
          prisma.authSession
            .findUniqueOrThrow({
              where: {
                id:
                  firstSession
                    .sessionId,
              },
              select: {
                revokedAt:
                  true,
              },
            }),
          prisma.authSession
            .findUniqueOrThrow({
              where: {
                id:
                  secondSession
                    .sessionId,
              },
              select: {
                revokedAt:
                  true,
              },
            }),
        ]);
      expect(
        firstStoredSession
          .revokedAt,
      ).not.toBeNull();
      expect(
        secondStoredSession
          .revokedAt,
      ).toBeNull();
      const unaffectedRefresh =
        await request(app)
          .post('/auth/refresh')
          .set(
            'Cookie',
            `codegym_refresh=${secondSession.refreshToken}`,
          );
      expect(
        unaffectedRefresh.status,
      ).toBe(200);
      const secondAfterRefresh =
        await prisma.authSession
          .findUniqueOrThrow({
            where: {
              id:
                secondSession
                  .sessionId,
            },
            select: {
              revokedAt:
                true,
            },
          });
      expect(
        secondAfterRefresh.revokedAt,
      ).toBeNull();
    });
  },
);
