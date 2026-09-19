import type { RequestHandler } from 'express';
import pino from 'pino';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp, type AppDependencies } from '../src/app.js';
import {
  InvalidCurrentPasswordError,
  NewPasswordSameAsCurrentError,
  PasswordChangeUserNotFoundError,
  type PasswordChangeService,
} from '../src/auth/password-change-service.js';
import { testConfig } from './helpers.js';

const unused = () => Promise.reject(new Error('not exercised'));

const authenticatedRequireAuth: RequestHandler = (incoming, _response, next) => {
  incoming.auth = Object.freeze({
    userId: 'authenticated-user',
    sessionId: 'current-session',
  });
  next();
};

const unauthorizedRequireAuth: RequestHandler = (_request, response) => {
  response.status(401).json({
    error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
  });
};

function testApp(
  changePassword: PasswordChangeService['changePassword'],
  requireAuth: RequestHandler = authenticatedRequireAuth,
) {
  return createApp({
    loginFailureKeySecret:
      'test-login-failure-key-secret',
    config: testConfig(),
    logger: pino({ level: 'silent' }),
    databaseHealthCheck: () => Promise.resolve(true),
    registrationService: { register: unused },
    loginService: { login: unused } as unknown as AppDependencies['loginService'],
    refreshService: { refresh: unused } as unknown as AppDependencies['refreshService'],
    logoutService: { logout: unused } as unknown as AppDependencies['logoutService'],
    currentUserService: { getCurrentUser: unused },
    passwordChangeService: { changePassword },
    sessionManagementService: {
      listSessions: unused,
      revokeSession: unused,
      revokeOtherSessions: unused,
    },
    requireAuth,
  });
}

const validBody = {
  currentPassword: 'current secure password',
  newPassword: 'new secure password value',
} as const;

describe('POST /auth/change-password', () => {
  it('requires an authenticated session', async () => {
    const changePassword = vi.fn<PasswordChangeService['changePassword']>();
    const response = await request(testApp(changePassword, unauthorizedRequireAuth))
      .post('/auth/change-password')
      .send(validBody);

    expect(response.status).toBe(401);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('derives user and current session exclusively from request.auth', async () => {
    const changePassword = vi.fn<PasswordChangeService['changePassword']>()
      .mockResolvedValue(undefined);
    const response = await request(testApp(changePassword))
      .post('/auth/change-password')
      .send(validBody);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
    expect(changePassword).toHaveBeenCalledWith({
      userId: 'authenticated-user',
      currentSessionId: 'current-session',
      ...validBody,
    });
  });

  it.each([
    ['userId', 'another-user'],
    ['email', 'victim@example.test'],
    ['sessionId', 'another-session'],
    ['role', 'ADMIN'],
  ])('rejects the client-controlled identity field %s', async (field, value) => {
    const changePassword = vi.fn<PasswordChangeService['changePassword']>();
    const response = await request(testApp(changePassword))
      .post('/auth/change-password')
      .send({ ...validBody, [field]: value });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(changePassword).not.toHaveBeenCalled();
  });

  it.each([
    ['', validBody.newPassword],
    [validBody.currentPassword, 'too short'],
    [validBody.currentPassword, 'a'.repeat(129)],
  ])('rejects invalid password input before the service', async (currentPassword, newPassword) => {
    const changePassword = vi.fn<PasswordChangeService['changePassword']>();
    const response = await request(testApp(changePassword))
      .post('/auth/change-password')
      .send({ currentPassword, newPassword });

    expect(response.status).toBe(400);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it.each([
    [new InvalidCurrentPasswordError(), 400, 'INVALID_CURRENT_PASSWORD'],
    [new NewPasswordSameAsCurrentError(), 400, 'NEW_PASSWORD_SAME_AS_CURRENT'],
    [new PasswordChangeUserNotFoundError(), 401, 'UNAUTHORIZED'],
  ] as const)('maps service failures safely', async (failure, status, code) => {
    const response = await request(testApp(() => Promise.reject(failure)))
      .post('/auth/change-password')
      .send(validBody);

    expect(response.status).toBe(status);
    expect(response.body).toMatchObject({ error: { code } });
    expect(JSON.stringify(response.body)).not.toContain(validBody.currentPassword);
    expect(JSON.stringify(response.body)).not.toContain(validBody.newPassword);
  });

  it('rejects an untrusted browser origin before calling the service', async () => {
    const changePassword = vi.fn<PasswordChangeService['changePassword']>();
    const response = await request(testApp(changePassword))
      .post('/auth/change-password')
      .set('Origin', 'https://attacker.example.test')
      .send(validBody);

    expect(response.status).toBe(403);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('has an independent sensitive-operation rate limit', async () => {
    const changePassword = vi.fn<PasswordChangeService['changePassword']>()
      .mockResolvedValue(undefined);
    const app = testApp(changePassword);
    const responses = [];

    for (let attempt = 0; attempt < 6; attempt += 1) {
      responses.push(await request(app).post('/auth/change-password').send(validBody));
    }

    expect(responses.slice(0, 5).every(({ status }) => status === 204)).toBe(true);
    expect(responses[5]?.status).toBe(429);
    expect(responses[5]?.body).toEqual({
      error: { code: 'RATE_LIMITED', message: 'Too many requests' },
    });
    expect(changePassword).toHaveBeenCalledTimes(5);
  });
});
