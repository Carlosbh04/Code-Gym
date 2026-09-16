import express, {
  type RequestHandler,
} from 'express';
import request from 'supertest';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  CurrentUserService,
} from '../src/auth/current-user-service.js';
import type {
  LoginService,
} from '../src/auth/login-service.js';
import type {
  LogoutService,
} from '../src/auth/logout-service.js';
import type {
  RefreshService,
} from '../src/auth/refresh-service.js';
import type {
  RegistrationService,
} from '../src/auth/user-service.js';
import type {
  SessionManagementService,
} from '../src/auth/session-management-service.js';

import {
  InactiveSessionError,
  type SessionActivityService,
} from '../src/auth/session-activity-service.js';

import {
  createAuthRouter,
} from '../src/routes/auth.js';

import {
  testConfig,
} from './helpers.js';

type RecordActivity =
  SessionActivityService[
    'recordActivity'
  ];

const authenticatedUserId =
  'user-1';

const authenticatedSessionId =
  'session-1';

const authenticatedRequireAuth:
RequestHandler = (
  request,
  _response,
  next,
) => {
  request.auth =
    Object.freeze({
      userId:
        authenticatedUserId,
      sessionId:
        authenticatedSessionId,
    });

  next();
};

const rejectingRequireAuth:
RequestHandler = (
  _request,
  response,
) => {
  response.status(401).json({
    error: {
      code:
        'UNAUTHORIZED',
      message:
        'Authentication required',
    },
  });
};

const unusedRegistrationService =
  {} as RegistrationService;

const unusedLoginService =
  {} as LoginService;

const unusedRefreshService =
  {} as RefreshService;

const unusedLogoutService =
  {} as LogoutService;

const unusedCurrentUserService =
  {} as Pick<
    CurrentUserService,
    'getCurrentUser'
  >;

const unusedSessionManagementService =
  {} as Pick<
    SessionManagementService,
    | 'listSessions'
    | 'revokeSession'
    | 'revokeOtherSessions'
  >;

function testApp(
  recordActivity: RecordActivity,
  requireAuth:
    RequestHandler =
      authenticatedRequireAuth,
) {
  const app =
    express();

  app.use(
    express.json(),
  );

  app.use(
    createAuthRouter({
      registrationService:
        unusedRegistrationService,
      loginService:
        unusedLoginService,
      googleLoginService:
        undefined,
      refreshService:
        unusedRefreshService,
      logoutService:
        unusedLogoutService,
      currentUserService:
        unusedCurrentUserService,
      profileService:
        undefined,
      passwordResetService:
        undefined,
      passwordChangeService:
        undefined,
      sessionManagementService:
        unusedSessionManagementService,
      sessionActivityService: {
        recordActivity,
      },
      requireAuth,
      config:
        testConfig(),
    }),
  );

  return app;
}

describe(
  'POST /auth/activity',
  () => {
    it(
      'records activity from the authenticated context and returns 204',
      async () => {
        const recordActivity =
          vi
            .fn<RecordActivity>()
            .mockResolvedValue();

        const response =
          await request(
            testApp(
              recordActivity,
            ),
          )
            .post(
              '/auth/activity',
            )
            .set(
              'Origin',
              'https://app.example.com',
            );

        expect(
          response.status,
        ).toBe(204);

        expect(
          recordActivity,
        ).toHaveBeenCalledOnce();

        expect(
          recordActivity,
        ).toHaveBeenCalledWith(
          authenticatedUserId,
          authenticatedSessionId,
        );

        expect(
          response.text,
        ).toBe('');
      },
    );

    it(
      'does not record activity when authentication fails',
      async () => {
        const recordActivity =
          vi
            .fn<RecordActivity>()
            .mockResolvedValue();

        const response =
          await request(
            testApp(
              recordActivity,
              rejectingRequireAuth,
            ),
          )
            .post(
              '/auth/activity',
            )
            .set(
              'Origin',
              'https://app.example.com',
            );

        expect(
          response.status,
        ).toBe(401);

        expect(
          recordActivity,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'rejects an untrusted origin without recording activity',
      async () => {
        const recordActivity =
          vi
            .fn<RecordActivity>()
            .mockResolvedValue();

        const response =
          await request(
            testApp(
              recordActivity,
            ),
          )
            .post(
              '/auth/activity',
            )
            .set(
              'Origin',
              'https://attacker.example.com',
            );

        expect(
          response.status,
        ).toBe(403);

        expect(
          recordActivity,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'returns the uniform 401 when the session can no longer record activity',
      async () => {
        const recordActivity =
          vi
            .fn<RecordActivity>()
            .mockRejectedValue(
              new InactiveSessionError(),
            );

        const response =
          await request(
            testApp(
              recordActivity,
            ),
          )
            .post(
              '/auth/activity',
            )
            .set(
              'Origin',
              'https://app.example.com',
            );

        expect(
          response.status,
        ).toBe(401);

        expect(
          response.body,
        ).toEqual({
          error: {
            code:
              'UNAUTHORIZED',
            message:
              'Authentication required',
          },
        });

        expect(
          recordActivity,
        ).toHaveBeenCalledWith(
          authenticatedUserId,
          authenticatedSessionId,
        );
      },
    );
  },
);
