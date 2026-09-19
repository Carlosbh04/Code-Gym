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

import {

  AuthenticatedUserNotFoundError,

  type CurrentUserService,

} from '../src/auth/current-user-service.js';

import type { LoginService } from '../src/auth/login-service.js';

import type { LogoutService } from '../src/auth/logout-service.js';

import type { PublicUser } from '../src/auth/public-user.js';

import type { RefreshService } from '../src/auth/refresh-service.js';

import type { RegistrationService } from '../src/auth/user-service.js';

import { testConfig } from './helpers.js';

const silentLogger = pino({

  level: 'silent',

});

const publicUser: PublicUser = {

  id: 'user-1',

  email: 'person@example.test',

  displayName: 'Ada',

  role: 'USER',

  createdAt: '2026-09-10T10:00:00.000Z',

  updatedAt: '2026-09-10T10:01:00.000Z',

};

const unusedRegistrationService: RegistrationService = {

  register: () =>

    Promise.reject(

      new Error(

        'Registration is not exercised by /auth/me HTTP tests',

      ),

    ),

};

const unusedLoginService = {

  login: () =>

    Promise.reject(

      new Error(

        'Login is not exercised by /auth/me HTTP tests',

      ),

    ),

} as unknown as LoginService;

const unusedRefreshService = {

  refresh: () =>

    Promise.reject(

      new Error(

        'Refresh is not exercised by /auth/me HTTP tests',

      ),

    ),

} as unknown as RefreshService;

const unusedLogoutService = {

  logout: () =>

    Promise.reject(

      new Error(

        'Logout is not exercised by /auth/me HTTP tests',

      ),

    ),

} as unknown as LogoutService;

function currentUserService(

  getCurrentUser:

    CurrentUserService['getCurrentUser'],

): Pick<

  CurrentUserService,

  'getCurrentUser'

> {

  return {

    getCurrentUser,

  };

}

const unusedSessionManagementService:
  AppDependencies['sessionManagementService'] = {
    listSessions: () =>
      Promise.reject(
        new Error(
          'Session management is not exercised by this HTTP test',
        ),
      ),

    revokeSession: () =>
      Promise.reject(
        new Error(
          'Session management is not exercised by this HTTP test',
        ),
      ),

    revokeOtherSessions: () =>
      Promise.reject(
        new Error(
          'Session management is not exercised by this HTTP test',
        ),
      ),
  };

const authenticatedRequireAuth: RequestHandler = (

  request,

  _response,

  next,

) => {

  request.auth = Object.freeze({

    userId: 'user-1',

    sessionId: 'session-1',

  });

  next();

};

const unauthorizedRequireAuth: RequestHandler = (

  _request,

  response,

) => {

  response.status(401).json({

    error: {

      code: 'UNAUTHORIZED',

      message: 'Authentication required',

    },

  });

};

