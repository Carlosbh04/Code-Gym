import type { AuthConfig } from '../config/env.js';

import type { AccessTokenService } from './access-token-service.js';
import type { AuthSessionRepository } from './auth-session-repository.js';
import {
  digestRefreshToken,
  issueRefreshToken,
} from './refresh-token-service.js';

export interface RefreshResult {
  readonly accessToken: string;
  readonly refreshToken: string;
}

export class InvalidRefreshSessionError extends Error {
  public constructor() {
    super('Invalid refresh session');
    this.name = 'InvalidRefreshSessionError';
  }
}

export type RefreshClock = () => Date;

export class RefreshService {
  public constructor(
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly accessTokenService: AccessTokenService,
    private readonly authConfig: Pick<AuthConfig, 'refreshTokenTtlSeconds'>,
    private readonly clock: RefreshClock = () => new Date(),
  ) {}

  public async refresh(
    refreshToken: string,
  ): Promise<RefreshResult> {
    let currentDigest: Buffer;

    try {
      currentDigest = digestRefreshToken(refreshToken);
    } catch {
      throw new InvalidRefreshSessionError();
    }

    const session =
      await this.authSessionRepository.findSessionByRefreshTokenDigest(
        currentDigest,
      );

    if (session === null) {
      throw new InvalidRefreshSessionError();
    }

    const now = this.clock();

    if (
      session.revokedAt !== null
      || session.expiresAt.getTime() <= now.getTime()
    ) {
      throw new InvalidRefreshSessionError();
    }

    const nextRefreshToken = issueRefreshToken();

    const nextExpiresAt = new Date(
      now.getTime()
        + this.authConfig.refreshTokenTtlSeconds * 1_000,
    );

    const rotatedSession =
      await this.authSessionRepository.rotateSession({
        sessionId: session.id,
        currentRefreshTokenDigest: currentDigest,
        nextRefreshTokenDigest: nextRefreshToken.digest,
        rotatedAt: now,
        expiresAt: nextExpiresAt,
      });

    if (rotatedSession === null) {
      throw new InvalidRefreshSessionError();
    }

    const accessToken =
      await this.accessTokenService.sign({
        userId: rotatedSession.userId,
        sessionId: rotatedSession.id,
      });

    return Object.freeze({
      accessToken,
      refreshToken: nextRefreshToken.token,
    });
  }
}