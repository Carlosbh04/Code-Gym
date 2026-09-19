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
  readonly isLoginAccountLocked?:
    | ((email: string) => Promise<boolean>)
    | undefined;
  readonly getLoginAccountCooldownUntil?:
    | ((email: string) => Promise<Date | null>)
    | undefined;
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
  isLoginAccountLocked,
  getLoginAccountCooldownUntil,
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
      createAccountAwareLoginLimiter({
        windowMs,
        limit:
          loginLimit,
        isAccountLocked:
          isLoginAccountLocked,
        getAccountCooldownUntil:
          getLoginAccountCooldownUntil,
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
        isAccountLocked:
          isLoginAccountLocked,
        getAccountCooldownUntil:
          getLoginAccountCooldownUntil,
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

export interface LoginFailureRequestRateLimitKeyInput {
  readonly request: Pick<
    Request,
    'ip' | 'socket'
  >;
  readonly email: string;
  readonly keySecret: string;
}

export function createLoginFailureRateLimitKeyForRequest({
  request,
  email,
  keySecret,
}: LoginFailureRequestRateLimitKeyInput): string {
  const ip =
    request.ip
    ?? request.socket.remoteAddress
    ?? 'unknown';

  return createLoginFailureRateLimitKey({
    ipKey:
      ipKeyGenerator(
        ip,
      ),
    email,
    keySecret,
  });
}

interface CreateLoginFailureLimiterOptions {
  readonly windowMs: number;
  readonly limit: number;
  readonly store?: Store | undefined;
  readonly keySecret?: string | undefined;
  readonly isAccountLocked?:
    | ((email: string) => Promise<boolean>)
    | undefined;

  readonly getAccountCooldownUntil?:
    | ((email: string) => Promise<Date | null>)
    | undefined;
}

function createLoginFailureLimiter({
  windowMs,
  limit,
  store,
  keySecret,
  isAccountLocked,
  getAccountCooldownUntil,
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

      return createLoginFailureRateLimitKeyForRequest({
        request,
        email,
        keySecret,
      });
    },

    async handler(
      request: Request,
      response: Response,
      next,
    ): Promise<void> {
      const body =
        request.body as
          | {
              email?: unknown;
            }
          | undefined;

      const email =
        typeof body?.email
          === 'string'
          ? body.email
              .trim()
              .toLowerCase()
          : '';

      if (
        email !== ''
        && isAccountLocked
          !== undefined
      ) {
        const accountLocked =
          await isAccountLocked(
            email,
          );

        if (accountLocked) {
          /*
           * Redis is throttling this IP+email pair, but
           * persistent MySQL state has higher authority.
           *
           * Let the request reach LoginService so the
           * canonical 423 ACCOUNT_LOCKED contract wins.
           */
          next();
          return;
        }
      }

      if (
        email !== ''
        && getAccountCooldownUntil
          !== undefined
      ) {
        const cooldownUntil =
          await getAccountCooldownUntil(
            email,
          );

        if (
          cooldownUntil !== null
          && cooldownUntil.getTime()
            > Date.now()
        ) {
          response.status(429).json({
            error: {
              code:
                'ACCOUNT_COOLDOWN',
              message:
                'Account login is temporarily unavailable',
              cooldownUntil:
                cooldownUntil.toISOString(),
            },
          });

          return;
        }
      }

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

interface CreateAccountAwareLoginLimiterOptions {
  readonly windowMs: number;
  readonly limit: number;

  readonly isAccountLocked?:
    | ((email: string) => Promise<boolean>)
    | undefined;

  readonly getAccountCooldownUntil?:
    | ((email: string) => Promise<Date | null>)
    | undefined;
}

function createAccountAwareLoginLimiter({
  windowMs,
  limit,
  isAccountLocked,
  getAccountCooldownUntil,
}: CreateAccountAwareLoginLimiterOptions):
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

    async handler(
      request: Request,
      response: Response,
    ): Promise<void> {
      const body =
        request.body as
          | {
              email?: unknown;
            }
          | undefined;

      const email =
        typeof body?.email
          === 'string'
          ? body.email
              .trim()
              .toLowerCase()
          : '';

      /*
       * The coarse IP limiter remains an anti-abuse boundary,
       * but it must not replace the authoritative security
       * state of a concrete account.
       */
      if (
        email !== ''
        && isAccountLocked
          !== undefined
      ) {
        const accountLocked =
          await isAccountLocked(
            email,
          );

        if (accountLocked) {
          response.status(423).json({
            error: {
              code:
                'ACCOUNT_LOCKED',
              message:
                'Account access is locked',
            },
          });

          return;
        }
      }

      if (
        email !== ''
        && getAccountCooldownUntil
          !== undefined
      ) {
        const cooldownUntil =
          await getAccountCooldownUntil(
            email,
          );

        if (
          cooldownUntil !== null
          && cooldownUntil.getTime()
            > Date.now()
        ) {
          response.status(429).json({
            error: {
              code:
                'ACCOUNT_COOLDOWN',
              message:
                'Account login is temporarily unavailable',
              cooldownUntil:
                cooldownUntil.toISOString(),
            },
          });

          return;
        }
      }

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
