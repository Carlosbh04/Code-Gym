import { describe, expect, it, vi } from 'vitest';

import { AccessTokenService } from '../src/auth/access-token-service.js';
import type {
  AuthSessionRecord,
  AuthSessionRepository,
} from '../src/auth/auth-session-repository.js';
import {
  InvalidRefreshSessionError,
  RefreshService,
} from '../src/auth/refresh-service.js';
import {
  digestRefreshToken,
  issueRefreshToken,
} from '../src/auth/refresh-token-service.js';

const now = new Date('2026-09-11T10:00:00.000Z');

const authConfig = {
  accessTokenSecret: Buffer.alloc(32, 9).toString('base64url'),
  accessTokenTtlSeconds: 600,
  refreshTokenTtlSeconds: 2_592_000,
  idleSessionTimeoutSeconds: 900,
};

const currentRefreshToken = issueRefreshToken();

const activeSession: AuthSessionRecord = {
  id: 'session-1',
  userId: 'user-1',
  refreshTokenDigest: currentRefreshToken.digest,
  createdAt: new Date('2026-09-10T10:00:00.000Z'),
  expiresAt: new Date(
    now.getTime() + 60_000,
  ),
  remembered: false,
  lastActivityAt: new Date(
    now.getTime() - 5 * 60_000,
  ),
  rotatedAt: null,
  revokedAt: null,
};

function createRepository(
  overrides: Partial<AuthSessionRepository> = {},
): AuthSessionRepository {
  return {
    createSession: vi.fn<AuthSessionRepository['createSession']>(),

    findSessionByRefreshTokenDigest: vi
      .fn<AuthSessionRepository['findSessionByRefreshTokenDigest']>()
      .mockResolvedValue(activeSession),

    findSessionById: vi
      .fn<AuthSessionRepository['findSessionById']>()
      .mockResolvedValue(null),

    findSessionsByUserId: vi
      .fn<AuthSessionRepository['findSessionsByUserId']>()
      .mockResolvedValue([]),

    rotateSession: vi
      .fn<AuthSessionRepository['rotateSession']>()
      .mockResolvedValue({
        ...activeSession,
        rotatedAt: now,
        expiresAt: new Date(
          now.getTime() + authConfig.refreshTokenTtlSeconds * 1_000,
        ),
      }),

    touchSessionActivity:
      () => Promise.resolve(true),

    revokeSessionByRefreshTokenDigest: vi
      .fn<AuthSessionRepository['revokeSessionByRefreshTokenDigest']>()
      .mockResolvedValue(),

    revokeSessionById: vi
      .fn<AuthSessionRepository['revokeSessionById']>()
      .mockResolvedValue(false),

    revokeOtherSessions: vi
      .fn<AuthSessionRepository['revokeOtherSessions']>()
      .mockResolvedValue(0),

    ...overrides,
  };
}

