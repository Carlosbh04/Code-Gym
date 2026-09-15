import { describe, expect, it, vi } from 'vitest';

import {
  Prisma,
  type PrismaClient,
} from '../src/generated/prisma/client.js';
import {
  EmailAlreadyExistsError,
  PrismaUserRepository,
  type CreateUserRecord,
} from '../src/auth/user-repository.js';

const record: CreateUserRecord = {
  email: 'user@example.test',
  passwordHash: '$argon2id$test-hash',
  displayName: null,
};

const persisted = {
  id: 'user-1',
  email: record.email,
  displayName: null,
  role: 'USER' as const,
  createdAt: new Date(
    '2026-09-10T10:00:00.000Z',
  ),
  updatedAt: new Date(
    '2026-09-10T10:00:00.000Z',
  ),
};

function knownRequestError(
  code: string,
  meta?: Record<string, unknown>,
) {
  return new Prisma.PrismaClientKnownRequestError(
    'private Prisma detail',
    {
      code,
      clientVersion: '7.10.0',
      ...(
        meta === undefined
          ? {}
          : {
              meta,
            }
      ),
    },
  );
}

function repositoryWithCreate(
  create: ReturnType<typeof vi.fn>,
): PrismaUserRepository {
  return new PrismaUserRepository(
    {
      user: {
        create,
      },
    } as unknown as PrismaClient,
  );
}

function repositoryWithUpdate(
  update: ReturnType<typeof vi.fn>,
): PrismaUserRepository {
  return new PrismaUserRepository(
    {
      user: {
        update,
      },
    } as unknown as PrismaClient,
  );
}

describe(
  'Prisma user repository',
  () => {
    it('updates only displayName by user id with the public-field select', async () => {
      const updated = {
        ...persisted,
        displayName:
          'Carlos Hernández',
      };
      const update = vi
        .fn()
        .mockResolvedValue(
          updated,
        );
      const repository =
        repositoryWithUpdate(
          update,
        );

      await expect(
        repository.updateDisplayName(
          'user-1',
          'Carlos Hernández',
        ),
      ).resolves.toEqual(
        updated,
      );

      expect(
        update,
      ).toHaveBeenCalledWith({
        where: {
          id:
            'user-1',
        },
        data: {
          displayName:
            'Carlos Hernández',
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('maps a missing update target to null and rethrows other failures', async () => {
      const missingUpdate = vi
        .fn()
        .mockRejectedValue(
          knownRequestError(
            'P2025',
          ),
        );
      const repository =
        repositoryWithUpdate(
          missingUpdate,
        );

      await expect(
        repository.updateDisplayName(
          'missing-user',
          'Ada',
        ),
      ).resolves.toBeNull();

      const persistenceFailure =
        new Error(
          'database unavailable',
        );
      const failedRepository =
        repositoryWithUpdate(
          vi
            .fn()
            .mockRejectedValue(
              persistenceFailure,
            ),
        );

      await expect(
        failedRepository.updateDisplayName(
          'user-1',
          'Ada',
        ),
      ).rejects.toBe(
        persistenceFailure,
      );
    });

    it('creates one user with an explicit public-field select', async () => {
      const create =
        vi
          .fn()
          .mockResolvedValue(
            persisted,
          );

      const repository =
        repositoryWithCreate(
          create,
        );

      await expect(
        repository.createUser(
          record,
        ),
      ).resolves.toEqual(
        persisted,
      );

      expect(
        create,
      ).toHaveBeenCalledWith({
        data: record,

        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const createArguments =
        create.mock.calls[
          0
        ]?.[0] as {
          select:
            Record<
              string,
              unknown
            >;
        };

      expect(
        createArguments.select,
      ).not.toHaveProperty(
        'passwordHash',
      );

      expect(
        create.mock.calls[
          0
        ]?.[0],
      ).not.toHaveProperty(
        'include',
      );
    });

    it.each([
      {
        target:
          'email',
      },

      {
        target: [
          'email',
        ],
      },

      {
        constraint:
          'users_email_key',
      },

      {
        constraint: {
          fields: [
            'email',
          ],
        },
      },

      {
        constraint: {
          index:
            'users_email_key',
        },
      },

      {
        driverAdapterError: {
          cause: {
            kind:
              'UniqueConstraintViolation',

            constraint: {
              index:
                'users_email_key',
            },

            table:
              'users',

            originalCode:
              1062,

            originalMessage:
              "Duplicate entry for key 'users.users_email_key'",
          },
        },
      },
    ])(
      'maps an email P2002 shape to the domain conflict error: %j',
      async (
        meta,
      ) => {
        const create =
          vi
            .fn()
            .mockRejectedValue(
              knownRequestError(
                'P2002',
                meta,
              ),
            );

        const repository =
          repositoryWithCreate(
            create,
          );

        await expect(
          repository.createUser(
            record,
          ),
        ).rejects.toEqual(
          new EmailAlreadyExistsError(),
        );
      },
    );

    it.each([
      knownRequestError(
        'P2002',
        {
          target: [
            'displayName',
          ],
        },
      ),

      knownRequestError(
        'P2002',
        {
          constraint: {
            index:
              'another_unique_key',
          },
        },
      ),

      knownRequestError(
        'P2002',
      ),

      knownRequestError(
        'P2024',
        {
          target: [
            'email',
          ],
        },
      ),

      new Error(
        'connection unavailable',
      ),
    ])(
      'rethrows unrelated persistence failures unchanged',
      async (
        failure,
      ) => {
        const create =
          vi
            .fn()
            .mockRejectedValue(
              failure,
            );

        const repository =
          repositoryWithCreate(
            create,
          );

        await expect(
          repository.createUser(
            record,
          ),
        ).rejects.toBe(
          failure,
        );
      },
    );
  },
);
