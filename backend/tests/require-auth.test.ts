import express, { type Express } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import type { AuthContext } from '../src/auth/auth-context.js';
import {
  InvalidAccessTokenError,
  type AccessTokenClaims,
  type AccessTokenService,
} from '../src/auth/access-token-service.js';
import type {
  AuthSessionAuthenticationRecord,
  AuthSessionRepository,
} from '../src/auth/auth-session-repository.js';
import { createRequireAuth } from '../src/middleware/require-auth.js';

const now = new Date('2026-09-11T14:00:00.000Z');
const accessToken = 'header.payload.signature';

const claims: AccessTokenClaims = Object.freeze({
  sub: 'user-1',
  sid: 'session-1',
  iat: 1_789_135_800,
  exp: 1_789_136_400,
});

const activeSession: AuthSessionAuthenticationRecord = Object.freeze({
  userId: claims.sub,
  expiresAt: new Date(now.getTime() + 60_000),
  lastActivityAt: new Date(
    now.getTime() - 5 * 60_000,
  ),
  revokedAt: null,
});

type VerifyAccessToken = AccessTokenService['verify'];
type FindSessionById = AuthSessionRepository['findSessionById'];

interface ProtectedTestApp {
  readonly app: Express;
  readonly observedAuth: () => AuthContext | undefined;
}

function createProtectedTestApp(
  verify: VerifyAccessToken,
  findSessionById: FindSessionById,
  clock: () => Date = () => now,
): ProtectedTestApp {
  const app = express();
  let auth: AuthContext | undefined;

  app.get(
    '/protected',
    createRequireAuth({
      accessTokenService: { verify },
      authSessionRepository: { findSessionById },
      idleSessionTimeoutSeconds:
        900,
      clock,
    }),
    (request, response) => {
      auth = request.auth;
      response.status(204).end();
    },
  );

  return {
    app,
    observedAuth: () => auth,
  };
}

function mockVerifyValid(): ReturnType<typeof vi.fn<VerifyAccessToken>> {
  return vi.fn<VerifyAccessToken>().mockResolvedValue(claims);
}

function mockFindActive(): ReturnType<typeof vi.fn<FindSessionById>> {
  return vi.fn<FindSessionById>().mockResolvedValue(activeSession);
}

function expectUniformUnauthorized(response: {
  readonly status: number;
  readonly body: unknown;
}): void {
  expect(response.status).toBe(401);
  expect(response.body).toEqual({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    },
  });
}

