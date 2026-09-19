import type { RequestHandler } from 'express';

import pino from 'pino';
import request from 'supertest';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  createApp,
  type AppDependencies,
} from '../src/app.js';
import type {
  CurrentUserService,
} from '../src/auth/current-user-service.js';
import type {
  LoginService,
} from '../src/auth/login-service.js';
import type {
  LogoutService,
} from '../src/auth/logout-service.js';
import type {
  RefreshService,
} from '../src/auth/refresh-service.js';
import type {
  SessionManagementService,
} from '../src/auth/session-management-service.js';
import type {
  RegistrationService,
} from '../src/auth/user-service.js';
import {
  testConfig,
} from './helpers.js';

const silentLogger =
  pino({
    level: 'silent',
  });

const unusedRegistrationService:
  RegistrationService = {
    register: () =>
      Promise.reject(
        new Error(
          'Registration is not exercised by session-management HTTP tests',
        ),
      ),
  };

const unusedLoginService = {
  login: () =>
    Promise.reject(
      new Error(
        'Login is not exercised by session-management HTTP tests',
      ),
    ),
} as unknown as LoginService;

const unusedRefreshService = {
  refresh: () =>
    Promise.reject(
      new Error(
        'Refresh is not exercised by session-management HTTP tests',
      ),
    ),
} as unknown as RefreshService;

const unusedLogoutService = {
  logout: () =>
    Promise.reject(
      new Error(
        'Logout is not exercised by session-management HTTP tests',
      ),
    ),
} as unknown as LogoutService;

const unusedCurrentUserService:
  Pick<
    CurrentUserService,
    'getCurrentUser'
  > = {
    getCurrentUser: () =>
      Promise.reject(
        new Error(
          'Current user is not exercised by session-management HTTP tests',
        ),
      ),
  };

const authenticatedRequireAuth:
  RequestHandler = (
    request,
    _response,
    next,
  ) => {
    request.auth =
      Object.freeze({
        userId:
          'user-1',

        sessionId:
          'session-current',
      });

    next();
  };

const unauthorizedRequireAuth:
  RequestHandler = (
    _request,
    response,
  ) => {
    response
      .status(401)
      .json({
        error: {
          code:
            'UNAUTHORIZED',

          message:
            'Authentication required',
        },
      });
  };

type SessionManagementDependency =
  AppDependencies[
    'sessionManagementService'
  ];

function testApp(
  sessionManagementService:
    SessionManagementDependency,

  requireAuth:
    RequestHandler =
      authenticatedRequireAuth,
) {
  return createApp({
    loginFailureKeySecret:
      'test-login-failure-key-secret',
    config:
      testConfig(),

    logger:
      silentLogger,

    databaseHealthCheck:
      () =>
        Promise.resolve(true),

    registrationService:
      unusedRegistrationService,

    loginService:
      unusedLoginService,

    refreshService:
      unusedRefreshService,

    logoutService:
      unusedLogoutService,

    currentUserService:
      unusedCurrentUserService,

    sessionManagementService,

    requireAuth,
  });
}

