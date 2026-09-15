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
  vi,
} from 'vitest';

import {
  createRequireTrustedOrigin,
} from '../src/middleware/require-trusted-origin.js';

const allowedOrigins =
  Object.freeze([
    'https://app.example.com',
    'https://admin.example.com',
  ]);

function testApp(): {
  readonly app: Express;
  readonly handler: ReturnType<
    typeof vi.fn
  >;
} {
  const app =
    express();

  const handler =
    vi.fn(
      (
        _request: Request,
        response: Response,
      ): void => {
        response
          .status(204)
          .end();
      },
    );

  app.post(
    '/protected',
    createRequireTrustedOrigin(
      allowedOrigins,
    ),
    handler,
  );

  return {
    app,
    handler,
  };
}

function expectForbidden(
  response: {
    readonly status:
      number;

    readonly body:
      unknown;
  },
): void {
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
}

describe(
  'T220 trusted-origin attacks',
  () => {
    it(
      'rejects Origin null',
      async () => {
        const {
          app,
          handler,
        } =
          testApp();

        const response =
          await request(
            app,
          )
            .post(
              '/protected',
            )
            .set(
              'Origin',
              'null',
            );

        expectForbidden(
          response,
        );

        expect(
          handler,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'rejects a subdomain that only resembles an allowed origin',
      async () => {
        const {
          app,
          handler,
        } =
          testApp();

        const response =
          await request(
            app,
          )
            .post(
              '/protected',
            )
            .set(
              'Origin',
              'https://app.example.com.attacker.test',
            );

        expectForbidden(
          response,
        );

        expect(
          handler,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'rejects an origin with attacker-controlled prefix',
      async () => {
        const {
          app,
          handler,
        } =
          testApp();

        const response =
          await request(
            app,
          )
            .post(
              '/protected',
            )
            .set(
              'Origin',
              'https://attacker-app.example.com',
            );

        expectForbidden(
          response,
        );

        expect(
          handler,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'rejects the allowed hostname on a different scheme',
      async () => {
        const {
          app,
          handler,
        } =
          testApp();

        const response =
          await request(
            app,
          )
            .post(
              '/protected',
            )
            .set(
              'Origin',
              'http://app.example.com',
            );

        expectForbidden(
          response,
        );

        expect(
          handler,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'rejects the allowed hostname on a different port',
      async () => {
        const {
          app,
          handler,
        } =
          testApp();

        const response =
          await request(
            app,
          )
            .post(
              '/protected',
            )
            .set(
              'Origin',
              'https://app.example.com:444',
            );

        expectForbidden(
          response,
        );

        expect(
          handler,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'allows an exact configured origin',
      async () => {
        const {
          app,
          handler,
        } =
          testApp();

        const response =
          await request(
            app,
          )
            .post(
              '/protected',
            )
            .set(
              'Origin',
              'https://app.example.com',
            );

        expect(
          response.status,
        ).toBe(204);

        expect(
          handler,
        ).toHaveBeenCalledOnce();
      },
    );

    it(
      'allows requests without Origin for non-browser clients',
      async () => {
        const {
          app,
          handler,
        } =
          testApp();

        const response =
          await request(
            app,
          )
            .post(
              '/protected',
            );

        expect(
          response.status,
        ).toBe(204);

        expect(
          handler,
        ).toHaveBeenCalledOnce();
      },
    );
  },
);
