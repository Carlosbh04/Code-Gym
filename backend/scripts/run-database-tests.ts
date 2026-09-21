import {
  loadConfig,
} from '../src/config/load-config.js';

import {
  runNodeCli,
} from './command-runner.js';

const config =
  loadConfig();

if (
  !config.isTest
  || !config.database.name
    .endsWith(
      '_test',
    )
) {
  throw new Error(
    'DB integration requires NODE_ENV=test and a DB_NAME ending in _test',
  );
}

runNodeCli(
  new URL(
    '../node_modules/prisma/build/index.js',
    import.meta.url,
  ),
  [
    'migrate',
    'deploy',
  ],
);

runNodeCli(
  new URL(
    '../node_modules/vitest/vitest.mjs',
    import.meta.url,
  ),
  [
    'run',
    'tests/integration/database.integration.test.ts',
    'tests/integration/register.integration.test.ts',
    'tests/integration/login.integration.test.ts',
    'tests/integration/refresh.integration.test.ts',
    'tests/integration/logout.integration.test.ts',
    'tests/integration/require-auth.integration.test.ts',
    'tests/integration/me.integration.test.ts',
    'tests/integration/profile.integration.test.ts',
    'tests/integration/session-management.integration.test.ts',
    'tests/integration/password-reset.integration.test.ts',
    'tests/integration/completed-session.integration.test.ts',
    'tests/integration/concept-progress.integration.test.ts',
    'tests/integration/attempt.integration.test.ts',
    'tests/integration/review.integration.test.ts',
    'tests/integration/badge.integration.test.ts',
    'tests/integration/dashboard.integration.test.ts',
    'tests/integration/training.integration.test.ts',
    'tests/integration/variables-coding-practice.integration.test.ts',
    'tests/integration/variables-levels.integration.test.ts',
    'tests/integration/functions-levels.integration.test.ts',
    'tests/integration/closures-levels.integration.test.ts',
    'tests/integration/objects-levels.integration.test.ts',
      'tests/integration/arrays-levels.integration.test.ts',
    'tests/integration/es6-plus-levels.integration.test.ts',
    'tests/integration/errors-levels.integration.test.ts',
    'tests/integration/isolation.integration.test.ts',
  ],
);
