import { describe, expect, it } from 'vitest';

import { buildDatabaseUrl } from '../src/config/database-url.js';
import { EnvironmentError, parseDatabaseEnv, parseEnv, type RawEnvironment } from '../src/config/env.js';

const validDatabaseEnv = Object.freeze({
  DB_HOST: '127.0.0.1',
  DB_PORT: '3306',
  DB_NAME: 'codegym_test',
  DB_USER: 'codegym',
  DB_PASSWORD: 'test-password',
});

const validAuthEnv = Object.freeze({
  ACCESS_TOKEN_SECRET: Buffer.alloc(32, 1).toString('base64url'),
  PASSWORD_RESET_SECRET: Buffer.alloc(32, 2).toString('base64url'),
  RESEND_API_KEY: 're_test_configuration_only',
  MAIL_FROM: 'CodeGym <security@example.com>',
});

function parseTestEnv(input: RawEnvironment = {}) {
  return parseEnv({ ...validDatabaseEnv, ...validAuthEnv, ...input });
}

describe('environment configuration', () => {
  it('loads safe development defaults, database config, and derived flags', () => {
    expect(parseTestEnv()).toEqual({
      nodeEnv: 'development', host: '127.0.0.1', port: 3000, frontendOrigins: [], logLevel: 'debug',
      isDevelopment: true, isTest: false, isProduction: false,
      database: { host: '127.0.0.1', port: 3306, name: 'codegym_test', user: 'codegym', password: 'test-password', tls: false },
      auth: {
        accessTokenSecret: validAuthEnv.ACCESS_TOKEN_SECRET,
        accessTokenTtlSeconds: 600,
        refreshTokenTtlSeconds: 2_592_000,
      },
      passwordReset: {
        hmacSecret: validAuthEnv.PASSWORD_RESET_SECRET,
        codeTtlSeconds: 300,
        resetTokenTtlSeconds: 600,
        maximumAttempts: 5,
      },
      mail: {
        provider: 'resend',
        resendApiKey: validAuthEnv.RESEND_API_KEY,
        from: validAuthEnv.MAIL_FROM,
      },
    });
  });

  it.each([
    ['development', 'debug', [true, false, false]],
    ['test', 'silent', [false, true, false]],
    ['production', 'info', [false, false, true]],
  ] as const)('derives defaults and flags for %s', (nodeEnv, logLevel, flags) => {
    const config = parseTestEnv({ NODE_ENV: nodeEnv, FRONTEND_ORIGINS: nodeEnv === 'production' ? 'https://app.example.com' : undefined });
    expect(config.logLevel).toBe(logLevel);
    expect([config.isDevelopment, config.isTest, config.isProduction]).toEqual(flags);
  });

  it('enables Google authentication only when GOOGLE_CLIENT_ID is configured', () => {
    const withoutGoogle = parseTestEnv();

    expect(withoutGoogle.auth.google).toBeUndefined();

    const withGoogle = parseTestEnv({
      GOOGLE_CLIENT_ID: 'codegym-test.apps.googleusercontent.com',
    });

    expect(withGoogle.auth.google).toEqual({
      clientId: 'codegym-test.apps.googleusercontent.com',
    });
    expect(Object.isFrozen(withGoogle.auth.google)).toBe(true);
  });

  it('normalizes frontend origins and accepts an explicit log override', () => {
    const config = parseTestEnv({
      LOG_LEVEL: 'trace',
      FRONTEND_ORIGINS: ' https://APP.example.com:443/, http://localhost:5173 ,https://app.example.com ',
    });
    expect(config.logLevel).toBe('trace');
    expect(config.frontendOrigins).toEqual(['https://app.example.com', 'http://localhost:5173']);
  });

  it.each(['1', '65535'])('accepts PORT boundary %s', (port) => {
    expect(parseTestEnv({ PORT: port }).port).toBe(Number(port));
  });

  it('deeply freezes app and database configuration', () => {
    const config = parseTestEnv({ FRONTEND_ORIGINS: 'https://app.example.com' });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.frontendOrigins)).toBe(true);
    expect(Object.isFrozen(config.database)).toBe(true);
    expect(Object.isFrozen(config.auth)).toBe(true);
    expect(Object.isFrozen(config.passwordReset)).toBe(true);
    expect(Object.isFrozen(config.mail)).toBe(true);
    expect(() => (config.frontendOrigins as string[]).push('https://attacker.example.com')).toThrow();
  });

  it.each(['development', 'test', 'production'] as const)(
    'requires ACCESS_TOKEN_SECRET in %s',
    (nodeEnv) => {
      const input = {
        ...validDatabaseEnv,
        NODE_ENV: nodeEnv,
        FRONTEND_ORIGINS: nodeEnv === 'production' ? 'https://app.example.com' : undefined,
      };
      expect(() => parseEnv(input)).toThrow('ACCESS_TOKEN_SECRET');
    },
  );

  it('accepts only a canonical unpadded base64url secret encoding exactly 32 bytes', () => {
    expect(parseTestEnv().auth.accessTokenSecret).toBe(validAuthEnv.ACCESS_TOKEN_SECRET);

    for (const secret of [
      Buffer.alloc(31, 1).toString('base64url'),
      Buffer.alloc(33, 1).toString('base64url'),
      `${validAuthEnv.ACCESS_TOKEN_SECRET}=`,
      'not/base64url+secret',
      '',
    ]) {
      expect(() => parseTestEnv({ ACCESS_TOKEN_SECRET: secret })).toThrow('ACCESS_TOKEN_SECRET');
    }
  });

  it('requires an independent canonical password-reset HMAC secret', () => {
    expect(() => parseEnv({
      ...validDatabaseEnv,
      ...validAuthEnv,
      PASSWORD_RESET_SECRET: undefined,
    })).toThrow(
      'PASSWORD_RESET_SECRET',
    );

    for (const secret of [
      Buffer.alloc(31, 2).toString('base64url'),
      Buffer.alloc(33, 2).toString('base64url'),
      `${validAuthEnv.PASSWORD_RESET_SECRET}=`,
      'not/base64url+secret',
      '',
    ]) {
      expect(() => parseTestEnv({ PASSWORD_RESET_SECRET: secret })).toThrow(
        'PASSWORD_RESET_SECRET',
      );
    }
  });

  it.each([
    ['ACCESS_TOKEN_TTL_SECONDS', '59'],
    ['ACCESS_TOKEN_TTL_SECONDS', '901'],
    ['ACCESS_TOKEN_TTL_SECONDS', '60.5'],
    ['ACCESS_TOKEN_TTL_SECONDS', 'invalid'],
    ['REFRESH_TOKEN_TTL_SECONDS', '86399'],
    ['REFRESH_TOKEN_TTL_SECONDS', '7776001'],
    ['REFRESH_TOKEN_TTL_SECONDS', '86400.5'],
    ['REFRESH_TOKEN_TTL_SECONDS', 'invalid'],
  ] as const)('rejects invalid auth TTL %s=%s', (field, value) => {
    expect(() => parseTestEnv({ [field]: value })).toThrow(field);
  });

  it('rejects a refresh TTL that is not greater than the access TTL', () => {
    expect(() => parseTestEnv({
      ACCESS_TOKEN_TTL_SECONDS: '900',
      REFRESH_TOKEN_TTL_SECONDS: '900',
    })).toThrow('REFRESH_TOKEN_TTL_SECONDS');
  });

  it('does not reveal an invalid access-token secret in errors', () => {
    const secret = 'private/access-token-secret';
    expect(() => parseTestEnv({ ACCESS_TOKEN_SECRET: secret })).toThrow('ACCESS_TOKEN_SECRET');
    expect(() => parseTestEnv({ ACCESS_TOKEN_SECRET: secret })).not.toThrow(secret);
  });

  it('disables real mail delivery in test without requiring Resend credentials', () => {
    const config = parseEnv({
      ...validDatabaseEnv,
      ACCESS_TOKEN_SECRET: validAuthEnv.ACCESS_TOKEN_SECRET,
      PASSWORD_RESET_SECRET: validAuthEnv.PASSWORD_RESET_SECRET,
      NODE_ENV: 'test',
    });

    expect(config.mail).toEqual({ provider: 'disabled' });
  });

  it.each(['development', 'production'] as const)(
    'requires Resend credentials in %s',
    (nodeEnv) => {
      const environment = {
        ...validDatabaseEnv,
        ACCESS_TOKEN_SECRET: validAuthEnv.ACCESS_TOKEN_SECRET,
        PASSWORD_RESET_SECRET: validAuthEnv.PASSWORD_RESET_SECRET,
        NODE_ENV: nodeEnv,
        FRONTEND_ORIGINS: nodeEnv === 'production' ? 'https://app.example.com' : undefined,
      };

      expect(() => parseEnv(environment)).toThrow('RESEND_API_KEY');
      expect(() => parseEnv(environment)).toThrow('MAIL_FROM');
    },
  );

  it('validates MAIL_FROM and never echoes mail secrets in errors', () => {
    const apiKey = 're_private-key-that-must-not-leak';
    const invalidFrom = 'CodeGym <invalid-address>\r\nBcc: attacker@example.com';

    expect(() => parseTestEnv({ RESEND_API_KEY: apiKey, MAIL_FROM: invalidFrom }))
      .toThrow('MAIL_FROM');
    expect(() => parseTestEnv({ RESEND_API_KEY: apiKey, MAIL_FROM: invalidFrom }))
      .not.toThrow(apiKey);
    expect(() => parseTestEnv({ RESEND_API_KEY: apiKey, MAIL_FROM: invalidFrom }))
      .not.toThrow(invalidFrom);
  });

  it.each(['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const)('requires %s in every environment', (field) => {
    const input: Record<string, string | undefined> = {
      ...validDatabaseEnv,
      ...validAuthEnv,
      [field]: undefined,
    };
    expect(() => parseEnv(input)).toThrow(field);
  });

  it.each(['1', '65535'])('accepts DB_PORT boundary %s', (port) => {
    expect(parseDatabaseEnv({ ...validDatabaseEnv, DB_PORT: port }).port).toBe(Number(port));
  });

  it.each([
    [{ DB_PORT: '0' }, 'DB_PORT'], [{ DB_PORT: '65536' }, 'DB_PORT'], [{ DB_PORT: 'invalid' }, 'DB_PORT'],
    [{ DB_HOST: 'http://localhost' }, 'DB_HOST'], [{ DB_NAME: ' ' }, 'DB_NAME'],
    [{ DB_USER: ' ' }, 'DB_USER'], [{ DB_PASSWORD: ' ' }, 'DB_PASSWORD'],
  ])('rejects invalid database config %#', (override, field) => {
    expect(() => parseDatabaseEnv({ ...validDatabaseEnv, ...override })).toThrow(field);
  });

  it('builds an encoded ephemeral URL and brackets IPv6 hosts', () => {
    const url = buildDatabaseUrl({ host: '::1', port: 3306, name: 'gym name', user: "user'name", password: 'p@ss:/word', tls: false });
    expect(url).toBe('mysql://user%27name:p%40ss%3A%2Fword@[::1]:3306/gym%20name');
  });

  it('requires verified TLS in production and includes strict TLS in the Prisma CLI URL', () => {
    const production = parseDatabaseEnv({ ...validDatabaseEnv, NODE_ENV: 'production' });
    expect(production.tls).toBe(true);
    expect(buildDatabaseUrl(production).endsWith('?sslaccept=strict')).toBe(true);
    expect(() => parseDatabaseEnv({ ...validDatabaseEnv, NODE_ENV: 'production', DB_SSL: 'false' })).toThrow(
      'DB_SSL',
    );
  });

  it('does not echo database secrets in validation errors', () => {
    const secret = 'private-database-password';
    expect(() => parseDatabaseEnv({ ...validDatabaseEnv, DB_PORT: secret })).toThrow('DB_PORT');
    expect(() => parseDatabaseEnv({ ...validDatabaseEnv, DB_PORT: secret })).not.toThrow(secret);
  });

  it.each([
    [{ PORT: '0' }, 'PORT'], [{ PORT: '65536' }, 'PORT'], [{ HOST: 'http://localhost' }, 'HOST'],
    [{ NODE_ENV: 'staging' }, 'NODE_ENV'], [{ LOG_LEVEL: 'verbose' }, 'LOG_LEVEL'],
    [{ FRONTEND_ORIGINS: '*' }, 'FRONTEND_ORIGINS'], [{ FRONTEND_ORIGINS: 'null' }, 'FRONTEND_ORIGINS'],
    [{ FRONTEND_ORIGINS: 'https://user:password@app.example.com' }, 'FRONTEND_ORIGINS'],
    [{ FRONTEND_ORIGINS: 'https://app.example.com/path' }, 'FRONTEND_ORIGINS'],
    [{ FRONTEND_ORIGINS: 'https://app.example.com?secret=value' }, 'FRONTEND_ORIGINS'],
    [{ FRONTEND_ORIGINS: 'https://app.example.com,' }, 'FRONTEND_ORIGINS'],
    [{ NODE_ENV: 'production' }, 'FRONTEND_ORIGINS'],
  ])('rejects invalid application config %#', (input, field) => {
    expect(() => parseTestEnv(input)).toThrow(EnvironmentError);
    expect(() => parseTestEnv(input)).toThrow(field);
  });
});
