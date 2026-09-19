import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  AuthSessionRepository,
} from '../src/auth/auth-session-repository.js';
import {
  LogoutService,
} from '../src/auth/logout-service.js';
import {
  digestRefreshToken,
  issueRefreshToken,
} from '../src/auth/refresh-token-service.js';

const now =
  new Date(
    '2026-09-11T10:00:00.000Z',
  );

function createAuthSessionRepository(
  revokeSessionByRefreshTokenDigest:
    AuthSessionRepository[
      'revokeSessionByRefreshTokenDigest'
    ],
): AuthSessionRepository {
  return {
    createSession:
      vi.fn<
        AuthSessionRepository[
          'createSession'
        ]
      >(),

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
      vi.fn<
        AuthSessionRepository[
          'touchSessionActivity'
        ]
      >()
        .mockResolvedValue(
          true,
        ),

    revokeSessionByRefreshTokenDigest,

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
  'logout service',
  () => {
    it(
      'does nothing when no refresh token is provided',
      async () => {
        const revokeSessionByRefreshTokenDigest =
          vi.fn<
            AuthSessionRepository[
              'revokeSessionByRefreshTokenDigest'
            ]
          >();

        const service =
          new LogoutService(
            createAuthSessionRepository(
              revokeSessionByRefreshTokenDigest,
            ),
            () => now,
          );

        await expect(
          service.logout(),
        ).resolves.toBeUndefined();

        expect(
          revokeSessionByRefreshTokenDigest,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'does nothing when the refresh token is malformed',
      async () => {
        const revokeSessionByRefreshTokenDigest =
          vi.fn<
            AuthSessionRepository[
              'revokeSessionByRefreshTokenDigest'
            ]
          >();

        const service =
          new LogoutService(
            createAuthSessionRepository(
              revokeSessionByRefreshTokenDigest,
            ),
            () => now,
          );

        await expect(
          service.logout(
            'not-a-valid-refresh-token',
          ),
        ).resolves.toBeUndefined();

        expect(
          revokeSessionByRefreshTokenDigest,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'revokes the session identified by the refresh-token digest',
      async () => {
        const revokeSessionByRefreshTokenDigest =
          vi
            .fn<
              AuthSessionRepository[
                'revokeSessionByRefreshTokenDigest'
              ]
            >()
            .mockResolvedValue();

        const refreshToken =
          issueRefreshToken().token;

        const service =
          new LogoutService(
            createAuthSessionRepository(
              revokeSessionByRefreshTokenDigest,
            ),
            () => now,
          );

        await service.logout(
          refreshToken,
        );

        expect(
          revokeSessionByRefreshTokenDigest,
        ).toHaveBeenCalledOnce();

        const call =
          revokeSessionByRefreshTokenDigest
            .mock.calls[0]?.[0];

        expect(
          call,
        ).toBeDefined();

        expect(
          call?.revokedAt,
        ).toEqual(
          now,
        );

        expect(
          call?.digest,
        ).toEqual(
          digestRefreshToken(
            refreshToken,
          ),
        );
      },
    );

    it(
      'uses the injected clock exactly once for a valid refresh token',
      async () => {
        const revokeSessionByRefreshTokenDigest =
          vi
            .fn<
              AuthSessionRepository[
                'revokeSessionByRefreshTokenDigest'
              ]
            >()
            .mockResolvedValue();

        const clock =
          vi
            .fn<() => Date>()
            .mockReturnValue(
              now,
            );

        const refreshToken =
          issueRefreshToken().token;

        const service =
          new LogoutService(
            createAuthSessionRepository(
              revokeSessionByRefreshTokenDigest,
            ),
            clock,
          );

        await service.logout(
          refreshToken,
        );

        expect(
          clock,
        ).toHaveBeenCalledOnce();

        expect(
          revokeSessionByRefreshTokenDigest,
        ).toHaveBeenCalledWith({
          digest:
            digestRefreshToken(
              refreshToken,
            ),

          revokedAt:
            now,
        });
      },
    );

    it(
      'propagates repository failures for a valid refresh token',
      async () => {
        const repositoryError =
          new Error(
            'database failure',
          );

        const revokeSessionByRefreshTokenDigest =
          vi
            .fn<
              AuthSessionRepository[
                'revokeSessionByRefreshTokenDigest'
              ]
            >()
            .mockRejectedValue(
              repositoryError,
            );

        const refreshToken =
          issueRefreshToken().token;

        const service =
          new LogoutService(
            createAuthSessionRepository(
              revokeSessionByRefreshTokenDigest,
            ),
            () => now,
          );

        await expect(
          service.logout(
            refreshToken,
          ),
        ).rejects.toBe(
          repositoryError,
        );
      },
    );
  },
);
