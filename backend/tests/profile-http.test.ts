import type { RequestHandler } from 'express';
import pino from 'pino';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp, type AppDependencies } from '../src/app.js';
import { AuthenticatedUserNotFoundError } from '../src/auth/current-user-service.js';
import type { LoginService } from '../src/auth/login-service.js';
import type { LogoutService } from '../src/auth/logout-service.js';
import type { ProfileService } from '../src/auth/profile-service.js';
import type { PublicUser } from '../src/auth/public-user.js';
import type { RefreshService } from '../src/auth/refresh-service.js';
import type { RegistrationService } from '../src/auth/user-service.js';
import { testConfig } from './helpers.js';

const publicUser: PublicUser = {
  id: 'user-1',
  email: 'person@example.test',
  displayName: 'Carlos Hernández',
  role: 'USER',
  createdAt: '2026-09-10T10:00:00.000Z',
  updatedAt: '2026-09-13T10:00:00.000Z',
};

const authenticatedRequireAuth: RequestHandler = (request, _response, next) => {
  request.auth = Object.freeze({
    userId: 'user-1',
    sessionId: 'session-1',
  });
  next();
};

const unauthorizedRequireAuth: RequestHandler = (_request, response) => {
  response.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    },
  });
};

const unusedRegistrationService: RegistrationService = {
  register: () => Promise.reject(new Error('not exercised')),
};
const unusedLoginService = {
  login: () => Promise.reject(new Error('not exercised')),
} as unknown as LoginService;
const unusedRefreshService = {
  refresh: () => Promise.reject(new Error('not exercised')),
} as unknown as RefreshService;
const unusedLogoutService = {
  logout: () => Promise.reject(new Error('not exercised')),
} as unknown as LogoutService;
const unusedCurrentUserService: AppDependencies['currentUserService'] = {
  getCurrentUser: () => Promise.reject(new Error('not exercised')),
};
const unusedSessionManagementService: AppDependencies['sessionManagementService'] = {
  listSessions: () => Promise.reject(new Error('not exercised')),
  revokeSession: () => Promise.reject(new Error('not exercised')),
  revokeOtherSessions: () => Promise.reject(new Error('not exercised')),
};

function testApp(
  updateDisplayName: ProfileService['updateDisplayName'],
  requireAuth: RequestHandler = authenticatedRequireAuth,
) {
  return createApp({
    loginFailureKeySecret:
      'test-login-failure-key-secret',
    config: testConfig(),
    logger: pino({ level: 'silent' }),
    databaseHealthCheck: () => Promise.resolve(true),
    registrationService: unusedRegistrationService,
    loginService: unusedLoginService,
    refreshService: unusedRefreshService,
    logoutService: unusedLogoutService,
    currentUserService: unusedCurrentUserService,
    profileService: {
      updateDisplayName,
    },
    sessionManagementService: unusedSessionManagementService,
    requireAuth,
  });
}

describe('PATCH /auth/me', () => {
  it('requires authentication', async () => {
    const updateDisplayName = vi.fn<ProfileService['updateDisplayName']>();
    const response = await request(
      testApp(updateDisplayName, unauthorizedRequireAuth),
    )
      .patch('/auth/me')
      .send({ displayName: 'Ada' });

    expect(response.status).toBe(401);
    expect(updateDisplayName).not.toHaveBeenCalled();
  });

  it('updates the authenticated identity with the normalized name', async () => {
    const updateDisplayName = vi
      .fn<ProfileService['updateDisplayName']>()
      .mockResolvedValue(publicUser);
    const response = await request(testApp(updateDisplayName))
      .patch('/auth/me')
      .send({ displayName: '   Carlos Hernández   ' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: publicUser,
    });
    expect(updateDisplayName).toHaveBeenCalledOnce();
    expect(updateDisplayName).toHaveBeenCalledWith(
      'user-1',
      'Carlos Hernández',
    );
    expect(
      JSON.stringify(
        response.body,
      ),
    ).not.toContain(
      'passwordHash',
    );
  });

  it.each(['', '   ', 'a'.repeat(101)])(
    'rejects invalid displayName %j',
    async (displayName) => {
      const updateDisplayName = vi.fn<ProfileService['updateDisplayName']>();
      const response = await request(testApp(updateDisplayName))
        .patch('/auth/me')
        .send({ displayName });

      expect(response.status).toBe(400);
      expect(updateDisplayName).not.toHaveBeenCalled();
    },
  );

  it.each([
    'userId',
    'email',
    'role',
    'password',
    'passwordHash',
    'createdAt',
    'updatedAt',
  ])('rejects the client-controlled field %s', async (field) => {
    const updateDisplayName = vi.fn<ProfileService['updateDisplayName']>();
    const response = await request(testApp(updateDisplayName))
      .patch('/auth/me')
      .send({
        displayName: 'Ada',
        [field]: 'another-user',
      });

    expect(response.status).toBe(400);
    expect(updateDisplayName).not.toHaveBeenCalled();
  });

  it('returns the existing uniform 401 when the authenticated account disappeared', async () => {
    const response = await request(
      testApp(() => Promise.reject(new AuthenticatedUserNotFoundError())),
    )
      .patch('/auth/me')
      .send({ displayName: 'Ada' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  });

  it('does not trust a browser origin outside the configured allowlist', async () => {
    const updateDisplayName = vi.fn<ProfileService['updateDisplayName']>();
    const response = await request(testApp(updateDisplayName))
      .patch('/auth/me')
      .set('Origin', 'https://attacker.example.test')
      .send({ displayName: 'Ada' });

    expect(response.status).toBe(403);
    expect(updateDisplayName).not.toHaveBeenCalled();
  });
});
