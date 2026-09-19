import { createServer } from 'node:http';
import type { Express } from 'express';
import type { Logger } from 'pino';
import { createClient } from 'redis';
import {
  RedisStore,
  type RedisReply,
} from 'rate-limit-redis';
import {
  createApp,
  type AppDependencies,
} from './app.js';
import { AccessTokenService } from './auth/access-token-service.js';
import {
  PrismaAuthSessionRepository,
  type AuthSessionRepository,
} from './auth/auth-session-repository.js';

import {
  AuthenticatedSessionIssuer,
} from './auth/authenticated-session.js';

import {
  PrismaAuthIdentityRepository,
  type AuthIdentityRepository,
} from './auth/auth-identity-repository.js';

import {
  PrismaGoogleAccountRepository,
  type GoogleAccountRepository,
} from './auth/google-account-repository.js';

import {
  GoogleIdTokenVerifier,
} from './auth/google-id-token-verifier.js';

import {
  GoogleLoginService,
} from './auth/google-login-service.js';
import {
  PrismaAccountSecurityRepository,
  type AccountSecurityRepository,
} from './auth/account-security-repository.js';
import {
  PrismaSecurityOutboxRepository,
  type SecurityOutboxRepository,
} from './auth/security-outbox-repository.js';
import {
  SecurityOutboxWorker,
} from './auth/security-outbox-worker.js';
import {
  createAccountLockMailer,
} from './auth/account-lock-mailer-factory.js';
import { CurrentUserService } from './auth/current-user-service.js';
import { LoginService } from './auth/login-service.js';
import { LogoutService } from './auth/logout-service.js';
import { ProfileService } from './auth/profile-service.js';
import {
  PrismaPasswordChangeRepository,
  type PasswordChangeRepository,
} from './auth/password-change-repository.js';
import { PasswordChangeService } from './auth/password-change-service.js';
import { PasswordResetCrypto } from './auth/password-reset-crypto.js';
import { createPasswordResetMailer } from './auth/password-reset-mailer-factory.js';
import {
  PrismaPasswordResetRepository,
  type PasswordResetRepository,
} from './auth/password-reset-repository.js';
import { PasswordResetService } from './auth/password-reset-service.js';
import { RefreshService } from './auth/refresh-service.js';
import { SessionManagementService } from './auth/session-management-service.js';
import { SessionActivityService } from './auth/session-activity-service.js';
import { UserService } from './auth/user-service.js';
import {
  PrismaUserRepository,
  type UserRepository,
} from './auth/user-repository.js';
import type { AppConfig } from './config/env.js';
import { loadConfig } from './config/load-config.js';
import { createLogger } from './config/logger.js';
import { createDatabaseService } from './database/database-service.js';
import { createPrismaClient } from './database/prisma.js';
import { createRequireAuth } from './middleware/require-auth.js';
import { ContentVerifier } from './content/content-verifier.js';
import { verifierManifest } from './content/generated/verifier-manifest.js';
import { StaticVerifierManifestRepository } from './content/verifier-manifest-repository.js';
import { PrismaTrainingRepository, type TrainingRepository } from './training/training-repository.js';
import { ProcessCodeExecutionService } from './code-execution/process-code-execution-service.js';
import { TrainingService } from './training/training-service.js';
import {
  PrismaConceptProgressRepository,
  type ConceptProgressRepository,
} from './progress/concept-progress-repository.js';
import {
  PrismaCompletedSessionRepository,
  type CompletedSessionRepository,
} from './progress/completed-session-repository.js';
import {
  PrismaAttemptRepository,
  type AttemptRepository,
} from './progress/attempt-repository.js';
import { AttemptService } from './progress/attempt-service.js';
import { ConceptProgressService } from './progress/concept-progress-service.js';
import {
  PrismaLearningProgressRepository,
  type LearningProgressRepository,
} from './progress/learning-progress-repository.js';
import {
  LearningProgressService,
} from './progress/learning-progress-service.js';
import { CompletedSessionService } from './progress/completed-session-service.js';
import { ReviewService } from './progress/review-service.js';
import { BadgeService } from './progress/badge-service.js';
import { DashboardService } from './progress/dashboard-service.js';
import {
  PrismaContentRepository,
  type ContentRepository,
} from './content/content-repository.js';
import { ContentService } from './content/content-service.js';
export type RuntimeEvent =
  | 'SIGINT'
  | 'SIGTERM'
  | 'uncaughtException'
  | 'unhandledRejection';
