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
  frontendOrigin:
    string | undefined,
): AccountLockMailer {
  if (
    config.provider ===
    'disabled'
  ) {
    return new
      UnavailableAccountLockMailer();
  }

  if (
    frontendOrigin ===
    undefined
  ) {
    return new
      UnavailableAccountLockMailer();
  }

  const recoveryUrl =
    new URL(
      '/forgot-password',
      frontendOrigin,
    ).toString();

  return new
    ResendAccountLockMailer(
      config.resendApiKey,
      config.from,
      recoveryUrl,
    );
}
