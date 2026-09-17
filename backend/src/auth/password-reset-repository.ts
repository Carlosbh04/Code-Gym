import type {
  PrismaClient,
} from '../generated/prisma/client.js';

export interface PasswordResetChallengeRecord {
  readonly userId: string;
  readonly challengeNonce: Uint8Array;
  readonly codeDigest: Uint8Array;
  readonly codeExpiresAt: Date;
  readonly attemptCount: number;
  readonly verifiedAt: Date | null;
  readonly resetTokenDigest: Uint8Array | null;
  readonly resetTokenExpiresAt: Date | null;
  readonly usedAt: Date | null;
}

export interface ReplacePasswordResetChallengeInput {
  readonly userId: string;
  readonly challengeNonce: Uint8Array;
  readonly codeDigest: Uint8Array;
  readonly codeExpiresAt: Date;
  readonly createdAt: Date;
}

export interface PasswordResetChallengeMutationInput {
  readonly userId: string;
  readonly challengeNonce: Uint8Array;
  readonly now: Date;
  readonly maximumAttempts: number;
}

export interface VerifyPasswordResetChallengeInput
extends PasswordResetChallengeMutationInput {
  readonly codeDigest: Uint8Array;
  readonly resetTokenDigest: Uint8Array;
  readonly resetTokenExpiresAt: Date;
}

export interface ResetAuthorizationRecord {
  readonly userId: string;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
  readonly verifiedAt: Date | null;
}

export interface ConsumeResetAuthorizationInput {
  readonly userId: string;
  readonly resetTokenDigest: Uint8Array;
  readonly newPasswordHash: string;
  readonly now: Date;
}

export interface PasswordResetRepository {
  replaceChallenge(
    input: ReplacePasswordResetChallengeInput,
  ): Promise<void>;

  findChallengeByEmail(
    email: string,
  ): Promise<PasswordResetChallengeRecord | null>;

  incrementFailedAttempt(
    input: PasswordResetChallengeMutationInput,
  ): Promise<boolean>;

  verifyChallenge(
    input: VerifyPasswordResetChallengeInput,
  ): Promise<boolean>;

  invalidateChallenge(
    input: Pick<PasswordResetChallengeMutationInput, 'userId' | 'challengeNonce' | 'now'>,
  ): Promise<void>;

  findResetAuthorization(
    resetTokenDigest: Uint8Array,
  ): Promise<ResetAuthorizationRecord | null>;

  consumeResetAuthorization(
    input: ConsumeResetAuthorizationInput,
  ): Promise<boolean>;
}

const challengeSelect = {
  userId: true,
  challengeNonce: true,
  codeDigest: true,
  codeExpiresAt: true,
  attemptCount: true,
  verifiedAt: true,
  resetTokenDigest: true,
  resetTokenExpiresAt: true,
  usedAt: true,
} as const;