export type RuntimeListener = (
  value?: unknown,
) => void;
export type ShutdownReason =
  | 'requested'
  | 'SIGINT'
  | 'SIGTERM'
  | 'uncaughtException'
  | 'unhandledRejection'
  | 'serverError';
export interface RuntimeProcess {
  once(
    event: RuntimeEvent,
    listener: RuntimeListener,
  ): void;
  off(
    event: RuntimeEvent,
    listener: RuntimeListener,
  ): void;
  setExitCode(
    code: number,
  ): void;
  exit(
    code: number,
  ): void;
}
export interface RuntimeServer {
  listen(
    port: number,
    host: string,
  ): RuntimeServer;
  close(
    callback: (
      error?: Error,
    ) => void,
  ): RuntimeServer;
  closeAllConnections?(): void;
  once(
    event: 'error',
    listener: (
      error: unknown,
    ) => void,
  ): RuntimeServer;
  once(
    event: 'listening',
    listener: () => void,
  ): RuntimeServer;
  on(
    event: 'error',
    listener: (
      error: unknown,
    ) => void,
  ): RuntimeServer;
  off(
    event: 'error',
    listener: (
      error: unknown,
    ) => void,
  ): RuntimeServer;
  off(
    event: 'listening',
    listener: () => void,
  ): RuntimeServer;
}
export interface ShutdownTimer {
  clear(): void;
  unref(): void;
}
export interface RuntimeController {
  readonly server: RuntimeServer;
  shutdown(
    reason?: ShutdownReason,
  ): Promise<void>;
}
export interface RuntimeDatabase {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
  readonly userRepository:
    UserRepository;

  readonly accountSecurityRepository?:
    AccountSecurityRepository;
  readonly securityOutboxRepository?:
    SecurityOutboxRepository;

  readonly authIdentityRepository?:

    AuthIdentityRepository;

  readonly googleAccountRepository?:

    GoogleAccountRepository;
  readonly authSessionRepository:
    AuthSessionRepository;
  readonly passwordResetRepository?:
    PasswordResetRepository;
  readonly passwordChangeRepository?:
    PasswordChangeRepository;
  readonly trainingRepository?:
    TrainingRepository;

  readonly learningProgressRepository?:
    LearningProgressRepository;
  readonly conceptProgressRepository?:
    ConceptProgressRepository;
  readonly completedSessionRepository?:
    CompletedSessionRepository;
  readonly attemptRepository?:
    AttemptRepository;
  readonly contentRepository?:
    ContentRepository;
}
export interface RuntimeDependencies {
  readonly process:
    RuntimeProcess;
  readonly appFactory: (
    dependencies:
      AppDependencies,
  ) => Express;
  readonly serverFactory: (
    app: Express,
  ) => RuntimeServer;
  readonly setShutdownTimer: (
    callback: () => void,
    milliseconds: number,
  ) => ShutdownTimer;
  readonly shutdownTimeoutMs:
    number;
}
export interface BootstrapDependencies
  extends Partial<
    RuntimeDependencies
  > {
  readonly configLoader?:
    () => AppConfig;
  readonly loggerFactory?: (
    config: AppConfig,
  ) => Logger;
  readonly databaseFactory?: (
    config: AppConfig,
  ) => RuntimeDatabase;
}
const defaultProcess:
  RuntimeProcess = {
    once(
      event,
      listener,
    ) {
      process.once(
        event,
        listener,
      );
    },
    off(
      event,
      listener,
    ) {
      process.off(
        event,
        listener,
      );
    },
    setExitCode(
      code,
    ) {
      process.exitCode =
        code;
    },
    exit(
      code,
    ) {
      process.exit(
        code,
      );
    },
  };
