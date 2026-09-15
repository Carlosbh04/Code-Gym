import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  ContentVerifier,
} from '../src/content/content-verifier.js';

import {
  verifierManifest,
} from '../src/content/generated/verifier-manifest.js';

import {
  StaticVerifierManifestRepository,
} from '../src/content/verifier-manifest-repository.js';

describe(
  'generated verifier manifest',
  () => {
    it(
      'loads the complete generated manifest',
      () => {
        const repository =
          new StaticVerifierManifestRepository(
            verifierManifest,
          );

        expect(
          verifierManifest.sessions.length,
        ).toBeGreaterThan(
          0,
        );

        expect(
          repository,
        ).toBeDefined();
      },
    );

    it(
      'contains the canonical map-vs-foreach exercise',
      () => {
        const verifier =
          new ContentVerifier(
            new StaticVerifierManifestRepository(
              verifierManifest,
            ),
          );

        const result =
          verifier.verifyAnswer({
            sessionId:
              'js-arrays-map-vs-foreach-01',

            exerciseId:
              'step-1',

            answer:
              'b',
          });

        expect(
          result,
        ).toMatchObject({
          kind:
            'scored',

          isCorrect:
            true,

          conceptId:
            'js-array-iteration',

          technologyId:
            'javascript',
        });
      },
    );

    it(
      'does not score fix-code without an isolated executor',
      () => {
        const verifier =
          new ContentVerifier(
            new StaticVerifierManifestRepository(
              verifierManifest,
            ),
          );

        const result =
          verifier.verifyAnswer({
            sessionId:
              'js-arrays-map-vs-foreach-01',

            exerciseId:
              'step-4',

            answer:
              'function dobles(numeros) { return numeros.map((n) => n * 2); }',
          });

        expect(
          result.kind,
        ).toBe(
          'requires-code-execution',
        );
      },
    );
  },
);