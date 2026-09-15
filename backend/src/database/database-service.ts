import type { PrismaClient } from '../generated/prisma/client.js';

export interface DatabaseClient {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $queryRaw<T>(query: TemplateStringsArray): Promise<T>;
}

export interface HealthTimer {
  clear(): void;
  unref(): void;
}

export interface DatabaseServiceOptions {
  readonly healthTimeoutMs: number;
  readonly setHealthTimer: (callback: () => void, milliseconds: number) => HealthTimer;
}

const defaultOptions: DatabaseServiceOptions = {
  healthTimeoutMs: 1_000,
  setHealthTimer(callback, milliseconds) {
    const timer = setTimeout(callback, milliseconds);
    return {
      clear() {
        clearTimeout(timer);
      },
      unref() {
        timer.unref();
      },
    };
  },
};

export class DatabaseService {
  private connectPromise: Promise<void> | undefined;
  private disconnectPromise: Promise<void> | undefined;

  public constructor(
    private readonly client: DatabaseClient,
    private readonly options: DatabaseServiceOptions = defaultOptions,
  ) {}

  public connect(): Promise<void> {
    this.connectPromise ??= this.connectAndVerify();
    return this.connectPromise;
  }

  public disconnect(): Promise<void> {
    this.disconnectPromise ??= this.client.$disconnect();
    return this.disconnectPromise;
  }

  public async healthCheck(): Promise<boolean> {
    let timer: HealthTimer | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = this.options.setHealthTimer(() => {
        reject(new Error('Database health timeout'));
      }, this.options.healthTimeoutMs);
      timer.unref();
    });

    try {
      await Promise.race([this.client.$queryRaw`SELECT 1`, timeout]);
      return true;
    } catch {
      return false;
    } finally {
      timer?.clear();
    }
  }

  private async connectAndVerify(): Promise<void> {
    await this.client.$connect();
    await this.client.$queryRaw`SELECT 1`;
  }
}

export function createDatabaseService(client: PrismaClient): DatabaseService {
  return new DatabaseService(client);
}