function defaultServerFactory(
  app: Express,
): RuntimeServer {
  return createServer(
    app,
  );
}
function defaultDatabaseFactory(
  config: AppConfig,
): RuntimeDatabase {
  const prisma =
    createPrismaClient(
      config.database,
    );
  const database =
    createDatabaseService(
      prisma,
    );
  const contentRepository =
    new PrismaContentRepository(
      prisma,
    );

  return {
    connect: () =>
      database.connect(),
    disconnect: () =>
      database.disconnect(),
    healthCheck: () =>
      database.healthCheck(),
    userRepository:
      new PrismaUserRepository(
        prisma,
      ),
    accountSecurityRepository:
      new PrismaAccountSecurityRepository(
        prisma,
      ),
    securityOutboxRepository:
      new PrismaSecurityOutboxRepository(
        prisma,
      ),
    authIdentityRepository:

      new PrismaAuthIdentityRepository(

        prisma,

      ),

    googleAccountRepository:

      new PrismaGoogleAccountRepository(

        prisma,

      ),

    authSessionRepository:
      new PrismaAuthSessionRepository(
        prisma,
      ),
    passwordResetRepository:
      new PrismaPasswordResetRepository(
        prisma,
      ),
    passwordChangeRepository:
      new PrismaPasswordChangeRepository(
        prisma,
      ),
    trainingRepository:
      new PrismaTrainingRepository(
        prisma,
      ),

    learningProgressRepository:
      new PrismaLearningProgressRepository(
        prisma,
      ),
    conceptProgressRepository:
      new PrismaConceptProgressRepository(
        prisma,
      ),
    completedSessionRepository:
      new PrismaCompletedSessionRepository(
        prisma,
      ),
    attemptRepository:
      new PrismaAttemptRepository(
        prisma,
      ),
    contentRepository,
  };
}
function defaultSetShutdownTimer(
  callback: () => void,
  milliseconds: number,
): ShutdownTimer {
  const timer =
    setTimeout(
      callback,
      milliseconds,
    );
  return {
    clear() {
      clearTimeout(
        timer,
      );
    },
    unref() {
      timer.unref();
    },
  };
}
const defaultRuntimeDependencies:
  RuntimeDependencies = {
    process:
      defaultProcess,
    appFactory:
      createApp,
    serverFactory:
      defaultServerFactory,
    setShutdownTimer:
      defaultSetShutdownTimer,
    shutdownTimeoutMs:
      10_000,
  };
export class RuntimeStartupError
  extends Error {
  public constructor() {
    super(
      'HTTP server could not start',
    );
    this.name =
      'RuntimeStartupError';
  }
}
export class DatabaseStartupError
  extends Error {
  public constructor() {
    super(
      'Database could not start',
    );
    this.name =
      'DatabaseStartupError';
  }
}
interface Deferred {
  readonly promise:
    Promise<void>;
  resolve(): void;
}
function createDeferred():
  Deferred {
  let resolvePromise:
    | (() => void)
    | undefined;
  const promise =
    new Promise<void>(
      (
        resolve,
      ) => {
        resolvePromise =
          resolve;
      },
    );
  return {
    promise,
    resolve() {
      resolvePromise?.();
    },
  };
}
async function cleanupDatabaseAfterStartupFailure(
  database:
    RuntimeDatabase,
  logger:
    Logger,
  dependencies:
    RuntimeDependencies,
): Promise<void> {
  await new Promise<void>(
    (
      resolve,
    ) => {
      let finished =
        false;
      const finish =
        (): void => {
          if (
            finished
          ) {
            return;
          }
          finished =
            true;
          timer.clear();
          resolve();
        };
      const timer =
        dependencies
          .setShutdownTimer(
            () => {
              logger.error(
                {
                  event:
                    'databaseCleanupTimeout',
                },
                'Database cleanup timed out',
              );
              dependencies
                .process
                .setExitCode(
                  1,
                );
              finish();
              dependencies
                .process
                .exit(
                  1,
                );
            },
            dependencies
              .shutdownTimeoutMs,
          );
      timer.unref();
      void database
        .disconnect()
        .then(
          () => {
            finish();
          },
          () => {
            logger.error(
              {
                event:
                  'databaseDisconnectFailure',
              },
              'Database shutdown failed',
            );
            finish();
          },
        );
    },
  );
}
async function disconnectDatabaseAfterWorker(
  database:
    RuntimeDatabase,

  worker:
    SecurityOutboxWorker
    | undefined,
): Promise<void> {
  /*
   * Preserve the existing shutdown contract:
   * when no worker exists, database.disconnect() must be
   * invoked immediately in this call stack.
   *
   * Optional chaining with `await worker?.stop()` would
   * introduce a microtask boundary even for undefined.
   */
  if (
    worker !== undefined
  ) {
    await worker.stop();
  }

  await database.disconnect();
}


