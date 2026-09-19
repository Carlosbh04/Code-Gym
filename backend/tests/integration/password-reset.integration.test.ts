import { randomUUID } from 'node:crypto';
import pino from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { AccessTokenService } from '../../src/auth/access-token-service.js';
import { PrismaAuthSessionRepository } from '../../src/auth/auth-session-repository.js';
import { CurrentUserService } from '../../src/auth/current-user-service.js';
import { LoginService } from '../../src/auth/login-service.js';
import { LogoutService } from '../../src/auth/logout-service.js';
import { PasswordResetCrypto } from '../../src/auth/password-reset-crypto.js';
import type {
  PasswordResetMailer,
  SendPasswordResetCodeInput,
} from '../../src/auth/password-reset-mailer.js';
import { PrismaPasswordResetRepository } from '../../src/auth/password-reset-repository.js';
import { PasswordResetService } from '../../src/auth/password-reset-service.js';
import { RefreshService } from '../../src/auth/refresh-service.js';
import { SessionManagementService } from '../../src/auth/session-management-service.js';
import { PrismaUserRepository } from '../../src/auth/user-repository.js';
import { UserService } from '../../src/auth/user-service.js';
import { loadConfig } from '../../src/config/load-config.js';
import { createDatabaseService } from '../../src/database/database-service.js';
import { createPrismaClient } from '../../src/database/prisma.js';
import { createRequireAuth } from '../../src/middleware/require-auth.js';

const config = loadConfig();
if (!config.isTest || !config.database.name.endsWith('_test')) {
  throw new Error('DB integration requires NODE_ENV=test and a DB_NAME ending in _test');
}

const prisma = createPrismaClient(config.database);
const database = createDatabaseService(prisma);
const userRepository = new PrismaUserRepository(prisma);
const authSessionRepository = new PrismaAuthSessionRepository(prisma);
const passwordResetRepository = new PrismaPasswordResetRepository(prisma);
const accessTokenService = new AccessTokenService(config.auth);
const delivered = new Map<string, SendPasswordResetCodeInput>();
const mailer: PasswordResetMailer = {
  sendPasswordResetCode(input) {
    delivered.set(input.to, input);
    return Promise.resolve();
  },
};
const passwordResetService = new PasswordResetService({
  userRepository,
  passwordResetRepository,
  mailer,
  crypto: new PasswordResetCrypto(config.passwordReset.hmacSecret),
  config: config.passwordReset,
});
const app = createApp({
  config,
  logger: pino({ level: 'silent' }),
  databaseHealthCheck: () => database.healthCheck(),
  registrationService: new UserService(userRepository),
  loginService: new LoginService(
    userRepository,
    authSessionRepository,
    accessTokenService,
    config.auth,
  ),
  loginFailureKeySecret:
    config.rateLimitKeySecret,
  refreshService: new RefreshService(authSessionRepository, accessTokenService, config.auth),
  logoutService: new LogoutService(authSessionRepository),
  currentUserService: new CurrentUserService(userRepository),
  sessionManagementService: new SessionManagementService(authSessionRepository),
  passwordResetService,
  requireAuth:
    createRequireAuth({
      accessTokenService,
      authSessionRepository,
      idleSessionTimeoutSeconds:
        config.auth.idleSessionTimeoutSeconds,
    }),
});

const runId = randomUUID().replaceAll('-', '');
const ownerEmail = `password-reset-owner-${runId}@example.test`;
const otherEmail = `password-reset-other-${runId}@example.test`;
const oldPassword = 'a sufficiently secure old password';
const newPassword = 'a sufficiently secure new password';
const finalPassword = 'a final secure password after concurrent reset';

function cookie(response: request.Response): string {
  const value: unknown = response.headers['set-cookie'];
  const first: unknown = Array.isArray(value) ? value[0] : value;
  if (typeof first !== 'string') throw new Error('Expected refresh cookie');
  return first.split(';', 1)[0] ?? '';
}

function readStringField(value: unknown, field: string): string {
  if (
    typeof value !== 'object'
    || value === null
  ) throw new Error(`Expected string field ${field}`);
  const record = value as Record<string, unknown>;
  const fieldValue = record[field];
  if (typeof fieldValue !== 'string') throw new Error(`Expected string field ${field}`);
  return fieldValue;
}

