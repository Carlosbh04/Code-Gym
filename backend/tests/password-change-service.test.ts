import { describe, expect, it, vi } from 'vitest';

import type { PasswordChangeRepository } from '../src/auth/password-change-repository.js';
import {
  InvalidCurrentPasswordError,
  NewPasswordSameAsCurrentError,
  PasswordChangeService,
  PasswordChangeUserNotFoundError,
} from '../src/auth/password-change-service.js';

function fixture(options: {
  readonly passwordHash?: string;
  readonly passwordMatches?: boolean;
  readonly committed?: boolean;
} = {}) {
  const findCredentialByUserId = vi.fn<PasswordChangeRepository['findCredentialByUserId']>()
    .mockResolvedValue(options.passwordHash === ''
      ? null
      : { passwordHash: options.passwordHash ?? 'old-hash' });
  const commitPasswordChange = vi.fn<PasswordChangeRepository['commitPasswordChange']>()
    .mockResolvedValue(options.committed ?? true);
  const passwordVerifier = vi.fn().mockResolvedValue(options.passwordMatches ?? true);
  const passwordHasher = vi.fn().mockResolvedValue('new-hash');
  const service = new PasswordChangeService(
    { findCredentialByUserId, commitPasswordChange },
    passwordVerifier,
    passwordHasher,
    () => new Date('2026-09-14T10:00:00.000Z'),
  );
  return {
    service,
    findCredentialByUserId,
    commitPasswordChange,
    passwordVerifier,
    passwordHasher,
  };
}

const input = {
  userId: 'user-1',
  currentSessionId: 'session-current',
  currentPassword: 'current secure password',
  newPassword: 'new secure password value',
} as const;

describe('password change service', () => {
  it('rejects a missing authenticated user without hashing', async () => {
    const context = fixture({ passwordHash: '' });
    await expect(context.service.changePassword(input))
      .rejects.toBeInstanceOf(PasswordChangeUserNotFoundError);
    expect(context.passwordVerifier).not.toHaveBeenCalled();
    expect(context.passwordHasher).not.toHaveBeenCalled();
  });

  it('rejects an incorrect current password without changing state', async () => {
    const context = fixture({ passwordMatches: false });
    await expect(context.service.changePassword(input))
      .rejects.toBeInstanceOf(InvalidCurrentPasswordError);
    expect(context.passwordVerifier).toHaveBeenCalledWith('old-hash', input.currentPassword);
    expect(context.passwordHasher).not.toHaveBeenCalled();
    expect(context.commitPasswordChange).not.toHaveBeenCalled();
  });

  it('rejects a canonically equivalent new password', async () => {
    const context = fixture();
    await expect(context.service.changePassword({
      ...input,
      currentPassword: `secure-password-Cafe\u0301`,
      newPassword: 'secure-password-Café',
    })).rejects.toBeInstanceOf(NewPasswordSameAsCurrentError);
    expect(context.passwordHasher).not.toHaveBeenCalled();
    expect(context.commitPasswordChange).not.toHaveBeenCalled();
  });

  it('hashes and commits the password with only the authenticated current session preserved', async () => {
    const context = fixture();
    await expect(context.service.changePassword(input)).resolves.toBeUndefined();
    expect(context.passwordHasher).toHaveBeenCalledWith(input.newPassword);
    expect(context.commitPasswordChange).toHaveBeenCalledWith({
      userId: input.userId,
      currentSessionId: input.currentSessionId,
      expectedPasswordHash: 'old-hash',
      newPasswordHash: 'new-hash',
      changedAt: new Date('2026-09-14T10:00:00.000Z'),
    });
  });

  it('fails closed when a concurrent password change invalidates the expected hash', async () => {
    const context = fixture({ committed: false });
    await expect(context.service.changePassword(input))
      .rejects.toBeInstanceOf(InvalidCurrentPasswordError);
  });
});
