import type { AppConfig } from '../src/config/env.js';

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const config: AppConfig = {
    nodeEnv: 'test',
    host: '127.0.0.1',
    port: 3000,
    frontendOrigins: Object.freeze(['https://app.example.com']),
    logLevel: 'silent',
    isDevelopment: false,
    isTest: true,
    isProduction: false,
    database: Object.freeze({
      host: '127.0.0.1',
      port: 3306,
      name: 'codegym_test',
      user: 'codegym',
      password: 'test-password',
      tls: false,
    }),
    auth: Object.freeze({
      accessTokenSecret: Buffer.alloc(32, 1).toString('base64url'),
      accessTokenTtlSeconds: 600,
      refreshTokenTtlSeconds: 2_592_000,
    }),
    passwordReset: Object.freeze({
      hmacSecret: Buffer.alloc(32, 2).toString('base64url'),
      codeTtlSeconds: 300,
      resetTokenTtlSeconds: 600,
      maximumAttempts: 5,
    }),
    mail: Object.freeze({
      provider: 'disabled',
    }),
    ...overrides,
  };

  return Object.freeze(config);
}
