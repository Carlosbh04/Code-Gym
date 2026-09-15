import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import type { DatabaseConfig } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

const discardDriverLog = (): void => undefined;

export function createPrismaClient(config: DatabaseConfig): PrismaClient {
  const adapter = new PrismaMariaDb({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.name,
    connectTimeout: 5_000,
    charset: 'utf8mb4',
    timezone: '+00:00',
    ...(config.tls ? { ssl: true } : {}),
    debug: false,
    debugCompress: false,
    logParam: false,
    logger: {
      network: discardDriverLog,
      query: discardDriverLog,
      error: discardDriverLog,
      warning: discardDriverLog,
    },
  });

  return new PrismaClient({
    adapter,
    errorFormat: 'minimal',
    log: [],
  });
}