function sessionManagementService(
  overrides: Partial<
    Pick<
      SessionManagementService,
      | 'listSessions'
      | 'revokeSession'
      | 'revokeOtherSessions'
    >
  > = {},
): SessionManagementDependency {
  return {
    listSessions:
      overrides.listSessions
      ?? (() =>
        Promise.reject(
          new Error(
            'listSessions was not expected',
          ),
        )),

    revokeSession:
      overrides.revokeSession
      ?? (() =>
        Promise.reject(
          new Error(
            'revokeSession was not expected',
          ),
        )),

    revokeOtherSessions:
      overrides.revokeOtherSessions
      ?? (() =>
        Promise.reject(
          new Error(
            'revokeOtherSessions was not expected',
          ),
        )),
  };
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
  'session-management HTTP routes',
  () => {
    it(
      'GET /auth/sessions returns only the public session DTOs from the service',
      async () => {
        const listSessions =
          vi.fn<
            SessionManagementService[
              'listSessions'
            ]
          >()
            .mockResolvedValue([
              {
                id:
                  'session-current',

                createdAt:
                  '2026-09-11T10:00:00.000Z',

                expiresAt:
                  '2026-10-11T10:00:00.000Z',

                rotatedAt:
                  null,

                isCurrent:
                  true,
              },

              {
                id:
                  'session-other',

                createdAt:
                  '2026-09-10T10:00:00.000Z',

                expiresAt:
                  '2026-10-10T10:00:00.000Z',

                rotatedAt:
                  '2026-09-10T12:00:00.000Z',

                isCurrent:
                  false,
              },
            ]);

        const response =
          await request(
            testApp(
              sessionManagementService({
                listSessions,
              }),
            ),
          )
            .get(
              '/auth/sessions',
            )
            .set(
              'Authorization',
              'Bearer valid-access-token',
            );

        expect(
          response.status,
        ).toBe(200);

        expect(
          response.body,
        ).toEqual({
          sessions: [
            {
              id:
                'session-current',

              createdAt:
                '2026-09-11T10:00:00.000Z',

              expiresAt:
                '2026-10-11T10:00:00.000Z',

              rotatedAt:
                null,

              isCurrent:
                true,
            },

            {
              id:
                'session-other',

              createdAt:
                '2026-09-10T10:00:00.000Z',

              expiresAt:
                '2026-10-10T10:00:00.000Z',

              rotatedAt:
                '2026-09-10T12:00:00.000Z',

              isCurrent:
                false,
            },
          ],
        });

        expect(
          listSessions,
        ).toHaveBeenCalledOnce();

        expect(
          listSessions,
        ).toHaveBeenCalledWith({
          userId:
            'user-1',

          currentSessionId:
            'session-current',
        });

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
      'GET /auth/sessions does not call the service when authentication fails',
      async () => {
        const listSessions =
          vi.fn<
            SessionManagementService[
              'listSessions'
            ]
          >();

        const response =
          await request(
            testApp(
              sessionManagementService({
                listSessions,
              }),
              unauthorizedRequireAuth,
            ),
          )
            .get(
              '/auth/sessions',
            );

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

        expect(
          listSessions,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'GET /auth/sessions returns the safe generic 500 contract when the service fails',
      async () => {
        const listSessions =
          vi.fn<
            SessionManagementService[
              'listSessions'
            ]
          >()
            .mockRejectedValue(
              new Error(
                'database-secret session listing failure',
              ),
            );

        const response =
          await request(
            testApp(
              sessionManagementService({
                listSessions,
              }),
            ),
          )
            .get(
              '/auth/sessions',
            );

        expect(
          response.status,
        ).toBe(500);

        expect(
          response.body,
        ).toEqual({
          error: {
            code:
              'INTERNAL_SERVER_ERROR',

            message:
              'An unexpected error occurred',
          },
        });

        expect(
          response.text,
        ).not.toContain(
          'database-secret',
        );
      },
    );

    it(
      'DELETE /auth/sessions/others revokes only other sessions for the authenticated user',
      async () => {
        const revokeOtherSessions =
          vi.fn<
            SessionManagementService[
              'revokeOtherSessions'
            ]
          >()
            .mockResolvedValue(
              2,
            );

        const revokeSession =
          vi.fn<
            SessionManagementService[
              'revokeSession'
            ]
          >();

        const response =
          await request(
            testApp(
              sessionManagementService({
                revokeOtherSessions,
                revokeSession,
              }),
            ),
          )
            .delete(
              '/auth/sessions/others',
            );

        expect(
          response.status,
        ).toBe(204);

        expect(
          response.text,
        ).toBe('');

        expect(
          revokeOtherSessions,
        ).toHaveBeenCalledOnce();

        expect(
          revokeOtherSessions,
        ).toHaveBeenCalledWith({
          userId:
            'user-1',

          currentSessionId:
            'session-current',
        });

        expect(
          revokeSession,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'DELETE /auth/sessions/others is matched before the dynamic session route',
      async () => {
        const revokeOtherSessions =
          vi.fn<
            SessionManagementService[
              'revokeOtherSessions'
            ]
          >()
            .mockResolvedValue(
              0,
            );

        const revokeSession =
          vi.fn<
            SessionManagementService[
              'revokeSession'
            ]
          >()
            .mockResolvedValue(
              false,
            );

        await request(
          testApp(
            sessionManagementService({
              revokeOtherSessions,
              revokeSession,
            }),
          ),
        )
          .delete(
            '/auth/sessions/others',
          )
          .expect(204);

        expect(
          revokeOtherSessions,
        ).toHaveBeenCalledOnce();

        expect(
          revokeSession,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'DELETE /auth/sessions/:sessionId passes authenticated ownership and returns non-enumerable 204',
      async () => {
        const revokeSession =
          vi.fn<
            SessionManagementService[
              'revokeSession'
            ]
          >()
            .mockResolvedValue(
              false,
            );

        const response =
          await request(
            testApp(
              sessionManagementService({
                revokeSession,
              }),
            ),
          )
            .delete(
              '/auth/sessions/session-target',
            );

        expect(
          response.status,
        ).toBe(204);

        expect(
          response.text,
        ).toBe('');

        expect(
          revokeSession,
        ).toHaveBeenCalledOnce();

        expect(
          revokeSession,
        ).toHaveBeenCalledWith({
          userId:
            'user-1',

          sessionId:
            'session-target',
        });

        expect(
          response.body,
        ).toEqual({});
      },
    );

    it(
      'DELETE /auth/sessions/:sessionId does not clear the refresh cookie when revoking another session',
      async () => {
        const revokeSession =
          vi.fn<
            SessionManagementService[
              'revokeSession'
            ]
          >()
            .mockResolvedValue(
              true,
            );

        const response =
          await request(
            testApp(
              sessionManagementService({
                revokeSession,
              }),
            ),
          )
            .delete(
              '/auth/sessions/session-other',
            );

        expect(
          response.status,
        ).toBe(204);

        expect(
          response.headers[
            'set-cookie'
          ],
        ).toBeUndefined();
      },
    );

    it(
      'DELETE /auth/sessions/:sessionId clears the refresh cookie when revoking the current session',
      async () => {
        const revokeSession =
          vi.fn<
            SessionManagementService[
              'revokeSession'
            ]
          >()
            .mockResolvedValue(
              true,
            );

        const response =
          await request(
            testApp(
              sessionManagementService({
                revokeSession,
              }),
            ),
          )
            .delete(
              '/auth/sessions/session-current',
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
      },
    );

    it(
      'DELETE session routes do not call the service when authentication fails',
      async () => {
        const revokeSession =
          vi.fn<
            SessionManagementService[
              'revokeSession'
            ]
          >();

        const revokeOtherSessions =
          vi.fn<
            SessionManagementService[
              'revokeOtherSessions'
            ]
          >();

        const app =
          testApp(
            sessionManagementService({
              revokeSession,
              revokeOtherSessions,
            }),
            unauthorizedRequireAuth,
          );

        const oneSessionResponse =
          await request(app)
            .delete(
              '/auth/sessions/session-target',
            );

        const othersResponse =
          await request(app)
            .delete(
              '/auth/sessions/others',
            );

        expect(
          oneSessionResponse.status,
        ).toBe(401);

        expect(
          othersResponse.status,
        ).toBe(401);

        expect(
          revokeSession,
        ).not.toHaveBeenCalled();

        expect(
          revokeOtherSessions,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'DELETE /auth/sessions/:sessionId returns the safe generic 500 contract when revocation fails',
      async () => {
        const revokeSession =
          vi.fn<
            SessionManagementService[
              'revokeSession'
            ]
          >()
            .mockRejectedValue(
              new Error(
                'database-secret revoke failure',
              ),
            );

        const response =
          await request(
            testApp(
              sessionManagementService({
                revokeSession,
              }),
            ),
          )
            .delete(
              '/auth/sessions/session-target',
            );

        expect(
          response.status,
        ).toBe(500);

        expect(
          response.body,
        ).toEqual({
          error: {
            code:
              'INTERNAL_SERVER_ERROR',

            message:
              'An unexpected error occurred',
          },
        });

        expect(
          response.text,
        ).not.toContain(
          'database-secret',
        );
      },
    );
  },
);
