import type {
  AuthSessionPublicRecord,
  AuthSessionRepository,
} from './auth-session-repository.js';

export interface PublicAuthSession {
  readonly id: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly rotatedAt: string | null;
  readonly isCurrent: boolean;
}

export interface ListSessionsInput {
  readonly userId: string;
  readonly currentSessionId: string;
}

export interface RevokeSessionInput {
  readonly userId: string;
  readonly sessionId: string;
}

export interface RevokeOtherSessionsInput {
  readonly userId: string;
  readonly currentSessionId: string;
}

export type SessionManagementClock =
  () => Date;

export class SessionManagementService {
  public constructor(
    private readonly authSessionRepository:
      Pick<
        AuthSessionRepository,
        | 'findSessionsByUserId'
        | 'revokeSessionById'
        | 'revokeOtherSessions'
      >,

    private readonly clock:
      SessionManagementClock =
        () => new Date(),
  ) {}

  public async listSessions(
    input: ListSessionsInput,
  ): Promise<
    readonly PublicAuthSession[]
  > {
    const sessions =
      await this.authSessionRepository
        .findSessionsByUserId(
          input.userId,
        );

    const now =
      this.clock();

    return sessions
      .filter(
        (session) =>
          isActiveSession(
            session,
            now,
          ),
      )
      .map(
        (session) =>
          toPublicSession(
            session,
            input.currentSessionId,
          ),
      );
  }

  public async revokeSession(
    input: RevokeSessionInput,
  ): Promise<boolean> {
    return this.authSessionRepository
      .revokeSessionById({
        userId:
          input.userId,

        sessionId:
          input.sessionId,

        revokedAt:
          this.clock(),
      });
  }

  public async revokeOtherSessions(
    input:
      RevokeOtherSessionsInput,
  ): Promise<number> {
    return this.authSessionRepository
      .revokeOtherSessions({
        userId:
          input.userId,

        currentSessionId:
          input.currentSessionId,

        revokedAt:
          this.clock(),
      });
  }
}

function isActiveSession(
  session:
    AuthSessionPublicRecord,
  now: Date,
): boolean {
  return (
    session.revokedAt === null
    && session.expiresAt.getTime()
      > now.getTime()
  );
}

function toPublicSession(
  session:
    AuthSessionPublicRecord,
  currentSessionId: string,
): PublicAuthSession {
  return Object.freeze({
    id:
      session.id,

    createdAt:
      session.createdAt
        .toISOString(),

    expiresAt:
      session.expiresAt
        .toISOString(),

    rotatedAt:
      session.rotatedAt
        ?.toISOString()
      ?? null,

    isCurrent:
      session.id
      === currentSessionId,
  });
}