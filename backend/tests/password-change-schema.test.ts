import { describe, expect, it } from 'vitest';

import { changePasswordRequestSchema } from '../src/auth/password-change-schema.js';

describe('change password schema', () => {
  it('normalizes the new password with the canonical policy', () => {
    const decomposed = `new-secure-Cafe\u0301-password`;
    expect(changePasswordRequestSchema.parse({
      currentPassword: 'current password',
      newPassword: decomposed,
    })).toEqual({
      currentPassword: 'current password',
      newPassword: decomposed.normalize('NFC'),
    });
  });

  it.each([
    {},
    { currentPassword: '', newPassword: 'a'.repeat(15) },
    { currentPassword: 'current password', newPassword: 'too short' },
    { currentPassword: 'current password', newPassword: 'a'.repeat(129) },
    { currentPassword: 'current password', newPassword: 'a'.repeat(15), userId: 'other-user' },
    { currentPassword: 'current password', newPassword: 'a'.repeat(15), email: 'other@example.test' },
    { currentPassword: 'current password', newPassword: 'a'.repeat(15), sessionId: 'other-session' },
  ])('rejects invalid or non-strict input %#', (input) => {
    expect(changePasswordRequestSchema.safeParse(input).success).toBe(false);
  });
});
