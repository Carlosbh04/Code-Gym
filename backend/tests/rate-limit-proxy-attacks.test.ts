import express, {
  type Express,
  type Request,
  type Response,
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

function testApp(): Express {
  const app =
    express();

  app.set(
    'trust proxy',
    false,
  );

  const limiters =
    createAuthRateLimiters({
      windowMs:
        60_000,

      loginLimit:
        2,
    });

  app.post(
    '/auth/login',

    limiters.login,

    (
      _request: Request,
      response: Response,
    ): void => {
      response
        .status(204)
        .end();
    },
  );

  return app;
}

describe(
  'T220 rate-limit proxy attacks',
  () => {
    it(
      'does not allow X-Forwarded-For spoofing to bypass the login rate limit',
      async () => {
        const app =
          testApp();

        const first =
          await request(
            app,
          )
            .post(
              '/auth/login',
            )
            .set(
              'X-Forwarded-For',
              '198.51.100.10',
            );

        const second =
          await request(
            app,
          )
            .post(
              '/auth/login',
            )
            .set(
              'X-Forwarded-For',
              '203.0.113.25',
            );

        const third =
          await request(
            app,
          )
            .post(
              '/auth/login',
            )
            .set(
              'X-Forwarded-For',
              '192.0.2.99',
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
      'keeps trust proxy disabled in the attack harness',
      () => {
        const app =
          testApp();

        expect(
          app.get(
            'trust proxy',
          ),
        ).toBe(false);
      },
    );
  },
);
