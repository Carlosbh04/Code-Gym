import { isIP } from 'node:net';

import { z } from 'zod';

export const nodeEnvironments = ['development', 'test', 'production'] as const;
export const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

export type NodeEnvironment = (typeof nodeEnvironments)[number];
export type LogLevel = (typeof logLevels)[number];
export type RawEnvironment = Readonly<Record<string, string | undefined>>;

export interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly name: string;
  readonly user: string;
  readonly password: string;
  readonly tls: boolean;
}

export interface GoogleAuthConfig {
  readonly clientId: string;
}

export interface AuthConfig {
  /** Canonical, unpadded base64url encoding of exactly 32 random bytes. */
  readonly accessTokenSecret: string;
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  readonly google?: GoogleAuthConfig;
}

export interface PasswordResetConfig {
  /** Canonical, unpadded base64url encoding of exactly 32 independent random bytes. */
  readonly hmacSecret: string;
  readonly codeTtlSeconds: number;
  readonly resetTokenTtlSeconds: number;
  readonly maximumAttempts: number;
}

export type MailConfig =
  | Readonly<{
      provider: 'disabled';
    }>
  | Readonly<{
      provider: 'resend';
      resendApiKey: string;
      from: string;
    }>;

export interface AppConfig {
  readonly nodeEnv: NodeEnvironment;
  readonly host: string;
  readonly port: number;
  readonly frontendOrigins: readonly string[];
  readonly logLevel: LogLevel;
  readonly isDevelopment: boolean;
  readonly isTest: boolean;
  readonly isProduction: boolean;
  readonly database: DatabaseConfig;
  readonly auth: AuthConfig;
  readonly passwordReset: PasswordResetConfig;
  readonly mail: MailConfig;
}

const hostSchema = z.string().trim().min(1).max(253).refine(isValidHost, 'Invalid host');

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(nodeEnvironments).default('development'),
  HOST: hostSchema.default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  FRONTEND_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.enum(logLevels).optional(),
  ACCESS_TOKEN_SECRET: z.string().refine(isCanonicalBase64UrlSecret, 'Must encode exactly 32 bytes'),
  PASSWORD_RESET_SECRET: z.string().refine(isCanonicalBase64UrlSecret, 'Must encode exactly 32 bytes'),
  RESEND_API_KEY: z.string().trim().min(1).max(512).optional(),
  MAIL_FROM: z.string().trim().min(3).max(320).refine(isValidMailFrom, 'Invalid sender').optional(),
  GOOGLE_CLIENT_ID: z.string().trim().min(1).max(512).optional(),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(600),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().min(86_400).max(7_776_000).default(2_592_000),
}).superRefine((environment, context) => {
  if (environment.REFRESH_TOKEN_TTL_SECONDS <= environment.ACCESS_TOKEN_TTL_SECONDS) {
    context.addIssue({
      code: 'custom',
      path: ['REFRESH_TOKEN_TTL_SECONDS'],
      message: 'Must be greater than access token TTL',
    });
  }
});

const databaseEnvSchema = z
  .object({
    NODE_ENV: z.enum(nodeEnvironments).default('development'),
    DB_HOST: hostSchema,
    DB_PORT: z.coerce.number().int().min(1).max(65_535).default(3306),
    DB_NAME: z.string().trim().min(1),
    DB_USER: z.string().trim().min(1),
    DB_PASSWORD: z.string().min(1).refine((value) => value.trim() !== '', 'Required'),
    DB_SSL: z.enum(['true', 'false']).optional(),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === 'production' && environment.DB_SSL === 'false') {
      context.addIssue({ code: 'custom', path: ['DB_SSL'], message: 'TLS is required in production' });
    }
  });

export class EnvironmentError extends Error {
  public readonly fields: readonly string[];

  public constructor(fields: readonly string[]) {
    const uniqueFields = [...new Set(fields)];
    super(`Invalid environment configuration: ${uniqueFields.join(', ')}`);
    this.name = 'EnvironmentError';
    this.fields = Object.freeze(uniqueFields);
  }
}

function isValidHost(value: string): boolean {
  if (isIP(value) !== 0 || value === 'localhost') {
    return true;
  }

  if (value.endsWith('.') || !/^[A-Za-z0-9.-]+$/.test(value)) {
    return false;
  }

  return value.split('.').every((label) => {
    return label.length > 0 && label.length <= 63 && /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label);
  });
}

function isCanonicalBase64UrlSecret(value: string): boolean {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    return false;
  }

  const decoded = Buffer.from(value, 'base64url');
  return decoded.byteLength === 32 && decoded.toString('base64url') === value;
}

function isValidMailFrom(value: string): boolean {
  if (/[\r\n]/.test(value)) return false;

  const bracketedAddress = /^(?:[^<>]{1,100})<([^<>]+)>$/.exec(value)?.[1]?.trim();
  const address = bracketedAddress ?? value;
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address);
}

