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

function createVerifier():
  ContentVerifier {
  return new ContentVerifier(
    new StaticVerifierManifestRepository(
      verifierManifest,
    ),
  );
}

describe(
  'Arrays staged verifier',
  () => {
    it(
      'scores every canonical quiz answer',
      () => {
        const verifier =
          createVerifier();

        const answers = [
          ['step-1', 'b'],
          ['step-2', 'a'],
          ['step-3', 'b'],
          ['step-4', 'b'],
          ['step-5', 'c'],
        ] as const;

        for (
          const [
            exerciseId,
            answer,
          ] of answers
        ) {
          const result =
            verifier.verifyAnswer({
              sessionId:
                'js-arrays-iteration-quiz-01',

              exerciseId,

              answer,
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
        }
      },
    );

    it(
      'scores a wrong quiz answer as incorrect',
      () => {
        const verifier =
          createVerifier();

        const result =
          verifier.verifyAnswer({
            sessionId:
              'js-arrays-iteration-quiz-01',

            exerciseId:
              'step-1',

            answer:
              'a',
          });

        expect(
          result,
        ).toMatchObject({
          kind:
            'scored',

          isCorrect:
            false,

          conceptId:
            'js-array-iteration',
        });
      },
    );

    it(
      'scores every canonical checkpoint answer',
      () => {
        const verifier =
          createVerifier();

        const answers = [
          ['step-1', 'b'],
          ['step-2', 'c'],
          ['step-3', 'b'],
          ['step-4', 'b'],
        ] as const;

        for (
          const [
            exerciseId,
            answer,
          ] of answers
        ) {
          const result =
            verifier.verifyAnswer({
              sessionId:
                'js-arrays-iteration-checkpoint-01',

              exerciseId,

              answer,
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
        }
      },
    );

    it(
      'scores a wrong checkpoint answer as incorrect',
      () => {
        const verifier =
          createVerifier();

        const result =
          verifier.verifyAnswer({
            sessionId:
              'js-arrays-iteration-checkpoint-01',

            exerciseId:
              'step-4',

            answer:
              'a',
          });

        expect(
          result,
        ).toMatchObject({
          kind:
            'scored',

          isCorrect:
            false,
        });
      },
    );
  },
);
