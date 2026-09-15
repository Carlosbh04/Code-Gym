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
} from '../src/middleware/auth-rate-limit.js';

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