async function connectDatabaseBeforeStartup(
  database:
    RuntimeDatabase,
  dependencies:
    RuntimeDependencies,
): Promise<void> {
  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      let finished =
        false;
      const finish = (
        callback:
          () => void,
      ): void => {
        if (
          finished
        ) {
          return;
        }
        finished =
          true;
        timer.clear();
        callback();
      };
      const timer =
        dependencies
          .setShutdownTimer(
            () => {
              finish(
                () => {
                  reject(
                    new DatabaseStartupError(),
                  );
                },
              );
            },
            dependencies
              .shutdownTimeoutMs,
          );
      timer.unref();
      void database
        .connect()
        .then(
          () => {
            finish(
              resolve,
            );
          },
          () => {
            finish(
              () => {
                reject(
                  new DatabaseStartupError(),
                );
              },
            );
          },
        );
    },
  );
}
async function waitUntilListening(
  server:
    RuntimeServer,
  config:
    AppConfig,
): Promise<void> {
  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      const cleanup =
        (): void => {
          server.off(
            'error',
            onError,
          );
          server.off(
            'listening',
            onListening,
          );
        };
      const onError =
        (): void => {
          cleanup();
          reject(
            new RuntimeStartupError(),
          );
        };
      const onListening =
        (): void => {
          cleanup();
          resolve();
        };
      server.once(
        'error',
        onError,
      );
      server.once(
        'listening',
        onListening,
      );
      try {
        server.listen(
          config.port,
          config.host,
        );
      } catch {
        cleanup();
        reject(
          new RuntimeStartupError(),
        );
      }
    },
  );
}
export async function startRuntime(
  config:
    AppConfig,
  logger:
    Logger,
  database:
    RuntimeDatabase,
  dependencies:
    RuntimeDependencies =
      defaultRuntimeDependencies,
): Promise<RuntimeController> {
  let server:
    RuntimeServer;

  let redisClient:
    | {
        readonly isOpen: boolean;
        quit(): Promise<unknown>;
      }
    | undefined;
  let securityOutboxWorker:
    SecurityOutboxWorker
    | undefined;

  try {
    const accessTokenService =
      new AccessTokenService(
        config.auth,
      );

    const redisUrl =
      config.redisUrl;

    const loginFailureStore =
      redisUrl === undefined
        ? undefined
        : await (async () => {
            const client =
              createClient({
                url:
                  redisUrl,
              });

            client.on(
              'error',
              () => {
                logger.error(
                  {
                    event:
                      'redisClientError',
                  },
                  'Redis client error',
                );
              },
            );

            redisClient =
              client;

            await client.connect();

            return new RedisStore({
              sendCommand:
                (...args: string[]) =>
                  client.sendCommand(
                    args,
                  ) as Promise<RedisReply>,
              prefix:
                'codegym:rate-limit:login-fail:',
            });
          })();
    const loginService =
      new LoginService(
        database
          .userRepository,
        database
          .authSessionRepository,
        accessTokenService,
        config.auth,
        undefined,
        undefined,
        database
          .accountSecurityRepository,
      );
    const googleLoginService =

      config.auth.google === undefined

      || database.authIdentityRepository === undefined

      || database.googleAccountRepository === undefined

        ? undefined

        : new GoogleLoginService(

            new GoogleIdTokenVerifier(

              config.auth.google,

            ),

            database.authIdentityRepository,

            database.userRepository,

            database.googleAccountRepository,

            new AuthenticatedSessionIssuer(

              database.authSessionRepository,

              accessTokenService,

              config.auth,

            ),

          );

    const refreshService =
      new RefreshService(
        database
          .authSessionRepository,
        accessTokenService,
        config.auth,
      );
    const logoutService =
      new LogoutService(
        database
          .authSessionRepository,
      );
    const currentUserService =
      new CurrentUserService(
        database
          .userRepository,
      );
    const profileService =
      new ProfileService(
        database
          .userRepository,
      );
    const passwordResetService =
      database.passwordResetRepository === undefined
        ? undefined
        : new PasswordResetService({
            userRepository: database.userRepository,
            passwordResetRepository: database.passwordResetRepository,
            mailer: createPasswordResetMailer(config.mail),
            crypto: new PasswordResetCrypto(config.passwordReset.hmacSecret),
            config: config.passwordReset,
          });
    const passwordChangeService =
      database.passwordChangeRepository === undefined
        ? undefined
        : new PasswordChangeService(
            database.passwordChangeRepository,
          );
    const sessionManagementService =
      new SessionManagementService(
        database
          .authSessionRepository,
      );
    const sessionActivityService =
      new SessionActivityService(
        database
          .authSessionRepository,
        config.auth,
      );

    const requireAuth =
      createRequireAuth({
        accessTokenService,
        authSessionRepository:
          database
            .authSessionRepository,
        idleSessionTimeoutSeconds:
          config.auth
            .idleSessionTimeoutSeconds,
      });
    const contentService =
      database.contentRepository ===
      undefined
        ? undefined
        : new ContentService(
            database.contentRepository,
          );

    const learningProgressService =
      database.learningProgressRepository
      === undefined
        ? undefined
        : new LearningProgressService(
            database.learningProgressRepository,
          );

    const trainingService =
      database.trainingRepository === undefined
        ? undefined
        : new TrainingService(
            database.trainingRepository,
            new ContentVerifier(
              new StaticVerifierManifestRepository(
                verifierManifest,
              ),
            ),
            undefined,
            new ProcessCodeExecutionService(),
            learningProgressService,
            database.contentRepository,
          );
    const completedSessionService =
      database.completedSessionRepository === undefined
        ? undefined
        : new CompletedSessionService(
            database.completedSessionRepository,
          );

    const attemptService =
      database.attemptRepository === undefined
        ? undefined
        : new AttemptService(
            database.attemptRepository,
          );

    const dashboardService =
      database.conceptProgressRepository === undefined
      || completedSessionService === undefined
        ? undefined
        : new DashboardService(
            new ConceptProgressService(
              database.conceptProgressRepository,
            ),
            completedSessionService,
            new ReviewService(
              database.conceptProgressRepository,
              {
                sufficientEvidenceAttempts: 5,
                targetAccuracy: 0.8,
                maximumCandidates: 4,
              },
            ),
            new BadgeService(
              database.conceptProgressRepository,
              {
                accuracyBadgeMinimumAttempts: 5,
              },
            ),
            10,
          );


    if (
      config.mail.provider !== 'disabled'
      && database.securityOutboxRepository
        !== undefined
    ) {
      securityOutboxWorker =
        new SecurityOutboxWorker(
          database.securityOutboxRepository,

          createAccountLockMailer(
            config.mail,
            config.frontendOrigins[0],
          ),

          logger,
        );
    }

    const app =
      dependencies
        .appFactory({
          contentService,
          config,
          logger,
          databaseHealthCheck:
            () =>
              database
                .healthCheck(),
          registrationService:
            new UserService(
              database
                .userRepository,
            ),
          loginService,
          ...(loginFailureStore === undefined
            ? {}
            : {
                loginFailureStore,
              }),
          loginFailureKeySecret:
            config.rateLimitKeySecret,

          accountSecurityRepository:
            database.accountSecurityRepository,

          googleLoginService,
          refreshService,
          logoutService,
          currentUserService,
          profileService,
          passwordResetService,
          passwordChangeService,
          sessionManagementService,
          sessionActivityService,
          learningProgressService,
          trainingService,
          dashboardService,
          attemptService,
          completedSessionService,
          requireAuth,
        });
    server =
      dependencies
        .serverFactory(
          app,
        );
    await waitUntilListening(
      server,
      config,
    );

    securityOutboxWorker?.start();
  } catch {
    if (
      redisClient !== undefined
      && redisClient.isOpen
    ) {
      try {
        await redisClient.quit();
      } catch {
        logger.error(
          {
            event:
              'redisStartupCleanupFailure',
          },
          'Redis startup cleanup failed',
        );
      }
    }

    await cleanupDatabaseAfterStartupFailure(
      database,
      logger,
      dependencies,
    );
    throw new RuntimeStartupError();
  }
  let handlersInstalled =
    true;
  let shutdownPromise:
    | Promise<void>
    | undefined;
  let databaseDisconnectPromise:
    | Promise<boolean>
    | undefined;
  let redisDisconnectPromise:
    | Promise<boolean>
    | undefined;

  const disconnectRedis =
    (): Promise<boolean> => {
      redisDisconnectPromise ??=
        Promise.resolve()
          .then(
            async () => {
              if (
                redisClient === undefined
                || !redisClient.isOpen
              ) {
                return;
              }

              await redisClient.quit();
            },
          )
          .then(
            () => false,
            () => {
              logger.error(
                {
                  event:
                    'redisDisconnectFailure',
                },
                'Redis shutdown failed',
              );

              return true;
            },
          );

      return redisDisconnectPromise;
    };

  const disconnectDatabase =
    (): Promise<boolean> => {
      databaseDisconnectPromise ??=
        Promise.resolve()
          .then(
            () =>
              disconnectDatabaseAfterWorker(database, securityOutboxWorker),
          )
          .then(
            () => false,
            () => {
              logger.error(
                {
                  event:
                    'databaseDisconnectFailure',
                },
                'Database shutdown failed',
              );
              return true;
            },
          );
      return databaseDisconnectPromise;
    };
  const removeHandlers =
    (): void => {
      if (
        !handlersInstalled
      ) {
        return;
      }
      handlersInstalled =
        false;
      dependencies
        .process
        .off(
          'SIGINT',
          onSigint,
        );
      dependencies
        .process
        .off(
          'SIGTERM',
          onSigterm,
        );
      dependencies
        .process
        .off(
          'uncaughtException',
          onUncaughtException,
        );
      dependencies
        .process
        .off(
          'unhandledRejection',
          onUnhandledRejection,
        );
      server.off(
        'error',
        onServerError,
      );
    };
  const shutdown = (
    reason:
      ShutdownReason =
        'requested',
  ): Promise<void> => {
    if (
      shutdownPromise !==
      undefined
    ) {
      return shutdownPromise;
    }
    const deferred =
      createDeferred();
    shutdownPromise =
      deferred.promise;
    removeHandlers();
    logger.info(
      {
        reason,
      },
      'Shutting down HTTP server',
    );
    let finished =
      false;
    const finish = (
      failed:
        boolean,
    ): void => {
      if (
        finished
      ) {
        return;
      }
      finished =
        true;
      timer.clear();
      if (
        failed
      ) {
        dependencies
          .process
          .setExitCode(
            1,
          );
      }
      deferred.resolve();
    };
    const timer =
      dependencies
        .setShutdownTimer(
          () => {
            logger.error(
              {
                event:
                  'shutdownTimeout',
              },
              'Runtime shutdown timed out',
            );
            server
              .closeAllConnections?.();
            void disconnectDatabase();
            void disconnectRedis();
            finish(
              true,
            );
            dependencies
              .process
              .exit(
                1,
              );
          },
          dependencies
            .shutdownTimeoutMs,
        );
    timer.unref();
    const closeHttp =
      new Promise<boolean>(
        (
          resolve,
        ) => {
          try {
            server.close(
              (
                error,
              ) => {
                if (
                  error !==
                  undefined
                ) {
                  logger.error(
                    {
                      event:
                        'shutdownCloseFailure',
                    },
                    'HTTP server shutdown failed',
                  );
                }
                resolve(
                  error !==
                    undefined,
                );
              },
            );
          } catch {
            logger.error(
              {
                event:
                  'shutdownCloseFailure',
              },
              'HTTP server shutdown failed',
            );
            resolve(
              true,
            );
          }
        },
      );
    void closeHttp.then(
      async (
        httpFailed,
      ) => {
        const [
          databaseFailed,
          redisFailed,
        ] =
          await Promise.all([
            disconnectDatabase(),
            disconnectRedis(),
          ]);

        finish(
          httpFailed
          || databaseFailed
          || redisFailed,
        );
      },
    );
    return shutdownPromise;
  };
  function handleFatalEvent(
    event:
      | 'uncaughtException'
      | 'unhandledRejection',
  ): void {
    logger.fatal(
      {
        event,
      },
      'Fatal runtime event',
    );
    dependencies
      .process
      .setExitCode(
        1,
      );
    void shutdown(
      event,
    );
  }
  function onSigint():
    void {
    void shutdown(
      'SIGINT',
    );
  }
  function onSigterm():
    void {
    void shutdown(
      'SIGTERM',
    );
  }
  function onUncaughtException():
    void {
    handleFatalEvent(
      'uncaughtException',
    );
  }
  function onUnhandledRejection():
    void {
    handleFatalEvent(
      'unhandledRejection',
    );
  }
  function onServerError():
    void {
    logger.fatal(
      {
        event:
          'serverError',
      },
      'HTTP server runtime failure',
    );
    dependencies
      .process
      .setExitCode(
        1,
      );
    void shutdown(
      'serverError',
    );
  }
  server.on(
    'error',
    onServerError,
  );
  dependencies
    .process
    .once(
      'SIGINT',
      onSigint,
    );
  dependencies
    .process
    .once(
      'SIGTERM',
      onSigterm,
    );
  dependencies
    .process
    .once(
      'uncaughtException',
      onUncaughtException,
    );
  dependencies
    .process
    .once(
      'unhandledRejection',
      onUnhandledRejection,
    );
  logger.info(
    {
      host:
        config.host,
      port:
        config.port,
    },
    'HTTP server listening',
  );
  return Object.freeze({
    server,
    shutdown,
  });
}
export async function bootstrapRuntime(
  dependencies:
    BootstrapDependencies = {},
): Promise<RuntimeController> {
  const config =
    (
      dependencies
        .configLoader
      ?? loadConfig
    )();
  const logger =
    (
      dependencies
        .loggerFactory
      ?? createLogger
    )(
      config,
    );
  const database =
    (
      dependencies
        .databaseFactory
      ?? defaultDatabaseFactory
    )(
      config,
    );
  const runtimeDependencies:
    RuntimeDependencies = {
      process:
        dependencies
          .process
        ?? defaultRuntimeDependencies
          .process,
      appFactory:
        dependencies
          .appFactory
        ?? defaultRuntimeDependencies
          .appFactory,
      serverFactory:
        dependencies
          .serverFactory
        ?? defaultRuntimeDependencies
          .serverFactory,
      setShutdownTimer:
        dependencies
          .setShutdownTimer
        ?? defaultRuntimeDependencies
          .setShutdownTimer,
      shutdownTimeoutMs:
        dependencies
          .shutdownTimeoutMs
        ?? defaultRuntimeDependencies
          .shutdownTimeoutMs,
    };
  try {
    await connectDatabaseBeforeStartup(
      database,
      runtimeDependencies,
    );
  } catch {
    await cleanupDatabaseAfterStartupFailure(
      database,
      logger,
      runtimeDependencies,
    );
    throw new DatabaseStartupError();
  }
  return startRuntime(
    config,
    logger,
    database,
    runtimeDependencies,
  );
}
