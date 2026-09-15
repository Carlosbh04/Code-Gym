import type { AuthSessionRepository } from './auth-session-repository.js';
import { digestRefreshToken } from './refresh-token-service.js';

export type LogoutClock = () => Date;

export class LogoutService {
  public constructor(
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly clock: LogoutClock = () => new Date(),
  ) {}

  public async logout(
    refreshToken?: string,
  ): Promise<void> {
    if (refreshToken === undefined) {
      return;
    }

    let digest: Buffer;

    try {
      digest = digestRefreshToken(refreshToken);
    } catch {
      return;
    }

    await this.authSessionRepository.revokeSessionByRefreshTokenDigest({
      digest,
      revokedAt: this.clock(),
    });
  }
}
