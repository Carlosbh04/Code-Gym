import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  apiRequest,
  parseRetryAfterHeader,
} from './http-client';

describe('HTTP retry metadata', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses Retry-After delta-seconds', () => {
    expect(parseRetryAfterHeader('754')).toBe(754);
    expect(parseRetryAfterHeader(' 15 ')).toBe(15);
    expect(parseRetryAfterHeader('0')).toBe(0);
  });

  it('parses an HTTP date relative to the response time', () => {
    const now = Date.parse('2026-09-14T10:00:00.000Z');

    expect(parseRetryAfterHeader('Mon, 14 Sep 2026 10:04:09 GMT', now)).toBe(249);
    expect(parseRetryAfterHeader('Mon, 14 Sep 2026 09:59:00 GMT', now)).toBe(0);
  });

  it('returns null when Retry-After is absent or malformed', () => {
    expect(parseRetryAfterHeader(null)).toBeNull();
    expect(parseRetryAfterHeader('')).toBeNull();
    expect(parseRetryAfterHeader('tomorrow')).toBeNull();
    expect(parseRetryAfterHeader('12.5')).toBeNull();
  });

  it('preserves Retry-After on ApiError without exposing extra headers', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '249',
          'X-Internal-Secret': 'must-not-be-copied',
        },
      },
    ));

    const error = await apiRequest('/auth/password-reset/request', { method: 'POST' })
      .catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
      retryAfterSeconds: 249,
    });
    expect(error).not.toHaveProperty('headers');
    expect(JSON.stringify(error)).not.toContain('must-not-be-copied');
  });
});
