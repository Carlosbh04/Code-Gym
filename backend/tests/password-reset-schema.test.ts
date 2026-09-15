import { describe, expect, it } from 'vitest';

import {
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  passwordResetVerifySchema,
} from '../src/auth/password-reset-schema.js';

describe('password reset request schemas', () => {
  it('normalizes email and accepts the exact request contracts', () => {
    expect(passwordResetRequestSchema.parse({ email: ' Person@Example.Test ' })).toEqual({
      email: 'person@example.test',
    });
    expect(passwordResetVerifySchema.parse({
      email: 'person@example.test',
      code: '012345',
    })).toEqual({ email: 'person@example.test', code: '012345' });
    expect(passwordResetConfirmSchema.safeParse({
      resetToken: 'A'.repeat(43),
      newPassword: 'a secure password of sufficient length',
    }).success).toBe(true);
  });

  it('rejects malformed values and unknown fields', () => {
    expect(passwordResetRequestSchema.safeParse({
      email: 'person@example.test',
      role: 'ADMIN',
    }).success).toBe(false);
    expect(passwordResetVerifySchema.safeParse({
      email: 'person@example.test',
      code: '12345a',
    }).success).toBe(false);
    expect(passwordResetConfirmSchema.safeParse({
      resetToken: 'short',
      newPassword: 'too short',
    }).success).toBe(false);
  });
});
