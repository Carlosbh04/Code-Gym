import type {
  RequestHandler,
} from 'express';

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
    level:
      'silent',
  });

const unusedRegistrationService:
RegistrationService = {
  register:
    () =>
      Promise.reject(
        new Error(
          'Registration is not exercised by session IDOR attack tests',
        ),
      ),
};

const unusedLoginService = {
  login:
    () =>
      Promise.reject(
        new Error(
          'Login is not exercised by session IDOR attack tests',
        ),
      ),
} as unknown as LoginService;

const unusedRefreshService = {
  refresh:
    () =>
      Promise.reject(
        new Error(
          'Refresh is not exercised by session IDOR attack tests',
        ),
      ),
} as unknown as RefreshService;

const unusedLogoutService = {
  logout:
    () =>
      Promise.reject(
        new Error(
          'Logout is not exercised by session IDOR attack tests',
        ),
      ),
} as unknown as LogoutService;

const unusedCurrentUserService:
Pick<
  CurrentUserService,
  'getCurrentUser'
> = {
  getCurrentUser:
    () =>
      Promise.reject(
        new Error(
          'Current user is not exercised by session IDOR attack tests',
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

type SessionManagementDependency =
  AppDependencies[
    'sessionManagementService'
  ];

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

function testApp(
  service:
    SessionManagementDependency,
) {
  return createApp({
    config:
      testConfig(),

    logger:
      silentLogger,

    databaseHealthCheck:
      () =>
        Promise.resolve(
          true,
        ),

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

    sessionManagementService:
      service,

    requireAuth:
      authenticatedRequireAuth,
  });
}

describe(
  'T220 session ownership and IDOR attacks',
  () => {
    it(
      'ignores attacker-controlled userId values when revoking one session',
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
              '/auth/sessions/session-target?userId=attacker-user',
            )
            .set(
              'x-user-id',
              'attacker-user',
            )
            .send({
              userId:
                'attacker-user',
            });

        expect(
          response.status,
        ).toBe(204);

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
      },
    );

    it(
      'returns the same non-enumerable response for different unknown or unowned session ids',
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

        const app =
          testApp(
            sessionManagementService({
              revokeSession,
            }),
          );

        const first =
          await request(
            app,
          )
            .delete(
              '/auth/sessions/session-does-not-exist',
            );

        const second =
          await request(
            app,
          )
            .delete(
              '/auth/sessions/session-owned-by-another-user',
            );

        expect(
          first.status,
        ).toBe(204);

        expect(
          second.status,
        ).toBe(204);

        expect(
          first.text,
        ).toBe('');

        expect(
          second.text,
        ).toBe('');
      },
    );

    it(
      'ignores attacker-controlled userId values when revoking other sessions',
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

        const response =
          await request(
            testApp(
              sessionManagementService({
                revokeOtherSessions,
              }),
            ),
          )
            .delete(
              '/auth/sessions/others?userId=attacker-user',
            )
            .set(
              'x-user-id',
              'attacker-user',
            )
            .send({
              userId:
                'attacker-user',

              currentSessionId:
                'attacker-session',
            });

        expect(
          response.status,
        ).toBe(204);

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
      },
    );

    it(
      'ignores attacker-controlled userId and currentSessionId when listing sessions',
      async () => {
        const listSessions =
          vi.fn<
            SessionManagementService[
              'listSessions'
            ]
          >()
            .mockResolvedValue(
              [],
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
              '/auth/sessions?userId=attacker-user&currentSessionId=attacker-session',
            )
            .set(
              'x-user-id',
              'attacker-user',
            )
            .set(
              'x-session-id',
              'attacker-session',
            );

        expect(
          response.status,
        ).toBe(200);

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
      },
    );

    it(
      'does not let the literal others route fall through to the dynamic session id route',
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
          revokeOtherSessions,
        ).toHaveBeenCalledOnce();

        expect(
          revokeSession,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
