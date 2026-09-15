import {
  Router,
  type Request,
  type RequestHandler,
} from 'express';

import {
  AuthenticatedUserNotFoundError,
  type CurrentUserService,
} from '../auth/current-user-service.js';
import {
  InvalidCredentialsError,
  type LoginService,
} from '../auth/login-service.js';

import {
  GoogleEmailAlreadyRegisteredError,
  type GoogleLoginService,
} from '../auth/google-login-service.js';

import {
  InvalidGoogleIdTokenError,
} from '../auth/google-id-token-verifier.js';

import {
  googleLoginRequestSchema,
  type GoogleLoginRequest,
} from '../auth/google-login-schema.js';
import {
  InvalidCurrentPasswordError,
  NewPasswordSameAsCurrentError,
  PasswordChangeUserNotFoundError,
  type PasswordChangeService,
} from '../auth/password-change-service.js';
import {
  changePasswordRequestSchema,
  type ChangePasswordRequest,
} from '../auth/password-change-schema.js';
import type {
  LogoutService,
} from '../auth/logout-service.js';
import {
  loginRequestSchema,
  type LoginRequest,
} from '../auth/login-schema.js';
import type {
  ProfileService,
} from '../auth/profile-service.js';
import {
  ExpiredPasswordResetCodeError,
  ExpiredPasswordResetTokenError,
  InvalidPasswordResetCodeError,
  InvalidPasswordResetTokenError,
  PasswordResetCodeAttemptsExceededError,
  type PasswordResetService,
  UnavailablePasswordResetCodeError,
} from '../auth/password-reset-service.js';
import {
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  passwordResetVerifySchema,
  type PasswordResetConfirmRequest,
  type PasswordResetRequest,
  type PasswordResetVerifyRequest,
} from '../auth/password-reset-schema.js';
import {
  clearRefreshCookieOptions,
  refreshCookieName,
  refreshCookieOptions,
} from '../auth/refresh-cookie.js';
import {
  InvalidRefreshSessionError,
  type RefreshService,
} from '../auth/refresh-service.js';
import {
  registerRequestSchema,
  type RegisterRequest,
} from '../auth/register-schema.js';
import {
  updateProfileRequestSchema,
  type UpdateProfileRequest,
} from '../auth/update-profile-schema.js';
import type {
  SessionManagementService,
} from '../auth/session-management-service.js';
import type {
  RegistrationService,
} from '../auth/user-service.js';
import {
  EmailAlreadyExistsError,
} from '../auth/user-repository.js';
import type {
  AppConfig,
} from '../config/env.js';
import {
  createAuthRateLimiters,
} from '../middleware/auth-rate-limit.js';
import {
  createRequireTrustedOrigin,
} from '../middleware/require-trusted-origin.js';
import {
  validateRequest,
} from '../middleware/validate-request.js';

export interface AuthRouterDependencies {
  readonly registrationService:
    RegistrationService;

  readonly loginService:
    LoginService;

  readonly googleLoginService?:

    | Pick<
        GoogleLoginService,
        'login'
      >
    | undefined;

  readonly refreshService:
    RefreshService;

  readonly logoutService:
    LogoutService;

  readonly currentUserService:
    Pick<
      CurrentUserService,
      'getCurrentUser'
    >;

  readonly profileService?:
    | Pick<
        ProfileService,
        'updateDisplayName'
      >
    | undefined;

  readonly passwordResetService?:
    | Pick<PasswordResetService, 'requestReset' | 'verifyCode' | 'confirmReset'>
    | undefined;

  readonly passwordChangeService?:
    | Pick<PasswordChangeService, 'changePassword'>
    | undefined;

  readonly sessionManagementService:
    Pick<
      SessionManagementService,
      | 'listSessions'
      | 'revokeSession'
      | 'revokeOtherSessions'
    >;

  readonly requireAuth:
    RequestHandler;

  readonly config:
    AppConfig;
}

