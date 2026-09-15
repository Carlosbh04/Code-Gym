import {
  Prisma,
  type PrismaClient,
} from '../generated/prisma/client.js';

import type {
  PublicUserSource,
  UserRole,
} from './public-user.js';

export interface CreateUserRecord {
  readonly email: string;
  readonly passwordHash: string;
  readonly displayName: string | null;
}

export interface AuthUserRecord {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string | null;
  readonly displayName: string | null;
  readonly role: UserRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UserRepository {
  createUser(
    user: CreateUserRecord,
  ): Promise<PublicUserSource>;

  findUserByEmail(
    email: string,
  ): Promise<AuthUserRecord | null>;

  findUserById(
    userId: string,
  ): Promise<PublicUserSource | null>;

  updateDisplayName(
    userId: string,
    displayName: string,
  ): Promise<PublicUserSource | null>;
}

export class EmailAlreadyExistsError
extends Error {
  public constructor() {
    super(
      'An account with this email already exists',
    );

    this.name =
      'EmailAlreadyExistsError';
  }
}

const publicUserSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UserSelect;

const authUserSelect = {
  id: true,
  email: true,
  passwordHash: true,
  displayName: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UserSelect;

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === 'object'
    && value !== null
  );
}

function isEmailConstraint(
  value: unknown,
): boolean {
  if (
    typeof value === 'string'
  ) {
    return (
      value === 'email'
      || value
        === 'users_email_key'
    );
  }

  if (
    Array.isArray(value)
  ) {
    return value.some(
      (field) =>
        field === 'email',
    );
  }

  if (
    !isRecord(value)
  ) {
    return false;
  }

  return (
    isEmailConstraint(
      value.fields,
    )
    || value.index
      === 'users_email_key'
  );
}

function isEmailUniqueViolation(
  error: unknown,
): boolean {
  if (
    !(
      error
      instanceof Prisma.PrismaClientKnownRequestError
    )
    || error.code !== 'P2002'
  ) {
    return false;
  }

  const metadata =
    error.meta;

  if (
    !isRecord(metadata)
  ) {
    return false;
  }

  if (
    isEmailConstraint(
      metadata.target,
    )
    || isEmailConstraint(
      metadata.constraint,
    )
  ) {
    return true;
  }

  const driverAdapterError =
    metadata.driverAdapterError;

  if (
    !isRecord(
      driverAdapterError,
    )
  ) {
    return false;
  }

  const cause =
    driverAdapterError.cause;

  return (
    isRecord(cause)
    && cause.kind
      === 'UniqueConstraintViolation'
    && isEmailConstraint(
      cause.constraint,
    )
  );
}

export class PrismaUserRepository
implements UserRepository {
  public constructor(
    private readonly prisma:
      PrismaClient,
  ) {}

  public async createUser(
    user: CreateUserRecord,
  ): Promise<PublicUserSource> {
    try {
      return await this.prisma.user.create({
        data: user,
        select:
          publicUserSelect,
      });
    } catch (error) {
      if (
        isEmailUniqueViolation(
          error,
        )
      ) {
        throw new EmailAlreadyExistsError();
      }

      throw error;
    }
  }

  public async findUserByEmail(
    email: string,
  ): Promise<
    AuthUserRecord | null
  > {
    return this.prisma.user.findUnique({
      where: {
        email,
      },

      select:
        authUserSelect,
    });
  }

  public async findUserById(
    userId: string,
  ): Promise<
    PublicUserSource | null
  > {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },

      select:
        publicUserSelect,
    });
  }

  public async updateDisplayName(
    userId: string,
    displayName: string,
  ): Promise<PublicUserSource | null> {
    try {
      return await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          displayName,
        },
        select:
          publicUserSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2025'
      ) {
        return null;
      }

      throw error;
    }
  }
}
