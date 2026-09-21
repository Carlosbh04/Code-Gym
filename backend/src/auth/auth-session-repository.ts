import type {
  PrismaClient,
} from '../generated/prisma/client.js';

import {
  AccountCooldownError,
  AccountLockedError,
  StalePasswordCredentialError,
} from './account-security-errors.js';

export interface CreateAuthSessionRecord {
  readonly userId: string;
  readonly refreshTokenDigest: Uint8Array;
  readonly expiresAt: Date;
  readonly remembered: boolean;

  /**
   * Present only for password authentication.
   *
   * The repository compares this snapshot while holding
   * the User row lock. If password reset changed the hash
   * after verification, session creation fails closed.
   */
  readonly expectedPasswordHash?: string;
}

export interface RotateAuthSessionRecord {
  readonly sessionId: string;
  readonly currentRefreshTokenDigest: Uint8Array;
  readonly nextRefreshTokenDigest: Uint8Array;
  readonly rotatedAt: Date;
  readonly expiresAt: Date;
}

export interface TouchAuthSessionActivityInput {
  readonly sessionId: string;
  readonly userId: string;
  readonly occurredAt: Date;
  readonly idleCutoff: Date;
}

export interface RevokeAuthSessionByRefreshTokenDigestInput {
  readonly digest: Uint8Array;
  readonly revokedAt: Date;
}

export interface RevokeAuthSessionByIdInput {
  readonly sessionId: string;
  readonly userId: string;
  readonly revokedAt: Date;
}

export interface RevokeOtherAuthSessionsInput {
  readonly userId: string;
  readonly currentSessionId: string;
  readonly revokedAt: Date;
}

export interface AuthSessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly refreshTokenDigest: Uint8Array;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly remembered: boolean;
  readonly lastActivityAt: Date;
  readonly rotatedAt: Date | null;
  readonly revokedAt: Date | null;
}

export interface AuthSessionAuthenticationRecord {
  readonly userId: string;
  readonly expiresAt: Date;
  readonly lastActivityAt: Date;
  readonly revokedAt: Date | null;
}

export interface AuthSessionPublicRecord {
  readonly id: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly rotatedAt: Date | null;
  readonly revokedAt: Date | null;
}

export interface AuthSessionRepository {
  createSession(
    session: CreateAuthSessionRecord,
  ): Promise<AuthSessionRecord>;

  findSessionByRefreshTokenDigest(
    refreshTokenDigest: Uint8Array,
  ): Promise<AuthSessionRecord | null>;

  findSessionById(
    sessionId: string,
  ): Promise<AuthSessionAuthenticationRecord | null>;

  findSessionsByUserId(
    userId: string,
  ): Promise<readonly AuthSessionPublicRecord[]>;

  rotateSession(
    session: RotateAuthSessionRecord,
  ): Promise<AuthSessionRecord | null>;
  touchSessionActivity(
    input: TouchAuthSessionActivityInput,
  ): Promise<boolean>;

  revokeSessionByRefreshTokenDigest(
    input: RevokeAuthSessionByRefreshTokenDigestInput,
  ): Promise<void>;

  revokeSessionById(
    input: RevokeAuthSessionByIdInput,
  ): Promise<boolean>;

  revokeOtherSessions(
    input: RevokeOtherAuthSessionsInput,
  ): Promise<number>;
}

const authSessionSelect = {
  id: true,
  userId: true,
  refreshTokenDigest: true,
  createdAt: true,
  expiresAt: true,
  remembered: true,
  lastActivityAt: true,
  rotatedAt: true,
  revokedAt: true,
} as const;

const authSessionAuthenticationSelect = {
  userId: true,
  expiresAt: true,
  lastActivityAt: true,
  revokedAt: true,
} as const;

const authSessionPublicSelect = {
  id: true,
  createdAt: true,
  expiresAt: true,
  rotatedAt: true,
  revokedAt: true,
} as const;