describe('password reset MySQL integration (explicit opt-in)', () => {
  beforeAll(async () => {
    await database.connect();
    await request(app).post('/auth/register').send({
      email: ownerEmail,
      password: oldPassword,
      displayName: 'Reset Owner',
    }).expect(201);
    await request(app).post('/auth/register').send({
      email: otherEmail,
      password: oldPassword,
      displayName: 'Other User',
    }).expect(201);
  }, 20_000);

  afterAll(async () => {
    if (
      !ownerEmail.includes(runId)
      || !otherEmail.includes(runId)
      || !ownerEmail.startsWith('password-reset-owner-')
    ) throw new Error('Refusing unsafe password-reset integration cleanup');
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, otherEmail] } } });
    await database.disconnect();
  }, 20_000);

  it('resets only the owner password, consumes authorization, and revokes all owner sessions', async () => {
    const firstLogin = await request(app).post('/auth/login').send({
      email: ownerEmail,
      password: oldPassword,
      remember: false,
    }).expect(200);
    const secondLogin = await request(app).post('/auth/login').send({
      email: ownerEmail,
      password: oldPassword,
      remember: false,
    }).expect(200);
    const otherLogin = await request(app).post('/auth/login').send({
      email: otherEmail,
      password: oldPassword,
      remember: false,
    }).expect(200);

    const unknownResponse = await request(app)
      .post('/auth/password-reset/request')
      .send({ email: `absent-${runId}@example.test` })
      .expect(202);
    const requestResponse = await request(app)
      .post('/auth/password-reset/request')
      .send({ email: ownerEmail })
      .expect(202);
    expect(requestResponse.body).toEqual(unknownResponse.body);

    const resetCode = delivered.get(ownerEmail)?.code;
    if (resetCode === undefined) throw new Error('Fake mailer did not receive reset code');
    await request(app)
      .post('/auth/password-reset/verify')
      .send({ email: otherEmail, code: resetCode })
      .expect(400);
    const verifyResponse = await request(app)
      .post('/auth/password-reset/verify')
      .send({ email: ownerEmail, code: resetCode })
      .expect(200);
    const resetToken = readStringField(verifyResponse.body, 'resetToken');
    expect(resetToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    await request(app)
      .post('/auth/password-reset/confirm')
      .send({ resetToken, newPassword })
      .expect(204);
    await request(app)
      .post('/auth/password-reset/confirm')
      .send({ resetToken, newPassword })
      .expect(410);
    await request(app)
      .post('/auth/password-reset/verify')
      .send({ email: ownerEmail, code: resetCode })
      .expect(410);

    await request(app).post('/auth/login').send({
      email: ownerEmail,
      password: oldPassword,
      remember: false,
    }).expect(401);
    await request(app).post('/auth/login').send({
      email: ownerEmail,
      password: newPassword,
      remember: false,
    }).expect(200);

    await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${readStringField(firstLogin.body, 'accessToken')}`)
      .expect(401);
    await request(app)
      .post('/auth/refresh')
      .set('Origin', config.frontendOrigins[0] ?? 'https://app.example.com')
      .set('Cookie', cookie(secondLogin))
      .expect(401);

    await request(app)
      .post('/auth/refresh')
      .set('Origin', config.frontendOrigins[0] ?? 'https://app.example.com')
      .set('Cookie', cookie(otherLogin))
      .expect(200);

    await request(app)
      .post('/auth/password-reset/request')
      .send({ email: ownerEmail })
      .expect(202);
    const concurrentCode = delivered.get(ownerEmail)?.code;
    if (concurrentCode === undefined) throw new Error('Fake mailer did not receive new code');
    const concurrentVerify = await request(app)
      .post('/auth/password-reset/verify')
      .send({ email: ownerEmail, code: concurrentCode })
      .expect(200);
    const concurrentToken = readStringField(concurrentVerify.body, 'resetToken');
    const concurrentResults = await Promise.all([
      request(app).post('/auth/password-reset/confirm').send({
        resetToken: concurrentToken,
        newPassword: finalPassword,
      }),
      request(app).post('/auth/password-reset/confirm').send({
        resetToken: concurrentToken,
        newPassword: finalPassword,
      }),
    ]);
    const concurrentStatuses = concurrentResults.map(({ status }) => status);
    expect(concurrentStatuses.filter((status) => status === 204)).toHaveLength(1);
    expect(concurrentStatuses.every((status) => [204, 400, 410].includes(status))).toBe(true);
    await request(app).post('/auth/login').send({
      email: ownerEmail,
      password: finalPassword,
      remember: false,
    }).expect(200);
  }, 30_000);

  it('distinguishes incorrect codes from an exhausted challenge in MySQL', async () => {
    await request(app)
      .post('/auth/password-reset/request')
      .send({ email: otherEmail })
      .expect(202);

    const resetCode = delivered.get(otherEmail)?.code;
    if (resetCode === undefined) throw new Error('Fake mailer did not receive reset code');
    const incorrectCode = resetCode === '000000' ? '000001' : '000000';

    for (let attempt = 1; attempt < config.passwordReset.maximumAttempts; attempt += 1) {
      const response = await request(app)
        .post('/auth/password-reset/verify')
        .send({ email: otherEmail, code: incorrectCode })
        .expect(400);
      expect(response.body).toMatchObject({
        error: { code: 'INVALID_RESET_CODE' },
      });
    }

    const exhausted = await request(app)
      .post('/auth/password-reset/verify')
      .send({ email: otherEmail, code: incorrectCode })
      .expect(410);
    expect(exhausted.body).toMatchObject({
      error: { code: 'RESET_CODE_ATTEMPTS_EXCEEDED' },
    });

    const unusable = await request(app)
      .post('/auth/password-reset/verify')
      .send({ email: otherEmail, code: resetCode })
      .expect(410);
    expect(unusable.body).toMatchObject({
      error: { code: 'RESET_CODE_ATTEMPTS_EXCEEDED' },
    });
  }, 20_000);
});
