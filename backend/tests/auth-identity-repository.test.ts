import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  Prisma,
  type PrismaClient,
} from '../src/generated/prisma/client.js';

import {
  AuthProvider,
  PrismaAuthIdentityRepository,
  ProviderIdentityAlreadyLinkedError,
  UserProviderAlreadyLinkedError,
} from '../src/auth/auth-identity-repository.js';

const persisted = {
  id: 'identity-1',
  userId: 'user-1',
  provider:
    AuthProvider.GOOGLE,
  providerUserId:
    'google-user-123',
  createdAt:
    new Date(
      '2026-09-15T08:00:00.000Z',
    ),
  updatedAt:
    new Date(
      '2026-09-15T08:00:00.000Z',
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
      clientVersion:
        '7.10.0',
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

function repositoryWithAuthIdentity(
  authIdentity: {
    findUnique?: ReturnType<typeof vi.fn>;
    create?: ReturnType<typeof vi.fn>;
  },
): PrismaAuthIdentityRepository {
  return new PrismaAuthIdentityRepository(
    {
      authIdentity,
    } as unknown as PrismaClient,
  );
}

describe(
  'Prisma auth identity repository',
  () => {
    it('finds an identity by provider and provider user id using the compound unique key', async () => {
      const findUnique =
        vi
          .fn()
          .mockResolvedValue(
            persisted,
          );

      const repository =
        repositoryWithAuthIdentity({
          findUnique,
        });

      await expect(
        repository.findByProviderIdentity(
          AuthProvider.GOOGLE,
          'google-user-123',
        ),
      ).resolves.toEqual(
        persisted,
      );

      expect(
        findUnique,
      ).toHaveBeenCalledWith({
        where: {
          provider_providerUserId: {
            provider:
              AuthProvider.GOOGLE,
            providerUserId:
              'google-user-123',
          },
        },
        select: {
          id: true,
          userId: true,
          provider: true,
          providerUserId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('finds an identity by user and provider using the compound unique key', async () => {
      const findUnique =
        vi
          .fn()
          .mockResolvedValue(
            persisted,
          );

      const repository =
        repositoryWithAuthIdentity({
          findUnique,
        });

      await expect(
        repository.findByUserAndProvider(
          'user-1',
          AuthProvider.GOOGLE,
        ),
      ).resolves.toEqual(
        persisted,
      );

      expect(
        findUnique,
      ).toHaveBeenCalledWith({
        where: {
          userId_provider: {
            userId:
              'user-1',
            provider:
              AuthProvider.GOOGLE,
          },
        },
        select: {
          id: true,
          userId: true,
          provider: true,
          providerUserId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('creates an identity with an explicit field select', async () => {
      const create =
        vi
          .fn()
          .mockResolvedValue(
            persisted,
          );

      const repository =
        repositoryWithAuthIdentity({
          create,
        });

      const input = {
        userId:
          'user-1',
        provider:
          AuthProvider.GOOGLE,
        providerUserId:
          'google-user-123',
      };

      await expect(
        repository.createIdentity(
          input,
        ),
      ).resolves.toEqual(
        persisted,
      );

      expect(
        create,
      ).toHaveBeenCalledWith({
        data:
          input,
        select: {
          id: true,
          userId: true,
          provider: true,
          providerUserId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it.each([
      {
        target: [
          'provider',
          'providerUserId',
        ],
      },
      {
        constraint:
          'auth_identities_provider_provider_user_id_key',
      },
      {
        constraint: {
          fields: [
            'provider',
            'providerUserId',
          ],
        },
      },
      {
        driverAdapterError: {
          cause: {
            kind:
              'UniqueConstraintViolation',
            constraint: {
              index:
                'auth_identities_provider_provider_user_id_key',
            },
          },
        },
      },
    ])(
      'maps provider identity P2002 to ProviderIdentityAlreadyLinkedError: %j',
      async (meta) => {
        const repository =
          repositoryWithAuthIdentity({
            create:
              vi
                .fn()
                .mockRejectedValue(
                  knownRequestError(
                    'P2002',
                    meta,
                  ),
                ),
          });

        await expect(
          repository.createIdentity({
            userId:
              'user-1',
            provider:
              AuthProvider.GOOGLE,
            providerUserId:
              'google-user-123',
          }),
        ).rejects.toEqual(
          new ProviderIdentityAlreadyLinkedError(),
        );
      },
    );

    it.each([
      {
        target: [
          'userId',
          'provider',
        ],
      },
      {
        constraint:
          'auth_identities_user_id_provider_key',
      },
      {
        constraint: {
          fields: [
            'userId',
            'provider',
          ],
        },
      },
      {
        driverAdapterError: {
          cause: {
            kind:
              'UniqueConstraintViolation',
            constraint: {
              index:
                'auth_identities_user_id_provider_key',
            },
          },
        },
      },
    ])(
      'maps user-provider P2002 to UserProviderAlreadyLinkedError: %j',
      async (meta) => {
        const repository =
          repositoryWithAuthIdentity({
            create:
              vi
                .fn()
                .mockRejectedValue(
                  knownRequestError(
                    'P2002',
                    meta,
                  ),
                ),
          });

        await expect(
          repository.createIdentity({
            userId:
              'user-1',
            provider:
              AuthProvider.GOOGLE,
            providerUserId:
              'google-user-123',
          }),
        ).rejects.toEqual(
          new UserProviderAlreadyLinkedError(),
        );
      },
    );

    it.each([
      knownRequestError(
        'P2002',
        {
          target: [
            'unrelated',
          ],
        },
      ),
      knownRequestError(
        'P2024',
        {
          target: [
            'provider',
            'providerUserId',
          ],
        },
      ),
      new Error(
        'database unavailable',
      ),
    ])(
      'rethrows unrelated persistence failures unchanged',
      async (failure) => {
        const repository =
          repositoryWithAuthIdentity({
            create:
              vi
                .fn()
                .mockRejectedValue(
                  failure,
                ),
          });

        await expect(
          repository.createIdentity({
            userId:
              'user-1',
            provider:
              AuthProvider.GOOGLE,
            providerUserId:
              'google-user-123',
          }),
        ).rejects.toBe(
          failure,
        );
      },
    );
  },
);