describe('refresh service', () => {
  it('rotates the refresh token and issues a new access token', async () => {
    const findSessionByRefreshTokenDigest = vi
      .fn<AuthSessionRepository['findSessionByRefreshTokenDigest']>()
      .mockResolvedValue(activeSession);

    const rotateSession = vi
      .fn<AuthSessionRepository['rotateSession']>()
      .mockImplementation((input) =>
        Promise.resolve({
          ...activeSession,
          refreshTokenDigest:
            input.nextRefreshTokenDigest,
          rotatedAt:
            input.rotatedAt,
          expiresAt:
            input.expiresAt,
        }),
      );

    const repository = createRepository({
      findSessionByRefreshTokenDigest,
      rotateSession,
    });

    const accessTokenService = new AccessTokenService(
      authConfig,
      () => now,
    );

    const service = new RefreshService(
      repository,
      accessTokenService,
      authConfig,
      () => now,
    );

    const result = await service.refresh(
      currentRefreshToken.token,
    );

    expect(
      findSessionByRefreshTokenDigest,
    ).toHaveBeenCalledOnce();

    expect(
      findSessionByRefreshTokenDigest,
    ).toHaveBeenCalledWith(
      digestRefreshToken(currentRefreshToken.token),
    );

    expect(
      rotateSession,
    ).toHaveBeenCalledOnce();

    const rotation =
      rotateSession.mock.calls[0]?.[0];

    expect(rotation?.sessionId).toBe(
      'session-1',
    );

    expect(
      rotation?.currentRefreshTokenDigest,
    ).toEqual(
      currentRefreshToken.digest,
    );

    expect(
      rotation?.nextRefreshTokenDigest,
    ).toBeInstanceOf(
      Uint8Array,
    );

    expect(
      rotation?.nextRefreshTokenDigest,
    ).not.toEqual(
      currentRefreshToken.digest,
    );

    expect(rotation?.rotatedAt).toEqual(
      now,
    );

    expect(rotation?.expiresAt).toEqual(
      new Date(
        now.getTime()
          + authConfig.refreshTokenTtlSeconds * 1_000,
      ),
    );

    expect(result.refreshToken).toMatch(
      /^[A-Za-z0-9_-]{43}$/,
    );

    expect(result.refreshToken).not.toBe(
      currentRefreshToken.token,
    );

    expect(
      result.remembered,
    ).toBe(false);

    const claims =
      await accessTokenService.verify(
        result.accessToken,
      );

    expect(claims.sub).toBe('user-1');
    expect(claims.sid).toBe('session-1');
  });

  it('rejects a malformed refresh token', async () => {
    const repository = createRepository();

    const accessTokenService = new AccessTokenService(
      authConfig,
      () => now,
    );

    const service = new RefreshService(
      repository,
      accessTokenService,
      authConfig,
      () => now,
    );

    await expect(
      service.refresh('not-a-valid-refresh-token'),
    ).rejects.toBeInstanceOf(
      InvalidRefreshSessionError,
    );

    expect(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      repository.findSessionByRefreshTokenDigest,
    ).not.toHaveBeenCalled();

    expect(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      repository.rotateSession,
    ).not.toHaveBeenCalled();
  });

  it('rejects an unknown refresh token', async () => {
    const findSessionByRefreshTokenDigest = vi
      .fn<AuthSessionRepository['findSessionByRefreshTokenDigest']>()
      .mockResolvedValue(null);

    const repository = createRepository({
      findSessionByRefreshTokenDigest,
    });

    const accessTokenService = new AccessTokenService(
      authConfig,
      () => now,
    );

    const service = new RefreshService(
      repository,
      accessTokenService,
      authConfig,
      () => now,
    );

    await expect(
      service.refresh(
        currentRefreshToken.token,
      ),
    ).rejects.toBeInstanceOf(
      InvalidRefreshSessionError,
    );

    expect(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      repository.rotateSession,
    ).not.toHaveBeenCalled();
  });

  it('allows refresh one millisecond before the idle deadline', async () => {
    const repository = createRepository({
      findSessionByRefreshTokenDigest: vi
        .fn<AuthSessionRepository['findSessionByRefreshTokenDigest']>()
        .mockResolvedValue({
          ...activeSession,
          lastActivityAt:
            new Date(
              now.getTime()
                - 900_000
                + 1,
            ),
        }),
    });

    const accessTokenService =
      new AccessTokenService(
        authConfig,
        () => now,
      );

    const service =
      new RefreshService(
        repository,
        accessTokenService,
        authConfig,
        () => now,
      );

    await expect(
      service.refresh(
        currentRefreshToken.token,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        remembered:
          false,
      }),
    );
  });

  it.each([
    new Date(
      now.getTime() - 900_000,
    ),
    new Date(
      now.getTime() - 900_001,
    ),
  ])(
    'rejects refresh when idle deadline is reached or exceeded: %s',
    async (
      lastActivityAt,
    ) => {
      const rotateSession = vi
        .fn<AuthSessionRepository['rotateSession']>()
        .mockResolvedValue({
          ...activeSession,
        });

      const repository =
        createRepository({
          findSessionByRefreshTokenDigest:
            vi
              .fn<AuthSessionRepository['findSessionByRefreshTokenDigest']>()
              .mockResolvedValue({
                ...activeSession,
                lastActivityAt,
              }),
          rotateSession,
        });

      const accessTokenService =
        new AccessTokenService(
          authConfig,
          () => now,
        );

      const service =
        new RefreshService(
          repository,
          accessTokenService,
          authConfig,
          () => now,
        );

      await expect(
        service.refresh(
          currentRefreshToken.token,
        ),
      ).rejects.toBeInstanceOf(
        InvalidRefreshSessionError,
      );

      expect(
        rotateSession,
      ).not.toHaveBeenCalled();
    },
  );

  it('rejects a revoked session', async () => {
    const repository = createRepository({
      findSessionByRefreshTokenDigest: vi
        .fn<AuthSessionRepository['findSessionByRefreshTokenDigest']>()
        .mockResolvedValue({
          ...activeSession,
          revokedAt: new Date(
            '2026-09-11T09:59:00.000Z',
          ),
        }),
    });

    const accessTokenService = new AccessTokenService(
      authConfig,
      () => now,
    );

    const service = new RefreshService(
      repository,
      accessTokenService,
      authConfig,
      () => now,
    );

    await expect(
      service.refresh(
        currentRefreshToken.token,
      ),
    ).rejects.toBeInstanceOf(
      InvalidRefreshSessionError,
    );

    expect(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      repository.rotateSession,
    ).not.toHaveBeenCalled();
  });

  it('rejects an expired session', async () => {
    const repository = createRepository({
      findSessionByRefreshTokenDigest: vi
        .fn<AuthSessionRepository['findSessionByRefreshTokenDigest']>()
        .mockResolvedValue({
          ...activeSession,
          expiresAt: new Date(
            now.getTime() - 1,
          ),
        }),
    });

    const accessTokenService = new AccessTokenService(
      authConfig,
      () => now,
    );

    const service = new RefreshService(
      repository,
      accessTokenService,
      authConfig,
      () => now,
    );

    await expect(
      service.refresh(
        currentRefreshToken.token,
      ),
    ).rejects.toBeInstanceOf(
      InvalidRefreshSessionError,
    );

    expect(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      repository.rotateSession,
    ).not.toHaveBeenCalled();
  });

  it('rejects reuse when the compare-and-swap rotation loses the race', async () => {
    const rotateSession = vi
      .fn<AuthSessionRepository['rotateSession']>()
      .mockResolvedValue(null);

    const repository = createRepository({
      rotateSession,
    });

    const accessTokenService = new AccessTokenService(
      authConfig,
      () => now,
    );

    const service = new RefreshService(
      repository,
      accessTokenService,
      authConfig,
      () => now,
    );

    await expect(
      service.refresh(
        currentRefreshToken.token,
      ),
    ).rejects.toBeInstanceOf(
      InvalidRefreshSessionError,
    );

    expect(
      rotateSession,
    ).toHaveBeenCalledOnce();
  });
});
