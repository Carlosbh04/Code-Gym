import { describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPasswordChangeRepository } from '../src/auth/password-change-repository.js';

describe('Prisma password change repository', () => {
  it('updates the expected hash and revokes only other sessions in one transaction', async () => {
    const updatePassword = vi.fn().mockResolvedValue({ count: 1 });
    const revokeSessions = vi.fn().mockResolvedValue({ count: 2 });
    const transaction = {
      user: { updateMany: updatePassword },
      authSession: { updateMany: revokeSessions },
    };
    const runTransaction = vi.fn((operation: (client: typeof transaction) => Promise<boolean>) => (
      operation(transaction)
    ));
    const prisma = {
      $transaction: runTransaction,
    } as unknown as PrismaClient;
    const repository = new PrismaPasswordChangeRepository(prisma);
    const changedAt = new Date('2026-09-14T10:00:00.000Z');

    await expect(repository.commitPasswordChange({
      userId: 'user-1',
      currentSessionId: 'session-current',
      expectedPasswordHash: 'old-hash',
      newPasswordHash: 'new-hash',
      changedAt,
    })).resolves.toBe(true);

    expect(updatePassword).toHaveBeenCalledWith({
      where: { id: 'user-1', passwordHash: 'old-hash' },
      data: { passwordHash: 'new-hash' },
    });
    expect(revokeSessions).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        id: { not: 'session-current' },
        revokedAt: null,
      },
      data: { revokedAt: changedAt },
    });
    expect(runTransaction).toHaveBeenCalledOnce();
  });

  it('does not revoke sessions when the expected password hash changed concurrently', async () => {
    const revokeSessions = vi.fn();
    const transaction = {
      user: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      authSession: { updateMany: revokeSessions },
    };
    const prisma = {
      $transaction: vi.fn((operation: (client: typeof transaction) => Promise<boolean>) => (
        operation(transaction)
      )),
    } as unknown as PrismaClient;
    const repository = new PrismaPasswordChangeRepository(prisma);

    await expect(repository.commitPasswordChange({
      userId: 'user-1',
      currentSessionId: 'session-current',
      expectedPasswordHash: 'stale-hash',
      newPasswordHash: 'new-hash',
      changedAt: new Date(),
    })).resolves.toBe(false);
    expect(revokeSessions).not.toHaveBeenCalled();
  });

  it('does not persist the password update when session revocation fails', async () => {
    let persistedPasswordHash = 'old-hash';
    const transaction = {
      user: {
        updateMany: vi.fn().mockImplementation(({ data }: { data: { passwordHash: string } }) => {
          transactionPasswordHash = data.passwordHash;
          return Promise.resolve({ count: 1 });
        }),
      },
      authSession: {
        updateMany: vi.fn().mockRejectedValue(new Error('session update failed')),
      },
    };
    let transactionPasswordHash = persistedPasswordHash;
    const prisma = {
      $transaction: vi.fn(async (
        operation: (client: typeof transaction) => Promise<boolean>,
      ) => {
        transactionPasswordHash = persistedPasswordHash;
        const result = await operation(transaction);
        persistedPasswordHash = transactionPasswordHash;
        return result;
      }),
    } as unknown as PrismaClient;
    const repository = new PrismaPasswordChangeRepository(prisma);

    await expect(repository.commitPasswordChange({
      userId: 'user-1',
      currentSessionId: 'session-current',
      expectedPasswordHash: 'old-hash',
      newPasswordHash: 'new-hash',
      changedAt: new Date(),
    })).rejects.toThrow('session update failed');
    expect(persistedPasswordHash).toBe('old-hash');
  });
});
