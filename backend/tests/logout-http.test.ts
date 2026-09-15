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

import type { CurrentUserService } from '../src/auth/current-user-service.js';

import type { LoginService } from '../src/auth/login-service.js';

import type { LogoutService } from '../src/auth/logout-service.js';

import type { RefreshService } from '../src/auth/refresh-service.js';

import type { RegistrationService } from '../src/auth/user-service.js';

import { testConfig } from './helpers.js';

const silentLogger = pino({

  level: 'silent',

});

const unusedRegistrationService: RegistrationService = {

  register: () =>

    Promise.reject(

      new Error(

        'Registration is not exercised by logout HTTP tests',

      ),

    ),

};

const unusedLoginService = {

  login: () =>

    Promise.reject(

      new Error(

        'Login is not exercised by logout HTTP tests',

      ),

    ),

} as unknown as LoginService;

const unusedRefreshService = {

  refresh: () =>

    Promise.reject(

      new Error(

        'Refresh is not exercised by logout HTTP tests',

      ),

    ),

} as unknown as RefreshService;

const unusedCurrentUserService: Pick<

  CurrentUserService,

  'getCurrentUser'

> = {

  getCurrentUser: () =>

    Promise.reject(

      new Error(

        'Current user is not exercised by logout HTTP tests',

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

function logoutService(

  logout: LogoutService['logout'],

): LogoutService {

  return {

    logout,

  } as unknown as LogoutService;

}

function testApp(

  service: LogoutService,

) {

  return createApp({

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

      service,

    currentUserService:

      unusedCurrentUserService,

    sessionManagementService:

      unusedSessionManagementService,

    requireAuth:

      unusedRequireAuth,

  });

}

describe('POST /auth/logout', () => {

  it('passes the refresh token cookie to the logout service and returns 204', async () => {

    const logout = vi

      .fn<LogoutService['logout']>()

      .mockResolvedValue();

    const refreshToken =

      'A'.repeat(43);

    const response =

      await request(

        testApp(

          logoutService(

            logout,

          ),

        ),

      )

        .post('/auth/logout')

        .set(

          'Cookie',

          `codegym_refresh=${refreshToken}`,

        );

    expect(

      response.status,

    ).toBe(204);

    expect(

      logout,

    ).toHaveBeenCalledOnce();

    expect(

      logout,

    ).toHaveBeenCalledWith(

      refreshToken,

    );

  });

  it('returns 204 when there is no refresh cookie', async () => {

    const logout = vi

      .fn<LogoutService['logout']>()

      .mockResolvedValue();

    const response =

      await request(

        testApp(

          logoutService(

            logout,

          ),

        ),

      )

        .post('/auth/logout');

    expect(

      response.status,

    ).toBe(204);

    expect(

      logout,

    ).toHaveBeenCalledOnce();

    expect(

      logout,

    ).toHaveBeenCalledWith(

      undefined,

    );

  });

  it('ignores unrelated cookies when the refresh cookie is absent', async () => {

    const logout = vi

      .fn<LogoutService['logout']>()

      .mockResolvedValue();

    const response =

      await request(

        testApp(

          logoutService(

            logout,

          ),

        ),

      )

        .post('/auth/logout')

        .set(

          'Cookie',

          'theme=dark; language=en',

        );

    expect(

      response.status,

    ).toBe(204);

    expect(

      logout,

    ).toHaveBeenCalledWith(

      undefined,

    );

  });

  it('treats an empty refresh cookie as missing', async () => {

    const logout = vi

      .fn<LogoutService['logout']>()

      .mockResolvedValue();

    const response =

      await request(

        testApp(

          logoutService(

            logout,

          ),

        ),

      )

        .post('/auth/logout')

        .set(

          'Cookie',

          'codegym_refresh=',

        );

    expect(

      response.status,

    ).toBe(204);

    expect(

      logout,

    ).toHaveBeenCalledWith(

      undefined,

    );

  });

  it('reads the refresh cookie when multiple cookies are present', async () => {

    const logout = vi

      .fn<LogoutService['logout']>()

      .mockResolvedValue();

    const refreshToken =

      'B'.repeat(43);

    const response =

      await request(

        testApp(

          logoutService(

            logout,

          ),

        ),

      )

        .post('/auth/logout')

        .set(

          'Cookie',

          `theme=dark; codegym_refresh=${refreshToken}; language=en`,

        );

    expect(

      response.status,

    ).toBe(204);

    expect(

      logout,

    ).toHaveBeenCalledWith(

      refreshToken,

    );

  });

  it('clears the refresh cookie on successful logout', async () => {

    const logout = vi

      .fn<LogoutService['logout']>()

      .mockResolvedValue();

    const response =

      await request(

        testApp(

          logoutService(

            logout,

          ),

        ),

      )

        .post('/auth/logout')

        .set(

          'Cookie',

          `codegym_refresh=${'C'.repeat(43)}`,

        );

    expect(

      response.status,

    ).toBe(204);

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

  it('returns an empty response body on successful logout', async () => {

    const logout = vi

      .fn<LogoutService['logout']>()

      .mockResolvedValue();

    const response =

      await request(

        testApp(

          logoutService(

            logout,

          ),

        ),

      )

        .post('/auth/logout');

    expect(

      response.status,

    ).toBe(204);

    expect(

      response.text,

    ).toBe('');

  });

  it('clears the cookie even when the logout service fails', async () => {

    const logout = vi

      .fn<LogoutService['logout']>()

      .mockRejectedValue(

        new Error(

          'database-secret logout failure',

        ),

      );

    const response =

      await request(

        testApp(

          logoutService(

            logout,

          ),

        ),

      )

        .post('/auth/logout')

        .set(

          'Cookie',

          `codegym_refresh=${'D'.repeat(43)}`,

        );

    expect(

      response.status,

    ).toBe(500);

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

  });

  it('does not expose internal logout failures', async () => {

    const logout = vi

      .fn<LogoutService['logout']>()

      .mockRejectedValue(

        new Error(

          'database-secret logout failure',

        ),

      );

    const response =

      await request(

        testApp(

          logoutService(

            logout,

          ),

        ),

      )

        .post('/auth/logout');

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

      'logout failure',

    );

  });

  it('allows logout from an authorized frontend origin with credentialed CORS', async () => {

    const logout = vi

      .fn<LogoutService['logout']>()

      .mockResolvedValue();

    const response =

      await request(

        testApp(

          logoutService(

            logout,

          ),

        ),

      )

        .post('/auth/logout')

        .set(

          'Origin',

          'https://app.example.com',

        )

        .set(

          'Cookie',

          `codegym_refresh=${'E'.repeat(43)}`,

        );

    expect(

      response.status,

    ).toBe(204);

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

  it('rejects logout from a disallowed origin without calling the logout service', async () => {

    const logout = vi

      .fn<LogoutService['logout']>()

      .mockResolvedValue();

    const response =

      await request(

        testApp(

          logoutService(

            logout,

          ),

        ),

      )

        .post('/auth/logout')

        .set(

          'Origin',

          'https://attacker.example.com',

        )

        .set(

          'Cookie',

          `codegym_refresh=${'E'.repeat(43)}`,

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

      logout,

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

  });


  it(
    'does not pass an ambiguous duplicate refresh cookie to the logout service',
    async () => {
      const logout = vi
        .fn<LogoutService['logout']>()
        .mockResolvedValue();

      const response =
        await request(
          testApp(
            logoutService(
              logout,
            ),
          ),
        )
          .post(
            '/auth/logout',
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
      ).toBe(204);

      expect(
        logout,
      ).toHaveBeenCalledOnce();

      expect(
        logout,
      ).toHaveBeenCalledWith(
        undefined,
      );

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
    'treats an empty refresh cookie as absent during logout',
    async () => {
      const logout = vi
        .fn<LogoutService['logout']>()
        .mockResolvedValue();

      const response =
        await request(
          testApp(
            logoutService(
              logout,
            ),
          ),
        )
          .post(
            '/auth/logout',
          )
          .set(
            'Cookie',
            'codegym_refresh=',
          );

      expect(
        response.status,
      ).toBe(204);

      expect(
        logout,
      ).toHaveBeenCalledOnce();

      expect(
        logout,
      ).toHaveBeenCalledWith(
        undefined,
      );
    },
  );

  it(
    'does not treat a similarly named cookie as the logout refresh cookie',
    async () => {
      const logout = vi
        .fn<LogoutService['logout']>()
        .mockResolvedValue();

      const response =
        await request(
          testApp(
            logoutService(
              logout,
            ),
          ),
        )
          .post(
            '/auth/logout',
          )
          .set(
            'Cookie',
            `codegym_refresh_evil=${'A'.repeat(43)}`,
          );

      expect(
        response.status,
      ).toBe(204);

      expect(
        logout,
      ).toHaveBeenCalledOnce();

      expect(
        logout,
      ).toHaveBeenCalledWith(
        undefined,
      );
    },
  );

});