export class PrismaAuthSessionRepository
implements AuthSessionRepository {
  public constructor(
    private readonly prisma:
      PrismaClient,
  ) {}

  public async createSession(
    session: CreateAuthSessionRecord,
  ): Promise<AuthSessionRecord> {
    return this.prisma.$transaction(
      async (transaction) => {
        const rows =
          await transaction.$queryRaw<
            Array<{
              passwordHash: string | null;
              securityLockedAt: Date | null;
              loginCooldownUntil: Date | null;
            }>
          >`
            SELECT
              password_hash AS passwordHash,
              security_locked_at AS securityLockedAt,
              login_cooldown_until AS loginCooldownUntil
            FROM users
            WHERE id = ${session.userId}
            FOR UPDATE
          `;

        const securityState =
          rows[0];

        if (securityState === undefined) {
          throw new StalePasswordCredentialError();
        }

        /*
         * Password login verified a particular hash before
         * arriving here. Password reset can change that hash
         * concurrently.
         *
         * Because User is locked FOR UPDATE here, this comparison
         * and the session INSERT are atomic relative to password
         * reset and account-security transitions.
         */
        if (
          session.expectedPasswordHash !== undefined
          && securityState.passwordHash
            !== session.expectedPasswordHash
        ) {
          throw new StalePasswordCredentialError();
        }

        if (
          securityState.securityLockedAt
            !== null
        ) {
          throw new AccountLockedError();
        }

        const now =
          new Date();

        if (
          securityState.loginCooldownUntil
            !== null
          && securityState
            .loginCooldownUntil
            .getTime()
            > now.getTime()
        ) {
          throw new AccountCooldownError(
            securityState
              .loginCooldownUntil,
          );
        }

        /*
         * Cualquier autenticación válida limpia los fallos
         * anteriores. Si había un cooldown ya vencido,
         * también queda rehabilitado aquí.
         *
         * La fila User sigue bloqueada con FOR UPDATE,
         * por lo que la limpieza y la creación de sesión
         * forman una única sección crítica.
         */
        await transaction.user.update({
          where: {
            id:
              session.userId,
          },

          data: {
            failedLoginAttempts:
              0,

            loginCooldownUntil:
              null,
          },
        });

        return transaction.authSession.create({
          data: {
            userId:
              session.userId,

            refreshTokenDigest:
              new Uint8Array(
                session.refreshTokenDigest,
              ),

            expiresAt:
              session.expiresAt,

            remembered:
              session.remembered,
          },

          select:
            authSessionSelect,
        });
      },
    );
  }

  public async findSessionByRefreshTokenDigest(
    refreshTokenDigest: Uint8Array,
  ): Promise<AuthSessionRecord | null> {
    return this.prisma.authSession.findUnique({
      where: {
        refreshTokenDigest:
          new Uint8Array(
            refreshTokenDigest,
          ),
      },

      select:
        authSessionSelect,
    });
  }

  public async findSessionById(
    sessionId: string,
  ): Promise<
    AuthSessionAuthenticationRecord | null
  > {
    return this.prisma.authSession.findUnique({
      where: {
        id:
          sessionId,
      },

      select:
        authSessionAuthenticationSelect,
    });
  }

  public async findSessionsByUserId(
    userId: string,
  ): Promise<
    readonly AuthSessionPublicRecord[]
  > {
    return this.prisma.authSession.findMany({
      where: {
        userId,
      },

      orderBy: {
        createdAt:
          'desc',
      },

      select:
        authSessionPublicSelect,
    });
  }

  public async rotateSession(
    session: RotateAuthSessionRecord,
  ): Promise<AuthSessionRecord | null> {
    const result =
      await this.prisma.authSession.updateMany({
        where: {
          id:
            session.sessionId,

          refreshTokenDigest:
            new Uint8Array(
              session
                .currentRefreshTokenDigest,
            ),

          revokedAt:
            null,

          expiresAt: {
            gt:
              session.rotatedAt,
          },
        },

        data: {
          refreshTokenDigest:
            new Uint8Array(
              session
                .nextRefreshTokenDigest,
            ),

          rotatedAt:
            session.rotatedAt,

          expiresAt:
            session.expiresAt,
        },
      });

    if (
      result.count !== 1
    ) {
      return null;
    }

    return this.prisma.authSession.findUnique({
      where: {
        id:
          session.sessionId,
      },

      select:
        authSessionSelect,
    });
  }

  public async touchSessionActivity(
    input: TouchAuthSessionActivityInput,
  ): Promise<boolean> {
    const result =
      await this.prisma.authSession.updateMany({
        where: {
          id:
            input.sessionId,
          userId:
            input.userId,
          revokedAt:
            null,
          expiresAt: {
            gt:
              input.occurredAt,
          },
          lastActivityAt: {
            gt:
              input.idleCutoff,
          },
        },
        data: {
          lastActivityAt:
            input.occurredAt,
        },
      });

    return result.count === 1;
  }

  public async revokeSessionByRefreshTokenDigest(
    input:
      RevokeAuthSessionByRefreshTokenDigestInput,
  ): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: {
        refreshTokenDigest:
          new Uint8Array(
            input.digest,
          ),

        revokedAt:
          null,
      },

      data: {
        revokedAt:
          input.revokedAt,
      },
    });
  }

  public async revokeSessionById(
    input:
      RevokeAuthSessionByIdInput,
  ): Promise<boolean> {
    const result =
      await this.prisma.authSession.updateMany({
        where: {
          id:
            input.sessionId,

          userId:
            input.userId,

          revokedAt:
            null,
        },

        data: {
          revokedAt:
            input.revokedAt,
        },
      });

    return (
      result.count === 1
    );
  }

  public async revokeOtherSessions(
    input:
      RevokeOtherAuthSessionsInput,
  ): Promise<number> {
    const result =
      await this.prisma.authSession.updateMany({
        where: {
          userId:
            input.userId,

          id: {
            not:
              input.currentSessionId,
          },

          revokedAt:
            null,
        },

        data: {
          revokedAt:
            input.revokedAt,
        },
      });

    return result.count;
  }
}
