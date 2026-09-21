import { EventEmitter } from 'node:events';
import { Writable } from 'node:stream';

import express from 'express';
import pino, { type Logger } from 'pino';
import { describe, expect, it, vi } from 'vitest';

import type { AuthSessionRepository } from '../src/auth/auth-session-repository.js';
import type { UserRepository } from '../src/auth/user-repository.js';
import { EnvironmentError } from '../src/config/env.js';
import { createLogger } from '../src/config/logger.js';
import {
  bootstrapRuntime,
  type RuntimeDatabase,
  type RuntimeDependencies,
  type RuntimeEvent,
  type RuntimeListener,
  type RuntimeProcess,
  type RuntimeServer,
  type ShutdownTimer,
  startRuntime,
} from '../src/runtime.js';
import { testConfig } from './helpers.js';

type ListenMode =
  | 'automatic'
  | 'manual'
  | 'syncFailure'
  | 'asyncFailure';

type CloseMode =
  | 'automatic'
  | 'manual'
  | 'error'
  | 'throw';

class FakeServer extends EventEmitter {
  public listenCalls = 0;
  public closeCalls = 0;
  public forceCloseCalls = 0;

  public listenAddress:
    | {
        port: number;
        host: string;
      }
    | undefined;

  private closeCallback:
    | ((error?: Error) => void)
    | undefined;

  public constructor(
    private readonly listenMode: ListenMode = 'automatic',
    private readonly closeMode: CloseMode = 'automatic',
  ) {
    super();
  }

  public listen(
    port: number,
    host: string,
  ): this {
    this.listenCalls += 1;

    this.listenAddress = {
      port,
      host,
    };

    if (
      this.listenMode ===
      'syncFailure'
    ) {
      throw new Error(
        'listen secret must not leak',
      );
    }

    if (
      this.listenMode ===
      'automatic'
    ) {
      queueMicrotask(() =>
        this.emit('listening'),
      );
    }

    if (
      this.listenMode ===
      'asyncFailure'
    ) {
      queueMicrotask(() =>
        this.emit(
          'error',
          new Error(
            'listen secret must not leak',
          ),
        ),
      );
    }

    return this;
  }

  public close(
    callback: (
      error?: Error,
    ) => void,
  ): this {
    this.closeCalls += 1;

    this.closeCallback =
      callback;

    if (
      this.closeMode === 'throw'
    ) {
      throw new Error(
        'close secret must not leak',
      );
    }

    if (
      this.closeMode ===
      'automatic'
    ) {
      callback();
    }

    if (
      this.closeMode === 'error'
    ) {
      callback(
        new Error(
          'close secret must not leak',
        ),
      );
    }

    return this;
  }

  public closeAllConnections(): void {
    this.forceCloseCalls += 1;
  }

  public finishClose(
    error?: Error,
  ): void {
    this.closeCallback?.(error);
  }

  public asRuntimeServer(): RuntimeServer {
    return this;
  }
}

class FakeProcess implements RuntimeProcess {
  public readonly emitter =
    new EventEmitter();

  public readonly exitCodes:
    number[] = [];

  public readonly forcedExitCodes:
    number[] = [];

  public once(
    event: RuntimeEvent,
    listener: RuntimeListener,
  ): void {
    this.emitter.once(
      event,
      listener,
    );
  }

  public off(
    event: RuntimeEvent,
    listener: RuntimeListener,
  ): void {
    this.emitter.off(
      event,
      listener,
    );
  }

  public setExitCode(
    code: number,
  ): void {
    this.exitCodes.push(code);
  }

  public exit(
    code: number,
  ): void {
    this.forcedExitCodes.push(
      code,
    );
  }

  public emit(
    event: RuntimeEvent,
    value?: unknown,
  ): void {
    this.emitter.emit(
      event,
      value,
    );
  }

  public listenerCount(
    event: RuntimeEvent,
  ): number {
    return this.emitter.listenerCount(
      event,
    );
  }
}

