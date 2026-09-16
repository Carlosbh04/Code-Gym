import type { AuthConfig } from '../config/env.js';

import type {
  AuthSessionRepository,
} from './auth-session-repository.js';

export type SessionActivityClock =
  () => Date;

export class InactiveSessionError
extends Error {
  public constructor() {
    super(
      'Session is no longer active',
    );

    this.name =
      'InactiveSessionError';
  }
}

export class SessionActivityService {
  public constructor(
    private readonly authSessionRepository:
      Pick<
        AuthSessionRepository,
        'touchSessionActivity'
      >,
    private readonly authConfig:
      Pick<
        AuthConfig,
        'idleSessionTimeoutSeconds'
      >,
    private readonly clock:
      SessionActivityClock =
        () => new Date(),
  ) {}

  public async recordActivity(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const now =
      this.clock();

    const idleCutoff =
      new Date(
        now.getTime()
        - this.authConfig
          .idleSessionTimeoutSeconds
          * 1_000,
      );

    const updated =
      await this
        .authSessionRepository
        .touchSessionActivity({
          sessionId,
          userId,
          occurredAt:
            now,
          idleCutoff,
        });

    if (!updated) {
      throw new InactiveSessionError();
    }
  }
}
