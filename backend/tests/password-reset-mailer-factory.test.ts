import { describe, expect, it } from 'vitest';

import { createPasswordResetMailer } from '../src/auth/password-reset-mailer-factory.js';
import { UnavailablePasswordResetMailer } from '../src/auth/password-reset-mailer.js';
import { ResendPasswordResetMailer } from '../src/auth/resend-password-reset-mailer.js';

describe('password reset mailer runtime factory', () => {
  it('keeps real delivery disabled for test configuration', () => {
    expect(createPasswordResetMailer({ provider: 'disabled' }))
      .toBeInstanceOf(UnavailablePasswordResetMailer);
  });

  it('wires the Resend adapter for configured runtime delivery', () => {
    expect(createPasswordResetMailer({
      provider: 'resend',
      resendApiKey: 're_test-construction-only',
      from: 'CodeGym <security@example.com>',
    })).toBeInstanceOf(ResendPasswordResetMailer);
  });
});