export function createAuthRouter({
  registrationService,
  loginService,
  googleLoginService,

  refreshService,
  logoutService,
  currentUserService,
  profileService,
  passwordResetService,
  passwordChangeService,
  sessionManagementService,
  requireAuth,
  config,
}: AuthRouterDependencies): Router {
  const router =
    Router();

  const authRateLimiters =
    createAuthRateLimiters();

  const requireTrustedOrigin =
    createRequireTrustedOrigin(
      config.frontendOrigins,
    );

  if (passwordResetService !== undefined) {
    router.post(
      '/auth/password-reset/request',
      authRateLimiters.passwordResetRequest,
      validateRequest({ body: passwordResetRequestSchema }),
      async (request: Request<object, object, PasswordResetRequest>, response, next) => {
        try {
          const result = await passwordResetService.requestReset(request.body.email);
          response.status(202).json(result);
        } catch (error) {
          next(error);
        }
      },
    );

    router.post(
      '/auth/password-reset/verify',
      authRateLimiters.passwordResetVerify,
      validateRequest({ body: passwordResetVerifySchema }),
      async (request: Request<object, object, PasswordResetVerifyRequest>, response, next) => {
        try {
          const resetToken = await passwordResetService.verifyCode(
            request.body.email,
            request.body.code,
          );
          response.status(200).json({ resetToken });
        } catch (error) {
          if (error instanceof InvalidPasswordResetCodeError) {
            response.status(400).json({
              error: { code: 'INVALID_RESET_CODE', message: 'Invalid security code' },
            });
            return;
          }
          if (error instanceof PasswordResetCodeAttemptsExceededError) {
            response.status(410).json({
              error: {
                code: 'RESET_CODE_ATTEMPTS_EXCEEDED',
                message: 'Maximum security code attempts exceeded; request a new one',
              },
            });
            return;
          }
          if (error instanceof ExpiredPasswordResetCodeError) {
            response.status(410).json({
              error: {
                code: 'RESET_CODE_EXPIRED',
                message: 'Security code expired; request a new one',
              },
            });
            return;
          }
          if (error instanceof UnavailablePasswordResetCodeError) {
            response.status(410).json({
              error: {
                code: 'RESET_CODE_EXPIRED',
                message: 'Security code expired or unavailable; request a new one',
              },
            });
            return;
          }
          next(error);
        }
      },
    );

    router.post(
      '/auth/password-reset/confirm',
      authRateLimiters.passwordResetConfirm,
      validateRequest({ body: passwordResetConfirmSchema }),
      async (request: Request<object, object, PasswordResetConfirmRequest>, response, next) => {
        try {
          await passwordResetService.confirmReset(
            request.body.resetToken,
            request.body.newPassword,
          );
          response.status(204).end();
        } catch (error) {
          if (error instanceof InvalidPasswordResetTokenError) {
            response.status(400).json({
              error: { code: 'INVALID_RESET_TOKEN', message: 'Invalid password reset token' },
            });
            return;
          }
          if (error instanceof ExpiredPasswordResetTokenError) {
            response.status(410).json({
              error: {
                code: 'RESET_TOKEN_EXPIRED',
                message: 'Password reset token expired or unavailable',
              },
            });
            return;
          }
          next(error);
        }
      },
    );
  }

  router.post(
    '/auth/register',

    authRateLimiters.register,

    validateRequest({
      body:
        registerRequestSchema,
    }),

    async (
      request: Request<
        object,
        object,
        RegisterRequest
      >,
      response,
      next,
    ) => {
      try {
        const user =
          await registrationService
            .register(
              request.body,
            );

        response.status(201).json({
          user,
        });
      } catch (error) {
        if (
          error instanceof
          EmailAlreadyExistsError
        ) {
          response.status(409).json({
            error: {
              code:
                'EMAIL_ALREADY_EXISTS',

              message:
                'An account with this email already exists',
            },
          });

          return;
        }

        next(error);
      }
    },
  );

  router.post(
    '/auth/login',

    authRateLimiters.login,

    validateRequest({
      body:
        loginRequestSchema,
    }),

    async (
      request: Request<
        object,
        object,
        LoginRequest
      >,
      response,
      next,
    ) => {
      try {
        const result =
          await loginService.login(
            request.body,
          );

        response.cookie(
          refreshCookieName,
          result.refreshToken,
          refreshCookieOptions(
            config,
          ),
        );

        response.status(200).json({
          user:
            result.user,

          accessToken:
            result.accessToken,
        });
      } catch (error) {
        if (
          error instanceof
          InvalidCredentialsError
        ) {
          response.status(401).json({
            error: {
              code:
                'INVALID_CREDENTIALS',

              message:
                'Invalid email or password',
            },
          });

          return;
        }

        next(error);
      }
    },
  );

  if (
    googleLoginService !== undefined
  ) {
    router.post(
      '/auth/google',

      authRateLimiters.login,

      validateRequest({
        body:
          googleLoginRequestSchema,
      }),

      async (
        request: Request<
          object,
          object,
          GoogleLoginRequest
        >,
        response,
        next,
      ) => {
        try {
          const result =
            await googleLoginService.login(
              request.body.idToken,
            );

          response.cookie(
            refreshCookieName,
            result.refreshToken,
            refreshCookieOptions(
              config,
            ),
          );

          response.status(200).json({
            user:
              result.user,
            accessToken:
              result.accessToken,
          });
        } catch (error) {
          if (
            error instanceof
              InvalidGoogleIdTokenError
          ) {
            response.status(401).json({
              error: {
                code:
                  'INVALID_GOOGLE_CREDENTIALS',
                message:
                  'Invalid Google credentials',
              },
            });

            return;
          }

          if (
            error instanceof
              GoogleEmailAlreadyRegisteredError
          ) {
            response.status(409).json({
              error: {
                code:
                  'GOOGLE_EMAIL_ALREADY_REGISTERED',
                message:
                  'An account with this email already exists',
              },
            });

            return;
          }

          next(error);
        }
      },
    );
  }

  router.post(
    '/auth/refresh',

    authRateLimiters.refresh,

    requireTrustedOrigin,

    async (
      request,
      response,
      next,
    ) => {
      const refreshToken =
        readCookie(
          request.headers.cookie,
          refreshCookieName,
        );

      if (
        refreshToken === undefined
      ) {
        response.clearCookie(
          refreshCookieName,
          clearRefreshCookieOptions(
            config,
          ),
        );

        response.status(401).json({
          error: {
            code:
              'INVALID_REFRESH_SESSION',

            message:
              'Invalid refresh session',
          },
        });

        return;
      }

      try {
        const result =
          await refreshService.refresh(
            refreshToken,
          );

        response.cookie(
          refreshCookieName,
          result.refreshToken,
          refreshCookieOptions(
            config,
          ),
        );

        response.status(200).json({
          accessToken:
            result.accessToken,
        });
      } catch (error) {
        if (
          error instanceof
          InvalidRefreshSessionError
        ) {
          response.clearCookie(
            refreshCookieName,
            clearRefreshCookieOptions(
              config,
            ),
          );

          response.status(401).json({
            error: {
              code:
                'INVALID_REFRESH_SESSION',

              message:
                'Invalid refresh session',
            },
          });

          return;
        }

        next(error);
      }
    },
  );

  router.post(
    '/auth/logout',

    authRateLimiters.logout,

    requireTrustedOrigin,

    async (
      request,
      response,
      next,
    ) => {
      const refreshToken =
        readCookie(
          request.headers.cookie,
          refreshCookieName,
        );

      response.clearCookie(
        refreshCookieName,
        clearRefreshCookieOptions(
          config,
        ),
      );

      try {
        await logoutService.logout(
          refreshToken,
        );

        response
          .status(204)
          .end();
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/auth/me',

    requireAuth,

    async (
      request,
      response,
      next,
    ) => {
      const auth =
        request.auth;

      if (
        auth === undefined
      ) {
        respondUnauthorized(
          response,
        );

        return;
      }

      try {
        const user =
          await currentUserService
            .getCurrentUser(
              auth.userId,
            );

        response.status(200).json({
          user,
        });
      } catch (error) {
        if (
          error instanceof
          AuthenticatedUserNotFoundError
        ) {
          respondUnauthorized(
            response,
          );

          return;
        }

        next(error);
      }
    },
  );

  if (profileService !== undefined) {
    router.patch(
      '/auth/me',

      requireAuth,

      requireTrustedOrigin,

      validateRequest({
        body:
          updateProfileRequestSchema,
      }),

      async (
        request: Request<
          object,
          object,
          UpdateProfileRequest
        >,
        response,
        next,
      ) => {
        const auth =
          request.auth;

        if (auth === undefined) {
          respondUnauthorized(
            response,
          );

          return;
        }

        try {
          const user =
            await profileService.updateDisplayName(
              auth.userId,
              request.body.displayName,
            );

          response.status(200).json({
            user,
          });
        } catch (error) {
          if (
            error instanceof
            AuthenticatedUserNotFoundError
          ) {
            respondUnauthorized(
              response,
            );

            return;
          }

          next(error);
        }
      },
    );
  }

  if (passwordChangeService !== undefined) {
    router.post(
      '/auth/change-password',

      requireAuth,

      requireTrustedOrigin,

      authRateLimiters.changePassword,

      validateRequest({
        body: changePasswordRequestSchema,
      }),

      async (
        request: Request<object, object, ChangePasswordRequest>,
        response,
        next,
      ) => {
        const auth = request.auth;

        if (auth === undefined) {
          respondUnauthorized(response);
          return;
        }

        try {
          await passwordChangeService.changePassword({
            userId: auth.userId,
            currentSessionId: auth.sessionId,
            currentPassword: request.body.currentPassword,
            newPassword: request.body.newPassword,
          });

          response.status(204).end();
        } catch (error) {
          if (error instanceof InvalidCurrentPasswordError) {
            response.status(400).json({
              error: {
                code: 'INVALID_CURRENT_PASSWORD',
                message: 'Current password is incorrect',
              },
            });
            return;
          }

          if (error instanceof NewPasswordSameAsCurrentError) {
            response.status(400).json({
              error: {
                code: 'NEW_PASSWORD_SAME_AS_CURRENT',
                message: 'New password must differ from current password',
              },
            });
            return;
          }

          if (error instanceof PasswordChangeUserNotFoundError) {
            respondUnauthorized(response);
            return;
          }

          next(error);
        }
      },
    );
  }

  router.get(
    '/auth/sessions',

    requireAuth,

    async (
      request,
      response,
      next,
    ) => {
      const auth =
        request.auth;

      if (
        auth === undefined
      ) {
        respondUnauthorized(
          response,
        );

        return;
      }

      try {
        const sessions =
          await sessionManagementService
            .listSessions({
              userId:
                auth.userId,

              currentSessionId:
                auth.sessionId,
            });

        response.status(200).json({
          sessions,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  /*
   * This route must be registered before
   * /auth/sessions/:sessionId so that the
   * literal "others" is not interpreted as
   * a session id.
   */
  router.delete(
    '/auth/sessions/others',

    requireAuth,

    async (
      request,
      response,
      next,
    ) => {
      const auth =
        request.auth;

      if (
        auth === undefined
      ) {
        respondUnauthorized(
          response,
        );

        return;
      }

      try {
        await sessionManagementService
          .revokeOtherSessions({
            userId:
              auth.userId,

            currentSessionId:
              auth.sessionId,
          });

        response
          .status(204)
          .end();
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/auth/sessions/:sessionId',

    requireAuth,

    async (
      request: Request<{
        sessionId: string;
      }>,
      response,
      next,
    ) => {
      const auth =
        request.auth;

      if (
        auth === undefined
      ) {
        respondUnauthorized(
          response,
        );

        return;
      }

      const sessionId =
        request.params.sessionId;

      try {
        await sessionManagementService
          .revokeSession({
            userId:
              auth.userId,

            sessionId,
          });

        /*
         * If the user revokes the session
         * currently making this request,
         * remove its refresh-token cookie too.
         *
         * The access token becomes unusable
         * immediately because requireAuth
         * verifies the backing session.
         */
        if (
          sessionId
          === auth.sessionId
        ) {
          response.clearCookie(
            refreshCookieName,
            clearRefreshCookieOptions(
              config,
            ),
          );
        }

        /*
         * Always return 204.
         *
         * We intentionally do not reveal whether
         * the supplied session id existed or was
         * owned by another user.
         */
        response
          .status(204)
          .end();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

function readCookie(
  cookieHeader:
    | string
    | undefined,
  name: string,
): string | undefined {
  if (
    cookieHeader === undefined
  ) {
    return undefined;
  }

  const prefix =
    `${name}=`;

  let matchedValue:
    string
    | undefined;

  let matchCount = 0;

  for (
    const cookie of
      cookieHeader.split(';')
  ) {
    const trimmed =
      cookie.trim();

    if (
      !trimmed.startsWith(
        prefix,
      )
    ) {
      continue;
    }

    matchCount += 1;

    /*
     * Duplicate security-sensitive cookies are
     * ambiguous. Reject the header instead of
     * trusting the first or last occurrence.
     */
    if (
      matchCount > 1
    ) {
      return undefined;
    }

    const value =
      trimmed.slice(
        prefix.length,
      );

    if (
      value.length === 0
    ) {
      return undefined;
    }

    matchedValue =
      value;
  }

  return matchedValue;
}

function respondUnauthorized(
  response: Parameters<
    RequestHandler
  >[1],
): void {
  response.status(401).json({
    error: {
      code:
        'UNAUTHORIZED',

      message:
        'Authentication required',
    },
  });
}
