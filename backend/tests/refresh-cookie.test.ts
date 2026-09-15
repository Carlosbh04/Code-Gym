import { describe, expect, it } from 'vitest';

import {
  clearRefreshCookieOptions,
  refreshCookieName,
  refreshCookieOptions,
} from '../src/auth/refresh-cookie.js';
import { testConfig } from './helpers.js';

describe('refresh-cookie policy', () => {
  it('uses a host-only HttpOnly cookie scoped to auth with a TTL-derived max age', () => {
    const options = refreshCookieOptions(testConfig());

    expect(refreshCookieName).toBe('codegym_refresh');
    expect(options).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/auth',
      maxAge: 2_592_000_000,
    });
    expect(options).not.toHaveProperty('domain');
    expect(Object.isFrozen(options)).toBe(true);
  });

  it('sets Secure only in production', () => {
    expect(refreshCookieOptions(testConfig()).secure).toBe(false);
    expect(refreshCookieOptions(testConfig({
      nodeEnv: 'development',
      isDevelopment: true,
      isTest: false,
    })).secure).toBe(false);
    expect(refreshCookieOptions(testConfig({
      nodeEnv: 'production',
      isDevelopment: false,
      isTest: false,
      isProduction: true,
    })).secure).toBe(true);
  });

  it('uses identical scope and security attributes when clearing, without resetting maxAge', () => {
    const config = testConfig({ isProduction: true });
    const clearOptions = clearRefreshCookieOptions(config);

    expect(clearOptions).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth',
    });
    expect(clearOptions).not.toHaveProperty('domain');
    expect(clearOptions).not.toHaveProperty('maxAge');
    expect(Object.isFrozen(clearOptions)).toBe(true);
  });
});
