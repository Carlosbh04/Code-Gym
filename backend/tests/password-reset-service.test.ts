import { describe, expect, it, vi } from 'vitest';

import { PasswordResetCrypto } from '../src/auth/password-reset-crypto.js';
import type {
  PasswordResetMailer,
  SendPasswordResetCodeInput,
} from '../src/auth/password-reset-mailer.js';
import type {
  ConsumeResetAuthorizationInput,
  PasswordResetChallengeRecord,
  PasswordResetRepository,
  ReplacePasswordResetChallengeInput,
  ResetAuthorizationRecord,
  VerifyPasswordResetChallengeInput,
} from '../src/auth/password-reset-repository.js';
import {
  ExpiredPasswordResetCodeError,
  ExpiredPasswordResetTokenError,
  InvalidPasswordResetCodeError,
  InvalidPasswordResetTokenError,
  PasswordResetCodeAttemptsExceededError,
  PasswordResetService,
  UnavailablePasswordResetCodeError,
  passwordResetRequestMessage,
} from '../src/auth/password-reset-service.js';
import type { AuthUserRecord } from '../src/auth/user-repository.js';
import { testConfig } from './helpers.js';

const user: AuthUserRecord = {
  id: 'user-1',
  email: 'person@example.test',
  passwordHash: 'old-hash',
  displayName: 'Person',
  role: 'USER',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

class MemoryRepository implements PasswordResetRepository {
  public challenge: PasswordResetChallengeRecord | null = null;
  public passwordHash = user.passwordHash;
  public revokedAllSessions = false;

  public replaceChallenge(input: ReplacePasswordResetChallengeInput): Promise<void> {
    this.challenge = {
      userId: input.userId,
      challengeNonce: input.challengeNonce,
      codeDigest: input.codeDigest,
      codeExpiresAt: input.codeExpiresAt,
      attemptCount: 0,
      verifiedAt: null,
      resetTokenDigest: null,
      resetTokenExpiresAt: null,
      usedAt: null,
    };
    return Promise.resolve();
  }

  public findChallengeByEmail(): Promise<PasswordResetChallengeRecord | null> {
    return Promise.resolve(this.challenge);
  }

  public incrementFailedAttempt(
    input: Parameters<PasswordResetRepository['incrementFailedAttempt']>[0],
  ): Promise<boolean> {
    if (
      this.challenge === null
      || this.challenge.attemptCount >= input.maximumAttempts
      || this.challenge.codeExpiresAt.getTime() <= input.now.getTime()
      || this.challenge.verifiedAt !== null
      || this.challenge.usedAt !== null
    ) return Promise.resolve(false);
    this.challenge = { ...this.challenge, attemptCount: this.challenge.attemptCount + 1 };
    return Promise.resolve(true);
  }

  public verifyChallenge(input: VerifyPasswordResetChallengeInput): Promise<boolean> {
    if (this.challenge === null || this.challenge.verifiedAt !== null) {
      return Promise.resolve(false);
    }
    this.challenge = {
      ...this.challenge,
      verifiedAt: input.now,
      resetTokenDigest: input.resetTokenDigest,
      resetTokenExpiresAt: input.resetTokenExpiresAt,
    };
    return Promise.resolve(true);
  }

  public invalidateChallenge(input: { readonly now: Date }): Promise<void> {
    if (this.challenge !== null) this.challenge = { ...this.challenge, usedAt: input.now };
    return Promise.resolve();
  }

  public findResetAuthorization(digest: Uint8Array): Promise<ResetAuthorizationRecord | null> {
    if (
      this.challenge === null
      || this.challenge.resetTokenDigest === null
      || !Buffer.from(this.challenge.resetTokenDigest).equals(Buffer.from(digest))
      || this.challenge.resetTokenExpiresAt === null
    ) return Promise.resolve(null);
    return Promise.resolve({
      userId: this.challenge.userId,
      expiresAt: this.challenge.resetTokenExpiresAt,
      usedAt: this.challenge.usedAt,
      verifiedAt: this.challenge.verifiedAt,
    });
  }

  public consumeResetAuthorization(input: ConsumeResetAuthorizationInput): Promise<boolean> {
    if (
      this.challenge === null
      || this.challenge.usedAt !== null
      || this.challenge.resetTokenExpiresAt === null
      || this.challenge.resetTokenExpiresAt.getTime() <= input.now.getTime()
    ) return Promise.resolve(false);
    this.challenge = { ...this.challenge, usedAt: input.now };
    this.passwordHash = input.newPasswordHash;
    this.revokedAllSessions = true;
    return Promise.resolve(true);
  }
}

function fixture(options: { readonly userExists?: boolean } = {}) {
  let now = new Date('2026-09-13T12:00:00.000Z');
  let nextCode = 111_111;
  const repository = new MemoryRepository();
  const delivered: SendPasswordResetCodeInput[] = [];
  const mailer: PasswordResetMailer = {
    sendPasswordResetCode: (input) => {
      delivered.push(input);
      return Promise.resolve();
    },
  };
  const service = new PasswordResetService({
    userRepository: {
      findUserByEmail: () => Promise.resolve(options.userExists === false ? null : user),
    },
    passwordResetRepository: repository,
    mailer,
    crypto: new PasswordResetCrypto(testConfig().passwordReset.hmacSecret, {
      randomInteger: () => nextCode++,
    }),
    config: testConfig().passwordReset,
    clock: () => now,
    passwordHasher: (password) => Promise.resolve(`hashed:${password}`),
  });
  return {
    service,
    repository,
    delivered,
    advance(milliseconds: number) { now = new Date(now.getTime() + milliseconds); },
  };
}

describe('password reset service', () => {
  it('returns the identical anti-enumeration response for existing and absent accounts', async () => {
    const existing = fixture();
    const absent = fixture({ userExists: false });

    await expect(existing.service.requestReset(user.email)).resolves.toEqual({
      message: passwordResetRequestMessage,
    });
    await expect(absent.service.requestReset('absent@example.test')).resolves.toEqual({
      message: passwordResetRequestMessage,
    });
    expect(existing.delivered).toHaveLength(1);
    expect(existing.delivered[0]?.displayName).toBe('Person');
    expect(absent.delivered).toHaveLength(0);
    expect(Buffer.from(existing.repository.challenge?.codeDigest ?? []).toString('utf8'))
      .not.toContain(existing.delivered[0]?.code);
    expect(existing.repository.challenge?.codeExpiresAt.toISOString())
      .toBe('2026-09-13T12:05:00.000Z');
  });

  it('reports incorrect codes while attempts remain, including a superseded code', async () => {
    const context = fixture();
    await context.service.requestReset(user.email);
    const firstCode = context.delivered[0]?.code ?? '';
    await context.service.requestReset(user.email);

    await expect(context.service.verifyCode(user.email, firstCode))
      .rejects.toBeInstanceOf(InvalidPasswordResetCodeError);
    await expect(context.service.verifyCode(user.email, '999999'))
      .rejects.toBeInstanceOf(InvalidPasswordResetCodeError);
    expect(context.repository.challenge?.attemptCount).toBe(2);
  });

  it('reports the maximum on the last permitted failed attempt and keeps the challenge unusable', async () => {
    const context = fixture();
    await context.service.requestReset(user.email);

    for (let attempt = 1; attempt < testConfig().passwordReset.maximumAttempts; attempt += 1) {
      await expect(context.service.verifyCode(user.email, '999999'))
        .rejects.toBeInstanceOf(InvalidPasswordResetCodeError);
    }

    await expect(context.service.verifyCode(user.email, '999999'))
      .rejects.toBeInstanceOf(PasswordResetCodeAttemptsExceededError);
    await expect(context.service.verifyCode(user.email, context.delivered[0]?.code ?? ''))
      .rejects.toBeInstanceOf(PasswordResetCodeAttemptsExceededError);
    expect(context.repository.challenge?.attemptCount)
      .toBe(testConfig().passwordReset.maximumAttempts);
  });

  it('reports a code expired by time independently from exhausted attempts', async () => {
    const expiring = fixture();
    await expiring.service.requestReset(user.email);
    const code = expiring.delivered[0]?.code ?? '';
    expiring.advance(300_000);

    await expect(expiring.service.verifyCode(user.email, code))
      .rejects.toBeInstanceOf(ExpiredPasswordResetCodeError);
  });

  it('issues a single-use token, hashes the new password, and revokes every session', async () => {
    const context = fixture();
    await context.service.requestReset(user.email);
    const token = await context.service.verifyCode(user.email, context.delivered[0]?.code ?? '');

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(context.repository.challenge?.resetTokenDigest ?? []).toString('utf8'))
      .not.toContain(token);
    await expect(context.service.verifyCode(user.email, context.delivered[0]?.code ?? ''))
      .rejects.toBeInstanceOf(UnavailablePasswordResetCodeError);
    await expect(context.service.confirmReset(token, 'a secure replacement password'))
      .resolves.toBeUndefined();
    expect(context.repository.passwordHash).toBe('hashed:a secure replacement password');
    expect(context.repository.revokedAllSessions).toBe(true);
    await expect(context.service.confirmReset(token, 'another secure replacement'))
      .rejects.toBeInstanceOf(ExpiredPasswordResetTokenError);
  });

  it('rejects invalid and expired reset tokens without hashing', async () => {
    const context = fixture();
    await expect(context.service.confirmReset('A'.repeat(43), 'a secure replacement password'))
      .rejects.toBeInstanceOf(InvalidPasswordResetTokenError);

    await context.service.requestReset(user.email);
    const token = await context.service.verifyCode(user.email, context.delivered[0]?.code ?? '');
    context.advance(600_000);
    await expect(context.service.confirmReset(token, 'a secure replacement password'))
      .rejects.toBeInstanceOf(ExpiredPasswordResetTokenError);
  });

  it('invalidates the challenge if delivery fails without leaking that failure', async () => {
    const context = fixture();
    const mailFailure = vi.spyOn(context.service['dependencies'].mailer, 'sendPasswordResetCode')
      .mockRejectedValue(new Error('provider unavailable'));

    await expect(context.service.requestReset(user.email)).resolves.toEqual({
      message: passwordResetRequestMessage,
    });
    expect(mailFailure).toHaveBeenCalledOnce();
    expect(context.repository.challenge?.usedAt).not.toBeNull();
  });
});
