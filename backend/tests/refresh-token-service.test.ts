import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  digestRefreshToken,
  issueRefreshToken,
  verifyRefreshTokenDigest,
} from '../src/auth/refresh-token-service.js';

describe('refresh-token service', () => {
  it('issues independent 256-bit base64url tokens and stores only SHA-256 digests', () => {
    const first = issueRefreshToken();
    const second = issueRefreshToken();

    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(first.token, 'base64url')).toHaveLength(32);
    expect(first.token).not.toBe(second.token);
    expect(first.digest).toHaveLength(32);
    expect(first.digest).toEqual(createHash('sha256').update(first.token, 'utf8').digest());
    expect(first.digest.toString('base64url')).not.toBe(first.token);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it('derives a deterministic digest and verifies the matching token', () => {
    const issued = issueRefreshToken();

    expect(digestRefreshToken(issued.token)).toEqual(issued.digest);
    expect(verifyRefreshTokenDigest(issued.token, issued.digest)).toBe(true);
    expect(verifyRefreshTokenDigest(issueRefreshToken().token, issued.digest)).toBe(false);
  });

  it('fails closed for malformed tokens and malformed expected digests', () => {
    const issued = issueRefreshToken();
    const malformedTokens = ['', 'a'.repeat(42), 'a'.repeat(44), `${issued.token.slice(0, -1)}+`];

    for (const token of malformedTokens) {
      expect(() => digestRefreshToken(token)).toThrow('Invalid refresh token');
      expect(verifyRefreshTokenDigest(token, issued.digest)).toBe(false);
    }
    expect(verifyRefreshTokenDigest(issued.token, Buffer.alloc(31))).toBe(false);
    expect(verifyRefreshTokenDigest(issued.token, Buffer.alloc(33))).toBe(false);
  });
});
