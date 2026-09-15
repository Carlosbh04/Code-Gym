import {
  SignJWT,
} from 'jose';

import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  AccessTokenService,
  InvalidAccessTokenError,
} from '../src/auth/access-token-service.js';

const issuedAt =
  new Date(
    '2026-09-11T20:00:00.000Z',
  );

const secret =
  Buffer
    .alloc(
      32,
      21,
    )
    .toString(
      'base64url',
    );

const key =
  Buffer.from(
    secret,
    'base64url',
  );

const userId =
  'user12345678901234567890';

const sessionId =
  'session12345678901234567';

function service():
AccessTokenService {
  return new AccessTokenService(
    {
      accessTokenSecret:
        secret,

      accessTokenTtlSeconds:
        600,
    },

    () =>
      issuedAt,
  );
}

function timestamp():
number {
  return Math.floor(
    issuedAt.getTime()
    / 1_000,
  );
}

describe(
  'T220 access-token attacks',
  () => {
    it(
      'rejects a correctly signed token with an attacker-controlled issuer',
      async () => {
        const now =
          timestamp();

        const token =
          await new SignJWT({
            sid:
              sessionId,
          })
            .setProtectedHeader({
              alg:
                'HS256',

              typ:
                'at+jwt',
            })
            .setIssuer(
              'attacker-service',
            )
            .setAudience(
              'codegym-api',
            )
            .setSubject(
              userId,
            )
            .setIssuedAt(
              now,
            )
            .setExpirationTime(
              now + 600,
            )
            .sign(
              key,
            );

        await expect(
          service().verify(
            token,
          ),
        ).rejects.toBeInstanceOf(
          InvalidAccessTokenError,
        );
      },
    );

    it(
      'rejects a correctly signed token with an attacker-controlled audience',
      async () => {
        const now =
          timestamp();

        const token =
          await new SignJWT({
            sid:
              sessionId,
          })
            .setProtectedHeader({
              alg:
                'HS256',

              typ:
                'at+jwt',
            })
            .setIssuer(
              'codegym-backend',
            )
            .setAudience(
              'attacker-api',
            )
            .setSubject(
              userId,
            )
            .setIssuedAt(
              now,
            )
            .setExpirationTime(
              now + 600,
            )
            .sign(
              key,
            );

        await expect(
          service().verify(
            token,
          ),
        ).rejects.toBeInstanceOf(
          InvalidAccessTokenError,
        );
      },
    );

    it(
      'rejects a correctly signed token without sid',
      async () => {
        const now =
          timestamp();

        const token =
          await new SignJWT({})
            .setProtectedHeader({
              alg:
                'HS256',

              typ:
                'at+jwt',
            })
            .setIssuer(
              'codegym-backend',
            )
            .setAudience(
              'codegym-api',
            )
            .setSubject(
              userId,
            )
            .setIssuedAt(
              now,
            )
            .setExpirationTime(
              now + 600,
            )
            .sign(
              key,
            );

        await expect(
          service().verify(
            token,
          ),
        ).rejects.toBeInstanceOf(
          InvalidAccessTokenError,
        );
      },
    );

    it(
      'rejects a correctly signed token without subject',
      async () => {
        const now =
          timestamp();

        const token =
          await new SignJWT({
            sid:
              sessionId,
          })
            .setProtectedHeader({
              alg:
                'HS256',

              typ:
                'at+jwt',
            })
            .setIssuer(
              'codegym-backend',
            )
            .setAudience(
              'codegym-api',
            )
            .setIssuedAt(
              now,
            )
            .setExpirationTime(
              now + 600,
            )
            .sign(
              key,
            );

        await expect(
          service().verify(
            token,
          ),
        ).rejects.toBeInstanceOf(
          InvalidAccessTokenError,
        );
      },
    );

    it(
      'rejects a signed token whose sid has an invalid type',
      async () => {
        const now =
          timestamp();

        const token =
          await new SignJWT({
            sid:
              12345,
          })
            .setProtectedHeader({
              alg:
                'HS256',

              typ:
                'at+jwt',
            })
            .setIssuer(
              'codegym-backend',
            )
            .setAudience(
              'codegym-api',
            )
            .setSubject(
              userId,
            )
            .setIssuedAt(
              now,
            )
            .setExpirationTime(
              now + 600,
            )
            .sign(
              key,
            );

        await expect(
          service().verify(
            token,
          ),
        ).rejects.toBeInstanceOf(
          InvalidAccessTokenError,
        );
      },
    );
  },
);