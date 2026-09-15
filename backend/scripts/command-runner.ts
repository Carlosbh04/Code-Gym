import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function runNodeCli(entrypoint: URL, arguments_: readonly string[]): void {
  const result = spawnSync(process.execPath, [fileURLToPath(entrypoint), ...arguments_], {
    stdio: 'inherit',
  });

  if (result.error !== undefined) {
    throw new Error('Unable to start the requested command', { cause: result.error });
  }

  if (result.signal !== null) {
    throw new Error(`Command terminated by signal ${result.signal}`);
  }

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    throw new Error('Command failed');
  }
}
