import { argon2id, hash as argonHash } from 'argon2';
import { describe, expect, it } from 'vitest';

import {
  PasswordPolicyError,
  passwordPolicy,
  validatePassword,
} from '../src/auth/password-policy.js';
import {
  argon2idParameters,
  hashPassword,
  needsRehash,
  verifyPassword,
} from '../src/auth/password-service.js';

const validPassword = 'correct horse battery staple';

describe('password policy', () => {
  it('accepts passphrases and preserves intentional whitespace', () => {
    const passphrase = '  four calm words stay here  ';
    expect(validatePassword(passphrase)).toBe(passphrase);
  });

  it('accepts the inclusive code-point boundaries without truncation', () => {
    const minimum = 'a'.repeat(passwordPolicy.minimumCodePoints);
    const maximum = '🔒'.repeat(passwordPolicy.maximumCodePoints);

    expect(validatePassword(minimum)).toBe(minimum);
    expect(validatePassword(maximum)).toBe(maximum);
  });

  it('rejects values immediately outside the configured bounds', () => {
    expect(() => validatePassword('a'.repeat(passwordPolicy.minimumCodePoints - 1))).toThrow(
      PasswordPolicyError,
    );
    expect(() => validatePassword('a'.repeat(passwordPolicy.maximumCodePoints + 1))).toThrow(
      PasswordPolicyError,
    );
  });

  it('normalizes well-formed Unicode to NFC', () => {
    const decomposed = `mot-de-passe-Cafe\u0301`;
    expect(validatePassword(decomposed)).toBe(decomposed.normalize('NFC'));
  });

  it('rejects malformed Unicode rather than hashing replacement data', () => {
    expect(() => validatePassword(`safe-prefix-long\ud800`)).toThrow(PasswordPolicyError);
    expect(() => validatePassword(`safe-prefix-long\udc00`)).toThrow(PasswordPolicyError);
  });
});

describe('Argon2id password service', () => {
  it('uses the approved, immutable Argon2id parameters and an encoded 32-byte hash', async () => {
    const passwordHash = await hashPassword(validPassword);

    expect(Object.isFrozen(argon2idParameters)).toBe(true);
    expect(argon2idParameters).toMatchObject({
      type: argon2id,
      version: 0x13,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 1,
      hashLength: 32,
    });
    expect(passwordHash).toMatch(/^\$argon2id\$v=19\$m=65536,p=1,t=3\$/);
    const encodedDigest = passwordHash.split('$')[5];
    expect(encodedDigest).toBeDefined();
    expect(Buffer.from(encodedDigest ?? '', 'base64')).toHaveLength(32);
  });

  it('never embeds plaintext and verifies only the correct password', async () => {
    const passwordHash = await hashPassword(validPassword);

    expect(passwordHash).not.toContain(validPassword);
    await expect(verifyPassword(passwordHash, validPassword)).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, 'wrong password but safely bounded')).resolves.toBe(false);
  });

  it('uses a fresh automatic salt for every hash', async () => {
    const first = await hashPassword(validPassword);
    const second = await hashPassword(validPassword);

    expect(first).not.toBe(second);
    await expect(verifyPassword(first, validPassword)).resolves.toBe(true);
    await expect(verifyPassword(second, validPassword)).resolves.toBe(true);
  });

  it('hashes NFC and verifies an equivalent decomposed representation', async () => {
    const decomposed = `mot-de-passe-Cafe\u0301`;
    const composed = decomposed.normalize('NFC');
    const passwordHash = await hashPassword(decomposed);

    await expect(verifyPassword(passwordHash, composed)).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, decomposed)).resolves.toBe(true);
  });

  it('fails closed for malformed hashes, wrong algorithms, oversized input, and malformed Unicode', async () => {
    const oversized = 'a'.repeat(passwordPolicy.maximumCodePoints + 1);
    const cases = [
      verifyPassword('not-an-encoded-hash', validPassword),
      verifyPassword('$argon2i$v=19$m=65536,t=3,p=1$bad$bad', validPassword),
      verifyPassword('$argon2id$v=19$m=invalid$bad$bad', validPassword),
      verifyPassword('$argon2id$v=19$m=65536,t=3,p=1$bad$bad', oversized),
      verifyPassword('$argon2id$v=19$m=65536,t=3,p=1$bad$bad', `bounded-password\ud800`),
    ];

    await expect(Promise.all(cases)).resolves.toEqual([false, false, false, false, false]);
  });

  it('identifies invalid and outdated hashes for future rehashing', async () => {
    const currentHash = await hashPassword(validPassword);
    const weakHash = await argonHash(validPassword, {
      type: argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
      hashLength: 16,
    });

    expect(needsRehash(currentHash)).toBe(false);
    expect(needsRehash(weakHash)).toBe(true);
    expect(needsRehash('not-a-hash')).toBe(true);
    expect(needsRehash('$argon2i$v=19$m=65536,t=3,p=1$bad$bad')).toBe(true);
  });
});
