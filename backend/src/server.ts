import { EnvironmentError } from './config/env.js';
import { bootstrapRuntime } from './runtime.js';

function startupFailureMessage(error: unknown): string {
  if (error instanceof EnvironmentError) {
    return `Startup failed: invalid environment configuration (${error.fields.join(', ')})\n`;
  }

  return 'Startup failed: backend could not start\n';
}

async function runServer(): Promise<void> {
  try {
    await bootstrapRuntime();
  } catch (error) {
    process.exitCode = 1;
    process.stderr.write(startupFailureMessage(error));
  }
}

void runServer();
