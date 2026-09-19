import cors from 'cors';
import express, {
  type Express,
  type RequestHandler,
} from 'express';
import helmet from 'helmet';
import type {
  Store,
} from 'express-rate-limit';
import type {
  IncomingMessage,
  ServerResponse,
} from 'node:http';
import type {
  Logger,
} from 'pino';
import {
  pinoHttp,
} from 'pino-http';
import type {
  AccountSecurityRepository,
} from './auth/account-security-repository.js';

import type {
  CurrentUserService,
} from './auth/current-user-service.js';
import type {
  LoginService,
} from './auth/login-service.js';

import type {
  GoogleLoginService,
} from './auth/google-login-service.js';
import type {
  LogoutService,
} from './auth/logout-service.js';
import type {
  ProfileService,
} from './auth/profile-service.js';
import type {
  PasswordChangeService,
} from './auth/password-change-service.js';
import type {
  PasswordResetService,
} from './auth/password-reset-service.js';
import type {
  RefreshService,
} from './auth/refresh-service.js';
import type {
  SessionManagementService,
} from './auth/session-management-service.js';
import type {
  SessionActivityService,
} from './auth/session-activity-service.js';
import type {
  RegistrationService,
} from './auth/user-service.js';
import type {
  AppConfig,
} from './config/env.js';
import {
  createErrorHandler,
} from './middleware/error-handler.js';
import {
  notFoundHandler,
} from './middleware/not-found.js';
import {
  createAuthRouter,
} from './routes/auth.js';
import {
  createHealthRouter,
  type DatabaseHealthCheck,
} from './routes/health.js';
import type {
  DashboardService,
} from './progress/dashboard-service.js';
import type {
  AttemptService,
} from './progress/attempt-service.js';
import type {
  CompletedSessionService,
} from './progress/completed-session-service.js';
import {
  createDashboardRouter,
} from './routes/dashboard.js';
import {
  createHistoryRouter,
} from './routes/history.js';
import type {
  TrainingService,
} from './training/training-service.js';
import {
  createTrainingRouter,
} from './routes/training.js';
import {
  createLearningRouter,
} from './routes/learning.js';
import type {
  LearningProgressService,
} from './progress/learning-progress-service.js';
import {
  createContentRouter,
} from './routes/content.js';
import type {
  ContentService,
} from './content/content-service.js';
export interface AppDependencies {
  contentService?:
    ContentService | undefined;

  learningProgressService?:
    LearningProgressService | undefined;
  config:
    AppConfig;
  logger:
    Logger;
  databaseHealthCheck:
    DatabaseHealthCheck;
  registrationService:
    RegistrationService;
  loginService:
    LoginService;
  loginFailureStore?:
    Store | undefined;
  loginFailureKeySecret:
    string;

  accountSecurityRepository?:
    | Pick<
        AccountSecurityRepository,
        | 'isAccountLockedByEmail'
        | 'getActiveLoginCooldownUntilByEmail'
      >
    | undefined;

  googleLoginService?:

