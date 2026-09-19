import express, {
  type RequestHandler,
} from 'express';

import request from 'supertest';

import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  createAuthRateLimiters,
  createLoginFailureRateLimitKey,
} from '../src/middleware/auth-rate-limit.js';

const TEST_RATE_LIMIT_KEY_SECRET =
  Buffer.alloc(32, 3).toString('base64url');

function createLimiterApp(
  route:
    | 'register'
    | 'login'
    | 'refresh'
    | 'logout'
    | 'password-reset/request'
    | 'password-reset/verify'
    | 'password-reset/confirm'
    | 'change-password',
  limiter: RequestHandler,
) {
  const app =
    express();

  app.set(
    'trust proxy',
    false,
  );

  app.post(
    `/auth/${route}`,
    limiter,
    (
      _request,
      response,
    ) => {
      response
        .status(204)
        .end();
    },
  );

  return app;
}

describe(
  'T219 auth rate limiting',
  () => {
    it.each([
      ['password-reset/request', 'passwordResetRequest', 'passwordResetRequestLimit'],
      ['password-reset/verify', 'passwordResetVerify', 'passwordResetVerifyLimit'],
      ['password-reset/confirm', 'passwordResetConfirm', 'passwordResetConfirmLimit'],
      ['change-password', 'changePassword', 'changePasswordLimit'],
    ] as const)(
      'rate limits %s independently',
      async (route, limiterName, optionName) => {
        const limiters = createAuthRateLimiters({
          windowMs: 60_000,
          [optionName]: 1,

      loginFailureKeySecret:
        TEST_RATE_LIMIT_KEY_SECRET,
    });
        const app = createLimiterApp(route, limiters[limiterName]);

        expect((await request(app).post(`/auth/${route}`)).status).toBe(204);
        expect((await request(app).post(`/auth/${route}`)).status).toBe(429);
      },
    );

    it(
      'allows requests up to the configured limit and then returns the safe 429 contract',
      async () => {
        const limiters =
          createAuthRateLimiters({
            windowMs:
              60_000,

            registerLimit:
              2,

            loginLimit:
              10,

            refreshLimit:
              10,

            logoutLimit:
              10,

      loginFailureKeySecret:
        TEST_RATE_LIMIT_KEY_SECRET,
    });

        const app =
          createLimiterApp(
            'register',
            limiters.register,
          );

        const first =
          await request(app)
            .post(
              '/auth/register',
            );

        const second =
          await request(app)
            .post(
              '/auth/register',
            );

        const third =
          await request(app)
            .post(
              '/auth/register',
            );

        expect(
          first.status,
        ).toBe(204);

        expect(
          second.status,
        ).toBe(204);

        expect(
          third.status,
        ).toBe(429);

        expect(
          third.body,
        ).toEqual({
          error: {
            code:
              'RATE_LIMITED',

            message:
              'Too many requests',
          },
        });
      },
    );

    it(
      'does not emit legacy X-RateLimit headers',
      async () => {
        const limiters =
          createAuthRateLimiters({
            windowMs:
              60_000,

            registerLimit:
              1,

            loginLimit:
              10,

            refreshLimit:
              10,

            logoutLimit:
              10,

      loginFailureKeySecret:
        TEST_RATE_LIMIT_KEY_SECRET,
    });

        const app =
          createLimiterApp(
            'register',
            limiters.register,
          );

        await request(app)
          .post(
            '/auth/register',
          );

        const limited =
          await request(app)
            .post(
              '/auth/register',
            );

        expect(
          limited.status,
        ).toBe(429);

        expect(
          limited.headers[
            'x-ratelimit-limit'
          ],
        ).toBeUndefined();

        expect(
          limited.headers[
            'x-ratelimit-remaining'
          ],
        ).toBeUndefined();

        expect(
          limited.headers[
            'x-ratelimit-reset'
          ],
        ).toBeUndefined();
      },
    );

    it(
      'keeps register and login counters independent',
      async () => {
        const limiters =
          createAuthRateLimiters({
            windowMs:
              60_000,

            registerLimit:
              1,

            loginLimit:
              1,

            refreshLimit:
              10,

            logoutLimit:
              10,

      loginFailureKeySecret:
        TEST_RATE_LIMIT_KEY_SECRET,
    });

        const app =
          express();

        app.set(
          'trust proxy',
          false,
        );

        app.post(
          '/auth/register',
          limiters.register,
          (
            _request,
            response,
          ) => {
            response
              .status(204)
              .end();
          },
        );

        app.post(
          '/auth/login',
          limiters.login,
          (
            _request,
            response,
          ) => {
            response
              .status(204)
              .end();
          },
        );

        const registerFirst =
          await request(app)
            .post(
              '/auth/register',
            );

        const registerSecond =
          await request(app)
            .post(
              '/auth/register',
            );

        const loginFirst =
          await request(app)
            .post(
              '/auth/login',
            );

        const loginSecond =
          await request(app)
            .post(
              '/auth/login',
            );

        expect(
          registerFirst.status,
        ).toBe(204);

        expect(
          registerSecond.status,
        ).toBe(429);

        expect(
          loginFirst.status,
        ).toBe(204);

        expect(
          loginSecond.status,
        ).toBe(429);
      },
    );

    it(
      'keeps refresh and logout counters independent',
      async () => {
        const limiters =
          createAuthRateLimiters({
            windowMs:
              60_000,

            registerLimit:
              10,

            loginLimit:
              10,

            refreshLimit:
              1,

            logoutLimit:
              1,

      loginFailureKeySecret:
        TEST_RATE_LIMIT_KEY_SECRET,
    });

        const app =
          express();

        app.set(
          'trust proxy',
          false,
        );

        app.post(
          '/auth/refresh',
          limiters.refresh,
          (
            _request,
            response,
          ) => {
            response
              .status(204)
              .end();
          },
        );

        app.post(
          '/auth/logout',
          limiters.logout,
          (
            _request,
            response,
          ) => {
            response
              .status(204)
              .end();
          },
        );

        const refreshFirst =
          await request(app)
            .post(
              '/auth/refresh',
            );

        const refreshSecond =
          await request(app)
            .post(
              '/auth/refresh',
            );

        const logoutFirst =
          await request(app)
            .post(
              '/auth/logout',
            );

        const logoutSecond =
          await request(app)
            .post(
              '/auth/logout',
            );

        expect(
          refreshFirst.status,
        ).toBe(204);

        expect(
          refreshSecond.status,
        ).toBe(429);

        expect(
          logoutFirst.status,
        ).toBe(204);

        expect(
          logoutSecond.status,
        ).toBe(429);
      },
    );
  },
);


