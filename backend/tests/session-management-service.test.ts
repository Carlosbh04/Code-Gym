import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  AuthSessionPublicRecord,
  AuthSessionRepository,
} from '../src/auth/auth-session-repository.js';
import {
  SessionManagementService,
} from '../src/auth/session-management-service.js';

const now =
  new Date(
    '2026-09-11T15:00:00.000Z',
  );

const currentSession:
  AuthSessionPublicRecord = {
    id:
      'session-current',

    createdAt:
      new Date(
        '2026-09-10T10:00:00.000Z',
      ),

    expiresAt:
      new Date(
        '2026-10-10T10:00:00.000Z',
      ),

    rotatedAt:
      null,

    revokedAt:
      null,
  };

const otherSession:
  AuthSessionPublicRecord = {
    id:
      'session-other',

    createdAt:
      new Date(
        '2026-09-09T10:00:00.000Z',
      ),

    expiresAt:
      new Date(
        '2026-10-09T10:00:00.000Z',
      ),

    rotatedAt:
      new Date(
        '2026-09-10T12:00:00.000Z',
      ),

    revokedAt:
      null,
  };

function createRepository(
  overrides:
    Partial<
      Pick<
        AuthSessionRepository,
        | 'findSessionsByUserId'
        | 'revokeSessionById'
        | 'revokeOtherSessions'
      >
    > = {},
): Pick<
  AuthSessionRepository,
  | 'findSessionsByUserId'
  | 'revokeSessionById'
  | 'revokeOtherSessions'
> {
  return {
    findSessionsByUserId:
      vi
        .fn<
          AuthSessionRepository[
            'findSessionsByUserId'
          ]
        >()
        .mockResolvedValue(
          [],
        ),

    revokeSessionById:
      vi
        .fn<
          AuthSessionRepository[
            'revokeSessionById'
          ]
        >()
        .mockResolvedValue(
          false,
        ),

    revokeOtherSessions:
      vi
        .fn<
          AuthSessionRepository[
            'revokeOtherSessions'
          ]
        >()
        .mockResolvedValue(
          0,
        ),

    ...overrides,
  };
}

