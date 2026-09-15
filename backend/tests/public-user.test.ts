import { describe, expect, it } from 'vitest';

import { toPublicUser } from '../src/auth/public-user.js';

describe('public user DTO', () => {
  it('uses an explicit allowlist and never exposes password or session data', () => {
    const source = {
      id: 'user123',
      email: 'user@example.test',
      displayName: null,
      role: 'ADMIN' as const,
      createdAt: new Date(
        '2026-09-10T10:00:00.000Z',
      ),
      updatedAt: new Date(
        '2026-09-10T11:00:00.000Z',
      ),
      passwordHash:
        '$argon2id$must-not-leak',
      refreshTokenDigest:
        Buffer.alloc(32, 9),
      authSessions: [
        {
          id: 'session123',
        },
      ],
    };

    const result =
      toPublicUser(source);

    expect(result).toEqual({
      id: 'user123',
      email:
        'user@example.test',
      displayName: null,
      role: 'ADMIN',
      createdAt:
        '2026-09-10T10:00:00.000Z',
      updatedAt:
        '2026-09-10T11:00:00.000Z',
    });

    expect(
      result,
    ).not.toHaveProperty(
      'passwordHash',
    );

    expect(
      result,
    ).not.toHaveProperty(
      'refreshTokenDigest',
    );

    expect(
      result,
    ).not.toHaveProperty(
      'authSessions',
    );

    expect(
      Object.isFrozen(result),
    ).toBe(true);
  });
});