import { describe, expect, it } from 'vitest';

import { PasswordResetCrypto } from '../src/auth/password-reset-crypto.js';

const secret = Buffer.alloc(32, 7).toString('base64url');

describe('password reset cryptography', () => {
  it('generates exactly six digits, including leading zeroes', () => {
    const crypto = new PasswordResetCrypto(secret, {
      randomInteger: () => 42,
    });

    expect(crypto.generateCode()).toBe('000042');
  });

  it('generates a 256-bit base64url reset token', () => {
    const crypto = new PasswordResetCrypto(secret, {
      randomBytes: (size) => Buffer.alloc(size, 9),
    });

    expect(crypto.generateResetToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('uses domain-separated keyed digests and constant-time comparison', () => {
    const crypto = new PasswordResetCrypto(secret);
    const nonce = new Uint8Array(16).fill(3);
    const codeDigest = crypto.digestCode(nonce, '123456');
    const otherNonceDigest = crypto.digestCode(new Uint8Array(16).fill(4), '123456');
    const tokenDigest = crypto.digestResetToken('123456');

    expect(Buffer.from(codeDigest).toString('utf8')).not.toContain('123456');
    expect(Buffer.from(codeDigest)).not.toEqual(Buffer.from(otherNonceDigest));
    expect(Buffer.from(codeDigest)).not.toEqual(Buffer.from(tokenDigest));
    expect(crypto.digestsEqual(codeDigest, new Uint8Array(codeDigest))).toBe(true);
    expect(crypto.digestsEqual(codeDigest, tokenDigest)).toBe(false);
  });
});
