import { Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { createLogger } from '../src/config/logger.js';
import { testConfig } from './helpers.js';

function captureDestination(): { destination: Writable; read: () => string } {
  let output = '';
  const destination = new Writable({
    write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
      output += chunk.toString();
      callback();
    },
  });

  return { destination, read: () => output };
}

describe('logger', () => {
  it('uses configuration as its level source', () => {
    const logger = createLogger(testConfig({ logLevel: 'warn' }));

    expect(logger.level).toBe('warn');
  });

  it('redacts authentication, cookie, and sensitive named fields at documented depths', () => {
    const capture = captureDestination();
    const logger = createLogger(testConfig({ logLevel: 'info' }), capture.destination);

    logger.info({
      password: 'root-password',
      req: { headers: { authorization: 'Bearer secret-token', cookie: 'session=secret-cookie' } },
      res: { headers: { 'set-cookie': 'session=new-secret' } },
      account: {
        passphrase: 'private-passphrase',
        credentials: {
          passwordHash: 'private-hash',
          arbitraryProviderToken: 'private-access-token',
          provider: { deploymentSecret: 'private-client-secret', apiKey: 'private-api-key' },
        },
      },
      databaseUrl: 'mysql://user:private-url-password@localhost/database',
      datasourceUrl: 'mysql://private-datasource',
      connectionString: 'mysql://private-connection',
      DB_PASSWORD: 'private-db-password',
      code: '123456',
      codeDigest: 'private-code-digest',
      resetToken: 'private-reset-token',
      resetTokenDigest: 'private-reset-token-digest',
      newPassword: 'private-new-password',
      currentPassword: 'private-current-password',
      RESEND_API_KEY: 'private-resend-key',
      resendApiKey: 'private-resend-camel-key',
    });

    const output = capture.read();
    for (const sensitiveValue of [
      'root-password',
      'secret-token',
      'secret-cookie',
      'new-secret',
      'private-passphrase',
      'private-hash',
      'private-access-token',
      'private-client-secret',
      'private-api-key',
      'private-url-password',
      'private-datasource',
      'private-connection',
      'private-db-password',
      '123456',
      'private-code-digest',
      'private-reset-token',
      'private-reset-token-digest',
      'private-new-password',
      'private-current-password',
      'private-resend-key',
      'private-resend-camel-key',
    ]) {
      expect(output).not.toContain(sensitiveValue);
    }
    expect(output).toContain('[Redacted]');
  });

  it('does not expose sensitive named fields nested beyond typical payload depths', () => {
    const capture = captureDestination();
    const logger = createLogger(testConfig({ logLevel: 'info' }), capture.destination);

    logger.info({
      payload: {
        integration: {
          provider: {
            response: {
              credentials: {
                refreshToken: 'deeply-nested-secret',
                refreshTokenDigest: 'deeply-nested-refresh-digest',
                newPassword: 'renamed-password-secret',
                credentialHash: 'renamed-hash-secret',
                authorization: 'renamed-authorization-secret',
                sessionCookie: 'renamed-cookie-secret',
              },
            },
          },
        },
      },
    });

    const output = capture.read();
    for (const sensitiveValue of [
      'deeply-nested-secret',
      'deeply-nested-refresh-digest',
      'renamed-password-secret',
      'renamed-hash-secret',
      'renamed-authorization-secret',
      'renamed-cookie-secret',
    ]) {
      expect(output).not.toContain(sensitiveValue);
    }
    expect(output).toContain('[Redacted]');
  });

  it('redacts common snake_case secret names recursively', () => {
    const capture = captureDestination();
    const logger = createLogger(testConfig({ logLevel: 'info' }), capture.destination);
    const credentials = {
      refresh_token: 'refresh-token-value',
      refresh_token_digest: 'refresh-token-digest-value',
      access_token: 'access-token-value',
      auth_token: 'auth-token-value',
      client_secret: 'client-secret-value',
      jwt_secret: 'jwt-secret-value',
      api_key: 'api-key-value',
      db_password: 'db-password-value',
      database_url: 'mysql://database-url-value',
      connection_string: 'mysql://connection-string-value',
      provider: 'visible-provider',
    };

    logger.info({ integration: { credentials } });

    const record = JSON.parse(capture.read()) as {
      integration?: { credentials?: Record<string, unknown> };
    };
    expect(record.integration?.credentials).toEqual({
      refresh_token: '[Redacted]',
      refresh_token_digest: '[Redacted]',
      access_token: '[Redacted]',
      auth_token: '[Redacted]',
      client_secret: '[Redacted]',
      jwt_secret: '[Redacted]',
      api_key: '[Redacted]',
      db_password: '[Redacted]',
      database_url: '[Redacted]',
      connection_string: '[Redacted]',
      provider: 'visible-provider',
    });
    expect(credentials.refresh_token).toBe('refresh-token-value');
  });

  it('redacts cyclic payloads without mutating the caller-owned object', () => {
    const capture = captureDestination();
    const logger = createLogger(testConfig({ logLevel: 'info' }), capture.destination);
    const payload: Record<string, unknown> = {
      nested: { password: 'cyclic-secret' },
    };
    payload.self = payload;

    logger.info(payload);

    expect((payload.nested as { password: string }).password).toBe('cyclic-secret');
    expect(payload.self).toBe(payload);
    expect(capture.read()).not.toContain('cyclic-secret');
    expect(capture.read()).toContain('[Redacted]');
  });
});