describe('login failure throttling', () => {
  function createFailureLimitedLoginApp() {
    const app =
      express();

    app.set(
      'trust proxy',
      false,
    );

    app.use(
      express.json(),
    );

    const limiters =
      createAuthRateLimiters({
        windowMs:
          60_000,
        loginLimit:
          100,
        loginFailureLimit:
          3,

      loginFailureKeySecret:
        TEST_RATE_LIMIT_KEY_SECRET,
    });

    app.post(
      '/auth/login',
      limiters.loginFailures,
      (
        request,
        response,
      ) => {
        if (
          request.body.password
          === 'correct-password'
        ) {
          response
            .status(204)
            .end();

          return;
        }

        response
          .status(401)
          .json({
            error: {
              code:
                'INVALID_CREDENTIALS',
            },
          });
      },
    );

    return app;
  }

  it(
    'blocks the fourth failed login for the same IP and email',
    async () => {
      const app =
        createFailureLimitedLoginApp();

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
                'wrong-password',
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
              'wrong-password',
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
    },
  );

  it(
    'keeps failure counters independent by email',
    async () => {
      const app =
        createFailureLimitedLoginApp();

      for (
        let attempt = 1;
        attempt <= 3;
        attempt += 1
      ) {
        await request(app)
          .post('/auth/login')
          .send({
            email:
              'first@example.test',
            password:
              'wrong-password',
          });
      }

      const otherEmail =
        await request(app)
          .post('/auth/login')
          .send({
            email:
              'second@example.test',
            password:
              'wrong-password',
          });

      expect(
        otherEmail.status,
      ).toBe(401);
    },
  );

  it(
    'does not count successful logins as failures',
    async () => {
      const app =
        createFailureLimitedLoginApp();

      for (
        let attempt = 0;
        attempt < 4;
        attempt += 1
      ) {
        const successful =
          await request(app)
            .post('/auth/login')
            .send({
              email:
                'person@example.test',
              password:
                'correct-password',
            });

        expect(
          successful.status,
        ).toBe(204);
      }

      const firstFailure =
        await request(app)
          .post('/auth/login')
          .send({
            email:
              'person@example.test',
            password:
              'wrong-password',
          });

      expect(
        firstFailure.status,
      ).toBe(401);
    },
  );
});

  it(
    'lets a persistently locked account reach the login service when the failure limiter is exhausted',
    async () => {
      const limiters =
        createAuthRateLimiters({
          windowMs:
            60_000,
          loginLimit:
            100,
          loginFailureLimit:
            1,
          loginFailureKeySecret:
            TEST_RATE_LIMIT_KEY_SECRET,
          isLoginAccountLocked:
            async (email) =>
              email
              === 'locked@example.test',
        });

      const app =
        express();

      app.set(
        'trust proxy',
        false,
      );

      app.use(
        express.json(),
      );

      let reachedHandler =
        0;

      app.post(
        '/auth/login',
        limiters.loginFailures,
        (
          _request,
          response,
        ) => {
          reachedHandler += 1;

          response
            .status(423)
            .json({
              error: {
                code:
                  'ACCOUNT_LOCKED',
              },
            });
        },
      );

      const first =
        await request(app)
          .post('/auth/login')
          .send({
            email:
              'locked@example.test',
            password:
              'wrong-password',
          });

      const second =
        await request(app)
          .post('/auth/login')
          .send({
            email:
              'locked@example.test',
            password:
              'wrong-password',
          });

      expect(
        first.status,
      ).toBe(423);

      expect(
        second.status,
      ).toBe(423);

      expect(
        reachedHandler,
      ).toBe(2);
    },
  );

  it(
    'returns the persistent account cooldown instead of the Redis window when the limiter is exhausted',
    async () => {
      const cooldownUntil =
        new Date(
          Date.now()
          + 15 * 60 * 1_000,
        );

      const limiters =
        createAuthRateLimiters({
          windowMs:
            15 * 60 * 1_000,
          loginFailureLimit:
            1,
          loginFailureKeySecret:
            TEST_RATE_LIMIT_KEY_SECRET,
          isLoginAccountLocked:
            async () =>
              false,
          getLoginAccountCooldownUntil:
            async () =>
              cooldownUntil,
        });

      const app =
        express();

      app.set(
        'trust proxy',
        false,
      );

      app.use(
        express.json(),
      );

      app.post(
        '/auth/login',
        limiters.loginFailures,
        (
          _request,
          response,
        ) => {
          response
            .status(401)
            .json({
              error: {
                code:
                  'INVALID_CREDENTIALS',
              },
            });
        },
      );

      await request(app)
        .post('/auth/login')
        .send({
          email:
            'person@example.test',
          password:
            'wrong-password',
        });

      const response =
        await request(app)
          .post('/auth/login')
          .send({
            email:
              'person@example.test',
            password:
              'wrong-password',
          });

      expect(
        response.status,
      ).toBe(429);

      expect(
        response.body,
      ).toEqual({
        error: {
          code:
            'ACCOUNT_COOLDOWN',
          message:
            'Account login is temporarily unavailable',
          cooldownUntil:
            cooldownUntil.toISOString(),
        },
      });
    },
  );

  it(
    'returns authoritative account cooldown when the coarse login IP limiter is exhausted',
    async () => {
      const cooldownUntil =
        new Date(
          Date.now()
          + 15 * 60 * 1_000,
        );

      const limiters =
        createAuthRateLimiters({
          windowMs:
            15 * 60 * 1_000,
          loginLimit:
            1,
          loginFailureLimit:
            100,
          loginFailureKeySecret:
            TEST_RATE_LIMIT_KEY_SECRET,
          isLoginAccountLocked:
            async () =>
              false,
          getLoginAccountCooldownUntil:
            async (email) =>
              email
              === 'cooldown@example.test'
                ? cooldownUntil
                : null,
        });

      const app =
        express();

      app.set(
        'trust proxy',
        false,
      );

      app.use(
        express.json(),
      );

      app.post(
        '/auth/login',
        limiters.login,
        (
          _request,
          response,
        ) => {
          response.status(401).json({
            error: {
              code:
                'INVALID_CREDENTIALS',
            },
          });
        },
      );

      await request(app)
        .post('/auth/login')
        .send({
          email:
            'cooldown@example.test',
          password:
            'wrong-password',
        });

      const blocked =
        await request(app)
          .post('/auth/login')
          .send({
            email:
              'cooldown@example.test',
            password:
              'wrong-password',
          });

      expect(
        blocked.status,
      ).toBe(429);

      expect(
        blocked.body,
      ).toEqual({
        error: {
          code:
            'ACCOUNT_COOLDOWN',
          message:
            'Account login is temporarily unavailable',
          cooldownUntil:
            cooldownUntil.toISOString(),
        },
      });
    },
  );

  it(
    'returns persistent account lock when the coarse login IP limiter is exhausted',
    async () => {
      const limiters =
        createAuthRateLimiters({
          windowMs:
            15 * 60 * 1_000,
          loginLimit:
            1,
          loginFailureLimit:
            100,
          loginFailureKeySecret:
            TEST_RATE_LIMIT_KEY_SECRET,
          isLoginAccountLocked:
            async (email) =>
              email
              === 'locked@example.test',
          getLoginAccountCooldownUntil:
            async () =>
              null,
        });

      const app =
        express();

      app.set(
        'trust proxy',
        false,
      );

      app.use(
        express.json(),
      );

      app.post(
        '/auth/login',
        limiters.login,
        (
          _request,
          response,
        ) => {
          response.status(401).json({
            error: {
              code:
                'INVALID_CREDENTIALS',
            },
          });
        },
      );

      await request(app)
        .post('/auth/login')
        .send({
          email:
            'locked@example.test',
          password:
            'wrong-password',
        });

      const blocked =
        await request(app)
          .post('/auth/login')
          .send({
            email:
              'locked@example.test',
            password:
              'wrong-password',
          });

      expect(
        blocked.status,
      ).toBe(423);

      expect(
        blocked.body,
      ).toEqual({
        error: {
          code:
            'ACCOUNT_LOCKED',
          message:
            'Account access is locked',
        },
      });
    },
  );