describe(
  'session management service',
  () => {
    it('lists only active sessions and marks the current session', async () => {
      const revokedSession:
        AuthSessionPublicRecord = {
          id:
            'session-revoked',

          createdAt:
            new Date(
              '2026-09-08T10:00:00.000Z',
            ),

          expiresAt:
            new Date(
              '2026-10-08T10:00:00.000Z',
            ),

          rotatedAt:
            null,

          revokedAt:
            new Date(
              '2026-09-11T14:00:00.000Z',
            ),
        };

      const expiredSession:
        AuthSessionPublicRecord = {
          id:
            'session-expired',

          createdAt:
            new Date(
              '2026-09-01T10:00:00.000Z',
            ),

          expiresAt:
            new Date(
              '2026-09-11T14:59:59.999Z',
            ),

          rotatedAt:
            null,

          revokedAt:
            null,
        };

      const findSessionsByUserId =
        vi
          .fn<
            AuthSessionRepository[
              'findSessionsByUserId'
            ]
          >()
          .mockResolvedValue([
            currentSession,
            otherSession,
            revokedSession,
            expiredSession,
          ]);

      const repository =
        createRepository({
          findSessionsByUserId,
        });

      const service =
        new SessionManagementService(
          repository,
          () => now,
        );

      const result =
        await service.listSessions({
          userId:
            'user-1',

          currentSessionId:
            'session-current',
        });

      expect(
        findSessionsByUserId,
      ).toHaveBeenCalledOnce();

      expect(
        findSessionsByUserId,
      ).toHaveBeenCalledWith(
        'user-1',
      );

      expect(result).toEqual([
        {
          id:
            'session-current',

          createdAt:
            currentSession.createdAt
              .toISOString(),

          expiresAt:
            currentSession.expiresAt
              .toISOString(),

          rotatedAt:
            null,

          isCurrent:
            true,
        },

        {
          id:
            'session-other',

          createdAt:
            otherSession.createdAt
              .toISOString(),

          expiresAt:
            otherSession.expiresAt
              .toISOString(),

          rotatedAt:
            otherSession.rotatedAt
              ?.toISOString()
              ?? null,

          isCurrent:
            false,
        },
      ]);
    });

    it('does not expose internal session fields', async () => {
      const repository =
        createRepository({
          findSessionsByUserId:
            vi
              .fn<
                AuthSessionRepository[
                  'findSessionsByUserId'
                ]
              >()
              .mockResolvedValue([
                currentSession,
              ]),
        });

      const service =
        new SessionManagementService(
          repository,
          () => now,
        );

      const result =
        await service.listSessions({
          userId:
            'user-1',

          currentSessionId:
            'session-current',
        });

      const session =
        result[0];

      expect(
        session,
      ).toBeDefined();

      expect(
        session,
      ).not.toHaveProperty(
        'userId',
      );

      expect(
        session,
      ).not.toHaveProperty(
        'refreshTokenDigest',
      );

      expect(
        session,
      ).not.toHaveProperty(
        'revokedAt',
      );
    });

    it('revokes a session using both session id and authenticated user id', async () => {
      const revokeSessionById =
        vi
          .fn<
            AuthSessionRepository[
              'revokeSessionById'
            ]
          >()
          .mockResolvedValue(
            true,
          );

      const repository =
        createRepository({
          revokeSessionById,
        });

      const service =
        new SessionManagementService(
          repository,
          () => now,
        );

      const result =
        await service.revokeSession({
          userId:
            'user-1',

          sessionId:
            'session-other',
        });

      expect(result).toBe(true);

      expect(
        revokeSessionById,
      ).toHaveBeenCalledOnce();

      expect(
        revokeSessionById,
      ).toHaveBeenCalledWith({
        userId:
          'user-1',

        sessionId:
          'session-other',

        revokedAt:
          now,
      });
    });

    it('returns false when the requested session does not belong to the authenticated user or does not exist', async () => {
      const revokeSessionById =
        vi
          .fn<
            AuthSessionRepository[
              'revokeSessionById'
            ]
          >()
          .mockResolvedValue(
            false,
          );

      const repository =
        createRepository({
          revokeSessionById,
        });

      const service =
        new SessionManagementService(
          repository,
          () => now,
        );

      const result =
        await service.revokeSession({
          userId:
            'user-1',

          sessionId:
            'session-not-owned',
        });

      expect(result).toBe(false);

      expect(
        revokeSessionById,
      ).toHaveBeenCalledWith({
        userId:
          'user-1',

        sessionId:
          'session-not-owned',

        revokedAt:
          now,
      });
    });

    it('revokes every other session while preserving the current session', async () => {
      const revokeOtherSessions =
        vi
          .fn<
            AuthSessionRepository[
              'revokeOtherSessions'
            ]
          >()
          .mockResolvedValue(
            3,
          );

      const repository =
        createRepository({
          revokeOtherSessions,
        });

      const service =
        new SessionManagementService(
          repository,
          () => now,
        );

      const result =
        await service.revokeOtherSessions({
          userId:
            'user-1',

          currentSessionId:
            'session-current',
        });

      expect(result).toBe(3);

      expect(
        revokeOtherSessions,
      ).toHaveBeenCalledOnce();

      expect(
        revokeOtherSessions,
      ).toHaveBeenCalledWith({
        userId:
          'user-1',

        currentSessionId:
          'session-current',

        revokedAt:
          now,
      });
    });

    it('propagates repository failures while listing sessions', async () => {
      const failure =
        new Error(
          'database unavailable',
        );

      const repository =
        createRepository({
          findSessionsByUserId:
            vi
              .fn<
                AuthSessionRepository[
                  'findSessionsByUserId'
                ]
              >()
              .mockRejectedValue(
                failure,
              ),
        });

      const service =
        new SessionManagementService(
          repository,
          () => now,
        );

      await expect(
        service.listSessions({
          userId:
            'user-1',

          currentSessionId:
            'session-current',
        }),
      ).rejects.toBe(
        failure,
      );
    });
  },
);