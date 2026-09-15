import type { RequestHandler } from 'express';
import pino from 'pino';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp, type AppDependencies } from '../src/app.js';
import {
  ExpiredPasswordResetCodeError,
  ExpiredPasswordResetTokenError,
  InvalidPasswordResetCodeError,
  InvalidPasswordResetTokenError,
  PasswordResetCodeAttemptsExceededError,
  type PasswordResetService,
  UnavailablePasswordResetCodeError,
  passwordResetRequestMessage,
} from '../src/auth/password-reset-service.js';
import { testConfig } from './helpers.js';

const unused = () => Promise.reject(new Error('Not exercised by password reset HTTP tests'));
const requireAuth: RequestHandler = (_request, _response, next) => { next(); };

function testApp(passwordResetService: Pick<
  PasswordResetService,
  'requestReset' | 'verifyCode' | 'confirmReset'
>) {
  return createApp({
    config: testConfig(),
    logger: pino({ level: 'silent' }),
    databaseHealthCheck: () => Promise.resolve(true),
    registrationService: { register: unused },
    loginService: { login: unused } as unknown as AppDependencies['loginService'],
    refreshService: { refresh: unused } as unknown as AppDependencies['refreshService'],
    logoutService: { logout: unused } as unknown as AppDependencies['logoutService'],
    currentUserService: { getCurrentUser: unused },
    sessionManagementService: {
      listSessions: unused,
      revokeSession: unused,
      revokeOtherSessions: unused,
    },
    passwordResetService,
    requireAuth,
  });
}

function service(overrides: Partial<Pick<
  PasswordResetService,
  'requestReset' | 'verifyCode' | 'confirmReset'
>> = {}) {
  return {
    requestReset: vi.fn(() => Promise.resolve({ message: passwordResetRequestMessage })),
    verifyCode: vi.fn(() => Promise.resolve('A'.repeat(43))),
    confirmReset: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('password reset HTTP protocol', () => {
  it('returns only the generic 202 response from request', async () => {
    const dependency = service();
    const response = await request(testApp(dependency))
      .post('/auth/password-reset/request')
      .send({ email: ' Person@Example.Test ' });

    expect(response.status).toBe(202);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.body).toEqual({ message: passwordResetRequestMessage });
    expect(dependency.requestReset).toHaveBeenCalledWith('person@example.test');
    expect(JSON.stringify(response.body)).not.toContain('123456');
  });

  it('rejects malformed and non-strict request bodies before the service', async () => {
    const dependency = service();
    const malformed = await request(testApp(dependency))
      .post('/auth/password-reset/verify')
      .send({ email: 'person@example.test', code: '12345a' });
    const extra = await request(testApp(dependency))
      .post('/auth/password-reset/confirm')
      .send({
        resetToken: 'A'.repeat(43),
        newPassword: 'a secure password of sufficient length',
        userId: 'victim',
      });

    expect(malformed.status).toBe(400);
    expect(extra.status).toBe(400);
    expect(dependency.verifyCode).not.toHaveBeenCalled();
    expect(dependency.confirmReset).not.toHaveBeenCalled();
  });

  it('returns the reset token only after successful verification', async () => {
    const dependency = service();
    const response = await request(testApp(dependency))
      .post('/auth/password-reset/verify')
      .send({ email: 'person@example.test', code: '012345' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ resetToken: 'A'.repeat(43) });
  });

  it.each([
    [new InvalidPasswordResetCodeError(), 400, 'INVALID_RESET_CODE'],
    [new ExpiredPasswordResetCodeError(), 410, 'RESET_CODE_EXPIRED'],
    [new PasswordResetCodeAttemptsExceededError(), 410, 'RESET_CODE_ATTEMPTS_EXCEEDED'],
    [new UnavailablePasswordResetCodeError(), 410, 'RESET_CODE_EXPIRED'],
  ] as const)('maps code failure safely', async (failure, status, code) => {
    const response = await request(testApp(service({
      verifyCode: vi.fn(() => Promise.reject(failure)),
    })))
      .post('/auth/password-reset/verify')
      .send({ email: 'person@example.test', code: '012345' });

    expect(response.status).toBe(status);
    expect(readErrorCode(response.body)).toBe(code);
  });

  it('confirms with only a token and a policy-compliant new password', async () => {
    const dependency = service();
    const response = await request(testApp(dependency))
      .post('/auth/password-reset/confirm')
      .send({
        resetToken: 'A'.repeat(43),
        newPassword: 'a secure password of sufficient length',
      });

    expect(response.status).toBe(204);
    expect(dependency.confirmReset).toHaveBeenCalledWith(
      'A'.repeat(43),
      'a secure password of sufficient length',
    );
  });

  it.each(['too short', 'x'.repeat(129)])(
    'rejects a new password outside the existing policy',
    async (newPassword) => {
      const dependency = service();
      const response = await request(testApp(dependency))
        .post('/auth/password-reset/confirm')
        .send({ resetToken: 'A'.repeat(43), newPassword });

      expect(response.status).toBe(400);
      expect(dependency.confirmReset).not.toHaveBeenCalled();
    },
  );

  it.each([
    [new InvalidPasswordResetTokenError(), 400, 'INVALID_RESET_TOKEN'],
    [new ExpiredPasswordResetTokenError(), 410, 'RESET_TOKEN_EXPIRED'],
  ] as const)('maps token failure safely', async (failure, status, code) => {
    const response = await request(testApp(service({
      confirmReset: vi.fn(() => Promise.reject(failure)),
    })))
      .post('/auth/password-reset/confirm')
      .send({
        resetToken: 'A'.repeat(43),
        newPassword: 'a secure password of sufficient length',
      });

    expect(response.status).toBe(status);
    expect(readErrorCode(response.body)).toBe(code);
  });
});

function readErrorCode(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || !('error' in value)) return undefined;
  const error = value.error;
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  return error.code;
}
