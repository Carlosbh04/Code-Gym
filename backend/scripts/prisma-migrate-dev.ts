import { loadConfig } from '../src/config/load-config.js';
import { runNodeCli } from './command-runner.js';

const config = loadConfig();

if (config.isProduction) {
  throw new Error('Development migrations are prohibited when NODE_ENV=production');
}

runNodeCli(new URL('../node_modules/prisma/build/index.js', import.meta.url), [
  'migrate',
  'dev',
  ...process.argv.slice(2),
]);
