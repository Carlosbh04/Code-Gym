import type { PasswordChangeRepository } from './password-change-repository.js';
import {
  hashPassword,
  verifyPassword,
} from './password-service.js';
import { normalizePassword } from './password-policy.js';

export class InvalidCurrentPasswordError extends Error {
  public constructor() {
    super('Invalid current password');
    this.name = 'InvalidCurrentPasswordError';
  }
}

export class NewPasswordSameAsCurrentError extends Error {
  public constructor() {
    super('New password must differ from current password');
    this.name = 'NewPasswordSameAsCurrentError';
  }
}

export class PasswordChangeUserNotFoundError extends Error {
  public constructor() {
    super('Authenticated password-change user not found');
    this.name = 'PasswordChangeUserNotFoundError';
  }
}

export interface ChangePasswordInput {
  readonly userId: string;
  readonly currentSessionId: string;
  readonly currentPassword: string;
  readonly newPassword: string;
}

export type PasswordChangeVerifier = (
  passwordHash: string,
  password: string,
) => Promise<boolean>;

export type PasswordChangeHasher = (password: string) => Promise<string>;
export type PasswordChangeClock = () => Date;

export class PasswordChangeService {
  public constructor(
    private readonly repository: PasswordChangeRepository,
    private readonly passwordVerifier: PasswordChangeVerifier = verifyPassword,
    private readonly passwordHasher: PasswordChangeHasher = hashPassword,
    private readonly clock: PasswordChangeClock = () => new Date(),
  ) {}

  public async changePassword(input: ChangePasswordInput): Promise<void> {
    const credential = await this.repository.findCredentialByUserId(input.userId);

    if (credential === null) {
      throw new PasswordChangeUserNotFoundError();
    }

    if (credential.passwordHash === null) {
      throw new InvalidCurrentPasswordError();
    }

    const currentPasswordMatches = await this.passwordVerifier(
      credential.passwordHash,
      input.currentPassword,
    );

    if (!currentPasswordMatches) {
      throw new InvalidCurrentPasswordError();
    }

    if (normalizePassword(input.currentPassword) === input.newPassword) {
      throw new NewPasswordSameAsCurrentError();
    }

    const newPasswordHash = await this.passwordHasher(input.newPassword);
    const committed = await this.repository.commitPasswordChange({
      userId: input.userId,
      currentSessionId: input.currentSessionId,
      expectedPasswordHash: credential.passwordHash,
      newPasswordHash,
      changedAt: this.clock(),
    });

    if (!committed) {
      throw new InvalidCurrentPasswordError();
    }
  }
}