class FakeDatabase implements RuntimeDatabase {
  public readonly userRepository: UserRepository = {
    createUser: () =>
      Promise.reject(
        new Error(
          'User persistence is not exercised by lifecycle tests',
        ),
      ),

    findUserByEmail: () =>
      Promise.reject(
        new Error(
          'User persistence is not exercised by lifecycle tests',
        ),
      ),

    findUserById: () =>
      Promise.reject(
        new Error(
          'User persistence is not exercised by lifecycle tests',
        ),
      ),

    updateDisplayName: () =>
      Promise.reject(
        new Error(
          'User persistence is not exercised by lifecycle tests',
        ),
      ),
  };

  public readonly authSessionRepository: AuthSessionRepository = {
    createSession: () =>
      Promise.reject(
        new Error(
          'Auth session persistence is not exercised by lifecycle tests',
        ),
      ),

    findSessionByRefreshTokenDigest: () =>
      Promise.reject(
        new Error(
          'Auth session persistence is not exercised by lifecycle tests',
        ),
      ),

    findSessionById: () =>
      Promise.reject(
        new Error(
          'Auth session persistence is not exercised by lifecycle tests',
        ),
      ),

    findSessionsByUserId: () =>
      Promise.reject(
        new Error(
          'Auth session persistence is not exercised by lifecycle tests',
        ),
      ),

    rotateSession: () =>
      Promise.reject(
        new Error(
          'Auth session persistence is not exercised by lifecycle tests',
        ),
      ),

    touchSessionActivity:
      () => Promise.resolve(true),

    revokeSessionByRefreshTokenDigest: () =>
      Promise.reject(
        new Error(
          'Auth session persistence is not exercised by lifecycle tests',
        ),
      ),

    revokeSessionById: () =>
      Promise.reject(
        new Error(
          'Auth session persistence is not exercised by lifecycle tests',
        ),
      ),

    revokeOtherSessions: () =>
      Promise.reject(
        new Error(
          'Auth session persistence is not exercised by lifecycle tests',
        ),
      ),
  };

  public connectCalls = 0;
  public disconnectCalls = 0;
  public healthCalls = 0;

  public connectError:
    | Error
    | undefined;

  public disconnectError:
    | Error
    | undefined;

  public connect(): Promise<void> {
    this.connectCalls += 1;

    if (
      this.connectError !==
      undefined
    ) {
      return Promise.reject(
        this.connectError,
      );
    }

    return Promise.resolve();
  }

  public disconnect(): Promise<void> {
    this.disconnectCalls += 1;

    if (
      this.disconnectError !==
      undefined
    ) {
      return Promise.reject(
        this.disconnectError,
      );
    }

    return Promise.resolve();
  }

  public healthCheck(): Promise<boolean> {
    this.healthCalls += 1;

    return Promise.resolve(true);
  }
}

function noOpTimer(): ShutdownTimer {
  return {
    clear() {},
    unref() {},
  };
}

function runtimeDependencies(
  server: FakeServer,
  runtimeProcess = new FakeProcess(),
  overrides: Partial<RuntimeDependencies> = {},
): RuntimeDependencies {
  return {
    process: runtimeProcess,

    appFactory: () =>
      express(),

    serverFactory: () =>
      server.asRuntimeServer(),

    setShutdownTimer: () =>
      noOpTimer(),

    shutdownTimeoutMs:
      10_000,

    ...overrides,
  };
}

const silentLogger = pino({
  level: 'silent',
});

