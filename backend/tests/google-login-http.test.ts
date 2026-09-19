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

import {
  GoogleEmailAlreadyRegisteredError,
  type GoogleLoginService,
} from '../src/auth/google-login-service.js';

import {
  InvalidGoogleIdTokenError,
} from '../src/auth/google-id-token-verifier.js';

import type {
  LoginService,
} from '../src/auth/login-service.js';

import type {
  LogoutService,
} from '../src/auth/logout-service.js';

import type {
  PublicUser,
} from '../src/auth/public-user.js';

import type {
  RefreshService,
} from '../src/auth/refresh-service.js';

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

const publicUser:
  PublicUser = {
    id:
      'google-user-1',
    email:
      'google@example.test',
    displayName:
      'Google User',
    role:
      'USER',
    createdAt:
      '2026-09-15T08:00:00.000Z',
    updatedAt:
      '2026-09-15T08:00:00.000Z',
  };

const googleLoginResult = {
  user:
    publicUser,
  accessToken:
    'google.access.token',
  refreshToken:
    'G'.repeat(43),
};

const unusedRegistrationService:
  RegistrationService = {
    register: () =>
      Promise.reject(
        new Error(
          'Registration is not exercised by Google login HTTP tests',
        ),
      ),
  };

const unusedLoginService = {
  login: () =>
    Promise.reject(
      new Error(
        'Password login is not exercised by Google login HTTP tests',
      ),
    ),
} as unknown as LoginService;

const unusedRefreshService = {
  refresh: () =>
    Promise.reject(
      new Error(
        'Refresh is not exercised by Google login HTTP tests',
      ),
    ),
} as unknown as RefreshService;

const unusedLogoutService = {
  logout: () =>
    Promise.reject(
      new Error(
        'Logout is not exercised by Google login HTTP tests',
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
          'Current user is not exercised by Google login HTTP tests',
        ),
      ),
  };

const unusedSessionManagementService:
  AppDependencies[
    'sessionManagementService'
  ] = {
    listSessions: () =>
      Promise.reject(
        new Error(
          'Session management is not exercised by Google login HTTP tests',
        ),
      ),

    revokeSession: () =>
      Promise.reject(
        new Error(
          'Session management is not exercised by Google login HTTP tests',
        ),
      ),

    revokeOtherSessions: () =>
      Promise.reject(
        new Error(
          'Session management is not exercised by Google login HTTP tests',
        ),
      ),
  };

const unusedRequireAuth:
  RequestHandler = (
    _request,
    _response,
    next,
  ) => {
    next();
  };

function googleLoginService(
  login:
    GoogleLoginService['login'],
): Pick<
  GoogleLoginService,
  'login'
> {
  return {
    login,
  };
}

function testApp(
  service:
    Pick<
      GoogleLoginService,
      'login'
    >,
) {
  return createApp({
    loginFailureKeySecret:
      'test-login-failure-key-secret',
    config:
      testConfig(),

    logger:
      silentLogger,

    databaseHealthCheck: () =>
      Promise.resolve(
        true,
      ),

    registrationService:
      unusedRegistrationService,

    loginService:
      unusedLoginService,

    googleLoginService:
      service,

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
}

function extractSetCookie(
  header: unknown,
): string {
  if (
    typeof header === 'string'
  ) {
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
  'POST /auth/google',
  () => {
    it('returns user and access token and stores the refresh token only in an HttpOnly cookie', async () => {
      const login =
        vi
          .fn<
            GoogleLoginService[
              'login'
            ]
          >()
          .mockResolvedValue(
            googleLoginResult,
          );

      const response =
        await request(
          testApp(
            googleLoginService(
              login,
            ),
          ),
        )
          .post(
            '/auth/google',
          )
          .send({
            idToken:
              'google-id-token',
          });

      expect(
        response.status,
      ).toBe(
        200,
      );

      expect(
        response.body,
      ).toEqual({
        user:
          publicUser,
        accessToken:
          'google.access.token',
      });

      expect(
        login,
      ).toHaveBeenCalledOnce();

      expect(
        login,
      ).toHaveBeenCalledWith(
        'google-id-token',
      );

      expect(
        response.body,
      ).not.toHaveProperty(
        'refreshToken',
      );

      expect(
        response.text,
      ).not.toContain(
        googleLoginResult
          .refreshToken,
      );

      const cookie =
        extractSetCookie(
          response.headers[
            'set-cookie'
          ],
        );

      expect(
        cookie,
      ).toContain(
        `codegym_refresh=${googleLoginResult.refreshToken}`,
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

      expect(
        cookie,
      ).toContain(
        'Path=/auth',
      );

      expect(
        cookie,
      ).toContain(
        'Max-Age=2592000',
      );

      expect(
        cookie,
      ).not.toContain(
        'Secure',
      );
    });

    it('returns 401 for invalid Google credentials without setting a refresh cookie', async () => {
      const login =
        vi
          .fn<
            GoogleLoginService[
              'login'
            ]
          >()
          .mockRejectedValue(
            new InvalidGoogleIdTokenError(),
          );

      const response =
        await request(
          testApp(
            googleLoginService(
              login,
            ),
          ),
        )
          .post(
            '/auth/google',
          )
          .send({
            idToken:
              'invalid-google-token',
          });

      expect(
        response.status,
      ).toBe(
        401,
      );

      expect(
        response.body,
      ).toEqual({
        error: {
          code:
            'INVALID_GOOGLE_CREDENTIALS',
          message:
            'Invalid Google credentials',
        },
      });

      expect(
        response.headers[
          'set-cookie'
        ],
      ).toBeUndefined();
    });

    it('returns 409 instead of auto-linking when the verified Google email already belongs to a local account', async () => {
      const login =
        vi
          .fn<
            GoogleLoginService[
              'login'
            ]
          >()
          .mockRejectedValue(
            new GoogleEmailAlreadyRegisteredError(),
          );

      const response =
        await request(
          testApp(
            googleLoginService(
              login,
            ),
          ),
        )
          .post(
            '/auth/google',
          )
          .send({
            idToken:
              'google-id-token',
          });

      expect(
        response.status,
      ).toBe(
        409,
      );

      expect(
        response.body,
      ).toEqual({
        error: {
          code:
            'GOOGLE_EMAIL_ALREADY_REGISTERED',
          message:
            'An account with this email already exists',
        },
      });

      expect(
        response.headers[
          'set-cookie'
        ],
      ).toBeUndefined();
    });

    it.each([
      {},
      {
        idToken:
          '',
      },
      {
        idToken:
          '   ',
      },
      {
        idToken:
          'google-id-token',
        email:
          'client-controlled@example.test',
      },
      [],
    ])(
      'returns safe 400 validation without calling Google login for invalid body %j',
      async (
        body,
      ) => {
        const login =
          vi.fn<
            GoogleLoginService[
              'login'
            ]
          >();

        const response =
          await request(
            testApp(
              googleLoginService(
                login,
              ),
            ),
          )
            .post(
              '/auth/google',
            )
            .send(
              body,
            );

        expect(
          response.status,
        ).toBe(
          400,
        );

        expect(
          response.body,
        ).toEqual({
          error: {
            code:
              'VALIDATION_ERROR',
            message:
              'Request validation failed',
          },
        });

        expect(
          login,
        ).not.toHaveBeenCalled();

        expect(
          response.headers[
            'set-cookie'
          ],
        ).toBeUndefined();
      },
    );
  },
);
