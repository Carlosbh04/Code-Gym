import type { RequestHandler } from 'express';

import pino from 'pino';

import request from 'supertest';

import { describe, expect, it, vi } from 'vitest';

import {
  createApp,
  type AppDependencies,
} from '../src/app.js';

import type { CurrentUserService } from '../src/auth/current-user-service.js';

import {

  InvalidCredentialsError,

  type LoginResult,

  type LoginService,

} from '../src/auth/login-service.js';

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

const loginResult: LoginResult = {

  user: publicUser,

  accessToken: 'header.payload.signature',

  refreshToken: 'A'.repeat(43),

};

const unusedRegistrationService: RegistrationService = {

  register: () =>

    Promise.reject(

      new Error(

        'Registration is not exercised by login HTTP tests',

      ),

    ),

};

const unusedRefreshService = {

  refresh: () =>

    Promise.reject(

      new Error(

        'Refresh is not exercised by login HTTP tests',

      ),

    ),

} as unknown as RefreshService;

const unusedLogoutService = {

  logout: () =>

    Promise.reject(

      new Error(

        'Logout is not exercised by login HTTP tests',

      ),

    ),

} as unknown as LogoutService;

const unusedCurrentUserService: Pick<

  CurrentUserService,

  'getCurrentUser'

> = {

  getCurrentUser: () =>

    Promise.reject(

      new Error(

        'Current user is not exercised by login HTTP tests',

      ),

    ),

};

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

const unusedRequireAuth: RequestHandler = (

  _request,

  _response,

  next,

) => {

  next();

};

function loginService(

  login: LoginService['login'],

): LoginService {

  return {

    login,

  } as unknown as LoginService;

}