function parseFrontendOrigins(value: string | undefined): readonly string[] {
  if (value === undefined || value.trim() === '') {
    return Object.freeze([]);
  }

  const candidates = value.split(',').map((origin) => origin.trim());
  if (candidates.some((origin) => origin === '')) {
    throw new EnvironmentError(['FRONTEND_ORIGINS']);
  }

  const origins = candidates.map((origin) => {
    if (origin === '*' || origin.toLowerCase() === 'null') {
      throw new EnvironmentError(['FRONTEND_ORIGINS']);
    }

    try {
      const url = new URL(origin);
      const isHttp = url.protocol === 'http:' || url.protocol === 'https:';
      const hasCredentials = url.username !== '' || url.password !== '';
      const hasExtraComponents = url.pathname !== '/' || url.search !== '' || url.hash !== '';

      if (!isHttp || hasCredentials || hasExtraComponents || url.origin === 'null') {
        throw new Error('Not an exact HTTP(S) origin');
      }

      return url.origin;
    } catch {
      throw new EnvironmentError(['FRONTEND_ORIGINS']);
    }
  });

  return Object.freeze([...new Set(origins)]);
}

function defaultLogLevel(nodeEnv: NodeEnvironment): LogLevel {
  switch (nodeEnv) {
    case 'development':
      return 'debug';
    case 'test':
      return 'silent';
    case 'production':
      return 'info';
  }
}

/** Pure validation and normalization. It never reads global process state. */
export function parseEnv(rawEnv: RawEnvironment): AppConfig {
  const result = rawEnvSchema.safeParse(rawEnv);

  if (!result.success) {
    const fields = result.error.issues.map((issue) => String(issue.path[0] ?? 'environment'));
    throw new EnvironmentError(fields);
  }

  const frontendOrigins = parseFrontendOrigins(result.data.FRONTEND_ORIGINS);
  if (result.data.NODE_ENV === 'production' && frontendOrigins.length === 0) {
    throw new EnvironmentError(['FRONTEND_ORIGINS']);
  }

  const database = parseDatabaseEnv(rawEnv);
  const auth = Object.freeze({
    accessTokenSecret: result.data.ACCESS_TOKEN_SECRET,
    accessTokenTtlSeconds: result.data.ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlSeconds: result.data.REFRESH_TOKEN_TTL_SECONDS,
    ...(result.data.GOOGLE_CLIENT_ID === undefined
      ? {}
      : {
          google: Object.freeze({
            clientId: result.data.GOOGLE_CLIENT_ID,
          }),
        }),
  });
  const passwordReset = Object.freeze({
    hmacSecret: result.data.PASSWORD_RESET_SECRET,
    codeTtlSeconds: 300,
    resetTokenTtlSeconds: 600,
    maximumAttempts: 5,
  });
  const mail = parseMailConfig(
    result.data.NODE_ENV,
    result.data.RESEND_API_KEY,
    result.data.MAIL_FROM,
  );

  return Object.freeze({
    nodeEnv: result.data.NODE_ENV,
    host: result.data.HOST,
    port: result.data.PORT,
    frontendOrigins,
    logLevel: result.data.LOG_LEVEL ?? defaultLogLevel(result.data.NODE_ENV),
    isDevelopment: result.data.NODE_ENV === 'development',
    isTest: result.data.NODE_ENV === 'test',
    isProduction: result.data.NODE_ENV === 'production',
    database,
    auth,
    passwordReset,
    mail,
  });
}

function parseMailConfig(
  nodeEnv: NodeEnvironment,
  resendApiKey: string | undefined,
  mailFrom: string | undefined,
): MailConfig {
  if (nodeEnv === 'test') {
    return Object.freeze({ provider: 'disabled' as const });
  }

  if (resendApiKey === undefined || mailFrom === undefined) {
    const missingFields: string[] = [];
    if (resendApiKey === undefined) missingFields.push('RESEND_API_KEY');
    if (mailFrom === undefined) missingFields.push('MAIL_FROM');
    throw new EnvironmentError(missingFields);
  }

  return Object.freeze({
    provider: 'resend' as const,
    resendApiKey,
    from: mailFrom,
  });
}

/** Pure database-only parser shared by the application and Prisma CLI config. */
export function parseDatabaseEnv(rawEnv: RawEnvironment): DatabaseConfig {
  const result = databaseEnvSchema.safeParse(rawEnv);

  if (!result.success) {
    const fields = result.error.issues.map((issue) => String(issue.path[0] ?? 'environment'));
    throw new EnvironmentError(fields);
  }

  return Object.freeze({
    host: result.data.DB_HOST,
    port: result.data.DB_PORT,
    name: result.data.DB_NAME,
    user: result.data.DB_USER,
    password: result.data.DB_PASSWORD,
    tls: result.data.DB_SSL === 'true' || (result.data.DB_SSL === undefined && result.data.NODE_ENV === 'production'),
  });
}
