import {
  AuthProvider,
  Prisma,
  type PrismaClient,
} from '../generated/prisma/client.js';

import {
  ProviderIdentityAlreadyLinkedError,
} from './auth-identity-repository.js';

import type {
  PublicUserSource,
} from './public-user.js';

import {
  EmailAlreadyExistsError,
} from './user-repository.js';

export interface CreateGoogleAccountInput {
  readonly email: string;
  readonly displayName: string | null;
  readonly providerUserId: string;
}

export interface GoogleAccountRepository {
  createGoogleAccount(
    input: CreateGoogleAccountInput,
  ): Promise<PublicUserSource>;
}

const publicUserSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UserSelect;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object'
    && value !== null
  );
}

function matchesConstraint(
  value: unknown,
  fields: readonly string[],
  indexName: string,
): boolean {
  if (
    typeof value === 'string'
  ) {
    return (
      value === indexName
      || fields.includes(value)
    );
  }

  if (
    Array.isArray(value)
  ) {
    return fields.every(
      (field) =>
        value.includes(field),
    );
  }

  if (
    !isRecord(value)
  ) {
    return false;
  }

  return (
    matchesConstraint(
      value.fields,
      fields,
      indexName,
    )
    || value.index === indexName
  );
}

function getUniqueConstraint(
  error: unknown,
): unknown {
  if (
    !(
      error
      instanceof Prisma.PrismaClientKnownRequestError
    )
    || error.code !== 'P2002'
  ) {
    return undefined;
  }

  const metadata =
    error.meta;

  if (
    !isRecord(metadata)
  ) {
    return undefined;
  }

  if (
    metadata.target !== undefined
  ) {
    return metadata.target;
  }

  if (
    metadata.constraint !== undefined
  ) {
    return metadata.constraint;
  }

  const driverAdapterError =
    metadata.driverAdapterError;

  if (
    !isRecord(
      driverAdapterError,
    )
  ) {
    return undefined;
  }

  const cause =
    driverAdapterError.cause;

  if (
    !isRecord(cause)
    || cause.kind
      !== 'UniqueConstraintViolation'
  ) {
    return undefined;
  }

  return cause.constraint;
}

export class PrismaGoogleAccountRepository
implements GoogleAccountRepository {
  public constructor(
    private readonly prisma:
      PrismaClient,
  ) {}

  public async createGoogleAccount(
    input: CreateGoogleAccountInput,
  ): Promise<PublicUserSource> {
    try {
      return await this.prisma.user.create({
        data: {
          email:
            input.email,
          passwordHash:
            null,
          displayName:
            input.displayName,
          authIdentities: {
            create: {
              provider:
                AuthProvider.GOOGLE,
              providerUserId:
                input.providerUserId,
            },
          },
        },
        select:
          publicUserSelect,
      });
    } catch (error) {
      const constraint =
        getUniqueConstraint(
          error,
        );

      if (
        matchesConstraint(
          constraint,
          ['email'],
          'users_email_key',
        )
      ) {
        throw new EmailAlreadyExistsError();
      }

      if (
        matchesConstraint(
          constraint,
          [
            'provider',
            'providerUserId',
          ],
          'auth_identities_provider_provider_user_id_key',
        )
      ) {
        throw new ProviderIdentityAlreadyLinkedError();
      }

      throw error;
    }
  }
}
