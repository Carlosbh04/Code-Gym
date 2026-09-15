import type {
  Request,
  RequestHandler,
  Response,
} from 'express';

import {
  ipKeyGenerator,
  rateLimit,
} from 'express-rate-limit';

export interface AuthRateLimiters {
  readonly register:
    RequestHandler;

  readonly login:
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