describe(
  'login failure key privacy',
  () => {
    it(
      'does not expose IP or email in login failure keys',
      () => {
        const ip =
          '203.0.113.42';

        const ipKey =
          ip;

        const email =
          'Person@example.test';

        const keySecret =
          Buffer
            .alloc(
              32,
              7,
            )
            .toString(
              'base64url',
            );

        const key =
          createLoginFailureRateLimitKey({
            ipKey,
            email,
            keySecret,
          });

        expect(
          key,
        ).toMatch(
          /^[a-f0-9]{64}$/,
        );

        expect(
          key,
        ).not.toContain(
          ip,
        );

        expect(
          key,
        ).not.toContain(
          email,
        );

        expect(
          key,
        ).not.toContain(
          email.toLowerCase(),
        );
      },
    );

    it(
      'is deterministic after email normalization',
      () => {
        const input = {
          ipKey:
            '203.0.113.42',
          keySecret:
            Buffer
              .alloc(
                32,
                7,
              )
              .toString(
                'base64url',
              ),
        };

        const first =
          createLoginFailureRateLimitKey({
            ...input,
            email:
              'Person@example.test',
          });

        const second =
          createLoginFailureRateLimitKey({
            ...input,
            email:
              '  PERSON@EXAMPLE.TEST  ',
          });

        expect(
          second,
        ).toBe(
          first,
        );
      },
    );

    it(
      'changes the key when the HMAC secret changes',
      () => {
        const base = {
          ipKey:
            '203.0.113.42',
          email:
            'person@example.test',
        };

        const first =
          createLoginFailureRateLimitKey({
            ...base,
            keySecret:
              Buffer
                .alloc(
                  32,
                  7,
                )
                .toString(
                  'base64url',
                ),
          });

        const second =
          createLoginFailureRateLimitKey({
            ...base,
            keySecret:
              Buffer
                .alloc(
                  32,
                  8,
                )
                .toString(
                  'base64url',
                ),
          });

        expect(
          second,
        ).not.toBe(
          first,
        );
      },
    );
  },
);
