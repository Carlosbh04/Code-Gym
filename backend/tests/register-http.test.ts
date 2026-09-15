import type { RequestHandler } from 'express';

import { Writable } from 'node:stream';

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

import type { PublicUser } from '../src/auth/public-user.js';

import type { RefreshService } from '../src/auth/refresh-service.js';

import { EmailAlreadyExistsError } from '../src/auth/user-repository.js';

import type { RegistrationService } from '../src/auth/user-service.js';

import { createLogger } from '../src/config/logger.js';

import { testConfig } from './helpers.js';

const validPassword = 'correct horse battery staple';

const publicUser: PublicUser = {

  id: 'user-1',

  email: 'person@example.test',

  displayName: 'Ada',

  role: 'USER',

  createdAt: '2026-09-10T10:00:00.000Z',

  updatedAt: '2026-09-10T10:00:00.000Z',

};

const silentLogger = pino({

  level: 'silent',

});

const unusedLoginService = {

  login: () =>

    Promise.reject(

      new Error(

        'Login is not exercised by register HTTP tests',

      ),

    ),

} as unknown as LoginService;

const unusedRefreshService = {

  refresh: () =>

    Promise.reject(

      new Error(

        'Refresh is not exercised by register HTTP tests',

      ),

    ),

} as unknown as RefreshService;

