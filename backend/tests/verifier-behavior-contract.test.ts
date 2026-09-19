import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  ProcessCodeExecutionService,
} from '../src/code-execution/process-code-execution-service.js';

import type {
  VerifierTestCase,
} from '../src/content/verifier-manifest.js';

function testCase(
  input: unknown,
  expected: unknown,
  description: string,
): VerifierTestCase {
  return Object.freeze({
    input,
    expected,
    call: 'duplicarValores(input)',
    description,
  });
}

const behaviorCases = Object.freeze([
  testCase(
    [1, 2],
    [2, 4],
    'duplica valores positivos',
  ),
  testCase(
    [],
    [],
    'acepta un array vacío',
  ),
  testCase(
    [-2, 0, 3, 3],
    [-4, 0, 6, 6],
    'cubre negativos, cero y duplicados',
  ),
]);

describe(
  'verifier behavior contract',
  () => {
    it(
      'accepts a functionally correct implementation even when its source is different from an expected implementation',
      async () => {
        const executor =
          new ProcessCodeExecutionService();

        const alternativeImplementation = `
          function duplicarValores(valores) {
            const resultado = [];

            for (const valor of valores) {
              resultado.push(valor + valor);
            }

            return resultado;
          }
        `;

        await expect(
          executor.execute({
            code: alternativeImplementation,
            testCases: behaviorCases,
          }),
        ).resolves.toEqual({
          passed: true,
          reason: 'passed',
        });
      },
      15_000,
    );

    it(
      'rejects a hardcoded implementation that only matches a known example',
      async () => {
        const executor =
          new ProcessCodeExecutionService();

        const hardcodedImplementation = `
          function duplicarValores(valores) {
            return [2, 4];
          }
        `;

        await expect(
          executor.execute({
            code: hardcodedImplementation,
            testCases: behaviorCases,
          }),
        ).resolves.toEqual({
          passed: false,
          reason: 'failed',
        });
      },
      15_000,
    );

    it(
      'does not require a specific implementation technique when the contract is purely functional',
      async () => {
        const executor =
          new ProcessCodeExecutionService();

        const reduceImplementation = `
          function duplicarValores(valores) {
            return valores.reduce(
              (resultado, valor) => {
                resultado.push(valor * 2);
                return resultado;
              },
              [],
            );
          }
        `;

        await expect(
          executor.execute({
            code: reduceImplementation,
            testCases: behaviorCases,
          }),
        ).resolves.toEqual({
          passed: true,
          reason: 'passed',
        });
      },
      15_000,
    );
  },
);
