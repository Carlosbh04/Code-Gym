import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  AccessTokenService,
} from '../src/auth/access-token-service.js';

import {
  AuthenticatedSessionIssuer,
} from '../src/auth/authenticated-session.js';

import type {
  AuthSessionRepository,
  AuthSessionRecord,
} from '../src/auth/auth-session-repository.js';

const now =
  new Date(
    '2026-09-15T08:30:00.000Z',
  );

const authConfig = {
  accessTokenSecret:
    Buffer
      .alloc(32, 11)
      .toString('base64url'),
  accessTokenTtlSeconds:
    600,
  refreshTokenTtlSeconds:
    2_592_000,
};

const user = {
  id:
    'user-1',
  email:
    'person@example.test',
  displayName:
    'Ada',
  role:
    'USER' as const,
  createdAt:
    new Date(
      '2026-09-14T10:00:00.000Z',
    ),
  updatedAt:
    new Date(
      '2026-09-14T10:01:00.000Z',
    ),
};

const session:
  AuthSessionRecord = {
  remembered:
    false,

  lastActivityAt:
    now,
    id:
      'session-1',
    userId:
      'user-1',
    refreshTokenDigest:
      new Uint8Array(32),
    createdAt:
      now,
    expiresAt:
      new Date(
        now.getTime()
          + authConfig
            .refreshTokenTtlSeconds
            * 1_000,
      ),
    rotatedAt:
      null,
    revokedAt:
      null,
  };

function createRepository(
  createSession:
    AuthSessionRepository[
      'createSession'
    ],
): AuthSessionRepository {
  return {
    createSession,
    findSessionByRefreshTokenDigest:
      vi
        .fn<
          AuthSessionRepository[
            'findSessionByRefreshTokenDigest'
          ]
        >()
        .mockResolvedValue(
          null,
        ),
    findSessionById:
      vi
        .fn<
          AuthSessionRepository[
            'findSessionById'
          ]
        >()
        .mockResolvedValue(
          null,
        ),
    findSessionsByUserId:
      vi
        .fn<
          AuthSessionRepository[
            'findSessionsByUserId'
          ]
        >()
        .mockResolvedValue(
          [],
        ),
    rotateSession:
      vi
        .fn<
          AuthSessionRepository[
            'rotateSession'
          ]
        >()
        .mockResolvedValue(
          null,
        ),
    touchSessionActivity:
      async () => true,

    revokeSessionByRefreshTokenDigest:
      vi
        .fn<
          AuthSessionRepository[
            'revokeSessionByRefreshTokenDigest'
          ]
        >()
        .mockResolvedValue(),
    revokeSessionById:
      vi
        .fn<
          AuthSessionRepository[
            'revokeSessionById'
          ]
        >()
        .mockResolvedValue(
          false,
        ),
    revokeOtherSessions:
      vi
        .fn<
          AuthSessionRepository[
            'revokeOtherSessions'
          ]
        >()
        .mockResolvedValue(
          0,
        ),
  };
}

describe(
  'AuthenticatedSessionIssuer',
  () => {
    it('creates a refresh session and signs the application access token', async () => {
      const createSession =
        vi
          .fn<
            AuthSessionRepository[
              'createSession'
            ]
          >()
          .mockResolvedValue(
            session,
          );

      const accessTokenService =
        new AccessTokenService(
          authConfig,
          () => now,
        );

      const issuer =
        new AuthenticatedSessionIssuer(
          createRepository(
            createSession,
          ),
          accessTokenService,
          authConfig,
          () => now,
        );

      const result =
        await issuer.issue(
          user,
        );

      expect(
        createSession,
      ).toHaveBeenCalledOnce();

      const input =
        createSession
          .mock.calls[0]?.[0];

      expect(
        input?.userId,
      ).toBe(
        'user-1',
      );

      expect(
        input?.refreshTokenDigest,
      ).toBeInstanceOf(
        Uint8Array,
      );

      expect(
        input?.refreshTokenDigest
          .byteLength,
      ).toBe(
        32,
      );

      expect(
        input?.expiresAt,
      ).toEqual(
        new Date(
          now.getTime()
            + authConfig
              .refreshTokenTtlSeconds
              * 1_000,
        ),
      );

      expect(
        result.refreshToken,
      ).toMatch(
        /^[A-Za-z0-9_-]{43}$/,
      );

      expect(
        result.user,
      ).toEqual({
        id:
          'user-1',
        email:
          'person@example.test',
        displayName:
          'Ada',
        role:
          'USER',
        createdAt:
          user.createdAt
            .toISOString(),
        updatedAt:
          user.updatedAt
            .toISOString(),
      });

      const claims =
        await accessTokenService
          .verify(
            result.accessToken,
          );

      expect(
        claims.sub,
      ).toBe(
        'user-1',
      );

      expect(
        claims.sid,
      ).toBe(
        'session-1',
      );

      expect(
        Object.isFrozen(
          result,
        ),
      ).toBe(
        true,
      );
    });
  },
);
