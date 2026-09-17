export class AccountLockedError extends Error {
  public constructor() {
    super('Account access is locked');
    this.name = 'AccountLockedError';
  }
}

export class AccountCooldownError extends Error {
  public constructor(
    public readonly cooldownUntil: Date,
  ) {
    super('Account login is temporarily unavailable');
    this.name = 'AccountCooldownError';
  }
}

/**
 * Internal authentication race signal.
 *
 * It means the password hash that was verified by LoginService
 * is no longer the password hash persisted for the user.
 *
 * This must never be exposed as a distinct public error because
 * callers should receive the normal invalid-credentials contract.
 */
export class StalePasswordCredentialError extends Error {
  public constructor() {
    super('Password credential changed during authentication');
    this.name = 'StalePasswordCredentialError';
  }
}
