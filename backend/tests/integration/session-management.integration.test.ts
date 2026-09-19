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

import {
  createApp,
} from '../../src/app.js';
import {
  AccessTokenService,
} from '../../src/auth/access-token-service.js';
import {
  PrismaAuthSessionRepository,
} from '../../src/auth/auth-session-repository.js';
import {
  CurrentUserService,
} from '../../src/auth/current-user-service.js';
import {
  LoginService,
} from '../../src/auth/login-service.js';
import {
  LogoutService,
} from '../../src/auth/logout-service.js';
import {
  RefreshService,
} from '../../src/auth/refresh-service.js';
import {
  SessionManagementService,
} from '../../src/auth/session-management-service.js';
import {
  PrismaUserRepository,
} from '../../src/auth/user-repository.js';
import {
  UserService,
} from '../../src/auth/user-service.js';
import {
  loadConfig,
} from '../../src/config/load-config.js';
import {
  createDatabaseService,
} from '../../src/database/database-service.js';
import {
  createPrismaClient,
} from '../../src/database/prisma.js';
import {
  createRequireAuth,
} from '../../src/middleware/require-auth.js';

const config =
  loadConfig();

if (
  !config.isTest
  || !config.database.name.endsWith(
    '_test',
  )
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

    logger:
      pino({
        level: 'silent',
      }),

    databaseHealthCheck:
      () =>
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
    `t217-${label}-${runId}@example.test`;

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

async function registerUser(
  label: string,
): Promise<{
  email: string;
  userId: string;
}> {
  const email =
    fixtureEmail(
      label,
    );

  const response =
    await request(app)
      .post(
        '/auth/register',
      )
      .send({
        email,
        password,
        displayName:
          `T217 ${label}`,
      });

  expect(
    response.status,
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

  return {
    email,
    userId:
      storedUser.id,
  };
}

async function loginUser(
  email: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}> {
  const response =
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
    response.status,
  ).toBe(200);

  const accessToken =
    extractAccessToken(
      response.body,
    );

  const refreshToken =
    extractRefreshToken(
      response.headers[
        'set-cookie'
      ],
    );

  const claims =
    await accessTokenService
      .verify(
        accessToken,
      );

  return {
    accessToken,
    refreshToken,
    sessionId:
      claims.sid,
  };
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


function extractSessions(
  body: unknown,
): readonly unknown[] {
  const record =
    asRecord(
      body,
      'sessions response body',
    );

  if (
    !Array.isArray(
      record.sessions,
    )
  ) {
    throw new Error(
      'Expected sessions response',
    );
  }

  return record.sessions;
}


function extractSetCookie(
  header: unknown,
): string {
  if (typeof header === 'string') {
    return header;
  }

  if (
    Array.isArray(header)
    && typeof header[0] === 'string'
  ) {
    return header[0];
  }

  throw new Error(
    'Expected Set-Cookie header',
  );
}


describe(
  'T217 session management MySQL integration (explicit opt-in)',
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
                    't217-',
                  )
                  || !email.includes(
                    runId,
                  ),
              )
            ) {
              throw new Error(
                'Refusing unsafe T217 integration cleanup',
              );
            }

            const users =
              await prisma.user
                .findMany({
                  where: {
                    email: {
                      in:
                        emails,
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
              await prisma
                .authSession
                .deleteMany({
                  where: {
                    userId: {
                      in:
                        userIds,
                    },
                  },
                });
            }

            await prisma.user
              .deleteMany({
                where: {
                  email: {
                    in:
                      emails,
                  },
                },
              });
          }
        } finally {
          await database
            .disconnect();
        }
      },
      20_000,
    );

    it(
      'findSessionsByUserId returns only sessions belonging to the requested user',
      async () => {
        const firstUser =
          await registerUser(
            'repo-list-a',
          );

        const secondUser =
          await registerUser(
            'repo-list-b',
          );

        const firstSession =
          await loginUser(
            firstUser.email,
          );

        const secondSession =
          await loginUser(
            firstUser.email,
          );

        await loginUser(
          secondUser.email,
        );

        const sessions =
          await authSessionRepository
            .findSessionsByUserId(
              firstUser.userId,
            );

        expect(
          sessions.map(
            ({ id }) =>
              id,
          ),
        ).toEqual(
          expect.arrayContaining([
            firstSession.sessionId,
            secondSession.sessionId,
          ]),
        );

        expect(
          sessions,
        ).toHaveLength(2);

        for (
          const session of
          sessions
        ) {
          expect(
            session,
          ).not.toHaveProperty(
            'refreshTokenDigest',
          );

          expect(
            session,
          ).not.toHaveProperty(
            'userId',
          );
        }
      },
    );

    it(
      'revokeSessionById revokes an owned session and refuses a session owned by another user',
      async () => {
        const firstUser =
          await registerUser(
            'repo-revoke-a',
          );

        const secondUser =
          await registerUser(
            'repo-revoke-b',
          );

        const ownedSession =
          await loginUser(
            firstUser.email,
          );

        const foreignSession =
          await loginUser(
            secondUser.email,
          );

        const revokedOwned =
          await authSessionRepository
            .revokeSessionById({
              sessionId:
                ownedSession
                  .sessionId,

              userId:
                firstUser.userId,

              revokedAt:
                new Date(),
            });

        const revokedForeign =
          await authSessionRepository
            .revokeSessionById({
              sessionId:
                foreignSession
                  .sessionId,

              userId:
                firstUser.userId,

              revokedAt:
                new Date(),
            });

        expect(
          revokedOwned,
        ).toBe(true);

        expect(
          revokedForeign,
        ).toBe(false);

        const [
          ownedStored,
          foreignStored,
        ] =
          await Promise.all([
            prisma.authSession
              .findUniqueOrThrow({
                where: {
                  id:
                    ownedSession
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
                    foreignSession
                      .sessionId,
                },

                select: {
                  revokedAt:
                    true,
                },
              }),
          ]);

        expect(
          ownedStored.revokedAt,
        ).not.toBeNull();

        expect(
          foreignStored.revokedAt,
        ).toBeNull();
      },
    );

    it(
      'revokeOtherSessions revokes the authenticated user other sessions and preserves the current session',
      async () => {
        const user =
          await registerUser(
            'repo-others',
          );

        const firstSession =
          await loginUser(
            user.email,
          );

        const currentSession =
          await loginUser(
            user.email,
          );

        const thirdSession =
          await loginUser(
            user.email,
          );

        const revokedCount =
          await authSessionRepository
            .revokeOtherSessions({
              userId:
                user.userId,

              currentSessionId:
                currentSession
                  .sessionId,

              revokedAt:
                new Date(),
            });

        expect(
          revokedCount,
        ).toBe(2);

        const storedSessions =
          await prisma.authSession
            .findMany({
              where: {
                userId:
                  user.userId,
              },

              select: {
                id: true,
                revokedAt:
                  true,
              },
            });

        const byId =
          new Map(
            storedSessions.map(
              (session) => [
                session.id,
                session,
              ],
            ),
          );

        expect(
          byId.get(
            firstSession
              .sessionId,
          )?.revokedAt,
        ).not.toBeNull();

        expect(
          byId.get(
            currentSession
              .sessionId,
          )?.revokedAt,
        ).toBeNull();

        expect(
          byId.get(
            thirdSession
              .sessionId,
          )?.revokedAt,
        ).not.toBeNull();
      },
    );

    it(
      'GET /auth/sessions returns only active sessions and marks the calling session as current',
      async () => {
        const user =
          await registerUser(
            'http-list',
          );

        const oldSession =
          await loginUser(
            user.email,
          );

        const currentSession =
          await loginUser(
            user.email,
          );

        await authSessionRepository
          .revokeSessionById({
            sessionId:
              oldSession.sessionId,

            userId:
              user.userId,

            revokedAt:
              new Date(),
          });

        const response =
          await request(app)
            .get(
              '/auth/sessions',
            )
            .set(
              'Authorization',
              `Bearer ${currentSession.accessToken}`,
            );

        expect(
          response.status,
        ).toBe(200);

        expect(
          response.body,
        ).toEqual({
          sessions: [
            expect.objectContaining({
              id:
                currentSession
                  .sessionId,

              isCurrent:
                true,
            }),
          ],
        });

        const responseSessions =
          extractSessions(
            response.body as unknown,
          );

        expect(
          responseSessions,
        ).toHaveLength(1);

        expect(
          response.text,
        ).not.toContain(
          'refreshTokenDigest',
        );

        expect(
          response.text,
        ).not.toContain(
          'userId',
        );

        expect(
          response.text,
        ).not.toContain(
          'revokedAt',
        );
      },
    );

    it(
      'DELETE /auth/sessions/others revokes the other sessions and keeps the current session usable',
      async () => {
        const user =
          await registerUser(
            'http-others',
          );

        const firstSession =
          await loginUser(
            user.email,
          );

        const secondSession =
          await loginUser(
            user.email,
          );

        const currentSession =
          await loginUser(
            user.email,
          );

        const response =
          await request(app)
            .delete(
              '/auth/sessions/others',
            )
            .set(
              'Authorization',
              `Bearer ${currentSession.accessToken}`,
            );

        expect(
          response.status,
        ).toBe(204);

        const [
          firstStored,
          secondStored,
          currentStored,
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

            prisma.authSession
              .findUniqueOrThrow({
                where: {
                  id:
                    currentSession
                      .sessionId,
                },

                select: {
                  revokedAt:
                    true,
                },
              }),
          ]);

        expect(
          firstStored.revokedAt,
        ).not.toBeNull();

        expect(
          secondStored.revokedAt,
        ).not.toBeNull();

        expect(
          currentStored.revokedAt,
        ).toBeNull();

        const stillAuthenticated =
          await request(app)
            .get(
              '/auth/me',
            )
            .set(
              'Authorization',
              `Bearer ${currentSession.accessToken}`,
            );

        expect(
          stillAuthenticated.status,
        ).toBe(200);
      },
    );

    it(
      'DELETE /auth/sessions/:sessionId cannot revoke another user session',
      async () => {
        const attacker =
          await registerUser(
            'http-idor-a',
          );

        const victim =
          await registerUser(
            'http-idor-b',
          );

        const attackerSession =
          await loginUser(
            attacker.email,
          );

        const victimSession =
          await loginUser(
            victim.email,
          );

        const response =
          await request(app)
            .delete(
              `/auth/sessions/${victimSession.sessionId}`,
            )
            .set(
              'Authorization',
              `Bearer ${attackerSession.accessToken}`,
            );

        expect(
          response.status,
        ).toBe(204);

        const victimStored =
          await prisma.authSession
            .findUniqueOrThrow({
              where: {
                id:
                  victimSession
                    .sessionId,
              },

              select: {
                revokedAt:
                  true,
              },
            });

        expect(
          victimStored.revokedAt,
        ).toBeNull();

        const victimStillAuthenticated =
          await request(app)
            .get(
              '/auth/me',
            )
            .set(
              'Authorization',
              `Bearer ${victimSession.accessToken}`,
            );

        expect(
          victimStillAuthenticated.status,
        ).toBe(200);
      },
    );

    it(
      'DELETE current session clears the refresh cookie and makes the old access token unusable',
      async () => {
        const user =
          await registerUser(
            'http-current',
          );

        const currentSession =
          await loginUser(
            user.email,
          );

        const response =
          await request(app)
            .delete(
              `/auth/sessions/${currentSession.sessionId}`,
            )
            .set(
              'Authorization',
              `Bearer ${currentSession.accessToken}`,
            )
            .set(
              'Cookie',
              `codegym_refresh=${currentSession.refreshToken}`,
            );

        expect(
          response.status,
        ).toBe(204);

        const cookie =
          extractSetCookie(
            response.headers[
              'set-cookie'
            ],
          );

        expect(
          cookie,
        ).toContain(
          'codegym_refresh=',
        );

        expect(
          cookie,
        ).toContain(
          'Path=/auth',
        );

        const storedSession =
          await prisma.authSession
            .findUniqueOrThrow({
              where: {
                id:
                  currentSession
                    .sessionId,
              },

              select: {
                revokedAt:
                  true,
              },
            });

        expect(
          storedSession.revokedAt,
        ).not.toBeNull();

        const afterRevocation =
          await request(app)
            .get(
              '/auth/me',
            )
            .set(
              'Authorization',
              `Bearer ${currentSession.accessToken}`,
            );

        expect(
          afterRevocation.status,
        ).toBe(401);

        expect(
          afterRevocation.body,
        ).toEqual({
          error: {
            code:
              'UNAUTHORIZED',

            message:
              'Authentication required',
          },
        });
      },
    );
  },
);
