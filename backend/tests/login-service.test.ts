import { describe, expect, it, vi } from 'vitest';

import { AccessTokenService } from '../src/auth/access-token-service.js';
import type {
  AuthSessionRepository,
  AuthSessionRecord,
} from '../src/auth/auth-session-repository.js';
import {
  InvalidCredentialsError,
  LoginService,
} from '../src/auth/login-service.js';
import type { UserRepository } from '../src/auth/user-repository.js';

const now =
  new Date(
    '2026-09-11T10:00:00.000Z',
  );

const accessTokenSecret =
  Buffer.alloc(32, 7)
    .toString('base64url');

const authConfig = {
  accessTokenSecret,
  accessTokenTtlSeconds: 600,
  refreshTokenTtlSeconds:
    2_592_000,
};

const storedUser = {
  id: 'user-1',

  email:
    'person@example.test',

  passwordHash:
    '$argon2id$v=19$test-hash',

  displayName:
    'Ada',

  role:
    'USER' as const,

  createdAt:
    new Date(
      '2026-09-10T10:00:00.000Z',
    ),

  updatedAt:
    new Date(
      '2026-09-10T10:01:00.000Z',
    ),
};

const storedSession:
  AuthSessionRecord = {
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

    remembered:
      true,
    rotatedAt:
      null,

    revokedAt:
      null,
  };

function createUserRepository(
  findUserByEmail:
    UserRepository[
      'findUserByEmail'
    ],
): UserRepository {
  return {
    createUser:
      vi.fn<
        UserRepository[
          'createUser'
        ]
      >(),

    findUserByEmail,

    findUserById:
      vi
        .fn<
          UserRepository[
            'findUserById'
          ]
        >()
        .mockResolvedValue(
          null,
        ),

    updateDisplayName:
      vi
        .fn<
          UserRepository[
            'updateDisplayName'
          ]
        >()
        .mockResolvedValue(
          null,
        ),
  };
}

