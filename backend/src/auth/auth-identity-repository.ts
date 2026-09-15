import {
  AuthProvider,
  Prisma,
  type PrismaClient,
} from '../generated/prisma/client.js';

export interface AuthIdentityRecord {
  readonly id: string;
  readonly userId: string;
  readonly provider: AuthProvider;
  readonly providerUserId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateAuthIdentityInput {
  readonly userId: string;
  readonly provider: AuthProvider;
  readonly providerUserId: string;
}

export interface AuthIdentityRepository {
  findByProviderIdentity(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<AuthIdentityRecord | null>;

  findByUserAndProvider(
    userId: string,
    provider: AuthProvider,
  ): Promise<AuthIdentityRecord | null>;

  createIdentity(
    input: CreateAuthIdentityInput,
  ): Promise<AuthIdentityRecord>;
}

export class ProviderIdentityAlreadyLinkedError
extends Error {
  public constructor() {
    super(
      'This provider identity is already linked',
    );
    this.name =
      'ProviderIdentityAlreadyLinkedError';
  }
}

export class UserProviderAlreadyLinkedError
extends Error {
  public constructor() {
    super(
      'This user already has an identity for this provider',
    );
    this.name =
      'UserProviderAlreadyLinkedError';
  }
}

const identitySelect = {
  id: true,
  userId: true,
  provider: true,
  providerUserId: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.AuthIdentitySelect;

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

function getUniqueViolationConstraint(
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
    !isRecord(driverAdapterError)
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

function mapIdentityUniqueViolation(
  error: unknown,
): Error | null {
  const constraint =
    getUniqueViolationConstraint(
      error,
    );

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
    return new ProviderIdentityAlreadyLinkedError();
  }

  if (
    matchesConstraint(
      constraint,
      [
        'userId',
        'provider',
      ],
      'auth_identities_user_id_provider_key',
    )
  ) {
    return new UserProviderAlreadyLinkedError();
  }

  return null;
}

export class PrismaAuthIdentityRepository
implements AuthIdentityRepository {
  public constructor(
    private readonly prisma:
      PrismaClient,
  ) {}

  public findByProviderIdentity(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<AuthIdentityRecord | null> {
    return this.prisma.authIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId,
        },
      },
      select:
        identitySelect,
    });
  }

  public findByUserAndProvider(
    userId: string,
    provider: AuthProvider,
  ): Promise<AuthIdentityRecord | null> {
    return this.prisma.authIdentity.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
      select:
        identitySelect,
    });
  }

  public async createIdentity(
    input: CreateAuthIdentityInput,
  ): Promise<AuthIdentityRecord> {
    try {
      return await this.prisma.authIdentity.create({
        data: input,
        select:
          identitySelect,
      });
    } catch (error) {
      const mapped =
        mapIdentityUniqueViolation(
          error,
        );

      if (
        mapped !== null
      ) {
        throw mapped;
      }

      throw error;
    }
  }
}

export {
  AuthProvider,
};
