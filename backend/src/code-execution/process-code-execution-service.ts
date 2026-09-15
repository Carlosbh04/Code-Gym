import { spawn } from 'node:child_process';
import {
  CodeExecutionUnavailableError,
  type CodeExecutionResult,
  type CodeExecutionService,
  type ExecuteCodeInput,
} from './code-execution-service.js';
import { QUICKJS_RUNNER_SOURCE } from './quickjs-runner-source.js';

const DEFAULT_EXECUTION_TIMEOUT_MS = 3_000;
const DEFAULT_WATCHDOG_GRACE_MS = 1_500;
const MAX_RESPONSE_BYTES = 256 * 1024;

export interface ProcessCodeExecutionOptions {
  readonly executionTimeoutMs?: number;
  readonly watchdogGraceMs?: number;
}

interface RunnerResponse {
  readonly ok: boolean;
  readonly result?: CodeExecutionResult;
  readonly infrastructureError?: string;
}

export class ProcessCodeExecutionService implements CodeExecutionService {
  private readonly executionTimeoutMs: number;
  private readonly watchdogGraceMs: number;

  public constructor(options: ProcessCodeExecutionOptions = {}) {
    this.executionTimeoutMs =
      options.executionTimeoutMs ?? DEFAULT_EXECUTION_TIMEOUT_MS;
    this.watchdogGraceMs =
      options.watchdogGraceMs ?? DEFAULT_WATCHDOG_GRACE_MS;

    assertPositiveInteger(this.executionTimeoutMs, 'executionTimeoutMs');
    assertPositiveInteger(this.watchdogGraceMs, 'watchdogGraceMs');
  }

  public execute(input: ExecuteCodeInput): Promise<CodeExecutionResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          '--max-old-space-size=96',
          '--input-type=module',
          '--eval',
          QUICKJS_RUNNER_SOURCE,
        ],
        {
          cwd: process.cwd(),
          env: minimalEnvironment(),
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
        },
      );

      let stdout = '';
      let stderr = '';
      let settled = false;

      const finish = (callback: () => void): void => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        callback();
      };

      const watchdog = setTimeout(() => {
        child.kill('SIGKILL');
        finish(() => {
          resolve({
            passed: false,
            reason: 'timeout',
          });
        });
      }, this.executionTimeoutMs + this.watchdogGraceMs);
      watchdog.unref();

      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');

      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
        if (Buffer.byteLength(stdout, 'utf8') > MAX_RESPONSE_BYTES) {
          child.kill('SIGKILL');
          finish(() => { reject(new CodeExecutionUnavailableError('Runner response exceeded limit')); });
        }
      });

      child.stderr.on('data', (chunk: string) => {
        if (Buffer.byteLength(stderr, 'utf8') < MAX_RESPONSE_BYTES) {
          stderr += chunk;
        }
      });

      child.on('error', () => {
        finish(() => { reject(new CodeExecutionUnavailableError('Runner could not start')); });
      });

      child.on('close', (code, signal) => {
        finish(() => {
          if (signal !== null || code !== 0) {
            reject(
              new CodeExecutionUnavailableError(
                `Runner exited unexpectedly (code=${String(code)}, signal=${String(signal)}): ${stderr.trim() || 'no stderr'}`,
              ),
            );
            return;
          }

          let parsed: RunnerResponse;
          try {
            parsed = JSON.parse(stdout) as RunnerResponse;
          } catch {
            reject(new CodeExecutionUnavailableError('Runner returned malformed output'));
            return;
          }

          if (!parsed.ok || parsed.result === undefined) {
            reject(new CodeExecutionUnavailableError(parsed.infrastructureError ?? 'Runner failed'));
            return;
          }

          if (!isCodeExecutionResult(parsed.result)) {
            reject(new CodeExecutionUnavailableError('Runner returned invalid result'));
            return;
          }

          resolve(Object.freeze({ ...parsed.result }));
        });
      });

      try {
        child.stdin.end(JSON.stringify({
          code: input.code,
          testCases: input.testCases,
          timeoutMs: this.executionTimeoutMs,
        }));
      } catch {
        child.kill('SIGKILL');
        finish(() => { reject(new CodeExecutionUnavailableError('Runner request failed')); });
      }
    });
  }
}

function minimalEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};

  for (const key of ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'SystemRoot', 'WINDIR']) {
    const value = process.env[key];
    if (value !== undefined) environment[key] = value;
  }

  environment.NODE_ENV = 'production';
  return environment;
}

function isCodeExecutionResult(value: unknown): value is CodeExecutionResult {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.passed === 'boolean'
    && typeof candidate.reason === 'string'
    && ['passed', 'failed', 'syntax-error', 'runtime-error', 'timeout'].includes(candidate.reason)
  );
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive integer`);
  }
}
