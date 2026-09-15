import type { RequestHandler } from 'express';

import pino from 'pino';

import request from 'supertest';

import { describe, expect, it, vi } from 'vitest';

import {

  createApp,

  type AppDependencies,

} from '../src/app.js';

import type { CurrentUserService } from '../src/auth/current-user-service.js';

import type { LoginService } from '../src/auth/login-service.js';

import type { LogoutService } from '../src/auth/logout-service.js';

import {

  InvalidRefreshSessionError,

  type RefreshResult,

  type RefreshService,

} from '../src/auth/refresh-service.js';

import type { RegistrationService } from '../src/auth/user-service.js';

import { testConfig } from './helpers.js';

const silentLogger = pino({

  level: 'silent',

});

const unusedRegistrationService: RegistrationService = {

  register: () =>

    Promise.reject(

      new Error(

        'Registration is not exercised by refresh HTTP tests',

      ),

    ),

};

const unusedLoginService = {

  login: () =>

    Promise.reject(

      new Error(

        'Login is not exercised by refresh HTTP tests',

      ),

    ),

} as unknown as LoginService;

const unusedLogoutService = {

  logout: () =>

    Promise.reject(

      new Error(

        'Logout is not exercised by refresh HTTP tests',

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

        'Current user is not exercised by refresh HTTP tests',

      ),

    ),

};