const unusedLogoutService = {

  logout: () =>

    Promise.reject(

      new Error(

        'Logout is not exercised by register HTTP tests',

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

        'Current user is not exercised by register HTTP tests',

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

function registrationService(

  register: RegistrationService['register'],

): RegistrationService {

  return {

    register,

  };

}

function testApp(

  service: RegistrationService,

  logger = silentLogger,

) {

  return createApp({

    config: testConfig(),

    logger,

    databaseHealthCheck: () =>

      Promise.resolve(true),

    registrationService: service,

    loginService: unusedLoginService,

    refreshService: unusedRefreshService,

    logoutService: unusedLogoutService,

    currentUserService: unusedCurrentUserService,

    sessionManagementService:
      unusedSessionManagementService,
    requireAuth: unusedRequireAuth,

  });

}

describe('POST /auth/register', () => {

  it('returns the exact 201 public contract and passes only validated canonical input', async () => {

    const register = vi

      .fn<RegistrationService['register']>()

      .mockResolvedValue(publicUser);

    const password =

      `correct-horse-Cafe\u0301-battery`;

    const response = await request(

      testApp(

        registrationService(register),

      ),

    )

      .post('/auth/register')

      .send({

        email:

          '  PERSON@EXAMPLE.TEST  ',

        password,

        displayName: '  Ada  ',

      });

    const responseBody =

      response.body as {

        user: Record<

          string,

          unknown

        >;

      };

    expect(

      response.status,

    ).toBe(201);

    expect(

      response.body,

    ).toEqual({

      user: publicUser,

    });

    expect(

      register,

    ).toHaveBeenCalledOnce();

    expect(

      register,

    ).toHaveBeenCalledWith({

      email:

        'person@example.test',

      password:

        password.normalize('NFC'),

      displayName: 'Ada',

    });

    expect(

      response.text,

    ).not.toContain(password);

    expect(

      responseBody.user,

    ).not.toHaveProperty(

      'password',

    );

    expect(

      responseBody.user,

    ).not.toHaveProperty(

      'passwordHash',

    );

    expect(

      responseBody.user,

    ).not.toHaveProperty(

      'authSession',

    );

    expect(

      responseBody.user,

    ).not.toHaveProperty(

      'refreshToken',

    );

    expect(

      response.headers['set-cookie'],

    ).toBeUndefined();

  });

  it.each([

    {

      email: 'not-an-email',

      password: validPassword,

    },

    {

      email:

        'person@example.test',

      password: 'too-short',

    },

    {

      email:

        'person@example.test',

      password: validPassword,

      displayName: '   ',

    },

    {

      email:

        'person@example.test',

      password: validPassword,

      passwordHash:

        'client-hash',

    },

    {

      email:

        'person@example.test',

      password: validPassword,

      role:

        'ADMIN',

    },

    [],

  ])(

    'returns the exact safe 400 contract without calling the service for invalid body %j',

    async (body) => {

      const register = vi.fn<

        RegistrationService['register']

      >();

      const response =

        await request(

          testApp(

            registrationService(

              register,

            ),

          ),

        )

          .post(

            '/auth/register',

          )

          .send(body);

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

        response.text,

      ).not.toContain(

        'issues',

      );

      expect(

        response.text,

      ).not.toContain(

        'passwordHash',

      );

      expect(

        register,

      ).not.toHaveBeenCalled();

    },

  );

  it('returns the exact 409 contract without leaking persistence details', async () => {

    const register = vi

      .fn<

        RegistrationService['register']

      >()

      .mockRejectedValue(

        new EmailAlreadyExistsError(),

      );

    const response =

      await request(

        testApp(

          registrationService(

            register,

          ),

        ),

      )

        .post('/auth/register')

        .send({

          email:

            'person@example.test',

          password:

            validPassword,

        });

    expect(

      response.status,

    ).toBe(409);

    expect(

      response.body,

    ).toEqual({

      error: {

        code:

          'EMAIL_ALREADY_EXISTS',

        message:

          'An account with this email already exists',

      },

    });

    expect(

      response.text,

    ).not.toContain('P2002');

    expect(

      response.text,

    ).not.toContain(

      'users_email_key',

    );

    expect(

      response.headers['set-cookie'],

    ).toBeUndefined();

  });

  it('returns an exact generic 500 and does not log secrets from the service failure', async () => {

    let output = '';

    const destination =

      new Writable({

        write(

          chunk: Buffer,

          _encoding:

            BufferEncoding,

          callback: (

            error?:

              | Error

              | null,

          ) => void,

        ) {

          output +=

            chunk.toString();

          callback();

        },

      });

    const logger =

      createLogger(

        testConfig({

          logLevel: 'info',

        }),

        destination,

      );

    const password =

      'private password must never leak';

    const register = vi

      .fn<

        RegistrationService['register']

      >()

      .mockRejectedValue(

        new Error(

          'P2002 users_email_key mysql://private-connection passwordHash=session-secret',

        ),

      );

    const response =

      await request(

        testApp(

          registrationService(

            register,

          ),

          logger,

        ),

      )

        .post('/auth/register')

        .send({

          email:

            'private-email@example.test',

          password,

        });

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

    for (const secret of [

      password,

      'private-email@example.test',

      'P2002',

      'users_email_key',

      'mysql://private-connection',

      'passwordHash=session-secret',

    ]) {

      expect(

        response.text,

      ).not.toContain(secret);

      expect(

        output,

      ).not.toContain(secret);

    }

    expect(

      output,

    ).toContain(

      '/auth/register',

    );

    expect(

      response.headers['set-cookie'],

    ).toBeUndefined();

  });

  it('allows authorized POST CORS with credentials enabled and no extra methods', async () => {

    const register = vi

      .fn<

        RegistrationService['register']

      >()

      .mockResolvedValue(

        publicUser,

      );

    const app = testApp(

      registrationService(

        register,

      ),

    );

    const preflight =

      await request(app)

        .options(

          '/auth/register',

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

    const response =

      await request(app)

        .post(

          '/auth/register',

        )

        .set(

          'Origin',

          'https://app.example.com',

        )

        .send({

          email:

            'person@example.test',

          password:

            validPassword,

          displayName: 'Ada',

        });

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

        'access-control-allow-methods'

      ],

    ).toBe('GET,POST,PATCH,DELETE');

    expect(

      preflight.headers[

        'access-control-allow-headers'

      ],

    ).toBe(

      'Content-Type,Authorization',

    );

    expect(

      preflight.headers[

        'access-control-allow-credentials'

      ],

    ).toBe('true');

    expect(

      response.status,

    ).toBe(201);

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

    ).toBe('true');

  });

  it('does not grant CORS access to a disallowed POST origin', async () => {

    const register = vi

      .fn<

        RegistrationService['register']

      >()

      .mockResolvedValue(

        publicUser,

      );

    const response =

      await request(

        testApp(

          registrationService(

            register,

          ),

        ),

      )

        .post('/auth/register')

        .set(

          'Origin',

          'https://attacker.example.com',

        )

        .send({

          email:

            'person@example.test',

          password:

            validPassword,

        });

    expect(

      response.status,

    ).toBe(201);

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

  it('does not log the register body, email, password, or authorization header', async () => {

    let output = '';

    const destination =

      new Writable({

        write(

          chunk: Buffer,

          _encoding:

            BufferEncoding,

          callback: (

            error?:

              | Error

              | null,

          ) => void,

        ) {

          output +=

            chunk.toString();

          callback();

        },

      });

    const logger =

      createLogger(

        testConfig({

          logLevel: 'info',

        }),

        destination,

      );

    const register = vi

      .fn<

        RegistrationService['register']

      >()

      .mockResolvedValue(

        publicUser,

      );

    await request(

      testApp(

        registrationService(

          register,

        ),

        logger,

      ),

    )

      .post('/auth/register')

      .set(

        'Authorization',

        'Bearer header-secret',

      )

      .send({

        email:

          'body-secret@example.test',

        password:

          'body-password-secret-value',

      });

    expect(

      output,

    ).toContain(

      '/auth/register',

    );

    expect(

      output,

    ).not.toContain(

      'body-secret@example.test',

    );

    expect(

      output,

    ).not.toContain(

      'body-password-secret-value',

    );

    expect(

      output,

    ).not.toContain(

      'header-secret',

    );

  });

  it(

    'protects GET /auth/me when no authenticated context is present',

    async () => {

      const register =

        vi.fn<

          RegistrationService['register']

        >();

      const appRequest =

        request(

          testApp(

            registrationService(

              register,

            ),

          ),

        );

      const response =

        await appRequest.get(

          '/auth/me',

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

        response.headers[

          'set-cookie'

        ],

      ).toBeUndefined();

      expect(

        register,

      ).not.toHaveBeenCalled();

    },

  );

});
