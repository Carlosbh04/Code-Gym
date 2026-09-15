import express from 'express';
import type { Express } from 'express';
import { Writable } from 'node:stream';

import pino from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import {
  createApp as createProductionApp,
  type AppDependencies,
} from '../src/app.js';
import type { LoginService } from '../src/auth/login-service.js';
import type { LogoutService } from '../src/auth/logout-service.js';
import type { RefreshService } from '../src/auth/refresh-service.js';
import type { RegistrationService } from '../src/auth/user-service.js';
import { createLogger } from '../src/config/logger.js';
import { createErrorHandler } from '../src/middleware/error-handler.js';
import { testConfig } from './helpers.js';

const logger = pino({
  level: 'silent',
});

const databaseHealthCheck = (): Promise<boolean> =>
  Promise.resolve(true);

const unusedRegistrationService: RegistrationService = {
  register: () =>
    Promise.reject(
      new Error(
        'Registration is not exercised by this app test',
      ),
    ),
};

const unusedLoginService = {
  login: () =>
    Promise.reject(
      new Error(
        'Login is not exercised by this app test',
      ),
    ),
} as unknown as LoginService;

const unusedRefreshService = {
  refresh: () =>
    Promise.reject(
      new Error(
        'Refresh is not exercised by this app test',
      ),
    ),
} as unknown as RefreshService;

const unusedLogoutService = {
  logout: () =>
    Promise.reject(
      new Error(
        'Logout is not exercised by this app test',
      ),
    ),
} as unknown as LogoutService;

const unusedCurrentUserService: AppDependencies['currentUserService'] = {
  getCurrentUser: () =>
    Promise.reject(
      new Error(
        'Current user is not exercised by this app test',
      ),
    ),
};

const unusedSessionManagementService:
  AppDependencies['sessionManagementService'] = {
    listSessions: () =>
      Promise.reject(
        new Error(
          'Session management is not exercised by this app test',
        ),
      ),

    revokeSession: () =>
      Promise.reject(
        new Error(
          'Session management is not exercised by this app test',
        ),
      ),

    revokeOtherSessions: () =>
      Promise.reject(
        new Error(
          'Session management is not exercised by this app test',
        ),
      ),
  };

const unusedRequireAuth: AppDependencies['requireAuth'] = (
  _request,
  _response,
  next,
) => {
  next();
};

function createApp(
  dependencies: Omit<
    AppDependencies,
    | 'registrationService'
    | 'loginService'
    | 'refreshService'
    | 'logoutService'
    | 'currentUserService'
    | 'sessionManagementService'
    | 'requireAuth'
  >,
): Express {
  return createProductionApp({
    ...dependencies,
    registrationService: unusedRegistrationService,
    loginService: unusedLoginService,
    refreshService: unusedRefreshService,
    logoutService: unusedLogoutService,
    currentUserService: unusedCurrentUserService,
    sessionManagementService:
      unusedSessionManagementService,
    requireAuth: unusedRequireAuth,
  });
}

