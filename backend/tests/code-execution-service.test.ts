import { describe, expect, it } from 'vitest';
import { ProcessCodeExecutionService } from '../src/code-execution/process-code-execution-service.js';

const testCase = (input: unknown, expected: unknown, call: string) => ({
  input,
  expected,
  call,
  description: call,
});

describe('T229.5 ProcessCodeExecutionService', () => {
  it('scores correct and incorrect solutions from canonical test cases', async () => {
    const service = new ProcessCodeExecutionService();

    await expect(service.execute({
      code: 'function doble(n) { return n * 2; }',
      testCases: [testCase(3, 6, 'doble(input)')],
    })).resolves.toEqual({ passed: true, reason: 'passed' });

    await expect(service.execute({
      code: 'function doble(n) { return n * 3; }',
      testCases: [testCase(3, 6, 'doble(input)')],
    })).resolves.toEqual({ passed: false, reason: 'failed' });
  }, 15_000);

  it('turns syntax/runtime failures into incorrect answers, not infrastructure failures', async () => {
    const service = new ProcessCodeExecutionService();

    await expect(service.execute({
      code: 'function rota( {',
      testCases: [testCase(1, 1, 'rota(input)')],
    })).resolves.toMatchObject({ passed: false, reason: 'syntax-error' });

    await expect(service.execute({
      code: 'function explota() { throw new Error("boom"); }',
      testCases: [testCase(null, 1, 'explota()')],
    })).resolves.toMatchObject({ passed: false, reason: 'runtime-error' });
  }, 15_000);

  it('does not expose Node process, require or environment secrets to guest code', async () => {
    const service = new ProcessCodeExecutionService();

    await expect(service.execute({
      code: `function aislado() {
        return {
          process: typeof process,
          require: typeof require,
          buffer: typeof Buffer,
          fetch: typeof fetch,
        };
      }`,
      testCases: [testCase(null, {
        process: 'undefined',
        require: 'undefined',
        buffer: 'undefined',
        fetch: 'undefined',
      }, 'aislado()')],
    })).resolves.toEqual({ passed: true, reason: 'passed' });
  }, 15_000);

  it('cuts off an infinite loop with both guest deadline and parent watchdog', async () => {
    const service = new ProcessCodeExecutionService({
      executionTimeoutMs: 150,
      watchdogGraceMs: 1_000,
    });

    await expect(service.execute({
      code: 'function cuelga() { while (true) {} }',
      testCases: [testCase(null, 1, 'cuelga()')],
    })).resolves.toEqual({ passed: false, reason: 'timeout' });
  }, 15_000);

  it('supports async user functions without exposing host async APIs', async () => {
    const service = new ProcessCodeExecutionService();

    await expect(service.execute({
      code: 'async function saludar(u) { return `Hola, ${u.nombre}`; }',
      testCases: [testCase({ nombre: 'Ada' }, 'Hola, Ada', 'saludar(input)')],
    })).resolves.toEqual({ passed: true, reason: 'passed' });
  }, 15_000);
});
