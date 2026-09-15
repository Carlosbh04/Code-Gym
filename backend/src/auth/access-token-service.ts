import { SignJWT, jwtVerify } from 'jose';

import type { AuthConfig } from '../config/env.js';

const ACCESS_TOKEN_ALGORITHM = 'HS256';
const ACCESS_TOKEN_TYPE = 'at+jwt';
const ACCESS_TOKEN_ISSUER = 'codegym-backend';
const ACCESS_TOKEN_AUDIENCE = 'codegym-api';
const MAX_ACCESS_TOKEN_BYTES = 4_096;
const ACCESS_TOKEN_SECRET_BYTES = 32;
const EXPECTED_CLAIMS = Object.freeze(['aud', 'exp', 'iat', 'iss', 'sid', 'sub']);
const EXPECTED_HEADER_FIELDS = Object.freeze(['alg', 'typ']);

export interface AccessTokenSubject {
  readonly userId: string;
  readonly sessionId: string;
}

export interface AccessTokenClaims {
  readonly sub: string;
  readonly sid: string;
  readonly iat: number;
  readonly exp: number;
}

export type AuthClock = () => Date;

export class InvalidAccessTokenError extends Error {
  public constructor() {
    super('Invalid access token');
    this.name = 'InvalidAccessTokenError';
  }
}

export class AccessTokenService {
  readonly #key: Uint8Array;
  readonly #ttlSeconds: number;
  readonly #clock: AuthClock;

  public constructor(
    config: Pick<AuthConfig, 'accessTokenSecret' | 'accessTokenTtlSeconds'>,
    clock: AuthClock = () => new Date(),
  ) {
    const key = Buffer.from(config.accessTokenSecret, 'base64url');
    if (
      key.byteLength !== ACCESS_TOKEN_SECRET_BYTES
      || key.toString('base64url') !== config.accessTokenSecret
      || !Number.isInteger(config.accessTokenTtlSeconds)
      || config.accessTokenTtlSeconds < 60
      || config.accessTokenTtlSeconds > 900
    ) {
      throw new TypeError('Invalid access token configuration');
    }

    this.#key = key;
    this.#ttlSeconds = config.accessTokenTtlSeconds;
    this.#clock = clock;
  }

  public async sign(subject: AccessTokenSubject): Promise<string> {
    assertIdentifier(subject.userId, 'userId');
    assertIdentifier(subject.sessionId, 'sessionId');

    const issuedAt = Math.floor(this.#clock().getTime() / 1_000);

    return new SignJWT({ sid: subject.sessionId })
      .setProtectedHeader({ alg: ACCESS_TOKEN_ALGORITHM, typ: ACCESS_TOKEN_TYPE })
      .setIssuer(ACCESS_TOKEN_ISSUER)
      .setAudience(ACCESS_TOKEN_AUDIENCE)
      .setSubject(subject.userId)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + this.#ttlSeconds)
      .sign(this.#key);
  }

  public async verify(token: string): Promise<AccessTokenClaims> {
    if (Buffer.byteLength(token, 'utf8') > MAX_ACCESS_TOKEN_BYTES) {
      throw new InvalidAccessTokenError();
    }

    try {
      const { payload, protectedHeader } = await jwtVerify(token, this.#key, {
        algorithms: [ACCESS_TOKEN_ALGORITHM],
        typ: ACCESS_TOKEN_TYPE,
        issuer: ACCESS_TOKEN_ISSUER,
        audience: ACCESS_TOKEN_AUDIENCE,
        requiredClaims: ['sub', 'sid', 'iat', 'exp'],
        currentDate: this.#clock(),
        clockTolerance: 5,
        maxTokenAge: this.#ttlSeconds,
      });

      const claimNames = Object.keys(payload).sort();
      const headerNames = Object.keys(protectedHeader).sort();
      if (
        protectedHeader.alg !== ACCESS_TOKEN_ALGORITHM
        || protectedHeader.typ !== ACCESS_TOKEN_TYPE
        || headerNames.length !== EXPECTED_HEADER_FIELDS.length
        || headerNames.some((header, index) => header !== EXPECTED_HEADER_FIELDS[index])
        || claimNames.length !== EXPECTED_CLAIMS.length
        || claimNames.some((claim, index) => claim !== EXPECTED_CLAIMS[index])
        || typeof payload.sub !== 'string'
        || typeof payload.sid !== 'string'
        || typeof payload.iat !== 'number'
        || typeof payload.exp !== 'number'
        || payload.sub.length === 0
        || payload.sid.length === 0
        || payload.exp - payload.iat !== this.#ttlSeconds
      ) {
        throw new InvalidAccessTokenError();
      }

      return Object.freeze({
        sub: payload.sub,
        sid: payload.sid,
        iat: payload.iat,
        exp: payload.exp,
      });
    } catch {
      throw new InvalidAccessTokenError();
    }
  }
}

function assertIdentifier(value: string, field: string): void {
  if (value.length === 0 || value.length > 30) {
    throw new TypeError(`Invalid ${field}`);
  }
}
