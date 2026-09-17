export interface SendAccountLockedInput {
  readonly to: string;
  readonly displayName: string | null;

  /**
   * Stable idempotency key belonging to one durable
   * security-outbox event.
   */
  readonly idempotencyKey: string;
}

export interface AccountLockMailer {
  sendAccountLocked(
    input: SendAccountLockedInput,
  ): Promise<void>;
}

export class AccountLockMailerUnavailableError
  extends Error {
  public constructor() {
    super(
      'Account lock mail delivery is unavailable',
    );

    this.name =
      'AccountLockMailerUnavailableError';
  }
}

export class UnavailableAccountLockMailer
implements AccountLockMailer {
  public sendAccountLocked():
  Promise<void> {
    return Promise.reject(
      new AccountLockMailerUnavailableError(),
    );
  }
}
