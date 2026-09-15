import { isIP } from 'node:net';

import type { DatabaseConfig } from './env.js';

function encodeUrlComponent(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => {
    return `%${character.charCodeAt(0).toString(16).toUpperCase()}`;
  });
}

/** Builds an ephemeral CLI datasource URL. Callers must never store or log it. */
export function buildDatabaseUrl(config: DatabaseConfig): string {
  const host = isIP(config.host) === 6 ? `[${config.host}]` : config.host;
  const user = encodeUrlComponent(config.user);
  const password = encodeUrlComponent(config.password);
  const database = encodeUrlComponent(config.name);

  const tlsParameters = config.tls ? '?sslaccept=strict' : '';

  return `mysql://${user}:${password}@${host}:${String(config.port)}/${database}${tlsParameters}`;
}
