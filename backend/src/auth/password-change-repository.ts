import type { PrismaClient } from '../generated/prisma/client.js';

export interface PasswordCredentialRecord {
  readonly passwordHash: string | null;
}

export interface CommitPasswordChangeInput {
  readonly userId: string;
  readonly currentSessionId: string;
  readonly expectedPasswordHash: string;
  readonly newPasswordHash: string;
  readonly changedAt: Date;
}

export interface PasswordChangeRepository {
  findCredentialByUserId(userId: string): Promise<PasswordCredentialRecord | null>;

  commitPasswordChange(input: CommitPasswordChangeInput): Promise<boolean>;
}

export class PrismaPasswordChangeRepository implements PasswordChangeRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public findCredentialByUserId(userId: string): Promise<PasswordCredentialRecord | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
  }

  public commitPasswordChange(input: CommitPasswordChangeInput): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.user.updateMany({
        where: {
          id: input.userId,
          passwordHash: input.expectedPasswordHash,
        },
        data: {
          passwordHash: input.newPasswordHash,
        },
      });

      if (updated.count !== 1) {
        return false;
      }

      await transaction.authSession.updateMany({
        where: {
          userId: input.userId,
          id: { not: input.currentSessionId },
          revokedAt: null,
        },
        data: {
          revokedAt: input.changedAt,
        },
      });

      return true;
    });
  }
}
