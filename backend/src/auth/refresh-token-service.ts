import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const REFRESH_TOKEN_BYTES = 32;
const REFRESH_TOKEN_LENGTH = 43;
const REFRESH_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const REFRESH_TOKEN_DIGEST_BYTES = 32;
const INVALID_TOKEN_DIGEST = Buffer.alloc(REFRESH_TOKEN_DIGEST_BYTES);

export interface IssuedRefreshToken {
  /** Return this value to the client once; never persist it. */
  readonly token: string;
  /** Persist only this SHA-256 digest. */
  readonly digest: Buffer;
}

export function issueRefreshToken(): IssuedRefreshToken {
  const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  return Object.freeze({ token, digest: digestRefreshToken(token) });
}

export function digestRefreshToken(token: string): Buffer {
  if (!isValidRefreshToken(token)) {
    throw new TypeError('Invalid refresh token');
  }

  return createHash('sha256').update(token, 'utf8').digest();
}

export function verifyRefreshTokenDigest(token: string, expectedDigest: Uint8Array): boolean {
  const validToken = isValidRefreshToken(token);
  const candidateDigest = validToken
    ? createHash('sha256').update(token, 'utf8').digest()
    : INVALID_TOKEN_DIGEST;
  const validDigest = expectedDigest.byteLength === REFRESH_TOKEN_DIGEST_BYTES;
  const comparableDigest = validDigest ? Buffer.from(expectedDigest) : INVALID_TOKEN_DIGEST;
  const matches = timingSafeEqual(candidateDigest, comparableDigest);

  return validToken && validDigest && matches;
}

function isValidRefreshToken(token: string): boolean {
  if (token.length !== REFRESH_TOKEN_LENGTH || !REFRESH_TOKEN_PATTERN.test(token)) {
    return false;
  }

  const decoded = Buffer.from(token, 'base64url');
  return decoded.byteLength === REFRESH_TOKEN_BYTES && decoded.toString('base64url') === token;
}
