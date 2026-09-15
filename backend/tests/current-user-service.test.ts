import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  AuthenticatedUserNotFoundError,
  CurrentUserService,
} from '../src/auth/current-user-service.js';
import type { UserRepository } from '../src/auth/user-repository.js';

const createdAt =
  new Date(
    '2026-09-10T10:00:00.000Z',
  );

const updatedAt =
  new Date(
    '2026-09-10T10:01:00.000Z',
  );

function createRepository(
  findUserById:
    UserRepository['findUserById'],
): Pick<
  UserRepository,
  'findUserById'
> {
  return {
    findUserById,
  };
}

describe(
  'current user service',
  () => {
    it('returns the explicit public user DTO for the authenticated user', async () => {
      const findUserById = vi
        .fn<
          UserRepository[
            'findUserById'
          ]
        >()
        .mockResolvedValue({
          id: 'user-1',

          email:
            'person@example.test',

          displayName:
            'Ada',

          role:
            'USER',

          createdAt,
          updatedAt,
        });

      const service =
        new CurrentUserService(
          createRepository(
            findUserById,
          ),
        );

      const result =
        await service.getCurrentUser(
          'user-1',
        );

      expect(
        findUserById,
      ).toHaveBeenCalledOnce();

      expect(
        findUserById,
      ).toHaveBeenCalledWith(
        'user-1',
      );

      expect(
        result,
      ).toEqual({
        id: 'user-1',

        email:
          'person@example.test',

        displayName:
          'Ada',

        role:
          'USER',

        createdAt:
          createdAt.toISOString(),

        updatedAt:
          updatedAt.toISOString(),
      });
    });

    it('throws AuthenticatedUserNotFoundError when the authenticated user no longer exists', async () => {
      const findUserById = vi
        .fn<
          UserRepository[
            'findUserById'
          ]
        >()
        .mockResolvedValue(
          null,
        );

      const service =
        new CurrentUserService(
          createRepository(
            findUserById,
          ),
        );

      await expect(
        service.getCurrentUser(
          'missing-user',
        ),
      ).rejects.toBeInstanceOf(
        AuthenticatedUserNotFoundError,
      );

      expect(
        findUserById,
      ).toHaveBeenCalledWith(
        'missing-user',
      );
    });

    it('returns the public role but excludes sensitive persistence fields', async () => {
      const persistedUser = {
        id: 'user-2',

        email:
          'person@example.test',

        displayName:
          null,

        role:
          'ADMIN' as const,

        createdAt,
        updatedAt,

        passwordHash:
          '$argon2id$must-not-leak',

        refreshTokenDigest:
          Buffer.alloc(32, 9),

        authSessions: [
          {
            id:
              'session-secret',
          },
        ],
      };

      const findUserById = vi
        .fn<
          UserRepository[
            'findUserById'
          ]
        >()
        .mockResolvedValue(
          persistedUser,
        );

      const service =
        new CurrentUserService(
          createRepository(
            findUserById,
          ),
        );

      const result =
        await service.getCurrentUser(
          'user-2',
        );

      expect(
        result,
      ).toEqual({
        id: 'user-2',

        email:
          'person@example.test',

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
        JSON.stringify(
          result,
        ),
      ).not.toContain(
        'must-not-leak',
      );

      expect(
        JSON.stringify(
          result,
        ),
      ).not.toContain(
        'session-secret',
      );
    });

    it('propagates repository failures without converting them into a fake not-found result', async () => {
      const repositoryFailure =
        new Error(
          'database unavailable',
        );

      const findUserById = vi
        .fn<
          UserRepository[
            'findUserById'
          ]
        >()
        .mockRejectedValue(
          repositoryFailure,
        );

      const service =
        new CurrentUserService(
          createRepository(
            findUserById,
          ),
        );

      await expect(
        service.getCurrentUser(
          'user-3',
        ),
      ).rejects.toBe(
        repositoryFailure,
      );
    });
  },
);