describe('require-auth middleware', () => {
  it('returns the uniform 401 when Authorization is missing', async () => {
    const verify = mockVerifyValid();
    const findSessionById = mockFindActive();
    const testApp = createProtectedTestApp(verify, findSessionById);

    const response = await request(testApp.app).get('/protected');

    expectUniformUnauthorized(response);
    expect(verify).not.toHaveBeenCalled();
    expect(findSessionById).not.toHaveBeenCalled();
    expect(testApp.observedAuth()).toBeUndefined();
  });

  it('returns the same 401 for an authorization scheme other than exact Bearer', async () => {
    const verify = mockVerifyValid();
    const findSessionById = mockFindActive();
    const testApp = createProtectedTestApp(verify, findSessionById);

    const response = await request(testApp.app)
      .get('/protected')
      .set('Authorization', `Basic ${accessToken}`);

    expectUniformUnauthorized(response);
    expect(verify).not.toHaveBeenCalled();
    expect(findSessionById).not.toHaveBeenCalled();
  });

  it.each(['Bearer', 'Bearer '])('returns the same 401 when Bearer has no token: %j', async (header) => {
    const verify = mockVerifyValid();
    const findSessionById = mockFindActive();
    const testApp = createProtectedTestApp(verify, findSessionById);

    const response = await request(testApp.app)
      .get('/protected')
      .set('Authorization', header);

    expectUniformUnauthorized(response);
    expect(verify).not.toHaveBeenCalled();
    expect(findSessionById).not.toHaveBeenCalled();
  });

  it('returns the same 401 for an invalid JWT', async () => {
    const verify = vi
      .fn<VerifyAccessToken>()
      .mockRejectedValue(new InvalidAccessTokenError());
    const findSessionById = mockFindActive();
    const testApp = createProtectedTestApp(verify, findSessionById);

    const response = await request(testApp.app)
      .get('/protected')
      .set('Authorization', `Bearer ${accessToken}`);

    expectUniformUnauthorized(response);
    expect(verify).toHaveBeenCalledOnce();
    expect(verify).toHaveBeenCalledWith(accessToken);
    expect(findSessionById).not.toHaveBeenCalled();
  });

  it('returns the same 401 when the signed session no longer exists', async () => {
    const verify = mockVerifyValid();
    const findSessionById = vi
      .fn<FindSessionById>()
      .mockResolvedValue(null);
    const testApp = createProtectedTestApp(verify, findSessionById);

    const response = await request(testApp.app)
      .get('/protected')
      .set('Authorization', `Bearer ${accessToken}`);

    expectUniformUnauthorized(response);
    expect(findSessionById).toHaveBeenCalledOnce();
    expect(findSessionById).toHaveBeenCalledWith(claims.sid);
  });

  it('returns the same 401 when the session is revoked', async () => {
    const verify = mockVerifyValid();
    const findSessionById = vi
      .fn<FindSessionById>()
      .mockResolvedValue({
        ...activeSession,
        revokedAt: new Date(now.getTime() - 1),
      });
    const testApp = createProtectedTestApp(verify, findSessionById);

    const response = await request(testApp.app)
      .get('/protected')
      .set('Authorization', `Bearer ${accessToken}`);

    expectUniformUnauthorized(response);
    expect(testApp.observedAuth()).toBeUndefined();
  });

  it.each([
    new Date(now.getTime() - 1),
    new Date(now),
  ])('returns the same 401 when session expiry is at or before now: %s', async (expiresAt) => {
    const verify = mockVerifyValid();
    const findSessionById = vi
      .fn<FindSessionById>()
      .mockResolvedValue({
        ...activeSession,
        expiresAt,
      });
    const testApp = createProtectedTestApp(verify, findSessionById);

    const response = await request(testApp.app)
      .get('/protected')
      .set('Authorization', `Bearer ${accessToken}`);

    expectUniformUnauthorized(response);
    expect(testApp.observedAuth()).toBeUndefined();
  });

  it('allows a session one millisecond before the idle deadline', async () => {
    const verify = mockVerifyValid();

    const findSessionById = vi
      .fn<FindSessionById>()
      .mockResolvedValue({
        ...activeSession,
        lastActivityAt:
          new Date(
            now.getTime()
              - 900_000
              + 1,
          ),
      });

    const testApp =
      createProtectedTestApp(
        verify,
        findSessionById,
      );

    const response =
      await request(testApp.app)
        .get('/protected')
        .set(
          'Authorization',
          `Bearer ${accessToken}`,
        );

    expect(
      response.status,
    ).toBe(204);

    expect(
      testApp.observedAuth(),
    ).toEqual({
      userId:
        claims.sub,
      sessionId:
        claims.sid,
    });
  });

  it.each([
    new Date(
      now.getTime() - 900_000,
    ),
    new Date(
      now.getTime() - 900_001,
    ),
  ])(
    'returns the same 401 when idle deadline is reached or exceeded: %s',
    async (
      lastActivityAt,
    ) => {
      const verify =
        mockVerifyValid();

      const findSessionById = vi
        .fn<FindSessionById>()
        .mockResolvedValue({
          ...activeSession,
          lastActivityAt,
        });

      const testApp =
        createProtectedTestApp(
          verify,
          findSessionById,
        );

      const response =
        await request(testApp.app)
          .get('/protected')
          .set(
            'Authorization',
            `Bearer ${accessToken}`,
          );

      expectUniformUnauthorized(
        response,
      );

      expect(
        testApp.observedAuth(),
      ).toBeUndefined();
    },
  );

  it('returns the same 401 when token subject and session owner differ', async () => {
    const verify = mockVerifyValid();
    const findSessionById = vi
      .fn<FindSessionById>()
      .mockResolvedValue({
        ...activeSession,
        userId: 'different-user',
      });
    const testApp = createProtectedTestApp(verify, findSessionById);

    const response = await request(testApp.app)
      .get('/protected')
      .set('Authorization', `Bearer ${accessToken}`);

    expectUniformUnauthorized(response);
    expect(testApp.observedAuth()).toBeUndefined();
  });

  it('calls next with the exact frozen auth context for a valid active session', async () => {
    const verify = mockVerifyValid();
    const findSessionById = mockFindActive();
    const testApp = createProtectedTestApp(verify, findSessionById);

    const response = await request(testApp.app)
      .get('/protected')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(204);
    expect(verify).toHaveBeenCalledWith(accessToken);
    expect(findSessionById).toHaveBeenCalledWith(claims.sid);
    expect(testApp.observedAuth()).toEqual({
      userId: claims.sub,
      sessionId: claims.sid,
    });
    expect(Object.keys(testApp.observedAuth() ?? {}).sort()).toEqual([
      'sessionId',
      'userId',
    ]);
    expect(Object.isFrozen(testApp.observedAuth())).toBe(true);
  });
});