function testApp(

  service: Pick<

    CurrentUserService,

    'getCurrentUser'

  >,

  requireAuth:

    RequestHandler =

      authenticatedRequireAuth,

) {

  return createApp({
    loginFailureKeySecret:
      'test-login-failure-key-secret',

    config: testConfig(),

    logger:

      silentLogger,

    databaseHealthCheck: () =>

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

      service,

    sessionManagementService:
      unusedSessionManagementService,
    requireAuth,

  });

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


describe('GET /auth/me', () => {

  it('returns the authenticated public user', async () => {

    const getCurrentUser = vi

      .fn<

        CurrentUserService[

          'getCurrentUser'

        ]

      >()

      .mockResolvedValue(

        publicUser,

      );

    const response =

      await request(

        testApp(

          currentUserService(

            getCurrentUser,

          ),

        ),

      )

        .get('/auth/me')

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

      user:

        publicUser,

    });

    expect(

      getCurrentUser,

    ).toHaveBeenCalledOnce();

    expect(

      getCurrentUser,

    ).toHaveBeenCalledWith(

      'user-1',

    );

  });

  it('returns the uniform 401 when authentication middleware rejects the request', async () => {

    const getCurrentUser =

      vi.fn<

        CurrentUserService[

          'getCurrentUser'

        ]

      >();

    const response =

      await request(

        testApp(

          currentUserService(

            getCurrentUser,

          ),

          unauthorizedRequireAuth,

        ),

      )

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

    expect(

      getCurrentUser,

    ).not.toHaveBeenCalled();

  });

  it('returns the uniform 401 when the authenticated user no longer exists', async () => {

    const getCurrentUser = vi

      .fn<

        CurrentUserService[

          'getCurrentUser'

        ]

      >()

      .mockRejectedValue(

        new AuthenticatedUserNotFoundError(),

      );

    const response =

      await request(

        testApp(

          currentUserService(

            getCurrentUser,

          ),

        ),

      )

        .get('/auth/me')

        .set(

          'Authorization',

          'Bearer valid-access-token',

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

      getCurrentUser,

    ).toHaveBeenCalledWith(

      'user-1',

    );

  });

  it('does not expose credential or session fields in the successful response', async () => {

    const getCurrentUser = vi

      .fn<

        CurrentUserService[

          'getCurrentUser'

        ]

      >()

      .mockResolvedValue(

        publicUser,

      );

    const response =

      await request(

        testApp(

          currentUserService(

            getCurrentUser,

          ),

        ),

      )

        .get('/auth/me')

        .set(

          'Authorization',

          'Bearer valid-access-token',

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

    expect(

      JSON.stringify(

        response.body,

      ),

    ).not.toContain(

      'passwordHash',

    );

    expect(

      JSON.stringify(

        response.body,

      ),

    ).not.toContain(

      'refreshToken',

    );

  });

  it('returns the generic safe 500 contract for an unexpected current-user failure', async () => {

    const getCurrentUser = vi

      .fn<

        CurrentUserService[

          'getCurrentUser'

        ]

      >()

      .mockRejectedValue(

        new Error(

          'database-secret internal failure',

        ),

      );

    const response =

      await request(

        testApp(

          currentUserService(

            getCurrentUser,

          ),

        ),

      )

        .get('/auth/me')

        .set(

          'Authorization',

          'Bearer valid-access-token',

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

    expect(

      response.text,

    ).not.toContain(

      'internal failure',

    );

  });

  it('allows Authorization on credentialed CORS preflight for /auth/me', async () => {

    const getCurrentUser = vi

      .fn<

        CurrentUserService[

          'getCurrentUser'

        ]

      >()

      .mockResolvedValue(

        publicUser,

      );

    const app =

      testApp(

        currentUserService(

          getCurrentUser,

        ),

      );

    const preflight =

      await request(app)

        .options('/auth/me')

        .set(

          'Origin',

          'https://app.example.com',

        )

        .set(

          'Access-Control-Request-Method',

          'GET',

        )

        .set(

          'Access-Control-Request-Headers',

          'Authorization',

        );

    expect(

      preflight.status,

    ).toBe(204);

    expect(

      preflight.headers[

        'access-control-allow-origin'

      ],

    ).toBe(

      'https://app.example.com',

    );

    expect(

      preflight.headers[

        'access-control-allow-credentials'

      ],

    ).toBe(

      'true',

    );

    expect(

      preflight.headers[

        'access-control-allow-methods'

      ],

    ).toBe(

      'GET,POST,PATCH,DELETE',

    );

    expect(

      preflight.headers[

        'access-control-allow-headers'

      ],

    ).toBe(

      'Content-Type,Authorization',

    );

  });

  it('does not grant CORS access to a disallowed origin', async () => {

    const getCurrentUser = vi

      .fn<

        CurrentUserService[

          'getCurrentUser'

        ]

      >()

      .mockResolvedValue(

        publicUser,

      );

    const response =

      await request(

        testApp(

          currentUserService(

            getCurrentUser,

          ),

        ),

      )

        .get('/auth/me')

        .set(

          'Origin',

          'https://attacker.example.com',

        )

        .set(

          'Authorization',

          'Bearer valid-access-token',

        );

    expect(

      response.status,

    ).toBe(200);

    expect(

      response.headers[

        'access-control-allow-origin'

      ],

    ).toBeUndefined();

    expect(

      response.headers[

        'access-control-allow-credentials'

      ],

    ).toBeUndefined();

  });

});