describe('HTTP application', () => {
  it('keeps proxy trust disabled until deployment topology is defined', () => {
    const app = createApp({
      config: testConfig(),
      logger,
      databaseHealthCheck,
    });

    expect(app.get('trust proxy')).toBe(false);
  });

  it('reports health through a Supertest-managed listener', async () => {
    const response = await request(
      createApp({
        config: testConfig(),
        logger,
        databaseHealthCheck,
      }),
    ).get('/health');

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      status: 'ok',
    });
  });

  it('reports a healthy injected database dependency', async () => {
    const response = await request(
      createApp({
        config: testConfig(),
        logger,
        databaseHealthCheck,
      }),
    ).get('/health/db');

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      status: 'ok',
    });
  });

  it.each([
    () => Promise.resolve(false),

    () =>
      Promise.reject(
        new Error(
          'database password must not leak',
        ),
      ),
  ])(
    'returns a constant safe 503 when database health is unavailable',
    async (unhealthyCheck) => {
      const response = await request(
        createApp({
          config: testConfig(),
          logger,
          databaseHealthCheck:
            unhealthyCheck,
        }),
      ).get('/health/db');

      expect(response.status).toBe(503);

      expect(response.body).toEqual({
        status: 'unavailable',
      });

      expect(
        response.text,
      ).not.toContain('password');
    },
  );

  it('does not serialize synthetic HTTP error stacks for an unavailable database', async () => {
    let output = '';

    const destination = new Writable({
      write(
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: (
          error?: Error | null,
        ) => void,
      ) {
        output += chunk.toString();

        callback();
      },
    });

    const httpLogger = createLogger(
      testConfig({
        logLevel: 'info',
      }),
      destination,
    );

    await request(
      createApp({
        config: testConfig(),
        logger: httpLogger,

        databaseHealthCheck: () =>
          Promise.resolve(false),
      }),
    ).get('/health/db');

    expect(output).toContain(
      'HttpResponseError',
    );

    expect(output).not.toContain(
      'failed with status code',
    );

    expect(output).not.toContain(
      '/Users/',
    );
  });

  it('does not expose health as a business mutation endpoint', async () => {
    const response = await request(
      createApp({
        config: testConfig(),
        logger,
        databaseHealthCheck,
      }),
    )
      .post('/health')
      .send({
        status: 'changed',
      });

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });
  });

  it('adds security headers and does not identify Express', async () => {
    const response = await request(
      createApp({
        config: testConfig(),
        logger,
        databaseHealthCheck,
      }),
    ).get('/health');

    expect(
      response.headers[
        'content-security-policy'
      ],
    ).toBeDefined();

    expect(
      response.headers[
        'x-content-type-options'
      ],
    ).toBe('nosniff');

    expect(
      response.headers['x-powered-by'],
    ).toBeUndefined();
  });

  it('reflects an exactly allowed CORS origin with credentials enabled', async () => {
    const response = await request(
      createApp({
        config: testConfig(),
        logger,
        databaseHealthCheck,
      }),
    )
      .get('/health')
      .set(
        'Origin',
        'https://app.example.com',
      );

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

    expect(
      response.headers[
        'access-control-expose-headers'
      ],
    ).toBe('Retry-After');

    expect(
      response.headers[
        'access-control-expose-headers'
      ],
    ).not.toMatch(
      /authorization|cookie|token|secret/i,
    );
  });

  it('does not emit CORS headers for a disallowed origin', async () => {
    const response = await request(
      createApp({
        config: testConfig(),
        logger,
        databaseHealthCheck,
      }),
    )
      .get('/health')
      .set(
        'Origin',
        'https://attacker.example.com',
      );

    expect(response.status).toBe(200);

    expect(
      response.headers[
        'access-control-allow-origin'
      ],
    ).toBeUndefined();
  });

  it('allows requests without an Origin header', async () => {
    const response = await request(
      createApp({
        config: testConfig(),
        logger,
        databaseHealthCheck,
      }),
    ).get('/health');

    expect(response.status).toBe(200);

    expect(
      response.headers[
        'access-control-allow-origin'
      ],
    ).toBeUndefined();
  });

  it('answers allowed CORS preflight requests deterministically', async () => {
    const response = await request(
      createApp({
        config: testConfig(),
        logger,
        databaseHealthCheck,
      }),
    )
      .options('/health')
      .set(
        'Origin',
        'https://app.example.com',
      )
      .set(
        'Access-Control-Request-Method',
        'GET',
      );

    expect(response.status).toBe(204);

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

    expect(
      response.headers[
        'access-control-allow-methods'
      ],
    ).toBe('GET,POST,PATCH,DELETE');

    expect(
      response.headers[
        'access-control-allow-headers'
      ],
    ).toBe('Content-Type,Authorization');
  });

  it('does not grant a disallowed CORS preflight request', async () => {
    const response = await request(
      createApp({
        config: testConfig(),
        logger,
        databaseHealthCheck,
      }),
    )
      .options('/health')
      .set(
        'Origin',
        'https://attacker.example.com',
      )
      .set(
        'Access-Control-Request-Method',
        'GET',
      );

    expect(response.status).toBe(200);

    expect(
      response.headers[
        'access-control-allow-origin'
      ],
    ).toBeUndefined();

    expect(
      response.headers[
        'access-control-allow-methods'
      ],
    ).toBeUndefined();
  });

  it('returns a consistent JSON 404', async () => {
    const response = await request(
      createApp({
        config: testConfig(),
        logger,
        databaseHealthCheck,
      }),
    ).get('/missing');

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });
  });

  it('rejects malformed JSON with a safe 400 response', async () => {
    const response = await request(
      createApp({
        config: testConfig(),
        logger,
        databaseHealthCheck,
      }),
    )
      .post('/health')
      .set(
        'Content-Type',
        'application/json',
      )
      .send('{"broken":');

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      error: {
        code: 'INVALID_JSON',
        message:
          'Request body contains invalid JSON',
      },
    });
  });

  it('rejects JSON primitives because the parser is strict', async () => {
    const response = await request(
      createApp({
        config: testConfig(),
        logger,
        databaseHealthCheck,
      }),
    )
      .post('/health')
      .set(
        'Content-Type',
        'application/json',
      )
      .send('"primitive"');

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      error: {
        code: 'INVALID_JSON',
        message:
          'Request body contains invalid JSON',
      },
    });
  });

  it('does not classify a generic status 400 error as invalid JSON', async () => {
    const failingApp = express();

    failingApp.get(
      '/failure',
      (
        _request,
        _response,
        next,
      ) => {
        next(
          Object.assign(
            new Error(
              'private generic 400 detail',
            ),
            {
              status: 400,
            },
          ),
        );
      },
    );

    failingApp.use(
      createErrorHandler(logger),
    );

    const response = await request(
      failingApp,
    ).get('/failure');

    expect(response.status).toBe(500);

    expect(response.body).toEqual({
      error: {
        code:
          'INTERNAL_SERVER_ERROR',
        message:
          'An unexpected error occurred',
      },
    });

    expect(
      response.text,
    ).not.toContain('INVALID_JSON');

    expect(
      response.text,
    ).not.toContain(
      'private generic 400 detail',
    );
  });

  it('accepts a JSON body below 100kb before routing it to the 404 handler', async () => {
    const response = await request(
      createApp({
        config: testConfig(),
        logger,
        databaseHealthCheck,
      }),
    )
      .post('/missing')
      .send({
        payload: 'a'.repeat(
          99 * 1024,
        ),
      });

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });
  });

  it('rejects JSON bodies larger than 100kb', async () => {
    const response = await request(
      createApp({
        config: testConfig(),
        logger,
        databaseHealthCheck,
      }),
    )
      .post('/health')
      .send({
        payload: 'a'.repeat(
          101 * 1024,
        ),
      });

    expect(response.status).toBe(413);

    expect(response.body).toEqual({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message:
          'Request body is too large',
      },
    });
  });

  it('hides unexpected error details from clients', async () => {
    const failingApp = express();

    failingApp.get(
      '/failure',
      () => {
        throw new Error(
          'private implementation detail',
        );
      },
    );

    failingApp.use(
      createErrorHandler(logger),
    );

    const response = await request(
      failingApp,
    ).get('/failure');

    expect(response.status).toBe(500);

    expect(
      response.text,
    ).not.toContain(
      'private implementation detail',
    );

    expect(response.body).toEqual({
      error: {
        code:
          'INTERNAL_SERVER_ERROR',
        message:
          'An unexpected error occurred',
      },
    });
  });

  it('does not log query values, request bodies, or authorization headers', async () => {
    let output = '';

    const destination = new Writable({
      write(
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: (
          error?: Error | null,
        ) => void,
      ) {
        output += chunk.toString();

        callback();
      },
    });

    const httpLogger = createLogger(
      testConfig({
        logLevel: 'info',
      }),
      destination,
    );

    const app = createApp({
      config: testConfig(),
      logger: httpLogger,
      databaseHealthCheck,
    });

    await request(app)
      .post(
        '/missing?token=query-secret',
      )
      .set(
        'Authorization',
        'Bearer header-secret',
      )
      .send({
        password: 'body-secret',
      });

    expect(output).not.toContain(
      'query-secret',
    );

    expect(output).not.toContain(
      'header-secret',
    );

    expect(output).not.toContain(
      'body-secret',
    );

    expect(output).toContain(
      '/missing',
    );
  });
});
                                                                                           
