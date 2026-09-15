import type {
  UserRepository,
} from './user-repository.js';
import type {
  PasswordResetMailer,
} from './password-reset-mailer.js';
import type {
  PasswordResetCrypto,
} from './password-reset-crypto.js';
import type {
  PasswordResetChallengeRecord,
  PasswordResetRepository,
} from './password-reset-repository.js';
import {
  hashPassword,
} from './password-service.js';
import type {
  PasswordResetConfig,
} from '../config/env.js';

export const passwordResetRequestMessage =
  'If an account exists, a security code will be sent.';

export interface PasswordResetRequestResult {
  readonly message: string;
}

export class InvalidPasswordResetCodeError extends Error {
  public constructor() {
    super('Invalid password reset code');
    this.name = 'InvalidPasswordResetCodeError';
  }
}

export class ExpiredPasswordResetCodeError extends Error {
  public constructor() {
    super('Password reset code expired');
    this.name = 'ExpiredPasswordResetCodeError';
  }
}

export class PasswordResetCodeAttemptsExceededError extends Error {
  public constructor() {
    super('Password reset code maximum attempts exceeded');
    this.name = 'PasswordResetCodeAttemptsExceededError';
  }
}

export class UnavailablePasswordResetCodeError extends Error {
  public constructor() {
    super('Password reset code expired or unavailable');
    this.name = 'UnavailablePasswordResetCodeError';
  }
}

export class InvalidPasswordResetTokenError extends Error {
  public constructor() {
    super('Invalid password reset token');
    this.name = 'InvalidPasswordResetTokenError';
  }
}

export class ExpiredPasswordResetTokenError extends Error {
  public constructor() {
    super('Password reset token expired or unavailable');
    this.name = 'ExpiredPasswordResetTokenError';
  }
}

export type PasswordResetClock = () => Date;
export type PasswordHasher = (password: string) => Promise<string>;

export interface PasswordResetServiceDependencies {
  readonly userRepository: Pick<UserRepository, 'findUserByEmail'>;
  readonly passwordResetRepository: PasswordResetRepository;
  readonly mailer: PasswordResetMailer;
  readonly crypto: PasswordResetCrypto;
  readonly config: PasswordResetConfig;
  readonly clock?: PasswordResetClock;
  readonly passwordHasher?: PasswordHasher;
}

export class PasswordResetService {
  private readonly clock: PasswordResetClock;
  private readonly passwordHasher: PasswordHasher;

  public constructor(
    private readonly dependencies: PasswordResetServiceDependencies,
  ) {
    this.clock = dependencies.clock ?? (() => new Date());
    this.passwordHasher = dependencies.passwordHasher ?? hashPassword;
  }

  public async requestReset(
    email: string,
  ): Promise<PasswordResetRequestResult> {
    const now = this.clock();
    const code = this.dependencies.crypto.generateCode();
    const challengeNonce = this.dependencies.crypto.generateChallengeNonce();
    const codeDigest = this.dependencies.crypto.digestCode(challengeNonce, code);
    const user = await this.dependencies.userRepository.findUserByEmail(email);

    if (user !== null) {
      const codeExpiresAt = addSeconds(
        now,
        this.dependencies.config.codeTtlSeconds,
      );

      await this.dependencies.passwordResetRepository.replaceChallenge({
        userId: user.id,
        challengeNonce,
        codeDigest,
        codeExpiresAt,
        createdAt: now,
      });

      try {
        await this.dependencies.mailer.sendPasswordResetCode({
          to: user.email,
          displayName: user.displayName,
          code,
          expiresInMinutes: Math.ceil(this.dependencies.config.codeTtlSeconds / 60),
        });
      } catch {
        await this.dependencies.passwordResetRepository.invalidateChallenge({
          userId: user.id,
          challengeNonce,
          now: this.clock(),
        });
      }
    }

    return Object.freeze({
      message: passwordResetRequestMessage,
    });
  }

  public async verifyCode(
    email: string,
    code: string,
  ): Promise<string> {
    const now = this.clock();
    const challenge = await this.dependencies.passwordResetRepository
      .findChallengeByEmail(email);

    this.assertChallengeAvailable(challenge, now);

    const codeDigest = this.dependencies.crypto.digestCode(
      challenge.challengeNonce,
      code,
    );

    if (!this.dependencies.crypto.digestsEqual(codeDigest, challenge.codeDigest)) {
      const attemptRecorded = await this.dependencies.passwordResetRepository.incrementFailedAttempt({
        userId: challenge.userId,
        challengeNonce: challenge.challengeNonce,
        now,
        maximumAttempts: this.dependencies.config.maximumAttempts,
      });

      if (!attemptRecorded) {
        const currentChallenge = await this.dependencies.passwordResetRepository
          .findChallengeByEmail(email);
        this.assertChallengeAvailable(currentChallenge, now);
        throw new UnavailablePasswordResetCodeError();
      }

      if (
        challenge.attemptCount + 1
        >= this.dependencies.config.maximumAttempts
      ) {
        throw new PasswordResetCodeAttemptsExceededError();
      }

      throw new InvalidPasswordResetCodeError();
    }

    const resetToken = this.dependencies.crypto.generateResetToken();
    const resetTokenDigest = this.dependencies.crypto.digestResetToken(resetToken);
    const resetTokenExpiresAt = addSeconds(
      now,
      this.dependencies.config.resetTokenTtlSeconds,
    );
    const verified = await this.dependencies.passwordResetRepository.verifyChallenge({
      userId: challenge.userId,
      challengeNonce: challenge.challengeNonce,
      codeDigest,
      resetTokenDigest,
      resetTokenExpiresAt,
      now,
      maximumAttempts: this.dependencies.config.maximumAttempts,
    });

    if (!verified) {
      throw new UnavailablePasswordResetCodeError();
    }

    return resetToken;
  }

  public async confirmReset(
    resetToken: string,
    newPassword: string,
  ): Promise<void> {
    const now = this.clock();
    const resetTokenDigest = this.dependencies.crypto.digestResetToken(resetToken);
    const authorization = await this.dependencies.passwordResetRepository
      .findResetAuthorization(resetTokenDigest);

    if (authorization === null || authorization.verifiedAt === null) {
      throw new InvalidPasswordResetTokenError();
    }

    if (
      authorization.usedAt !== null
      || authorization.expiresAt.getTime() <= now.getTime()
    ) {
      throw new ExpiredPasswordResetTokenError();
    }

    const newPasswordHash = await this.passwordHasher(newPassword);
    const consumed = await this.dependencies.passwordResetRepository
      .consumeResetAuthorization({
        userId: authorization.userId,
        resetTokenDigest,
        newPasswordHash,
        now,
      });

    if (!consumed) {
      throw new InvalidPasswordResetTokenError();
    }
  }

  private assertChallengeAvailable(
    challenge: PasswordResetChallengeRecord | null,
    now: Date,
  ): asserts challenge is PasswordResetChallengeRecord {
    if (challenge === null) {
      throw new InvalidPasswordResetCodeError();
    }

    if (challenge.usedAt !== null || challenge.verifiedAt !== null) {
      throw new UnavailablePasswordResetCodeError();
    }

    if (challenge.codeExpiresAt.getTime() <= now.getTime()) {
      throw new ExpiredPasswordResetCodeError();
    }

    if (challenge.attemptCount >= this.dependencies.config.maximumAttempts) {
      throw new PasswordResetCodeAttemptsExceededError();
    }
  }
}

function addSeconds(
  value: Date,
  seconds: number,
): Date {
  return new Date(value.getTime() + seconds * 1_000);
}
