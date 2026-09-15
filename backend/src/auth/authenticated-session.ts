import type {
  AuthConfig,
} from '../config/env.js';

import type {
  AccessTokenService,
} from './access-token-service.js';

import type {
  AuthSessionRepository,
} from './auth-session-repository.js';

import {
  toPublicUser,
  type PublicUser,
  type PublicUserSource,
} from './public-user.js';

import {
  issueRefreshToken,
} from './refresh-token-service.js';

export interface AuthenticatedSessionResult {
  readonly user: PublicUser;
  readonly accessToken: string;
  readonly refreshToken: string;
}

export type AuthenticatedSessionClock =
  () => Date;

export class AuthenticatedSessionIssuer {
  public constructor(
    private readonly authSessionRepository:
      AuthSessionRepository,
    private readonly accessTokenService:
      AccessTokenService,
    private readonly authConfig:
      Pick<AuthConfig, 'refreshTokenTtlSeconds'>,
    private readonly clock:
      AuthenticatedSessionClock =
        () => new Date(),
  ) {}

  public async issue(
    user: PublicUserSource,
    remembered: boolean = true,
  ): Promise<AuthenticatedSessionResult> {
    const refreshToken =
      issueRefreshToken();

    const expiresAt =
      new Date(
        this.clock().getTime()
          + this.authConfig
            .refreshTokenTtlSeconds
            * 1_000,
      );

    const session =
      await this.authSessionRepository
        .createSession({
          userId:
            user.id,
          refreshTokenDigest:
            refreshToken.digest,
          expiresAt,
          remembered,
        });

    const accessToken =
      await this.accessTokenService.sign({
        userId:
          user.id,
        sessionId:
          session.id,
      });

    return Object.freeze({
      user:
        toPublicUser(user),
      accessToken,
      refreshToken:
        refreshToken.token,
    });
  }
}
