import { describe, expect, it, vi } from 'vitest';

import { DatabaseService, type DatabaseClient } from '../src/database/database-service.js';

class FakeDatabaseClient implements DatabaseClient {
  public connectCalls = 0;
  public disconnectCalls = 0;
  public query = 'pending';
  public queryResult: Promise<unknown> = Promise.resolve([{ value: 1 }]);

  public $connect(): Promise<void> { this.connectCalls += 1; return Promise.resolve(); }
  public $disconnect(): Promise<void> { this.disconnectCalls += 1; return Promise.resolve(); }
  public $queryRaw<T>(query: TemplateStringsArray): Promise<T> {
    this.query = query.join('');
    return this.queryResult as Promise<T>;
  }
}

describe('DatabaseService', () => {
  it('connects and disconnects exactly once', async () => {
    const client = new FakeDatabaseClient();
    const service = new DatabaseService(client);
    await Promise.all([service.connect(), service.connect()]);
    await Promise.all([service.disconnect(), service.disconnect()]);
    expect(client.connectCalls).toBe(1);
    expect(client.query).toBe('SELECT 1');
    expect(client.disconnectCalls).toBe(1);
  });

  it('uses a static tagged SELECT 1 and reports health', async () => {
    const client = new FakeDatabaseClient();
    const service = new DatabaseService(client);
    await expect(service.healthCheck()).resolves.toBe(true);
    expect(client.query).toBe('SELECT 1');
  });

  it('returns false for query failures and bounded timeouts', async () => {
    const failedClient = new FakeDatabaseClient();
    failedClient.queryResult = Promise.reject(new Error('private DB error'));
    await expect(new DatabaseService(failedClient).healthCheck()).resolves.toBe(false);

    const pendingClient = new FakeDatabaseClient();
    pendingClient.queryResult = new Promise(() => undefined);
    let deadline: (() => void) | undefined;
    const clear = vi.fn();
    const unref = vi.fn();
    const service = new DatabaseService(pendingClient, {
      healthTimeoutMs: 25,
      setHealthTimer(callback, milliseconds) {
        expect(milliseconds).toBe(25);
        deadline = callback;
        return { clear, unref };
      },
    });
    const health = service.healthCheck();
    deadline?.();
    await expect(health).resolves.toBe(false);
    expect(clear).toHaveBeenCalledOnce();
    expect(unref).toHaveBeenCalledOnce();
  });
});
