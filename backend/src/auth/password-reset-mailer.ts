export interface SendPasswordResetCodeInput {
  readonly to: string;
  readonly displayName: string | null;
  readonly code: string;
  readonly expiresInMinutes: number;
}

export interface PasswordResetMailer {
  sendPasswordResetCode(
    input: SendPasswordResetCodeInput,
  ): Promise<void>;
}

export class PasswordResetMailerUnavailableError extends Error {
  public constructor() {
    super('Password reset mail delivery is not configured');
    this.name = 'PasswordResetMailerUnavailableError';
  }
}

/**
 * Safe runtime placeholder until a real provider is explicitly selected.
 * The service invalidates the challenge if delivery fails and still returns
 * the generic public response, preserving anti-enumeration behavior.
 */
export class UnavailablePasswordResetMailer implements PasswordResetMailer {
  public sendPasswordResetCode(): Promise<void> {
    return Promise.reject(
      new PasswordResetMailerUnavailableError(),
    );
  }
}