    | Pick<
        GoogleLoginService,
        'login'
      >
    | undefined;
  refreshService:
    RefreshService;
  logoutService:
    LogoutService;
  currentUserService:
    Pick<
      CurrentUserService,
      'getCurrentUser'
    >;
  profileService?:
    | Pick<
        ProfileService,
        'updateDisplayName'
      >
    | undefined;
  passwordResetService?:
    | Pick<PasswordResetService, 'requestReset' | 'verifyCode' | 'confirmReset'>
    | undefined;
  passwordChangeService?:
    | Pick<PasswordChangeService, 'changePassword'>
    | undefined;
  sessionManagementService:
    Pick<
      SessionManagementService,
      | 'listSessions'
      | 'revokeSession'
      | 'revokeOtherSessions'
    >;
  sessionActivityService?:
    | Pick<
        SessionActivityService,
        'recordActivity'
      >
    | undefined;
  dashboardService?:
    | Pick<
        DashboardService,
        'getDashboard'
      >
    | undefined;
  attemptService?:
    | Pick<
        AttemptService,
        | 'getAttemptsBySession'
        | 'getAttemptsByTrainingRun'
      >
    | undefined;
  completedSessionService?:
    | Pick<
        CompletedSessionService,
        | 'getCompletedSession'
        | 'getCompletedSessionHistoryTarget'
      >
    | undefined;
  trainingService?:
    | Pick<
        TrainingService,
        | 'startRun'
        | 'revealHint'
        | 'submitAnswer'
      >
    | undefined;
  requireAuth:
    RequestHandler;
}
function requestPath(
  url: string | undefined,
): string | undefined {
  return url?.split(
    '?',
    1,
  )[0];
}
export function createApp({
  config,
  logger,
  databaseHealthCheck,
  registrationService,
  loginService,
  loginFailureStore,
  loginFailureKeySecret,
  accountSecurityRepository,
  googleLoginService,

  refreshService,
  logoutService,
  currentUserService,
  profileService,
  passwordResetService,
  passwordChangeService,
  sessionManagementService,
  sessionActivityService,
  contentService,
  learningProgressService,
  dashboardService,
  attemptService,
  completedSessionService,
  trainingService,
  requireAuth,
}: AppDependencies): Express {
  const app =
    express();
  app.disable(
    'x-powered-by',
  );
  app.set(
    'trust proxy',
    false,
  );
app.use(
    helmet(),
  );
  app.use(
    cors({
      allowedHeaders: [
        'Content-Type',
        'Authorization',
      ],
      exposedHeaders: [
        'Retry-After',
      ],
      /*
       * Authentication uses:
       *
       * - an HttpOnly refresh-token cookie
       * - an Authorization Bearer header
       *
       * The frontend and backend run on different
       * origins during development, so credentialed
       * CORS is required.
       */
      credentials:
        true,
      methods: [
        'GET',
        'POST',
        'PATCH',
        'DELETE',
      ],
      optionsSuccessStatus:
        204,
      origin(
        origin,
        callback,
      ) {
        callback(
          null,
          origin === undefined
            || config.frontendOrigins
              .includes(
                origin,
              ),
        );
      },
    }),
  );
  app.use(
    express.json({
      limit:
        '100kb',
      strict:
        true,
    }),
  );
  app.use(
    pinoHttp({
      logger,
      wrapSerializers:
        false,
      serializers: {
        err() {
          return {
            type:
              'HttpResponseError',
          };
        },
        req(
          request:
            IncomingMessage & {
              id?: unknown;
              originalUrl?: string;
            },
        ) {
          return {
            id:
              request.id,
            method:
              request.method,
            path:
              requestPath(
                request.originalUrl,
              ),
          };
        },
        res(
          response:
            ServerResponse,
        ) {
          return {
            statusCode:
              response.statusCode,
          };
        },
      },
    }),
  );
  if (
    contentService !==
    undefined
  ) {
    app.use(
      '/content',
      createContentRouter(
        contentService,
      ),
    );
  }

  app.use(
    createAuthRouter({
      registrationService,
      loginService,
      loginFailureStore,
      loginFailureKeySecret,
      accountSecurityRepository,
      googleLoginService,

      refreshService,
      logoutService,
      currentUserService,
      profileService,
      passwordResetService,
      passwordChangeService,
      sessionManagementService,
      sessionActivityService,
      requireAuth,
      config,
    }),
  );
  if (
    dashboardService !==
    undefined
  ) {
    app.use(
      createDashboardRouter({
        dashboardService,
        requireAuth,
      }),
    );
  }
  if (
    attemptService !== undefined
    && completedSessionService !== undefined
  ) {
    app.use(
      createHistoryRouter({
        attemptService,
        completedSessionService,
        requireAuth,
      }),
    );
  }

  if (
    learningProgressService
    !== undefined
  ) {
    app.use(
      createLearningRouter({
        learningProgressService,
        requireAuth,
      }),
    );
  }

  if (
    trainingService !==
    undefined
  ) {
    app.use(
      createTrainingRouter({
        trainingService,
        requireAuth,
      }),
    );
  }
  app.use(
    createHealthRouter({
      databaseHealthCheck,
      logger,
    }),
  );
  app.use(
    notFoundHandler,
  );
  app.use(
    createErrorHandler(
      logger,
    ),
  );
  return app;
}
