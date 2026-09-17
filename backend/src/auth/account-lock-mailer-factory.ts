import type {
  MailConfig,
} from '../config/env.js';

import {
  UnavailableAccountLockMailer,
  type AccountLockMailer,
} from './account-lock-mailer.js';

import {
  ResendAccountLockMailer,
} from './resend-account-lock-mailer.js';


export function createAccountLockMailer(
  config: MailConfig,
): AccountLockMailer {
  if (
    config.provider ===
    'disabled'
  ) {
    return new
      UnavailableAccountLockMailer();
  }

  return new
    ResendAccountLockMailer(
      config.resendApiKey,
      config.from,
    );
}
