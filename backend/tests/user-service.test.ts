import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  registerRequestSchema,
  type RegisterRequest,
} from '../src/auth/register-schema.js';
import type { UserRepository } from '../src/auth/user-repository.js';
import { UserService } from '../src/auth/user-service.js';

const createdAt =
  new Date(
    '2026-09-10T10:00:00.000Z',
  );

const updatedAt =
  new Date(
    '2026-09-10T10:01:00.000Z',
  );

function createRepository(
  createUser:
    UserRepository['createUser'],
): UserRepository {
  return {
    createUser,

    findUserByEmail: vi
      .fn<
        UserRepository[
          'findUserByEmail'
        ]
      >()
      .mockResolvedValue(
        null,
      ),

    findUserById: vi
      .fn<
        UserRepository[
          'findUserById'
        ]
      >()
      .mockResolvedValue(
        null,
      ),

    updateDisplayName: vi
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

describe(
  'user registration service',
  () => {
    it('hashes the normalized password and persists only its hash', async () => {
      const password =
        `correct-horse-Cafe\u0301-battery`;

      const input =
        registerRequestSchema.parse({
          email:
            'USER@EXAMPLE.TEST',

          password,

          displayName:
            'Ada',
        });

      const createUser = vi
        .fn<
          UserRepository[
            'createUser'
          ]
        >()
        .mockResolvedValue({
          id:
            'user-1',

          email:
            'user@example.test',

          displayName:
            'Ada',

          role:
            'USER',

          createdAt,
          updatedAt,
        });

      const passwordHasher = vi
        .fn<
          (
            value: string,
          ) => Promise<string>
        >()
        .mockResolvedValue(
          '$argon2id$test-password-hash',
        );

      const service =
        new UserService(
          createRepository(
            createUser,
          ),
          passwordHasher,
        );

      await service.register(
        input,
      );

      expect(
        passwordHasher,
      ).toHaveBeenCalledWith(
        password.normalize(
          'NFC',
        ),
      );

      expect(
        createUser,
      ).toHaveBeenCalledWith({
        email:
          'user@example.test',

        passwordHash:
          '$argon2id$test-password-hash',

        displayName:
          'Ada',
      });

      expect(
        createUser
          .mock.calls[0]?.[0],
      ).not.toHaveProperty(
        'password',
      );

      expect(
        createUser
          .mock.calls[0]?.[0],
      ).not.toHaveProperty(
        'role',
      );

      expect(
        JSON.stringify(
          createUser
            .mock.calls[0]?.[0],
        ),
      ).not.toContain(
        password,
      );
    });

    it('defensively canonicalizes email even when called outside the validated route', async () => {
      const createUser = vi
        .fn<
          UserRepository[
            'createUser'
          ]
        >()
        .mockResolvedValue({
          id:
            'user-2',

          email:
            'person@example.test',

          displayName:
            null,

          role:
            'USER',

          createdAt,
          updatedAt,
        });

      const service =
        new UserService(
          createRepository(
            createUser,
          ),
          () =>
            Promise.resolve(
              'safe-hash',
            ),
        );

      const bypassedRouteInput = {
        email:
          '  PERSON@EXAMPLE.TEST  ',

        password:
          'correct horse battery staple',
      } as RegisterRequest;

      await service.register(
        bypassedRouteInput,
      );

      expect(
        createUser,
      ).toHaveBeenCalledWith({
        email:
          'person@example.test',

        passwordHash:
          'safe-hash',

        displayName:
          null,
      });

      expect(
        createUser
          .mock.calls[0]?.[0],
      ).not.toHaveProperty(
        'role',
      );
    });

    it('does not attempt persistence when password hashing fails', async () => {
      const createUser =
        vi.fn<
          UserRepository[
            'createUser'
          ]
        >();

      const hashingFailure =
        new Error(
          'hashing unavailable',
        );

      const service =
        new UserService(
          createRepository(
            createUser,
          ),
          () =>
            Promise.reject(
              hashingFailure,
            ),
        );

      const input =
        registerRequestSchema.parse({
          email:
            'user@example.test',

          password:
            'correct horse battery staple',
        });

      await expect(
        service.register(
          input,
        ),
      ).rejects.toBe(
        hashingFailure,
      );

      expect(
        createUser,
      ).not.toHaveBeenCalled();
    });

    it('returns the explicit public DTO allowlist even if persistence returns extra secrets', async () => {
      const persistedUser = {
        id:
          'user-3',

        email:
          'user@example.test',

        displayName:
          null,

        role:
          'ADMIN' as const,

        createdAt,
        updatedAt,

        passwordHash:
          '$argon2id$must-not-leak',

        refreshTokenDigest:
          Buffer.alloc(
            32,
            7,
          ),

        authSessions: [
          {
            id:
              'session-1',
          },
        ],

        roles: [
          'admin',
        ],
      };

      const createUser = vi
        .fn<
          UserRepository[
            'createUser'
          ]
        >()
        .mockResolvedValue(
          persistedUser,
        );

      const service =
        new UserService(
          createRepository(
            createUser,
          ),
          () =>
            Promise.resolve(
              'safe-hash',
            ),
        );

      const input =
        registerRequestSchema.parse({
          email:
            'user@example.test',

          password:
            'correct horse battery staple',
        });

      const result =
        await service.register(
          input,
        );

      expect(
        result,
      ).toEqual({
        id:
          'user-3',

        email:
          'user@example.test',

        displayName:
          null,

        role:
          'ADMIN',

        createdAt:
          createdAt.toISOString(),

        updatedAt:
          updatedAt.toISOString(),
      });

      expect(
        result,
      ).not.toHaveProperty(
        'passwordHash',
      );

      expect(
        result,
      ).not.toHaveProperty(
        'refreshTokenDigest',
      );

      expect(
        result,
      ).not.toHaveProperty(
        'authSessions',
      );

      expect(
        result,
      ).not.toHaveProperty(
        'roles',
      );
    });
  },
);
