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
import { PrismaPasswordChangeRepository } from '../../src/auth/password-change-repository.js';
import { PasswordChangeService } from '../../src/auth/password-change-service.js';
import { verifyPassword } from '../../src/auth/password-service.js';
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
  throw new Error('Password change integration requires a test database');
}

const prisma = createPrismaClient(config.database);
const database = createDatabaseService(prisma);
const userRepository = new PrismaUserRepository(prisma);
const authSessionRepository = new PrismaAuthSessionRepository(prisma);
const accessTokenService = new AccessTokenService(config.auth);
const passwordChangeService = new PasswordChangeService(
  new PrismaPasswordChangeRepository(prisma),
);
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
  refreshService: new RefreshService(
    authSessionRepository,
    accessTokenService,
    config.auth,
  ),
  logoutService: new LogoutService(authSessionRepository),
  currentUserService: new CurrentUserService(userRepository),
  passwordChangeService,
  sessionManagementService: new SessionManagementService(authSessionRepository),
  requireAuth: createRequireAuth({ accessTokenService, authSessionRepository }),
});

const runId = randomUUID().replaceAll('-', '');
const email = `password-change-${runId}@example.test`;
const currentPassword = 'current password is secure';
const newPassword = 'replacement password is secure';
const trustedOrigin = config.frontendOrigins[0] ?? 'https://app.example.com';

function accessTokenFrom(body: unknown): string {
  if (
    typeof body !== 'object'
    || body === null
    || !('accessToken' in body)
    || typeof body.accessToken !== 'string'
  ) throw new Error('Expected login access token');
  return body.accessToken;
}

describe('POST /auth/change-password MySQL integration', () => {
  beforeAll(async () => {
    await database.connect();
    await request(app).post('/auth/register').send({
      email,
      password: currentPassword,
      displayName: 'Password Change Owner',
    }).expect(201);
  }, 20_000);

  afterAll(async () => {
    try {
      if (!email.startsWith('password-change-') || !email.includes(runId)) {
        throw new Error('Refusing unsafe password-change integration cleanup');
      }
      await prisma.user.deleteMany({ where: { email } });
    } finally {
      await database.disconnect();
    }
  }, 20_000);

  it('changes the hash atomically, revokes other sessions, and preserves the current session', async () => {
    const otherLogin = await request(app).post('/auth/login').send({
      email,
      password: currentPassword,
    }).expect(200);
    const currentLogin = await request(app).post('/auth/login').send({
      email,
      password: currentPassword,
    }).expect(200);
    const otherAccessToken = accessTokenFrom(otherLogin.body);
    const currentAccessToken = accessTokenFrom(currentLogin.body);
    const otherClaims = await accessTokenService.verify(otherAccessToken);
    const currentClaims = await accessTokenService.verify(currentAccessToken);
    const before = await prisma.user.findUniqueOrThrow({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    const incorrect = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${currentAccessToken}`)
      .set('Origin', trustedOrigin)
      .send({ currentPassword: 'incorrect current password', newPassword });
    expect(incorrect.status).toBe(400);
    expect(incorrect.body).toMatchObject({ error: { code: 'INVALID_CURRENT_PASSWORD' } });

    const unchanged = await prisma.user.findUniqueOrThrow({
      where: { email },
      select: { passwordHash: true },
    });
    expect(unchanged.passwordHash).toBe(before.passwordHash);

    const samePassword = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${currentAccessToken}`)
      .set('Origin', trustedOrigin)
      .send({ currentPassword, newPassword: currentPassword });
    expect(samePassword.status).toBe(400);
    expect(samePassword.body).toMatchObject({
      error: { code: 'NEW_PASSWORD_SAME_AS_CURRENT' },
    });

    await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${currentAccessToken}`)
      .set('Origin', trustedOrigin)
      .send({ currentPassword, newPassword, userId: 'another-user' })
      .expect(400);

    await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${currentAccessToken}`)
      .set('Origin', trustedOrigin)
      .send({ currentPassword, newPassword })
      .expect(204);

    const after = await prisma.user.findUniqueOrThrow({
      where: { email },
      select: { id: true, passwordHash: true },
    });
    expect(after.id).toBe(before.id);
    expect(after.passwordHash).not.toBe(before.passwordHash);
    expect(after.passwordHash).not.toBeNull();

    if (after.passwordHash === null) {
      throw new Error('Password hash unexpectedly missing after password change');
    }

    await expect(verifyPassword(after.passwordHash, currentPassword)).resolves.toBe(false);
    await expect(verifyPassword(after.passwordHash, newPassword)).resolves.toBe(true);

    const [otherSession, currentSession] = await Promise.all([
      prisma.authSession.findUniqueOrThrow({ where: { id: otherClaims.sid } }),
      prisma.authSession.findUniqueOrThrow({ where: { id: currentClaims.sid } }),
    ]);
    expect(otherSession.revokedAt).not.toBeNull();
    expect(currentSession.revokedAt).toBeNull();

    await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .expect(401);
    await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${currentAccessToken}`)
      .expect(200);

    await request(app).post('/auth/login').send({
      email,
      password: currentPassword,
    }).expect(401);
    await request(app).post('/auth/login').send({
      email,
      password: newPassword,
    }).expect(200);
  }, 30_000);
});
