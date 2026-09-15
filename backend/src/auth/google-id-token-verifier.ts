import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
} from 'jose';

import type {
  GoogleAuthConfig,
} from '../config/env.js';

const googleJwks =
  createRemoteJWKSet(
    new URL(
      'https://www.googleapis.com/oauth2/v3/certs',
    ),
  );

const googleIssuers: string[] = [
  'https://accounts.google.com',
  'accounts.google.com',
];

export interface VerifiedGoogleIdentity {
  readonly providerUserId: string;
  readonly email: string;
  readonly displayName: string | null;
}

export class InvalidGoogleIdTokenError
extends Error {
  public constructor() {
    super('Invalid Google ID token');
    this.name =
      'InvalidGoogleIdTokenError';
  }
}

export type GoogleJwtVerifier = (
  token: string,
  clientId: string,
) => Promise<JWTPayload>;

async function verifyGoogleJwt(
  token: string,
  clientId: string,
): Promise<JWTPayload> {
  const { payload } =
    await jwtVerify(
      token,
      googleJwks,
      {
        audience: clientId,
        issuer: googleIssuers,
        algorithms: ['RS256'],
      },
    );

  return payload;
}

function readNonEmptyString(
  value: unknown,
): string | null {
  if (
    typeof value !== 'string'
    || value.trim() === ''
  ) {
    return null;
  }

  return value.trim();
}

export class GoogleIdTokenVerifier {
  public constructor(
    private readonly config:
      GoogleAuthConfig,
    private readonly verifyJwt:
      GoogleJwtVerifier =
        verifyGoogleJwt,
  ) {}

  public async verify(
    idToken: string,
  ): Promise<VerifiedGoogleIdentity> {
    if (
      typeof idToken !== 'string'
      || idToken.trim() === ''
    ) {
      throw new InvalidGoogleIdTokenError();
    }

    let payload: JWTPayload;

    try {
      payload =
        await this.verifyJwt(
          idToken,
          this.config.clientId,
        );
    } catch {
      throw new InvalidGoogleIdTokenError();
    }

    const providerUserId =
      readNonEmptyString(
        payload.sub,
      );

    const email =
      readNonEmptyString(
        payload.email,
      );

    if (
      providerUserId === null
      || email === null
      || payload.email_verified !== true
    ) {
      throw new InvalidGoogleIdTokenError();
    }

    const name =
      readNonEmptyString(
        payload.name,
      );

    return Object.freeze({
      providerUserId,
      email,
      displayName: name,
    });
  }
}
