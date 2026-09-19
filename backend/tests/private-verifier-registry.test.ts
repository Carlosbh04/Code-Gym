import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  resolvePrivateVerifierConfig,
} from '../src/content/private-verifier-registry.js';

describe(
  'private verifier registry',
  () => {
    it(
      'binds hidden verification config to the canonical session/exercise pair',
      () => {
        const config =
          resolvePrivateVerifierConfig(
            'js-arrays-filter-mutation-01',
            'step-4',
          );

        expect(
          config.hiddenTestCases,
        ).toHaveLength(
          2,
        );

        expect(
          config.pedagogicalRequirements,
        ).toEqual([
          {
            kind:
              'required-array-method',

            method:
              'filter',

            feedback:
              'El resultado es correcto, pero este ejercicio requiere practicar Array.filter().',
          },
        ]);

        expect(
          config.oracle,
        ).toEqual({
          outputCases: [
            {
              input:
                [12, -3, 5, 0, 12],

              expected:
                [12, 5, 12],

              call:
                'positivos(input)',

              description:
                'oracle conductual: compara únicamente el output canónico',
            },
          ],
        });
      },
    );

    it(
      'resolves hidden cases for the three low-coverage exercises',
      () => {
        const dynamic =
          resolvePrivateVerifierConfig(
            'js-objects-dynamic-properties-01',
            'step-4',
          );

        const shared =
          resolvePrivateVerifierConfig(
            'js-objects-shared-reference-01',
            'step-4',
          );

        const promise =
          resolvePrivateVerifierConfig(
            'js-promises-await-value-01',
            'step-4',
          );

        expect(
          dynamic.hiddenTestCases,
        ).toHaveLength(
          2,
        );

        expect(
          shared.hiddenTestCases,
        ).toHaveLength(
          2,
        );

        expect(
          promise.hiddenTestCases,
        ).toHaveLength(
          2,
        );

        expect(
          dynamic.pedagogicalRequirements,
        ).toEqual([]);

        expect(
          shared.pedagogicalRequirements,
        ).toEqual([]);

        expect(
          promise.pedagogicalRequirements,
        ).toEqual([]);

        expect(
          dynamic.oracle,
        ).toBeNull();

        expect(
          shared.oracle,
        ).toBeNull();

        expect(
          promise.oracle,
        ).toBeNull();
      },
    );

    it(
      'resolves hidden cases for the objects and promises hardening set',
      () => {
        const targets = [
          [
            'js-objects-coding-pick-01',
            'step-1',
            2,
          ],
          [
            'js-objects-object-entries-01',
            'step-4',
            2,
          ],
          [
            'js-promises-chain-transform-01',
            'step-4',
            2,
          ],
          [
            'js-promises-coding-fetch-label-01',
            'step-1',
            2,
          ],
          [
            'js-promises-error-recovery-01',
            'step-4',
            3,
          ],
        ] as const;

        for (
          const [
            sessionId,
            exerciseId,
            expectedHiddenCases,
          ] of targets
        ) {
          const config =
            resolvePrivateVerifierConfig(
              sessionId,
              exerciseId,
            );

          expect(
            config.hiddenTestCases,
          ).toHaveLength(
            expectedHiddenCases,
          );

          expect(
            config.pedagogicalRequirements,
          ).toEqual([]);

          expect(
            config.oracle,
          ).toBeNull();
        }
      },
    );

    it(
      'resolves hidden cases for observable error-handling contracts',
      () => {
        const targets = [
          [
            'js-errors-catch-context-01',
            'step-4',
            2,
          ],
          [
            'js-errors-coding-parse-number-01',
            'step-1',
            2,
          ],
          [
            'js-errors-throw-validation-01',
            'step-4',
            3,
          ],
        ] as const;

        for (
          const [
            sessionId,
            exerciseId,
            hiddenCaseCount,
          ] of targets
        ) {
          const config =
            resolvePrivateVerifierConfig(
              sessionId,
              exerciseId,
            );

          expect(
            config.hiddenTestCases,
          ).toHaveLength(
            hiddenCaseCount,
          );

          expect(
            config.pedagogicalRequirements,
          ).toEqual([]);

          expect(
            config.oracle,
          ).toBeNull();
        }

        const finallyCleanup =
          resolvePrivateVerifierConfig(
            'js-errors-finally-cleanup-01',
            'step-4',
          );

        expect(
          finallyCleanup.hiddenTestCases,
        ).toEqual([]);

        expect(
          finallyCleanup.pedagogicalRequirements,
        ).toEqual([]);

        expect(
          finallyCleanup.oracle,
        ).toBeNull();
      },
    );

    it(
      'does not allow another exercise to inherit the registered verifier config',
      () => {
        const config =
          resolvePrivateVerifierConfig(
            'js-arrays-filter-mutation-01',
            'step-3',
          );

        expect(
          config.hiddenTestCases,
        ).toEqual([]);

        expect(
          config.pedagogicalRequirements,
        ).toEqual([]);

        expect(
          config.oracle,
        ).toBeNull();
      },
    );

    it(
      'does not resolve a config from an arbitrary client-selected exercise pair',
      () => {
        const config =
          resolvePrivateVerifierConfig(
            'attacker-session',
            'attacker-verifier',
          );

        expect(
          config,
        ).toEqual({
          hiddenTestCases: [],
          pedagogicalRequirements: [],
          oracle: null,
        });
      },
    );

    it(
      'returns immutable registered configuration',
      () => {
        const config =
          resolvePrivateVerifierConfig(
            'js-arrays-filter-mutation-01',
            'step-4',
          );

        expect(
          Object.isFrozen(config),
        ).toBe(true);

        expect(
          Object.isFrozen(
            config.hiddenTestCases,
          ),
        ).toBe(true);

        expect(
          Object.isFrozen(
            config.pedagogicalRequirements,
          ),
        ).toBe(true);

        expect(
          Object.isFrozen(
            config.oracle,
          ),
        ).toBe(true);

        expect(
          Object.isFrozen(
            config.oracle?.outputCases,
          ),
        ).toBe(true);
      },
    );
  },
);
