import {
  SecurityLockReason,
  SecurityOutboxEventType,
  type PrismaClient,
} from '../generated/prisma/client.js';

import {
  LOGIN_FAILURE_THRESHOLD,
  LOGIN_SECURITY_COOLDOWN_MS,
} from './login-security-policy.js';

export type FailedPasswordAttemptResult =
  | 'FAILED'
  | 'COOLDOWN'
  | 'LOCKED'
  | 'STALE';

export interface RecordFailedPasswordAttemptInput {
  readonly userId: string;
  readonly occurredAt: Date;

  /**
   * Hash against which the failed password was actually
   * verified. If password reset changed it before this
   * transaction locks User, the stale failure is ignored.
   */
  readonly expectedPasswordHash?: string;
}

export interface AccountSecurityRepository {
  recordFailedPasswordAttempt(
    input: RecordFailedPasswordAttemptInput,
  ): Promise<FailedPasswordAttemptResult>;
}

interface LockedUserSecurityRow {
  readonly id: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly passwordHash: string | null;
  readonly failedLoginAttempts: number;
  readonly loginCooldownUntil: Date | null;
  readonly securityLockedAt: Date | null;
  readonly securityLockVersion: number | bigint;
}

export class PrismaAccountSecurityRepository
implements AccountSecurityRepository {
  public constructor(
    private readonly prisma: PrismaClient,
  ) {}

  public recordFailedPasswordAttempt(
    input: RecordFailedPasswordAttemptInput,
  ): Promise<FailedPasswordAttemptResult> {
    return this.prisma.$transaction(
      async (transaction) => {
        /*
         * Serializa todas las transiciones de seguridad
         * correspondientes a este usuario.
         *
         * No dependemos de Redis para la autoridad del
         * estado de la cuenta.
         */
        const rows =
          await transaction.$queryRaw<
            LockedUserSecurityRow[]
          >`
            SELECT
              id,
              email,
              display_name AS displayName,
              password_hash AS passwordHash,
              failed_login_attempts AS failedLoginAttempts,
              login_cooldown_until AS loginCooldownUntil,
              security_locked_at AS securityLockedAt,
              security_lock_version AS securityLockVersion
            FROM users
            WHERE id = ${input.userId}
            FOR UPDATE
          `;

        const user = rows[0];

        if (user === undefined) {
          /*
           * El usuario desapareció entre la lectura de
           * credenciales y esta transacción.
           *
           * No creamos ningún estado huérfano.
           */
          return 'STALE';
        }

        if (
          input.expectedPasswordHash !== undefined
          && user.passwordHash
            !== input.expectedPasswordHash
        ) {
          /*
           * El fallo se calculó contra una contraseña que
           * ya fue reemplazada. No penalizamos el nuevo
           * estado de credenciales.
           */
          return 'STALE';
        }

        if (user.securityLockedAt !== null) {
          return 'LOCKED';
        }

        const cooldownUntil =
          user.loginCooldownUntil;

        if (
          cooldownUntil !== null
          && cooldownUntil.getTime()
            > input.occurredAt.getTime()
        ) {
          /*
           * Durante el cooldown no aumentamos el contador.
           * Redis puede cortar antes la petición, pero MySQL
           * sigue siendo la autoridad si cambia la IP o Redis
           * desaparece.
           */
          return 'COOLDOWN';
        }

        if (
          cooldownUntil !== null
          && cooldownUntil.getTime()
            <= input.occurredAt.getTime()
          && user.failedLoginAttempts
            >= LOGIN_FAILURE_THRESHOLD
        ) {
          const currentLockVersion =
            Number(
              user.securityLockVersion,
            );

          if (
            !Number.isSafeInteger(
              currentLockVersion,
            )
            || currentLockVersion < 0
          ) {
            throw new Error(
              'Invalid security lock version',
            );
          }

          const nextLockVersion =
            currentLockVersion + 1;

          /*
           * Esta transición, la revocación y el outbox
           * pertenecen a la misma transacción.
           */
          await transaction.user.update({
            where: {
              id: user.id,
            },

            data: {
              failedLoginAttempts: 0,
              loginCooldownUntil: null,
              securityLockedAt:
                input.occurredAt,
              securityLockReason:
                SecurityLockReason
                  .LOGIN_FAILURE_ESCALATION,
              securityLockVersion:
                nextLockVersion,
            },
          });

          await transaction.authSession.updateMany({
            where: {
              userId: user.id,
              revokedAt: null,
            },

            data: {
              revokedAt:
                input.occurredAt,
            },
          });

          await transaction.securityOutboxEvent.create({
            data: {
              userId:
                user.id,

              type:
                SecurityOutboxEventType
                  .ACCOUNT_LOCKED,

              lockVersion:
                nextLockVersion,

              recipientEmail:
                user.email,

              recipientDisplayName:
                user.displayName,
            },
          });

          return 'LOCKED';
        }

        const nextFailureCount =
          user.failedLoginAttempts + 1;

        if (
          nextFailureCount
          >= LOGIN_FAILURE_THRESHOLD
        ) {
          await transaction.user.update({
            where: {
              id: user.id,
            },

            data: {
              failedLoginAttempts:
                LOGIN_FAILURE_THRESHOLD,

              loginCooldownUntil:
                new Date(
                  input.occurredAt.getTime()
                    + LOGIN_SECURITY_COOLDOWN_MS,
                ),
            },
          });

          return 'COOLDOWN';
        }

        await transaction.user.update({
          where: {
            id: user.id,
          },

          data: {
            failedLoginAttempts:
              nextFailureCount,

            loginCooldownUntil:
              null,
          },
        });

        return 'FAILED';
      },
    );
  }
}
