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
  ProviderIdentityAlreadyLinkedError,
} from '../src/auth/auth-identity-repository.js';

import {
  PrismaGoogleAccountRepository,
} from '../src/auth/google-account-repository.js';

import {
  EmailAlreadyExistsError,
} from '../src/auth/user-repository.js';

const input = {
  email:
    'google@example.test',
  displayName:
    'Google User',
  providerUserId:
    'google-sub-123',
};

const persisted = {
  id:
    'user-google-1',
  email:
    input.email,
  displayName:
    input.displayName,
  role:
    'USER' as const,
  createdAt:
    new Date(
      '2026-09-15T08:30:00.000Z',
    ),
  updatedAt:
    new Date(
      '2026-09-15T08:30:00.000Z',
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

function repositoryWithCreate(
  create: ReturnType<typeof vi.fn>,
): PrismaGoogleAccountRepository {
  return new PrismaGoogleAccountRepository(
    {
      user: {
        create,
      },
    } as unknown as PrismaClient,
  );
}

describe(
  'Prisma Google account repository',
  () => {
    it('creates the local user and Google identity atomically with a null password', async () => {
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
        repository
          .createGoogleAccount(
            input,
          ),
      ).resolves.toEqual(
        persisted,
      );

      expect(
        create,
      ).toHaveBeenCalledWith({
        data: {
          email:
            'google@example.test',
          passwordHash:
            null,
          displayName:
            'Google User',
          authIdentities: {
            create: {
              provider:
                'GOOGLE',
              providerUserId:
                'google-sub-123',
            },
          },
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

      const argumentsUsed =
        create.mock.calls[0]?.[0] as {
          select:
            Record<string, unknown>;
        };

      expect(
        argumentsUsed.select,
      ).not.toHaveProperty(
        'passwordHash',
      );
    });

    it.each([
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
        driverAdapterError: {
          cause: {
            kind:
              'UniqueConstraintViolation',
            constraint: {
              index:
                'users_email_key',
            },
          },
        },
      },
    ])(
      'maps an email collision to EmailAlreadyExistsError: %j',
      async (meta) => {
        const repository =
          repositoryWithCreate(
            vi
              .fn()
              .mockRejectedValue(
                knownRequestError(
                  'P2002',
                  meta,
                ),
              ),
          );

        await expect(
          repository
            .createGoogleAccount(
              input,
            ),
        ).rejects.toEqual(
          new EmailAlreadyExistsError(),
        );
      },
    );

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
      'maps an existing Google identity to ProviderIdentityAlreadyLinkedError: %j',
      async (meta) => {
        const repository =
          repositoryWithCreate(
            vi
              .fn()
              .mockRejectedValue(
                knownRequestError(
                  'P2002',
                  meta,
                ),
              ),
          );

        await expect(
          repository
            .createGoogleAccount(
              input,
            ),
        ).rejects.toEqual(
          new ProviderIdentityAlreadyLinkedError(),
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
      ),
      new Error(
        'database unavailable',
      ),
    ])(
      'rethrows unrelated persistence failures unchanged',
      async (failure) => {
        const repository =
          repositoryWithCreate(
            vi
              .fn()
              .mockRejectedValue(
                failure,
              ),
          );

        await expect(
          repository
            .createGoogleAccount(
              input,
            ),
        ).rejects.toBe(
          failure,
        );
      },
    );
  },
);