function createAuthSessionRepository(
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
      () => Promise.resolve(true),

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
  'login service',
  () => {
    it('authenticates valid credentials and creates a refresh session', async () => {
      const findUserByEmail =
        vi
          .fn<
            UserRepository[
              'findUserByEmail'
            ]
          >()
          .mockResolvedValue(
            storedUser,
          );

      const createSession =
        vi
          .fn<
            AuthSessionRepository[
              'createSession'
            ]
          >()
          .mockResolvedValue(
            storedSession,
          );

      const passwordVerifier =
        vi
          .fn<
            (
              passwordHash:
                string,
              password:
                string,
            ) => Promise<boolean>
          >()
          .mockResolvedValue(
            true,
          );

      const accessTokenService =
        new AccessTokenService(
          authConfig,
          () => now,
        );

      const service =
        new LoginService(
          createUserRepository(
            findUserByEmail,
          ),
          createAuthSessionRepository(
            createSession,
          ),
          accessTokenService,
          authConfig,
          passwordVerifier,
          () => now,
        );

      const result =
        await service.login({
          email:
            '  PERSON@EXAMPLE.TEST  ',

          password:
            'correct horse battery staple',
            remember:
              true,
        });

      expect(
        findUserByEmail,
      ).toHaveBeenCalledOnce();

      expect(
        findUserByEmail,
      ).toHaveBeenCalledWith(
        'person@example.test',
      );

      expect(
        passwordVerifier,
      ).toHaveBeenCalledOnce();

      expect(
        passwordVerifier,
      ).toHaveBeenCalledWith(
        storedUser.passwordHash,
        'correct horse battery staple',
      );

      expect(
        createSession,
      ).toHaveBeenCalledOnce();

      const createdSession =
        createSession
          .mock.calls[0]?.[0];

      expect(
        createdSession
          ?.userId,
      ).toBe(
        'user-1',
      );

      expect(
        createdSession
          ?.refreshTokenDigest,
      ).toBeInstanceOf(
        Uint8Array,
      );

      expect(
        createdSession
          ?.remembered,
      ).toBe(true);

      expect(
        createdSession
          ?.refreshTokenDigest
          .byteLength,
      ).toBe(
        32,
      );

      expect(
        createdSession
          ?.expiresAt,
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
          storedUser
            .createdAt
            .toISOString(),

        updatedAt:
          storedUser
            .updatedAt
            .toISOString(),
      });

      expect(
        result.user,
      ).not.toHaveProperty(
        'password',
      );

      expect(
        result.user,
      ).not.toHaveProperty(
        'passwordHash',
      );

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
    });

    it('rejects an incorrect password without creating a session', async () => {
      const findUserByEmail =
        vi
          .fn<
            UserRepository[
              'findUserByEmail'
            ]
          >()
          .mockResolvedValue(
            storedUser,
          );

      const createSession =
        vi.fn<
          AuthSessionRepository[
            'createSession'
          ]
        >();

      const passwordVerifier =
        vi
          .fn<
            (
              passwordHash:
                string,
              password:
                string,
            ) => Promise<boolean>
          >()
          .mockResolvedValue(
            false,
          );

      const accessTokenService =
        new AccessTokenService(
          authConfig,
          () => now,
        );

      const service =
        new LoginService(
          createUserRepository(
            findUserByEmail,
          ),
          createAuthSessionRepository(
            createSession,
          ),
          accessTokenService,
          authConfig,
          passwordVerifier,
          () => now,
        );

      await expect(
        service.login({
          remember:
            false,
          email:
            'person@example.test',

          password:
            'wrong password',
        }),
      ).rejects.toBeInstanceOf(
        InvalidCredentialsError,
      );

      expect(
        passwordVerifier,
      ).toHaveBeenCalledOnce();

      expect(
        passwordVerifier,
      ).toHaveBeenCalledWith(
        storedUser.passwordHash,
        'wrong password',
      );

      expect(
        createSession,
      ).not.toHaveBeenCalled();
    });

    it('rejects a Google-only user through password login even if the injected verifier returns true', async () => {
      const googleOnlyUser = {
        ...storedUser,
        passwordHash: null,
      };

      const findUserByEmail =
        vi
          .fn<
            UserRepository[
              'findUserByEmail'
            ]
          >()
          .mockResolvedValue(
            googleOnlyUser,
          );

      const createSession =
        vi.fn<
          AuthSessionRepository[
            'createSession'
          ]
        >();

      const passwordVerifier =
        vi
          .fn<
            (
              passwordHash:
                string,
              password:
                string,
            ) => Promise<boolean>
          >()
          .mockResolvedValue(
            true,
          );

      const accessTokenService =
        new AccessTokenService(
          authConfig,
          () => now,
        );

      const service =
        new LoginService(
          createUserRepository(
            findUserByEmail,
          ),
          createAuthSessionRepository(
            createSession,
          ),
          accessTokenService,
          authConfig,
          passwordVerifier,
          () => now,
        );

      await expect(
        service.login({
          remember:
            false,
          email:
            'person@example.test',
          password:
            'correct horse battery staple',
        }),
      ).rejects.toBeInstanceOf(
        InvalidCredentialsError,
      );

      expect(
        passwordVerifier,
      ).toHaveBeenCalledOnce();

      const verificationCall =
        passwordVerifier
          .mock.calls[0];

      expect(
        verificationCall,
      ).toBeDefined();

      const [
        verificationHash,
        verificationPassword,
      ] =
        verificationCall ?? [];

      expect(
        verificationHash,
      ).toMatch(
        /^\$argon2id\$v=19\$m=65536,t=3,p=1\$/,
      );

      expect(
        verificationPassword,
      ).toBe(
        'correct horse battery staple',
      );

      expect(
        createSession,
      ).not.toHaveBeenCalled();
    });

    it('performs password verification for an unknown email and still creates no session', async () => {
      const findUserByEmail =
        vi
          .fn<
            UserRepository[
              'findUserByEmail'
            ]
          >()
          .mockResolvedValue(
            null,
          );

      const createSession =
        vi.fn<
          AuthSessionRepository[
            'createSession'
          ]
        >();

      const passwordVerifier =
        vi
          .fn<
            (
              passwordHash:
                string,
              password:
                string,
            ) => Promise<boolean>
          >()
          .mockResolvedValue(
            false,
          );

      const accessTokenService =
        new AccessTokenService(
          authConfig,
          () => now,
        );

      const service =
        new LoginService(
          createUserRepository(
            findUserByEmail,
          ),
          createAuthSessionRepository(
            createSession,
          ),
          accessTokenService,
          authConfig,
          passwordVerifier,
          () => now,
        );

      await expect(
        service.login({
          remember:
            false,
          email:
            'missing@example.test',

          password:
            'correct horse battery staple',
        }),
      ).rejects.toBeInstanceOf(
        InvalidCredentialsError,
      );

      expect(
        passwordVerifier,
      ).toHaveBeenCalledOnce();

      const verificationCall =
        passwordVerifier
          .mock.calls[0];

      expect(
        verificationCall,
      ).toBeDefined();

      const [
        verificationHash,
        verificationPassword,
      ] =
        verificationCall ?? [];

      expect(
        verificationHash,
      ).toMatch(
        /^\$argon2id\$v=19\$m=65536,t=3,p=1\$/,
      );

      expect(
        verificationHash,
      ).not.toBe(
        storedUser.passwordHash,
      );

      expect(
        verificationPassword,
      ).toBe(
        'correct horse battery staple',
      );

      expect(
        createSession,
      ).not.toHaveBeenCalled();
    });

    it('does not create a session for an unknown email even if the injected verifier returns true', async () => {
      const findUserByEmail =
        vi
          .fn<
            UserRepository[
              'findUserByEmail'
            ]
          >()
          .mockResolvedValue(
            null,
          );

      const createSession =
        vi.fn<
          AuthSessionRepository[
            'createSession'
          ]
        >();

      const passwordVerifier =
        vi
          .fn<
            (
              passwordHash:
                string,
              password:
                string,
            ) => Promise<boolean>
          >()
          .mockResolvedValue(
            true,
          );

      const accessTokenService =
        new AccessTokenService(
          authConfig,
          () => now,
        );

      const service =
        new LoginService(
          createUserRepository(
            findUserByEmail,
          ),
          createAuthSessionRepository(
            createSession,
          ),
          accessTokenService,
          authConfig,
          passwordVerifier,
          () => now,
        );

      await expect(
        service.login({
          remember:
            false,
          email:
            'missing@example.test',

          password:
            'correct horse battery staple',
        }),
      ).rejects.toBeInstanceOf(
        InvalidCredentialsError,
      );

      expect(
        passwordVerifier,
      ).toHaveBeenCalledOnce();

      expect(
        createSession,
      ).not.toHaveBeenCalled();
    });

    it('does not expose password hashes or refresh-token digests in the public user', async () => {
      const findUserByEmail =
        vi
          .fn<
            UserRepository[
              'findUserByEmail'
            ]
          >()
          .mockResolvedValue(
            storedUser,
          );

      const createSession =
        vi
          .fn<
            AuthSessionRepository[
              'createSession'
            ]
          >()
          .mockResolvedValue(
            storedSession,
          );

      const accessTokenService =
        new AccessTokenService(
          authConfig,
          () => now,
        );

      const service =
        new LoginService(
          createUserRepository(
            findUserByEmail,
          ),
          createAuthSessionRepository(
            createSession,
          ),
          accessTokenService,
          authConfig,
          () =>
            Promise.resolve(
              true,
            ),
          () => now,
        );

      const result =
        await service.login({
          remember:
            false,
          email:
            'person@example.test',

          password:
            'correct horse battery staple',
        });

      expect(
        result.user,
      ).toHaveProperty(
        'role',
        'USER',
      );

      expect(
        result.user,
      ).not.toHaveProperty(
        'passwordHash',
      );

      expect(
        result.user,
      ).not.toHaveProperty(
        'refreshTokenDigest',
      );

      expect(
        result.user,
      ).not.toHaveProperty(
        'authSessions',
      );

      expect(
        JSON.stringify(
          result.user,
        ),
      ).not.toContain(
        storedUser.passwordHash,
      );
    });
  },
);

