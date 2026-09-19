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
      },
    );
  },
);
