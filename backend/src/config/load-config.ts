import 'dotenv/config';

import { type AppConfig, type DatabaseConfig, parseDatabaseEnv, parseEnv } from './env.js';

function readEnvironment(): NodeJS.ProcessEnv {
  return process.env;
}

/** The application's only boundary for reading the ambient environment. */
export function loadConfig(): AppConfig {
  return parseEnv(readEnvironment());
}

export function loadDatabaseConfig(): DatabaseConfig {
  return parseDatabaseEnv(readEnvironment());
}

/**
 * Prisma can validate and generate a model-free client without a live
 * datasource. Migration commands still require the complete DB_* set.
 */
export function loadOptionalDatabaseConfig(): DatabaseConfig | undefined {
  const environment = readEnvironment();
  const databaseFields = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_SSL'] as const;
  const configuredFields = databaseFields.filter((field) => environment[field] !== undefined);

  if (configuredFields.length === 0) {
    return undefined;
  }

  return parseDatabaseEnv(environment);
}
