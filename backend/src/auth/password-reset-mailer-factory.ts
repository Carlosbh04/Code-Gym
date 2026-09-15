import type { MailConfig } from '../config/env.js';
import {
  UnavailablePasswordResetMailer,
  type PasswordResetMailer,
} from './password-reset-mailer.js';
import { ResendPasswordResetMailer } from './resend-password-reset-mailer.js';

export function createPasswordResetMailer(
  config: MailConfig,
): PasswordResetMailer {
  if (config.provider === 'disabled') {
    return new UnavailablePasswordResetMailer();
  }

  return new ResendPasswordResetMailer(
    config.resendApiKey,
    config.from,
  );
}
