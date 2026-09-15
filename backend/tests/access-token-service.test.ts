import { decodeJwt, decodeProtectedHeader, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';

import {
  AccessTokenService,
  InvalidAccessTokenError,
} from '../src/auth/access-token-service.js';

const issuedAt = new Date('2026-09-10T12:00:00.000Z');
const secret = Buffer.alloc(32, 7).toString('base64url');
const otherSecret = Buffer.alloc(32, 8).toString('base64url');
const subject = Object.freeze({ userId: 'user12345678901234567890', sessionId: 'session12345678901234567' });

function createService(
  accessTokenSecret = secret,
  clock: () => Date = () => issuedAt,
): AccessTokenService {
  return new AccessTokenService({ accessTokenSecret, accessTokenTtlSeconds: 600 }, clock);
}

describe('access-token service', () => {
  it('signs and verifies a short-lived access token with only approved claims', async () => {
    const service = createService();
    const token = await service.sign(subject);
    const claims = await service.verify(token);

    expect(claims).toEqual({
      sub: subject.userId,
      sid: subject.sessionId,
      iat: Math.floor(issuedAt.getTime() / 1_000),
      exp: Math.floor(issuedAt.getTime() / 1_000) + 600,
    });
    expect(Object.isFrozen(claims)).toBe(true);
    expect(Object.keys(decodeJwt(token)).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'sid', 'sub']);
    expect(decodeJwt(token)).not.toHaveProperty('email');
    expect(decodeJwt(token)).not.toHaveProperty('passwordHash');
    expect(decodeProtectedHeader(token)).toEqual({ alg: 'HS256', typ: 'at+jwt' });
  });

  it('rejects an expired token using the injected clock', async () => {
    const token = await createService().sign(subject);
    const afterTolerance = new Date(issuedAt.getTime() + 606_000);

    await expect(createService(secret, () => afterTolerance).verify(token)).rejects.toBeInstanceOf(
      InvalidAccessTokenError,
    );
  });

  it('rejects malformed tokens and tokens signed with another secret', async () => {
    const token = await createService().sign(subject);

    await expect(createService().verify('not-a-jwt')).rejects.toBeInstanceOf(InvalidAccessTokenError);
    await expect(createService(otherSecret).verify(token)).rejects.toBeInstanceOf(
      InvalidAccessTokenError,
    );
  });

  it('rejects the wrong algorithm, token type, and unapproved claims', async () => {
    const key = Buffer.from(secret, 'base64url');
    const timestamp = Math.floor(issuedAt.getTime() / 1_000);
    const base = () => new SignJWT({ sid: subject.sessionId })
      .setIssuer('codegym-backend')
      .setAudience('codegym-api')
      .setSubject(subject.userId)
      .setIssuedAt(timestamp)
      .setExpirationTime(timestamp + 600);
    const wrongAlgorithm = await base().setProtectedHeader({ alg: 'HS384', typ: 'at+jwt' }).sign(key);
    const wrongType = await base().setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).sign(key);
    const extraClaim = await new SignJWT({ sid: subject.sessionId, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256', typ: 'at+jwt' })
      .setIssuer('codegym-backend')
      .setAudience('codegym-api')
      .setSubject(subject.userId)
      .setIssuedAt(timestamp)
      .setExpirationTime(timestamp + 600)
      .sign(key);

    await expect(createService().verify(wrongAlgorithm)).rejects.toBeInstanceOf(InvalidAccessTokenError);
    await expect(createService().verify(wrongType)).rejects.toBeInstanceOf(InvalidAccessTokenError);
    await expect(createService().verify(extraClaim)).rejects.toBeInstanceOf(InvalidAccessTokenError);
  });

  it('rejects oversized tokens before verification', async () => {
    await expect(createService().verify('a'.repeat(4_097))).rejects.toBeInstanceOf(
      InvalidAccessTokenError,
    );
  });

  it('rejects non-canonical secrets, unsafe TTLs, and invalid identifiers', async () => {
    expect(() => new AccessTokenService({ accessTokenSecret: 'bad', accessTokenTtlSeconds: 600 })).toThrow(
      'Invalid access token configuration',
    );
    expect(() => new AccessTokenService({ accessTokenSecret: secret, accessTokenTtlSeconds: 59 })).toThrow(
      'Invalid access token configuration',
    );
    await expect(createService().sign({ ...subject, userId: '' })).rejects.toThrow('Invalid userId');
    await expect(createService().sign({ ...subject, sessionId: 's'.repeat(31) })).rejects.toThrow(
      'Invalid sessionId',
    );
  });
});