const unusedSessionManagementService:

  AppDependencies['sessionManagementService'] = {

    listSessions: () =>

      Promise.reject(

        new Error(

          'Session management is not exercised by refresh HTTP tests',

        ),

      ),

    revokeSession: () =>

      Promise.reject(

        new Error(

          'Session management is not exercised by refresh HTTP tests',

        ),

      ),

    revokeOtherSessions: () =>

      Promise.reject(

        new Error(

          'Session management is not exercised by refresh HTTP tests',

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

const refreshResult: RefreshResult = {

  accessToken: 'new.header.payload.signature',

  refreshToken: 'B'.repeat(43),

};

function refreshService(

  refresh: RefreshService['refresh'],

): RefreshService {

  return {

    refresh,

  } as unknown as RefreshService;

}

function testApp(

  service: RefreshService,

) {

  return createApp({

    config: testConfig(),

    logger: silentLogger,

    databaseHealthCheck: () =>

      Promise.resolve(true),

    registrationService:

      unusedRegistrationService,

    loginService:

      unusedLoginService,

    refreshService:

      service,

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

describe('POST /auth/refresh', () => {

  it('rotates the refresh cookie and returns only the new access token', async () => {

    const refresh = vi

      .fn<RefreshService['refresh']>()

      .mockResolvedValue(

        refreshResult,

      );

    const response =

      await request(

        testApp(

          refreshService(

            refresh,

          ),

        ),

      )

        .post('/auth/refresh')

        .set(

          'Cookie',

          'codegym_refresh=A'.concat(

            'A'.repeat(42),

          ),

        );

    expect(

      response.status,

    ).toBe(200);

    expect(

      refresh,

    ).toHaveBeenCalledOnce();

    expect(

      refresh,

    ).toHaveBeenCalledWith(

      'A'.repeat(43),

    );

    expect(

      response.body,

    ).toEqual({

      accessToken:

        refreshResult.accessToken,

    });

    expect(

      response.body,

    ).not.toHaveProperty(

      'refreshToken',

    );

    expect(

      response.text,

    ).not.toContain(

      refreshResult.refreshToken,

    );

    const cookies: unknown =

      response.headers[

        'set-cookie'

      ];

    expect(

      cookies,

    ).toBeDefined();

    const cookie =

      typeof cookies ===
        'string'

        ? cookies

        : (
            Array.isArray(
              cookies,
            )
            && typeof cookies[0]
              === 'string'
          )

          ? cookies[0]

          : undefined;

    expect(

      cookie,

    ).toContain(

      `codegym_refresh=${refreshResult.refreshToken}`,

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

  });

  it('returns safe 401 and clears the cookie when no refresh cookie is present', async () => {

    const refresh =

      vi.fn<

        RefreshService['refresh']

      >();

    const response =

      await request(

        testApp(

          refreshService(

            refresh,

          ),

        ),

      ).post(

        '/auth/refresh',

      );

    expect(

      response.status,

    ).toBe(401);

    expect(

      response.body,

    ).toEqual({

      error: {

        code:

          'INVALID_REFRESH_SESSION',

        message:

          'Invalid refresh session',

      },

    });

    expect(

      refresh,

    ).not.toHaveBeenCalled();

    const cookies: unknown =

      response.headers[

        'set-cookie'

      ];

    expect(

      cookies,

    ).toBeDefined();

    const cookie =

      typeof cookies ===
        'string'

        ? cookies

        : (
            Array.isArray(
              cookies,
            )
            && typeof cookies[0]
              === 'string'
          )

          ? cookies[0]

          : undefined;

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

  });

  it('returns safe 401 and clears the cookie for an invalid refresh session', async () => {

    const refresh = vi

      .fn<RefreshService['refresh']>()

      .mockRejectedValue(

        new InvalidRefreshSessionError(),

      );

    const response =

      await request(

        testApp(

          refreshService(

            refresh,

          ),

        ),

      )

        .post('/auth/refresh')

        .set(

          'Cookie',

          `codegym_refresh=${'A'.repeat(

            43,

          )}`,

        );

    expect(

      response.status,

    ).toBe(401);

    expect(

      response.body,

    ).toEqual({

      error: {

        code:

          'INVALID_REFRESH_SESSION',

        message:

          'Invalid refresh session',

      },

    });

    const cookies: unknown =

      response.headers[

        'set-cookie'

      ];

    expect(

      cookies,

    ).toBeDefined();

    const cookie =

      typeof cookies ===
        'string'

        ? cookies

        : (
            Array.isArray(
              cookies,
            )
            && typeof cookies[0]
              === 'string'
          )

          ? cookies[0]

          : undefined;

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

  });

  it('does not expose the refresh token in the JSON response', async () => {

    const refresh = vi

      .fn<RefreshService['refresh']>()

      .mockResolvedValue(

        refreshResult,

      );

    const response =

      await request(

        testApp(

          refreshService(

            refresh,

          ),

        ),

      )

        .post('/auth/refresh')

        .set(

          'Cookie',

          `codegym_refresh=${'A'.repeat(

            43,

          )}`,

        );

    expect(

      response.status,

    ).toBe(200);

    expect(

      JSON.stringify(

        response.body,

      ),

    ).not.toContain(

      refreshResult.refreshToken,

    );

  });

  it('allows refresh from an authorized frontend origin with credentialed CORS', async () => {

    const refresh = vi

      .fn<RefreshService['refresh']>()

      .mockResolvedValue(

        refreshResult,

      );

    const app =

      testApp(

        refreshService(

          refresh,

        ),

      );

    const preflight =

      await request(app)

        .options(

          '/auth/refresh',

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

    const response =

      await request(app)

        .post(

          '/auth/refresh',

        )

        .set(

          'Origin',

          'https://app.example.com',

        )

        .set(

          'Cookie',

          `codegym_refresh=${'A'.repeat(

            43,

          )}`,

        );

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


  it(
    'rejects refresh from a disallowed origin without calling the refresh service',
    async () => {
      const refresh = vi
        .fn<RefreshService['refresh']>()
        .mockResolvedValue(
          refreshResult,
        );

      const response =
        await request(
          testApp(
            refreshService(
              refresh,
            ),
          ),
        )
          .post(
            '/auth/refresh',
          )
          .set(
            'Origin',
            'https://attacker.example.com',
          )
          .set(
            'Cookie',
            `codegym_refresh=${'A'.repeat(43)}`,
          );

      expect(
        response.status,
      ).toBe(403);

      expect(
        response.body,
      ).toEqual({
        error: {
          code:
            'UNTRUSTED_ORIGIN',

          message:
            'Request origin is not allowed',
        },
      });

      expect(
        refresh,
      ).not.toHaveBeenCalled();

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

      expect(
        response.headers[
          'set-cookie'
        ],
      ).toBeUndefined();
    },
  );


  it(
    'rejects duplicate refresh cookies without calling the refresh service',
    async () => {
      const refresh = vi
        .fn<RefreshService['refresh']>()
        .mockResolvedValue(
          refreshResult,
        );

      const response =
        await request(
          testApp(
            refreshService(
              refresh,
            ),
          ),
        )
          .post(
            '/auth/refresh',
          )
          .set(
            'Cookie',
            [
              `codegym_refresh=${'A'.repeat(43)}`,
              `codegym_refresh=${'B'.repeat(43)}`,
            ].join('; '),
          );

      expect(
        response.status,
      ).toBe(401);

      expect(
        response.body,
      ).toEqual({
        error: {
          code:
            'INVALID_REFRESH_SESSION',

          message:
            'Invalid refresh session',
        },
      });

      expect(
        refresh,
      ).not.toHaveBeenCalled();

      const cookies: unknown =
        response.headers[
          'set-cookie'
        ];

      expect(
        cookies,
      ).toBeDefined();
    },
  );


  it(
    'rejects an empty refresh cookie without calling the refresh service',
    async () => {
      const refresh = vi
        .fn<RefreshService['refresh']>()
        .mockResolvedValue(
          refreshResult,
        );

      const response =
        await request(
          testApp(
            refreshService(
              refresh,
            ),
          ),
        )
          .post(
            '/auth/refresh',
          )
          .set(
            'Cookie',
            'codegym_refresh=',
          );

      expect(
        response.status,
      ).toBe(401);

      expect(
        response.body,
      ).toEqual({
        error: {
          code:
            'INVALID_REFRESH_SESSION',

          message:
            'Invalid refresh session',
        },
      });

      expect(
        refresh,
      ).not.toHaveBeenCalled();
    },
  );

  it(
    'does not treat a similarly named cookie as the refresh cookie',
    async () => {
      const refresh = vi
        .fn<RefreshService['refresh']>()
        .mockResolvedValue(
          refreshResult,
        );

      const response =
        await request(
          testApp(
            refreshService(
              refresh,
            ),
          ),
        )
          .post(
            '/auth/refresh',
          )
          .set(
            'Cookie',
            `codegym_refresh_evil=${'A'.repeat(43)}`,
          );

      expect(
        response.status,
      ).toBe(401);

      expect(
        response.body,
      ).toEqual({
        error: {
          code:
            'INVALID_REFRESH_SESSION',

          message:
            'Invalid refresh session',
        },
      });

      expect(
        refresh,
      ).not.toHaveBeenCalled();
    },
  );

  it(
    'returns the safe refresh error when the exact cookie contains a malformed token',
    async () => {
      const refresh = vi
        .fn<RefreshService['refresh']>()
        .mockRejectedValue(
          new InvalidRefreshSessionError(),
        );

      const response =
        await request(
          testApp(
            refreshService(
              refresh,
            ),
          ),
        )
          .post(
            '/auth/refresh',
          )
          .set(
            'Cookie',
            'codegym_refresh=malformed-token',
          );

      expect(
        response.status,
      ).toBe(401);

      expect(
        response.body,
      ).toEqual({
        error: {
          code:
            'INVALID_REFRESH_SESSION',

          message:
            'Invalid refresh session',
        },
      });

      expect(
        refresh,
      ).toHaveBeenCalledOnce();

      expect(
        refresh,
      ).toHaveBeenCalledWith(
        'malformed-token',
      );

      expect(
        response.text,
      ).not.toContain(
        'malformed-token',
      );
    },
  );

});
