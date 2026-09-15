import type { CookieOptions } from 'express';

import type { AppConfig } from '../config/env.js';

export const refreshCookieName = 'codegym_refresh';

export type RefreshCookieConfig = Pick<AppConfig, 'auth' | 'isProduction'>;

/** Host-only cookie options for the future refresh endpoints. */
export function refreshCookieOptions(config: RefreshCookieConfig): Readonly<CookieOptions> {
  return Object.freeze({
    ...baseRefreshCookieOptions(config),
    maxAge: config.auth.refreshTokenTtlSeconds * 1_000,
  });
}

export function clearRefreshCookieOptions(config: RefreshCookieConfig): Readonly<CookieOptions> {
  return Object.freeze(baseRefreshCookieOptions(config));
}

function baseRefreshCookieOptions(config: RefreshCookieConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/auth',
  };
}
