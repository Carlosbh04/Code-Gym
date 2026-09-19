import express, {
  type Express,
} from 'express';

import request from 'supertest';

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  AccessTokenClaims,
  AccessTokenService,
} from '../src/auth/access-token-service.js';

import type {
  AuthSessionAuthenticationRecord,
  AuthSessionRepository,
} from '../src/auth/auth-session-repository.js';

import {
  createRequireAuth,
} from '../src/middleware/require-auth.js';

const now =
  new Date(
    '2026-09-11T20:30:00.000Z',
  );

const claims:
AccessTokenClaims =
  Object.freeze({
    sub:
      'user-1',

    sid:
      'session-1',

    iat:
      1_789_138_200,

    exp:
      1_789_138_800,
  });

const activeSession:
AuthSessionAuthenticationRecord =
  Object.freeze({
    lastActivityAt:
      now,
    userId:
      claims.sub,

    expiresAt:
      new Date(
        now.getTime()
        + 60_000,
      ),

    revokedAt:
      null,
  });

type VerifyAccessToken =
  AccessTokenService[
    'verify'
  ];

type FindSessionById =
  AuthSessionRepository[
    'findSessionById'
  ];

function testApp(
  verify:
    VerifyAccessToken,

  findSessionById:
    FindSessionById,
): Express {
  const app =
    express();

  app.get(
    '/protected',

    createRequireAuth({
      idleSessionTimeoutSeconds:
        3600,
      accessTokenService: {
        verify,
      },

      authSessionRepository: {
        findSessionById,
      },

      clock:
        () => now,
    }),

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

function verifyMock():
ReturnType<
  typeof vi.fn<
    VerifyAccessToken
  >
> {
  return vi
    .fn<
      VerifyAccessToken
    >()
    .mockResolvedValue(
      claims,
    );
}

function sessionMock():
ReturnType<
  typeof vi.fn<
    FindSessionById
  >
> {
  return vi
    .fn<
      FindSessionById
    >()
    .mockResolvedValue(
      activeSession,
    );
}

function expectUnauthorized(
  response: {
    readonly status:
      number;

    readonly body:
      unknown;
  },
): void {
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
}

/*
 * Supertest supports an array here at runtime and sends
 * duplicate header lines, but its TypeScript overload only
 * models string[] for Cookie. Keep this compatibility cast
 * isolated to the adversarial duplicate-header test.
 */
function duplicateAuthorizationValues():
string {
  return [
    'Bearer attacker-token',
    'Bearer legitimate-token',
  ] as unknown as string;
}

describe(
  'T220 Authorization header attacks',
  () => {
    it(
      'rejects duplicate Authorization headers before JWT verification',
      async () => {
        const verify =
          verifyMock();

        const findSessionById =
          sessionMock();

        const response =
          await request(
            testApp(
              verify,
              findSessionById,
            ),
          )
            .get(
              '/protected',
            )
            .set(
              'Authorization',
              duplicateAuthorizationValues(),
            );

        expectUnauthorized(
          response,
        );

        expect(
          verify,
        ).not.toHaveBeenCalled();

        expect(
          findSessionById,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'rejects a comma-joined pair of Bearer tokens',
      async () => {
        const verify =
          verifyMock();

        const findSessionById =
          sessionMock();

        const response =
          await request(
            testApp(
              verify,
              findSessionById,
            ),
          )
            .get(
              '/protected',
            )
            .set(
              'Authorization',
              'Bearer attacker-token, Bearer legitimate-token',
            );

        expectUnauthorized(
          response,
        );

        expect(
          verify,
        ).not.toHaveBeenCalled();

        expect(
          findSessionById,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'rejects multiple credentials inside one Authorization value',
      async () => {
        const verify =
          verifyMock();

        const findSessionById =
          sessionMock();

        const response =
          await request(
            testApp(
              verify,
              findSessionById,
            ),
          )
            .get(
              '/protected',
            )
            .set(
              'Authorization',
              'Bearer first-token Bearer second-token',
            );

        expectUnauthorized(
          response,
        );

        expect(
          verify,
        ).not.toHaveBeenCalled();

        expect(
          findSessionById,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'accepts exactly one well-formed Authorization header',
      async () => {
        const verify =
          verifyMock();

        const findSessionById =
          sessionMock();

        const response =
          await request(
            testApp(
              verify,
              findSessionById,
            ),
          )
            .get(
              '/protected',
            )
            .set(
              'Authorization',
              'Bearer legitimate-token',
            );

        expect(
          response.status,
        ).toBe(204);

        expect(
          verify,
        ).toHaveBeenCalledOnce();

        expect(
          verify,
        ).toHaveBeenCalledWith(
          'legitimate-token',
        );

        expect(
          findSessionById,
        ).toHaveBeenCalledWith(
          claims.sid,
        );
      },
    );
  },
);