export class PrismaPasswordResetRepository
implements PasswordResetRepository {
  public constructor(
    private readonly prisma: PrismaClient,
  ) {}

  public async replaceChallenge(
    input: ReplacePasswordResetChallengeInput,
  ): Promise<void> {
    await this.prisma.passwordResetChallenge.upsert({
      where: {
        userId: input.userId,
      },
      create: {
        userId: input.userId,
        challengeNonce: new Uint8Array(input.challengeNonce),
        codeDigest: new Uint8Array(input.codeDigest),
        codeExpiresAt: input.codeExpiresAt,
        createdAt: input.createdAt,
      },
      update: {
        challengeNonce: new Uint8Array(input.challengeNonce),
        codeDigest: new Uint8Array(input.codeDigest),
        codeExpiresAt: input.codeExpiresAt,
        attemptCount: 0,
        verifiedAt: null,
        resetTokenDigest: null,
        resetTokenExpiresAt: null,
        usedAt: null,
        createdAt: input.createdAt,
      },
    });
  }

  public async findChallengeByEmail(
    email: string,
  ): Promise<PasswordResetChallengeRecord | null> {
    return this.prisma.passwordResetChallenge.findFirst({
      where: {
        user: {
          email,
        },
      },
      select: challengeSelect,
    });
  }

  public async incrementFailedAttempt(
    input: PasswordResetChallengeMutationInput,
  ): Promise<boolean> {
    const result = await this.prisma.passwordResetChallenge.updateMany({
      where: {
        userId: input.userId,
        challengeNonce: new Uint8Array(input.challengeNonce),
        attemptCount: {
          lt: input.maximumAttempts,
        },
        codeExpiresAt: {
          gt: input.now,
        },
        verifiedAt: null,
        usedAt: null,
      },
      data: {
        attemptCount: {
          increment: 1,
        },
      },
    });

    return result.count === 1;
  }

  public async verifyChallenge(
    input: VerifyPasswordResetChallengeInput,
  ): Promise<boolean> {
    const result = await this.prisma.passwordResetChallenge.updateMany({
      where: {
        userId: input.userId,
        challengeNonce: new Uint8Array(input.challengeNonce),
        codeDigest: new Uint8Array(input.codeDigest),
        attemptCount: {
          lt: input.maximumAttempts,
        },
        codeExpiresAt: {
          gt: input.now,
        },
        verifiedAt: null,
        usedAt: null,
      },
      data: {
        verifiedAt: input.now,
        resetTokenDigest: new Uint8Array(input.resetTokenDigest),
        resetTokenExpiresAt: input.resetTokenExpiresAt,
      },
    });

    return result.count === 1;
  }

  public async invalidateChallenge(
    input: Pick<PasswordResetChallengeMutationInput, 'userId' | 'challengeNonce' | 'now'>,
  ): Promise<void> {
    await this.prisma.passwordResetChallenge.updateMany({
      where: {
        userId: input.userId,
        challengeNonce: new Uint8Array(input.challengeNonce),
        usedAt: null,
      },
      data: {
        usedAt: input.now,
      },
    });
  }

  public async findResetAuthorization(
    resetTokenDigest: Uint8Array,
  ): Promise<ResetAuthorizationRecord | null> {
    const record = await this.prisma.passwordResetChallenge.findUnique({
      where: {
        resetTokenDigest: new Uint8Array(resetTokenDigest),
      },
      select: {
        userId: true,
        resetTokenExpiresAt: true,
        usedAt: true,
        verifiedAt: true,
      },
    });

    if (record === null || record.resetTokenExpiresAt === null) {
      return null;
    }

    return {
      userId: record.userId,
      expiresAt: record.resetTokenExpiresAt,
      usedAt: record.usedAt,
      verifiedAt: record.verifiedAt,
    };
  }

  public consumeResetAuthorization(
    input: ConsumeResetAuthorizationInput,
  ): Promise<boolean> {
    return this.prisma.$transaction(
      async (transaction) => {
        /*
         * Every operation capable of creating/changing login
         * state locks User first.
         *
         * This gives password reset the same lock ordering as
         * session creation and failed-login escalation.
         */
        const lockedUsers =
          await transaction.$queryRaw<
            Array<{
              id: string;
            }>
          >`
            SELECT
              id
            FROM users
            WHERE id = ${input.userId}
            FOR UPDATE
          `;

        const lockedUser =
          lockedUsers[0];

        if (lockedUser === undefined) {
          return false;
        }

        /*
         * IMPORTANT:
         *
         * Do not select CURRENT_TIMESTAMP in the same
         * SELECT ... FOR UPDATE statement.
         *
         * That timestamp may be evaluated when the SQL
         * statement begins, before it finishes waiting for
         * another transaction to release the User row.
         *
         * First acquire the row lock. Only afterwards obtain
         * database time in a second statement.
         *
         * Therefore transactionNow is guaranteed to be taken
         * after any preceding session-creation transaction
         * that held this User row has completed.
         */
        const databaseTimes =
          await transaction.$queryRaw<
            Array<{
              transactionNow: Date;
            }>
          >`
            SELECT
              CURRENT_TIMESTAMP(3)
                AS transactionNow
          `;

        const transactionNow =
          databaseTimes[0]
            ?.transactionNow;

        if (transactionNow === undefined) {
          throw new Error(
            'Unable to read database transaction time',
          );
        }

        const consumed =
          await transaction
            .passwordResetChallenge
            .updateMany({
              where: {
                userId:
                  input.userId,

                resetTokenDigest:
                  new Uint8Array(
                    input.resetTokenDigest,
                  ),

                resetTokenExpiresAt: {
                  gt:
                    transactionNow,
                },

                verifiedAt: {
                  not:
                    null,
                },

                usedAt:
                  null,
              },

              data: {
                usedAt:
                  transactionNow,
              },
            });

        if (consumed.count !== 1) {
          return false;
        }

        await transaction.user.update({
          where: {
            id:
              input.userId,
          },

          data: {
            passwordHash:
              input.newPasswordHash,

            failedLoginAttempts:
              0,

            loginCooldownUntil:
              null,

            securityLockedAt:
              null,

            securityLockReason:
              null,
          },
        });

        await transaction.authSession.updateMany({
          where: {
            userId:
              input.userId,

            revokedAt:
              null,
          },

          data: {
            revokedAt:
              transactionNow,
          },
        });

        return true;
      },
    );
  }
}
