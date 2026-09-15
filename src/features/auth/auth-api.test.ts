import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  changePassword,
  confirmPasswordReset,
  googleLogin,
  requestPasswordReset,
  updateProfile,
  verifyPasswordReset,
} from './auth-api';
import { ApiError } from '@/lib/api/http-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('auth-api Google login', () => {
  it('envía solo idToken a POST /auth/google con credentials include', async () => {
    const user = {
      id: 'user-google-1',
      email: 'google@example.test',
      displayName: 'Google User',
      role: 'USER',
      createdAt: '2026-09-15T10:00:00.000Z',
      updatedAt: '2026-09-15T10:00:00.000Z',
    } as const;

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user,
          accessToken: 'codegym-access-token',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      googleLogin({
        idToken: 'google-id-token-test',
      }),
    ).resolves.toEqual({
      user,
      accessToken: 'codegym-access-token',
    });

    const [url, options] =
      fetchMock.mock.calls[0] as [
        string,
        RequestInit,
      ];

    expect(url).toBe(
      'http://localhost:3000/auth/google',
    );

    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('include');

    expect(
      JSON.parse(options.body as string),
    ).toEqual({
      idToken: 'google-id-token-test',
    });
  });
});

describe('auth-api profile update', () => {
  it('envía únicamente displayName a PATCH /auth/me con el Bearer token', async () => {
    const user = {
      id: 'user-1',
      email: 'person@example.test',
      displayName: 'Carlos Hernández',
      role: 'USER',
      createdAt: '2026-09-10T10:00:00.000Z',
      updatedAt: '2026-09-13T10:00:00.000Z',
    } as const;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      updateProfile(
        {
          displayName: 'Carlos Hernández',
        },
        'access-token-test',
      ),
    ).resolves.toEqual({
      user,
    });

    const [
      url,
      options,
    ] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    const headers =
      new Headers(
        options.headers,
      );

    expect(url).toBe('http://localhost:3000/auth/me');
    expect(options.method).toBe('PATCH');
    expect(options.credentials).toBe('include');
    expect(headers.get('Authorization')).toBe('Bearer access-token-test');
    expect(JSON.parse(options.body as string)).toEqual({
      displayName: 'Carlos Hernández',
    });
  });
});

describe('auth-api password change', () => {
  it('sends only both passwords to the authenticated endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await changePassword({
      currentPassword: 'current secure password',
      newPassword: 'new secure password value',
    }, 'access-token-test');

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(options.headers);
    expect(url).toBe('http://localhost:3000/auth/change-password');
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('include');
    expect(headers.get('Authorization')).toBe('Bearer access-token-test');
    expect(JSON.parse(options.body as string)).toEqual({
      currentPassword: 'current secure password',
      newPassword: 'new secure password value',
    });
  });
});

describe('auth-api password reset', () => {
  it('uses the exact request and verify endpoints without converting the code to a number', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'generic' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ resetToken: 'A'.repeat(43) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    await requestPasswordReset({ email: 'person@example.test' });
    await verifyPasswordReset({ email: 'person@example.test', code: '004821' });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3000/auth/password-reset/request');
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      email: 'person@example.test',
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://localhost:3000/auth/password-reset/verify');
    expect(JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body))).toEqual({
      email: 'person@example.test',
      code: '004821',
    });
  });

  it('confirms with resetToken and newPassword only', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await confirmPasswordReset({
      resetToken: 'A'.repeat(43),
      newPassword: 'A secure password 123!',
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3000/auth/password-reset/confirm');
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      resetToken: 'A'.repeat(43),
      newPassword: 'A secure password 123!',
    });
  });

  it('preserves the structured backend ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'RESET_CODE_EXPIRED', message: 'expired' },
    }), {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    })));

    await expect(verifyPasswordReset({
      email: 'person@example.test',
      code: '123456',
    })).rejects.toMatchObject({
      status: 410,
      code: 'RESET_CODE_EXPIRED',
    } satisfies Partial<ApiError>);
  });
});
