import type {
  PrismaClient,
} from '../generated/prisma/client.js';

export interface CreateAuthSessionRecord {
  readonly userId: string;
  readonly refreshTokenDigest: Uint8Array;
  readonly expiresAt: Date;
}

export interface RotateAuthSessionRecord {
  readonly sessionId: string;
  readonly currentRefreshTokenDigest: Uint8Array;
  readonly nextRefreshTokenDigest: Uint8Array;
  readonly rotatedAt: Date;
  readonly expiresAt: Date;
}

export interface RevokeAuthSessionByRefreshTokenDigestInput {
  readonly digest: Uint8Array;
  readonly revokedAt: Date;
}

export interface RevokeAuthSessionByIdInput {
  readonly sessionId: string;
  readonly userId: string;
  readonly revokedAt: Date;
}

export interface RevokeOtherAuthSessionsInput {
  readonly userId: string;
  readonly currentSessionId: string;
  readonly revokedAt: Date;
}

export interface AuthSessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly refreshTokenDigest: Uint8Array;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly rotatedAt: Date | null;
  readonly revokedAt: Date | null;
}

export interface AuthSessionAuthenticationRecord {
  readonly userId: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}

export interface AuthSessionPublicRecord {
  readonly id: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly rotatedAt: Date | null;
  readonly revokedAt: Date | null;
}

export interface AuthSessionRepository {
  createSession(
    session: CreateAuthSessionRecord,
  ): Promise<AuthSessionRecord>;

  findSessionByRefreshTokenDigest(
    refreshTokenDigest: Uint8Array,
  ): Promise<AuthSessionRecord | null>;

  findSessionById(
    sessionId: string,
  ): Promise<AuthSessionAuthenticationRecord | null>;

  findSessionsByUserId(
    userId: string,
  ): Promise<readonly AuthSessionPublicRecord[]>;

  rotateSession(
    session: RotateAuthSessionRecord,
  ): Promise<AuthSessionRecord | null>;

  revokeSessionByRefreshTokenDigest(
    input: RevokeAuthSessionByRefreshTokenDigestInput,
  ): Promise<void>;

  revokeSessionById(
    input: RevokeAuthSessionByIdInput,
  ): Promise<boolean>;

  revokeOtherSessions(
    input: RevokeOtherAuthSessionsInput,
  ): Promise<number>;
}

const authSessionSelect = {
  id: true,
  userId: true,
  refreshTokenDigest: true,
  createdAt: true,
  expiresAt: true,
  rotatedAt: true,
  revokedAt: true,
} as const;

const authSessionAuthenticationSelect = {
  userId: true,
  expiresAt: true,
  revokedAt: true,
} as const;

const authSessionPublicSelect = {
  id: true,
  createdAt: true,
  expiresAt: true,
  rotatedAt: true,
  revokedAt: true,
} as const;

export class PrismaAuthSessionRepository
implements AuthSessionRepository {
  public constructor(
    private readonly prisma:
      PrismaClient,
  ) {}

  public async createSession(
    session: CreateAuthSessionRecord,
  ): Promise<AuthSessionRecord> {
    return this.prisma.authSession.create({
      data: {
        userId:
          session.userId,

        refreshTokenDigest:
          new Uint8Array(
            session.refreshTokenDigest,
          ),

        expiresAt:
          session.expiresAt,
      },

      select:
        authSessionSelect,
    });
  }

  public async findSessionByRefreshTokenDigest(
    refreshTokenDigest: Uint8Array,
  ): Promise<AuthSessionRecord | null> {
    return this.prisma.authSession.findUnique({
      where: {
        refreshTokenDigest:
          new Uint8Array(
            refreshTokenDigest,
          ),
      },

      select:
        authSessionSelect,
    });
  }

  public async findSessionById(
    sessionId: string,
  ): Promise<
    AuthSessionAuthenticationRecord | null
  > {
    return this.prisma.authSession.findUnique({
      where: {
        id:
          sessionId,
      },

      select:
        authSessionAuthenticationSelect,
    });
  }

  public async findSessionsByUserId(
    userId: string,
  ): Promise<
    readonly AuthSessionPublicRecord[]
  > {
    return this.prisma.authSession.findMany({
      where: {
        userId,
      },

      orderBy: {
        createdAt:
          'desc',
      },

      select:
        authSessionPublicSelect,
    });
  }

  public async rotateSession(
    session: RotateAuthSessionRecord,
  ): Promise<AuthSessionRecord | null> {
    const result =
      await this.prisma.authSession.updateMany({
        where: {
          id:
            session.sessionId,

          refreshTokenDigest:
            new Uint8Array(
              session
                .currentRefreshTokenDigest,
            ),

          revokedAt:
            null,

          expiresAt: {
            gt:
              session.rotatedAt,
          },
        },

        data: {
          refreshTokenDigest:
            new Uint8Array(
              session
                .nextRefreshTokenDigest,
            ),

          rotatedAt:
            session.rotatedAt,

          expiresAt:
            session.expiresAt,
        },
      });

    if (
      result.count !== 1
    ) {
      return null;
    }

    return this.prisma.authSession.findUnique({
      where: {
        id:
          session.sessionId,
      },

      select:
        authSessionSelect,
    });
  }

  public async revokeSessionByRefreshTokenDigest(
    input:
      RevokeAuthSessionByRefreshTokenDigestInput,
  ): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: {
        refreshTokenDigest:
          new Uint8Array(
            input.digest,
          ),

        revokedAt:
          null,
      },

      data: {
        revokedAt:
          input.revokedAt,
      },
    });
  }

  public async revokeSessionById(
    input:
      RevokeAuthSessionByIdInput,
  ): Promise<boolean> {
    const result =
      await this.prisma.authSession.updateMany({
        where: {
          id:
            input.sessionId,

          userId:
            input.userId,

          revokedAt:
            null,
        },

        data: {
          revokedAt:
            input.revokedAt,
        },
      });

    return (
      result.count === 1
    );
  }

  public async revokeOtherSessions(
    input:
      RevokeOtherAuthSessionsInput,
  ): Promise<number> {
    const result =
      await this.prisma.authSession.updateMany({
        where: {
          userId:
            input.userId,

          id: {
            not:
              input.currentSessionId,
          },

          revokedAt:
            null,
        },

        data: {
          revokedAt:
            input.revokedAt,
        },
      });

    return result.count;
  }
}