describe(
  'HTTP runtime lifecycle',
  () => {
    it('validates configuration before creating the app, server, or listener', async () => {
      const appFactory =
        vi.fn(() => express());

      const serverFactory =
        vi.fn();

      const databaseFactory =
        vi.fn();

      await expect(
        bootstrapRuntime({
          configLoader: () => {
            throw new EnvironmentError(
              [
                'FRONTEND_ORIGINS',
              ],
            );
          },

          appFactory,
          serverFactory,
          databaseFactory,
        }),
      ).rejects.toThrow(
        EnvironmentError,
      );

      expect(
        appFactory,
      ).not.toHaveBeenCalled();

      expect(
        serverFactory,
      ).not.toHaveBeenCalled();

      expect(
        databaseFactory,
      ).not.toHaveBeenCalled();
    });

    it('fails safely and cleans up when the required database cannot connect', async () => {
      const serverFactory =
        vi.fn();

      const database =
        new FakeDatabase();

      database.connectError =
        new Error(
          'mysql://user:password@private-host/database',
        );

      await expect(
        bootstrapRuntime({
          configLoader:
            testConfig,

          loggerFactory: () =>
            silentLogger,

          databaseFactory: () =>
            database,

          serverFactory,
        }),
      ).rejects.toThrow(
        'Database could not start',
      );

      expect(
        database.connectCalls,
      ).toBe(1);

      expect(
        database.disconnectCalls,
      ).toBe(1);

      expect(
        serverFactory,
      ).not.toHaveBeenCalled();
    });

    it('bounds a database connection that never settles and never creates a listener', async () => {
      const runtimeProcess =
        new FakeProcess();

      const database =
        new FakeDatabase();

      const connect = vi
        .spyOn(
          database,
          'connect',
        )
        .mockImplementation(
          () =>
            new Promise<void>(
              () => undefined,
            ),
        );

      const serverFactory =
        vi.fn();

      const timers:
        Array<() => void> = [];

      const startup =
        bootstrapRuntime({
          configLoader:
            testConfig,

          loggerFactory: () =>
            silentLogger,

          databaseFactory: () =>
            database,

          serverFactory,

          process:
            runtimeProcess,

          setShutdownTimer(
            callback,
          ) {
            timers.push(
              callback,
            );

            return noOpTimer();
          },

          shutdownTimeoutMs: 25,
        });

      await Promise.resolve();

      timers[0]?.();

      await expect(
        startup,
      ).rejects.toThrow(
        'Database could not start',
      );

      expect(
        connect,
      ).toHaveBeenCalledOnce();

      expect(
        database.disconnectCalls,
      ).toBe(1);

      expect(
        serverFactory,
      ).not.toHaveBeenCalled();

      expect(
        runtimeProcess
          .forcedExitCodes,
      ).toEqual([]);
    });

    it('attaches startup listeners before listen and lifecycle handlers only after listening', async () => {
      const server =
        new FakeServer(
          'manual',
        );

      const runtimeProcess =
        new FakeProcess();

      const starting =
        startRuntime(
          testConfig(),
          silentLogger,
          new FakeDatabase(),
          runtimeDependencies(
            server,
            runtimeProcess,
          ),
        );

      expect(
        server.listenCalls,
      ).toBe(1);

      expect(
        server.listenerCount(
          'error',
        ),
      ).toBe(1);

      expect(
        server.listenerCount(
          'listening',
        ),
      ).toBe(1);

      expect(
        runtimeProcess.listenerCount(
          'SIGTERM',
        ),
      ).toBe(0);

      server.emit(
        'listening',
      );

      const runtime =
        await starting;

      expect(
        server.listenAddress,
      ).toEqual({
        port: 3000,
        host: '127.0.0.1',
      });

      expect(
        runtimeProcess.listenerCount(
          'SIGINT',
        ),
      ).toBe(1);

      expect(
        runtimeProcess.listenerCount(
          'SIGTERM',
        ),
      ).toBe(1);

      expect(
        runtimeProcess.listenerCount(
          'uncaughtException',
        ),
      ).toBe(1);

      expect(
        runtimeProcess.listenerCount(
          'unhandledRejection',
        ),
      ).toBe(1);

      await runtime.shutdown();
    });

    it('shares one idempotent shutdown, closes once, and removes every handler once', async () => {
      const server =
        new FakeServer(
          'automatic',
          'manual',
        );

      const runtimeProcess =
        new FakeProcess();

      const database =
        new FakeDatabase();

      const runtime =
        await startRuntime(
          testConfig(),
          silentLogger,
          database,
          runtimeDependencies(
            server,
            runtimeProcess,
          ),
        );

      const firstShutdown =
        runtime.shutdown(
          'SIGINT',
        );

      const secondShutdown =
        runtime.shutdown(
          'SIGTERM',
        );

      expect(
        secondShutdown,
      ).toBe(
        firstShutdown,
      );

      expect(
        server.closeCalls,
      ).toBe(1);

      for (const event of [
        'SIGINT',
        'SIGTERM',
        'uncaughtException',
        'unhandledRejection',
      ] as const) {
        expect(
          runtimeProcess.listenerCount(
            event,
          ),
        ).toBe(0);
      }

      expect(
        server.listenerCount(
          'error',
        ),
      ).toBe(0);

      server.finishClose();

      await firstShutdown;

      expect(
        database.disconnectCalls,
      ).toBe(1);

      expect(
        runtimeProcess.exitCodes,
      ).toEqual([]);
    });

    it.each(
      [
        'SIGINT',
        'SIGTERM',
      ] as const,
    )(
      'performs clean shutdown for %s',
      async (signal) => {
        const server =
          new FakeServer();

        const runtimeProcess =
          new FakeProcess();

        const database =
          new FakeDatabase();

        const runtime =
          await startRuntime(
            testConfig(),
            silentLogger,
            database,
            runtimeDependencies(
              server,
              runtimeProcess,
            ),
          );

        runtimeProcess.emit(
          signal,
        );

        await runtime.shutdown();

        expect(
          server.closeCalls,
        ).toBe(1);

        expect(
          database.disconnectCalls,
        ).toBe(1);

        expect(
          runtimeProcess
            .exitCodes,
        ).toEqual([]);
      },
    );

    it('forces connections closed, marks failure, and resolves after the shutdown deadline', async () => {
      const server =
        new FakeServer(
          'automatic',
          'manual',
        );

      const runtimeProcess =
        new FakeProcess();

      let deadline:
        | (() => void)
        | undefined;

      const clear = vi.fn();
      const unref = vi.fn();

      const database =
        new FakeDatabase();

      const runtime =
        await startRuntime(
          testConfig(),
          silentLogger,
          database,
          runtimeDependencies(
            server,
            runtimeProcess,
            {
              shutdownTimeoutMs:
                25,

              setShutdownTimer(
                callback,
                milliseconds,
              ) {
                expect(
                  milliseconds,
                ).toBe(25);

                deadline =
                  callback;

                return {
                  clear,
                  unref,
                };
              },
            },
          ),
        );

      const shutdown =
        runtime.shutdown();

      expect(
        unref,
      ).toHaveBeenCalledOnce();

      deadline?.();

      await shutdown;

      expect(
        server.forceCloseCalls,
      ).toBe(1);

      expect(
        database.disconnectCalls,
      ).toBe(1);

      expect(
        runtimeProcess
          .exitCodes,
      ).toContain(1);

      expect(
        runtimeProcess
          .forcedExitCodes,
      ).toEqual([1]);

      expect(
        clear,
      ).toHaveBeenCalledOnce();
    });

    it('hard-terminates after the global deadline when database disconnect never settles', async () => {
      const server =
        new FakeServer(
          'automatic',
          'automatic',
        );

      const runtimeProcess =
        new FakeProcess();

      const database =
        new FakeDatabase();

      const disconnect = vi
        .spyOn(
          database,
          'disconnect',
        )
        .mockImplementation(
          () =>
            new Promise<void>(
              () => undefined,
            ),
        );

      let deadline:
        | (() => void)
        | undefined;

      const runtime =
        await startRuntime(
          testConfig(),
          silentLogger,
          database,
          runtimeDependencies(
            server,
            runtimeProcess,
            {
              setShutdownTimer(
                callback,
              ) {
                deadline =
                  callback;

                return noOpTimer();
              },
            },
          ),
        );

      const shutdown =
        runtime.shutdown();

      await Promise.resolve();

      deadline?.();

      await shutdown;

      expect(
        disconnect,
      ).toHaveBeenCalledOnce();

      expect(
        runtimeProcess
          .forcedExitCodes,
      ).toEqual([1]);
    });

    it('bounds cleanup after a failed database connection without creating a listener', async () => {
      const runtimeProcess =
        new FakeProcess();

      const database =
        new FakeDatabase();

      database.connectError =
        new Error(
          'private DB error',
        );

      const disconnect = vi
        .spyOn(
          database,
          'disconnect',
        )
        .mockImplementation(
          () =>
            new Promise<void>(
              () => undefined,
            ),
        );

      const serverFactory =
        vi.fn();

      const deadlines:
        Array<() => void> = [];

      const startup =
        bootstrapRuntime({
          configLoader:
            testConfig,

          loggerFactory: () =>
            silentLogger,

          databaseFactory: () =>
            database,

          serverFactory,

          process:
            runtimeProcess,

          setShutdownTimer(
            callback,
          ) {
            deadlines.push(
              callback,
            );

            return noOpTimer();
          },
        });

      await vi.waitFor(() => {
        expect(
          deadlines,
        ).toHaveLength(2);
      });

      deadlines[1]?.();

      await expect(
        startup,
      ).rejects.toThrow(
        'Database could not start',
      );

      expect(
        serverFactory,
      ).not.toHaveBeenCalled();

      expect(
        disconnect,
      ).toHaveBeenCalledOnce();

      expect(
        runtimeProcess
          .forcedExitCodes,
      ).toEqual([1]);
    });

    it.each(
      [
        'error',
        'throw',
      ] as const,
    )(
      'marks close %s as a failure without leaking the raw error',
      async (mode) => {
        const server =
          new FakeServer(
            'automatic',
            mode,
          );

        const runtimeProcess =
          new FakeProcess();

        const runtime =
          await startRuntime(
            testConfig(),
            silentLogger,
            new FakeDatabase(),
            runtimeDependencies(
              server,
              runtimeProcess,
            ),
          );

        await runtime.shutdown();

        expect(
          runtimeProcess
            .exitCodes,
        ).toContain(1);
      },
    );

    it.each(
      [
        'syncFailure',
        'asyncFailure',
      ] as const,
    )(
      'rejects a %s listen failure without process handlers',
      async (mode) => {
        const server =
          new FakeServer(mode);

        const runtimeProcess =
          new FakeProcess();

        const database =
          new FakeDatabase();

        await expect(
          startRuntime(
            testConfig(),
            silentLogger,
            database,
            runtimeDependencies(
              server,
              runtimeProcess,
            ),
          ),
        ).rejects.toThrow(
          'HTTP server could not start',
        );

        expect(
          server.listenerCount(
            'error',
          ),
        ).toBe(0);

        expect(
          server.listenerCount(
            'listening',
          ),
        ).toBe(0);

        expect(
          runtimeProcess.listenerCount(
            'SIGINT',
          ),
        ).toBe(0);

        expect(
          database.disconnectCalls,
        ).toBe(1);
      },
    );

    it.each(
      [
        'uncaughtException',
        'unhandledRejection',
      ] as const,
    )(
      'sanitizes %s, sets failure status, and reuses shutdown',
      async (event) => {
        let output = '';

        const destination =
          new Writable({
            write(
              chunk: Buffer,
              _encoding:
                BufferEncoding,
              callback: (
                error?:
                  | Error
                  | null,
              ) => void,
            ) {
              output +=
                chunk.toString();

              callback();
            },
          });

        const logger: Logger =
          createLogger(
            testConfig({
              logLevel: 'info',
            }),
            destination,
          );

        const server =
          new FakeServer();

        const runtimeProcess =
          new FakeProcess();

        const database =
          new FakeDatabase();

        const runtime =
          await startRuntime(
            testConfig(),
            logger,
            database,
            runtimeDependencies(
              server,
              runtimeProcess,
            ),
          );

        runtimeProcess.emit(
          event,
          new Error(
            'fatal-secret-value',
          ),
        );

        await runtime.shutdown();

        expect(
          output,
        ).not.toContain(
          'fatal-secret-value',
        );

        expect(
          output,
        ).toContain(event);

        expect(
          runtimeProcess
            .exitCodes,
        ).toContain(1);

        expect(
          server.closeCalls,
        ).toBe(1);

        expect(
          database.disconnectCalls,
        ).toBe(1);
      },
    );
  },
);
