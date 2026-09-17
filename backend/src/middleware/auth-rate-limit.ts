import { createHmac } from 'node:crypto';
import type {
  Request,
  RequestHandler,
  Response,
} from 'express';

import {
  ipKeyGenerator,
  rateLimit,
  type Store,
} from 'express-rate-limit';

export interface AuthRateLimiters {
  readonly register:
    RequestHandler;

  readonly login:
    RequestHandler;
  readonly loginFailures:
    RequestHandler;

  readonly refresh:
    RequestHandler;

  readonly logout:
    RequestHandler;

  readonly passwordResetRequest:
    RequestHandler;

  readonly passwordResetVerify:
    RequestHandler;

  readonly passwordResetConfirm:
    RequestHandler;

  readonly changePassword:
    RequestHandler;
}

export interface AuthRateLimitOptions {
  readonly windowMs?: number;

  readonly registerLimit?: number;
  readonly loginLimit?: number;
  readonly loginFailureLimit?: number;
  readonly loginFailureStore?: Store | undefined;
  readonly loginFailureKeySecret?: string | undefined;
  readonly refreshLimit?: number;
  readonly logoutLimit?: number;
  readonly passwordResetRequestLimit?: number;
  readonly passwordResetVerifyLimit?: number;
  readonly passwordResetConfirmLimit?: number;
  readonly changePasswordLimit?: number;
}

const DEFAULT_WINDOW_MS =
  15 * 60 * 1_000;

export function createAuthRateLimiters({
  windowMs =
    DEFAULT_WINDOW_MS,

  registerLimit = 20,
  loginLimit = 20,
  loginFailureLimit = 3,
  loginFailureStore,
  loginFailureKeySecret,
  refreshLimit = 60,
  logoutLimit = 60,
  passwordResetRequestLimit = 5,
  passwordResetVerifyLimit = 20,
  passwordResetConfirmLimit = 10,
  changePasswordLimit = 5,
}: AuthRateLimitOptions = {}):
AuthRateLimiters {
  return Object.freeze({
    register:
      createLimiter({
        windowMs,
        limit:
          registerLimit,
      }),

    login:
      createLimiter({
        windowMs,
        limit:
          loginLimit,
      }),
    loginFailures:
      createLoginFailureLimiter({
        windowMs,
        limit:
          loginFailureLimit,
        store:
          loginFailureStore,
        keySecret:
          loginFailureKeySecret,
      }),

    refresh:
      createLimiter({
        windowMs,
        limit:
          refreshLimit,
      }),

    logout:
      createLimiter({
        windowMs,
        limit:
          logoutLimit,
      }),

    passwordResetRequest:
      createLimiter({
        windowMs,
        limit: passwordResetRequestLimit,
      }),

    passwordResetVerify:
      createLimiter({
        windowMs,
        limit: passwordResetVerifyLimit,
      }),

    passwordResetConfirm:
      createLimiter({
        windowMs,
        limit: passwordResetConfirmLimit,
      }),

    changePassword:
      createLimiter({
        windowMs,
        limit: changePasswordLimit,
      }),
  });
}


export interface LoginFailureRateLimitKeyInput {
  readonly ipKey: string;
  readonly email: string;
  readonly keySecret: string;
}

export function createLoginFailureRateLimitKey({
  ipKey,
  email,
  keySecret,
}: LoginFailureRateLimitKeyInput): string {
  const normalizedEmail =
    email
      .trim()
      .toLowerCase();

  const identifier =
    [
      ipKey,
      normalizedEmail,
    ].join(':');

  return createHmac(
    'sha256',
    keySecret,
  )
    .update(
      identifier,
      'utf8',
    )
    .digest(
      'hex',
    );
}

interface CreateLoginFailureLimiterOptions {
  readonly windowMs: number;
  readonly limit: number;
  readonly store?: Store | undefined;
  readonly keySecret?: string | undefined;
}

function createLoginFailureLimiter({
  windowMs,
  limit,
  store,
  keySecret,
}: CreateLoginFailureLimiterOptions):
RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    ...(store === undefined
      ? {}
      : {
          store,
        }),

    /*
     * Solo conserva en el contador respuestas fallidas.
     * Un login 200 no consume intentos.
     */
    skipSuccessfulRequests:
      true,

    standardHeaders:
      'draft-8',

    legacyHeaders:
      false,

    keyGenerator(
      request: Request,
    ): string {
      const ip =
        request.ip
        ?? request.socket.remoteAddress
        ?? 'unknown';

      const body =
        request.body as
          | {
              email?: unknown;
            }
          | undefined;

      const email =
        typeof body?.email === 'string'
          ? body.email
          : 'unknown';

      if (
        keySecret === undefined
      ) {
        throw new Error(
          'Login failure rate-limit key secret is required',
        );
      }

      const ipKey =
        ipKeyGenerator(
          ip,
        );

      return createLoginFailureRateLimitKey({
        ipKey,
        email,
        keySecret,
      });
    },

    handler(
      _request: Request,
      response: Response,
    ): void {
      response.status(429).json({
        error: {
          code:
            'RATE_LIMITED',
          message:
            'Too many requests',
        },
      });
    },
  });
}

interface CreateLimiterOptions {
  readonly windowMs: number;
  readonly limit: number;
}

function createLimiter({
  windowMs,
  limit,
}: CreateLimiterOptions):
RequestHandler {
  return rateLimit({
    windowMs,
    limit,

    standardHeaders:
      'draft-8',

    legacyHeaders:
      false,

    keyGenerator(
      request: Request,
    ): string {
      const ip =
        request.ip
        ?? request.socket.remoteAddress
        ?? 'unknown';

      return ipKeyGenerator(
        ip,
      );
    },

    handler(
      _request: Request,
      response: Response,
    ): void {
      response.status(429).json({
        error: {
          code:
            'RATE_LIMITED',

          message:
            'Too many requests',
        },
      });
    },
  });
}