function testApp(
  service: LoginService,
) {
  const config =
    testConfig();

  return createApp({
    config,
    loginFailureKeySecret:
      config.rateLimitKeySecret,

    logger: silentLogger,

    databaseHealthCheck: () =>

      Promise.resolve(true),

    registrationService:

      unusedRegistrationService,

    loginService:

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


describe('POST /auth/login', () => {

  it('returns user and access token and stores the refresh token only in an HttpOnly cookie', async () => {

    const login = vi

      .fn<LoginService['login']>()

      .mockResolvedValue(

        loginResult,

      );

    const response =

      await request(

        testApp(

          loginService(

            login,

          ),

        ),

      )

        .post('/auth/login')

        .send({

          email:

            '  PERSON@EXAMPLE.TEST  ',

          password:

            'correct horse battery staple',

        });

    expect(

      response.status,

    ).toBe(200);

    expect(

      response.body,

    ).toEqual({

      user:

        publicUser,

      accessToken:

        'header.payload.signature',

    });

    expect(

      login,

    ).toHaveBeenCalledOnce();

    expect(

      login,

    ).toHaveBeenCalledWith({

      email:

        'person@example.test',

      password:

        'correct horse battery staple',
        remember:
          false,

    });

    expect(

      response.body,

    ).not.toHaveProperty(

      'refreshToken',

    );

    expect(

      response.text,

    ).not.toContain(

      loginResult.refreshToken,

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

      `codegym_refresh=${loginResult.refreshToken}`,

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
    ).not.toContain(
      'Max-Age=',
    );

    expect(

      cookie,

    ).not.toContain(

      'Secure',

    );

  });


  it('sets a persistent refresh cookie when remember is true', async () => {
    const login = vi
      .fn<LoginService['login']>()
      .mockResolvedValue(
        loginResult,
      );

    const response =
      await request(
        testApp(
          loginService(
            login,
          ),
        ),
      )
        .post('/auth/login')
        .send({
          email:
            'person@example.test',
          password:
            'correct horse battery staple',
          remember:
            true,
        });

    expect(
      response.status,
    ).toBe(200);

    expect(
      login,
    ).toHaveBeenCalledWith({
      email:
        'person@example.test',
      password:
        'correct horse battery staple',
      remember:
        true,
    });

    const cookie =
      extractSetCookie(
        response.headers[
          'set-cookie'
        ],
      );

    expect(
      cookie,
    ).toContain(
      'Max-Age=2592000',
    );
  });

  it('returns the same safe 401 contract for invalid credentials', async () => {

    const login = vi

      .fn<LoginService['login']>()

      .mockRejectedValue(

        new InvalidCredentialsError(),

      );

    const response =

      await request(

        testApp(

          loginService(

            login,

          ),

        ),

      )

        .post('/auth/login')

        .send({

          email:

            'person@example.test',

          password:

            'incorrect password',

        });

    expect(

      response.status,

    ).toBe(401);

    expect(

      response.body,

    ).toEqual({

      error: {

        code:

          'INVALID_CREDENTIALS',

        message:

          'Invalid email or password',

      },

    });

    expect(

      response.headers[

        'set-cookie'

      ],

    ).toBeUndefined();

    expect(

      response.text,

    ).not.toContain(

      'passwordHash',

    );

    expect(

      response.text,

    ).not.toContain(

      'refreshToken',

    );

  });

  it.each([

    {

      email:

        'not-an-email',

      password:

        'correct horse battery staple',

    },

    {

      email:

        'person@example.test',

      password: '',

    },

    {

      email:

        'person@example.test',

    },

    {

      password:

        'correct horse battery staple',

    },

    {

      email:

        'person@example.test',

      password:

        'correct horse battery staple',

      passwordHash:

        'client-controlled-hash',

    },

    [],

  ])(

    'returns the safe 400 contract without calling login for invalid body %j',

    async (

      body,

    ) => {

      const login =

        vi.fn<

          LoginService['login']

        >();

      const response =

        await request(

          testApp(

            loginService(

              login,

            ),

          ),

        )

          .post(

            '/auth/login',

          )

          .send(

            body,

          );

      expect(

        response.status,

      ).toBe(400);

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

  it('does not expose the refresh token inside the JSON response', async () => {

    const login = vi

      .fn<LoginService['login']>()

      .mockResolvedValue(

        loginResult,

      );

    const response =

      await request(

        testApp(

          loginService(

            login,

          ),

        ),

      )

        .post('/auth/login')

        .send({

          email:

            'person@example.test',

          password:

            'correct horse battery staple',

        });

    expect(

      response.status,

    ).toBe(200);

    expect(

      response.body,

    ).not.toHaveProperty(

      'refreshToken',

    );

    expect(

      JSON.stringify(

        response.body,

      ),

    ).not.toContain(

      loginResult.refreshToken,

    );

  });

  it('allows login from an authorized frontend origin with credentialed CORS', async () => {

    const login = vi

      .fn<LoginService['login']>()

      .mockResolvedValue(

        loginResult,

      );

    const app =

      testApp(

        loginService(

          login,

        ),

      );

    const preflight =

      await request(

        app,

      )

        .options(

          '/auth/login',

        )

        .set(

          'Origin',

          'https://app.example.com',

        )

        .set(

          'Access-Control-Request-Method',

          'POST',

        )

        .set(

          'Access-Control-Request-Headers',

          'Content-Type',

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

    const response =

      await request(

        app,

      )

        .post(

          '/auth/login',

        )

        .set(

          'Origin',

          'https://app.example.com',

        )

        .send({

          email:

            'person@example.test',

          password:

            'correct horse battery staple',

        });

    expect(

      response.status,

    ).toBe(200);

    expect(

      response.headers[

        'access-control-allow-origin'

      ],

    ).toBe(

      'https://app.example.com',

    );

    expect(

      response.headers[

        'access-control-allow-credentials'

      ],

    ).toBe(

      'true',

    );

  });

  it('does not grant CORS access to a disallowed origin', async () => {

    const login = vi

      .fn<LoginService['login']>()

      .mockResolvedValue(

        loginResult,

      );

    const response =

      await request(

        testApp(

          loginService(

            login,

          ),

        ),

      )

        .post('/auth/login')

        .set(

          'Origin',

          'https://attacker.example.com',

        )

        .send({

          email:

            'person@example.test',

          password:

            'correct horse battery staple',

        });

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


describe('POST /auth/login login-failure throttling', () => {
  it(
    'blocks the fourth invalid credential attempt for the same IP and email',
    async () => {
      const login =
        vi
          .fn<LoginService['login']>()
          .mockRejectedValue(
            new InvalidCredentialsError(),
          );

      const app =
        testApp(
          loginService(
            login,
          ),
        );

      for (
        let attempt = 1;
        attempt <= 3;
        attempt += 1
      ) {
        const response =
          await request(app)
            .post('/auth/login')
            .send({
              email:
                'person@example.test',
              password:
                'wrong-password-value',
            });

        expect(
          response.status,
        ).toBe(401);
      }

      const blocked =
        await request(app)
          .post('/auth/login')
          .send({
            email:
              'person@example.test',
            password:
              'wrong-password-value',
          });

      expect(
        blocked.status,
      ).toBe(429);

      expect(
        blocked.body,
      ).toEqual({
        error: {
          code:
            'RATE_LIMITED',
          message:
            'Too many requests',
        },
      });

      expect(
        login,
      ).toHaveBeenCalledTimes(
        3,
      );
    },
  );
});