describe(
  'login account security escalation',
  () => {
    function createSecurityAwareUserRepository(
      user: Omit<
        typeof storedUser,
        'passwordHash'
      > & {
        passwordHash: string | null;
      } = storedUser,
    ): UserRepository {
      return {
        createUser:
          vi.fn<
            UserRepository['createUser']
          >(),

        findUserByEmail:
          vi.fn<
            UserRepository['findUserByEmail']
          >()
            .mockResolvedValue(
              user,
            ),

        findUserById:
          vi.fn<
            UserRepository['findUserById']
          >()
            .mockResolvedValue(
              null,
            ),

        updateDisplayName:
          vi.fn<
            UserRepository[
              'updateDisplayName'
            ]
          >()
            .mockResolvedValue(
              null,
            ),
      };
    }

    it(
      'records a failed password attempt for a real password account',
      async () => {
        const securityRepository = {
          recordFailedPasswordAttempt:
            vi.fn()
              .mockResolvedValue(
                'FAILED' as const,
              ),

          getActiveLoginCooldownUntilByEmail:
            vi.fn()
              .mockResolvedValue(
                null,
              ),
        };

        const service =
          new LoginService(
            createSecurityAwareUserRepository(),
            createAuthSessionRepository(
              vi.fn(),
            ),
            new AccessTokenService(
              authConfig,
              () => now,
            ),
            authConfig,
            vi.fn()
              .mockResolvedValue(
                false,
              ),
            () => now,
            securityRepository,
          );

        await expect(
          service.login({
            email:
              storedUser.email,
            password:
              'wrong-password',
            remember:
              false,
          }),
        ).rejects.toBeInstanceOf(
          InvalidCredentialsError,
        );

        expect(
          securityRepository
            .recordFailedPasswordAttempt,
        ).toHaveBeenCalledExactlyOnceWith({
          userId:
            storedUser.id,

          occurredAt:
            now,

          expectedPasswordHash:
            storedUser.passwordHash,
        });
      },
    );

    it(
      'surfaces the authoritative cooldown immediately when the failed attempt reaches the threshold',
      async () => {
        const cooldownUntil =
          new Date(
            now.getTime()
            + 15 * 60 * 1_000,
          );

        const securityRepository = {
          recordFailedPasswordAttempt:
            vi.fn()
              .mockResolvedValue(
                'COOLDOWN' as const,
              ),

          getActiveLoginCooldownUntilByEmail:
            vi.fn()
              .mockResolvedValue(
                cooldownUntil,
              ),
        };

        const service =
          new LoginService(
            createSecurityAwareUserRepository(),
            createAuthSessionRepository(
              vi.fn(),
            ),
            new AccessTokenService(
              authConfig,
              () => now,
            ),
            authConfig,
            vi.fn()
              .mockResolvedValue(
                false,
              ),
            () => now,
            securityRepository,
          );

        await expect(
          service.login({
            email:
              storedUser.email,
            password:
              'wrong-password',
            remember:
              false,
          }),
        ).rejects.toMatchObject({
          name:
            'AccountCooldownError',
          cooldownUntil,
        });

        expect(
          securityRepository
            .getActiveLoginCooldownUntilByEmail,
        ).toHaveBeenCalledWith(
          storedUser.email,
          now,
        );
      },
    );

    it(
      'surfaces a persistent account lock immediately when the failed attempt locks the account',
      async () => {
        const securityRepository = {
          recordFailedPasswordAttempt:
            vi.fn()
              .mockResolvedValue(
                'LOCKED' as const,
              ),

          getActiveLoginCooldownUntilByEmail:
            vi.fn()
              .mockResolvedValue(
                null,
              ),
        };

        const service =
          new LoginService(
            createSecurityAwareUserRepository(),
            createAuthSessionRepository(
              vi.fn(),
            ),
            new AccessTokenService(
              authConfig,
              () => now,
            ),
            authConfig,
            vi.fn()
              .mockResolvedValue(
                false,
              ),
            () => now,
            securityRepository,
          );

        await expect(
          service.login({
            email:
              storedUser.email,
            password:
              'wrong-password',
            remember:
              false,
          }),
        ).rejects.toMatchObject({
          name:
            'AccountLockedError',
        });

        expect(
          securityRepository
            .recordFailedPasswordAttempt,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      'does not create persistent failure state for an unknown email',
      async () => {
        const securityRepository = {
          recordFailedPasswordAttempt:
            vi.fn(),

          getActiveLoginCooldownUntilByEmail:
            vi.fn()
              .mockResolvedValue(
                null,
              ),
        };

        const userRepository =
          createSecurityAwareUserRepository();

        vi.spyOn(
          userRepository,
          'findUserByEmail',
        ).mockResolvedValue(
          null,
        );

        const service =
          new LoginService(
            userRepository,
            createAuthSessionRepository(
              vi.fn(),
            ),
            new AccessTokenService(
              authConfig,
              () => now,
            ),
            authConfig,
            vi.fn()
              .mockResolvedValue(
                false,
              ),
            () => now,
            securityRepository,
          );

        await expect(
          service.login({
            email:
              'missing@example.test',
            password:
              'wrong-password',
            remember:
              false,
          }),
        ).rejects.toBeInstanceOf(
          InvalidCredentialsError,
        );

        expect(
          securityRepository
            .recordFailedPasswordAttempt,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'does not create password-failure state for a Google-only account',
      async () => {
        const securityRepository = {
          recordFailedPasswordAttempt:
            vi.fn(),

          getActiveLoginCooldownUntilByEmail:
            vi.fn()
              .mockResolvedValue(
                null,
              ),
        };

        const service =
          new LoginService(
            createSecurityAwareUserRepository({
              ...storedUser,
              passwordHash:
                null,
            }),
            createAuthSessionRepository(
              vi.fn(),
            ),
            new AccessTokenService(
              authConfig,
              () => now,
            ),
            authConfig,
            vi.fn()
              .mockResolvedValue(
                true,
              ),
            () => now,
            securityRepository,
          );

        await expect(
          service.login({
            email:
              storedUser.email,
            password:
              'anything',
            remember:
              false,
          }),
        ).rejects.toBeInstanceOf(
          InvalidCredentialsError,
        );

        expect(
          securityRepository
            .recordFailedPasswordAttempt,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
