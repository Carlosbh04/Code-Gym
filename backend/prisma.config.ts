import { defineConfig } from 'prisma/config';

import { buildDatabaseUrl } from './src/config/database-url.js';
import { loadOptionalDatabaseConfig } from './src/config/load-config.js';

const databaseConfig =
  loadOptionalDatabaseConfig();

export default defineConfig({
  schema: 'prisma/schema.prisma',

  migrations: {
    path: 'prisma/migrations',
  },

  ...(databaseConfig === undefined
    ? {}
    : {
        datasource: {
          url: buildDatabaseUrl(
            databaseConfig,
          ),

          shadowDatabaseUrl:
            buildDatabaseUrl({
              ...databaseConfig,
              name: 'codegym_shadow',
            }),
        },
      }),
});