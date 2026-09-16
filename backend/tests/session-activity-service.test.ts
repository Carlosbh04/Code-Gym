import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  AuthSessionRepository,
} from '../src/auth/auth-session-repository.js';

import {
  InactiveSessionError,
  SessionActivityService,
} from '../src/auth/session-activity-service.js';

const now =
  new Date(
    '2026-09-16T07:30:00.000Z',
  );

const authConfig = {
  idleSessionTimeoutSeconds:
    900,
};

type TouchSessionActivity =
  AuthSessionRepository[
    'touchSessionActivity'
  ];

describe(
  'session activity service',
  () => {
    it(
      'records activity using backend time and the configured idle cutoff',
      async () => {
        const touchSessionActivity =
          vi
            .fn<TouchSessionActivity>()
            .mockResolvedValue(
              true,
            );

        const service =
          new SessionActivityService(
            {
              touchSessionActivity,
            },
            authConfig,
            () => now,
          );

        await service.recordActivity(
          'user-1',
          'session-1',
        );

        expect(
          touchSessionActivity,
        ).toHaveBeenCalledOnce();

        expect(
          touchSessionActivity,
        ).toHaveBeenCalledWith({
          userId:
            'user-1',
          sessionId:
            'session-1',
          occurredAt:
            now,
          idleCutoff:
            new Date(
              now.getTime()
              - 900_000,
            ),
        });
      },
    );

    it(
      'rejects when the repository refuses to update the session',
      async () => {
        const touchSessionActivity =
          vi
            .fn<TouchSessionActivity>()
            .mockResolvedValue(
              false,
            );

        const service =
          new SessionActivityService(
            {
              touchSessionActivity,
            },
            authConfig,
            () => now,
          );

        await expect(
          service.recordActivity(
            'user-1',
            'session-1',
          ),
        ).rejects.toBeInstanceOf(
          InactiveSessionError,
        );
      },
    );
  },
);
