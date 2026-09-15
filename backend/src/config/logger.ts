import pino, { type DestinationStream, type Logger, type LoggerOptions } from 'pino';

import type { AppConfig } from './env.js';

const sensitiveKeys = [
  'password',
  'passphrase',
  'hash',
  'passwordHash',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'refreshTokenDigest',
  'refresh_token_digest',
  'authToken',
  'auth_token',
  'secret',
  'clientSecret',
  'client_secret',
  'jwtSecret',
  'jwt_secret',
  'apiKey',
  'api_key',
  'RESEND_API_KEY',
  'resendApiKey',
  'databaseUrl',
  'database_url',
  'datasourceUrl',
  'connectionString',
  'connection_string',
  'DB_PASSWORD',
  'db_password',
  'code',
  'codeHash',
  'codeDigest',
  'resetToken',
  'resetTokenDigest',
  'newPassword',
] as const;

const sensitiveKeySet = new Set<string>(sensitiveKeys);

const sensitiveKeyPattern =
  /(?:authorization|cookie|password|passphrase|hash|digest|token|secret|api_?key|database_?url|datasource_?url|connection_?string)$/i;

const redactedPaths = [
  'req.headers.authorization',
  'req.headers.Authorization',
  'req.headers.cookie',
  'res.headers.set-cookie',
  'res.headers["set-cookie"]',
  ...sensitiveKeys.flatMap((key) => [key, `*.${key}`, `*.*.${key}`, `*.*.*.${key}`, `*.*.*.*.${key}`]),
];

export type LoggerConfig = Pick<AppConfig, 'logLevel' | 'nodeEnv'>;

function isSensitiveKey(key: string): boolean {
  return sensitiveKeySet.has(key) || sensitiveKeyPattern.test(key);
}

type PlainContainer = Record<string, unknown> | unknown[];

function isPlainContainer(value: unknown): value is PlainContainer {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  if (Array.isArray(value)) {
    return true;
  }

  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function createContainer(source: PlainContainer): PlainContainer {
  return Array.isArray(source) ? [] : (Object.create(null) as Record<string, unknown>);
}

function redactNamedFields(value: unknown): unknown {
  if (!isPlainContainer(value)) {
    return value;
  }

  const root = createContainer(value);
  const visited = new WeakMap<object, PlainContainer>([[value, root]]);
  const pending: Array<{ source: PlainContainer; target: PlainContainer }> = [
    { source: value, target: root },
  ];

  const cloneValue = (entry: unknown): unknown => {
    if (!isPlainContainer(entry)) {
      return entry;
    }

    const existing = visited.get(entry);
    if (existing !== undefined) {
      return existing;
    }

    const clone = createContainer(entry);
    visited.set(entry, clone);
    pending.push({ source: entry, target: clone });
    return clone;
  };

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) {
      continue;
    }

    if (Array.isArray(current.source) && Array.isArray(current.target)) {
      for (const entry of current.source) {
        current.target.push(cloneValue(entry));
      }
      continue;
    }

    const target = current.target as Record<string, unknown>;
    for (const [key, entry] of Object.entries(current.source)) {
      target[key] = isSensitiveKey(key) ? '[Redacted]' : cloneValue(entry);
    }
  }

  return root;
}

/**
 * Structured logger with cycle-safe sensitive-name redaction at any nesting
 * depth. HTTP serializers deliberately avoid bodies and queries.
 */
export function createLogger(config: LoggerConfig, destination?: DestinationStream): Logger {
  const options: LoggerOptions = {
    level: config.logLevel,
    base: config.nodeEnv === 'test' ? null : { environment: config.nodeEnv },
    redact: {
      paths: redactedPaths,
      censor: '[Redacted]',
    },
    formatters: {
      log(object) {
        return redactNamedFields(object) as Record<string, unknown>;
      },
    },
  };

  return pino(options, destination);
}
