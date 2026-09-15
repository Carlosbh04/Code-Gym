import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  ContentVerifier,
  InvalidVerifierAnswerError,
  VerifierExerciseNotFoundError,
  VerifierSessionNotFoundError,
} from '../src/content/content-verifier.js';

import {
  InvalidVerifierManifestError,
  StaticVerifierManifestRepository,
} from '../src/content/verifier-manifest-repository.js';

const manifest = {
  schemaVersion:
    1,

  sessions: [
    {
      id:
        'js-arrays-demo-01',

      technologyId:
        'javascript',

      topicId:
        'js-arrays',

      conceptId:
        'js-array-iteration',

      status:
        'published',

      totalExercises:
        4,

      steps: [
        {
          id:
            'step-1',

          type:
            'code-reading',

          correctOptionIds: [
            'b',
          ],
          hints: [
            'Inspect the callback return value.',
          ],
        },

        {
          id:
            'step-2',

          type:
            'predict-output',

          correctOptionIds: [
            'a',
          ],
          hints: [
            'Trace the output in order.',
          ],
        },

        {
          id:
            'step-3',

          type:
            'find-error',

          errorLines: [
            2,
          ],

          errorType:
            'conceptual',
          hints: [
            'Inspect line two.',
          ],
        },

        {
          id:
            'step-4',

          type:
            'fix-code',
          hints: [
            'Return the transformed array.',
          ],

          testCases: [
            {
              input: [
                1,
                2,
              ],

              expected: [
                2,
                4,
              ],

              call:
                'dobles(input)',

              description:
                'duplica números',
            },
          ],
        },
      ],
    },
  ],
} as const;

function createVerifier():
  ContentVerifier {
  return new ContentVerifier(
    new StaticVerifierManifestRepository(
      manifest,
    ),
  );
}

describe(
  'ContentVerifier',
  () => {
    it(
      'scores the canonical option on the backend',
      () => {
        const result =
          createVerifier()
            .verifyAnswer({
              sessionId:
                'js-arrays-demo-01',

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

          exerciseType:
            'code-reading',

          isCorrect:
            true,

          technologyId:
            'javascript',

          topicId:
            'js-arrays',

          conceptId:
            'js-array-iteration',

          totalExercises:
            4,
        });
      },
    );

    it(
      'does not trust another option as correct',
      () => {
        const result =
          createVerifier()
            .verifyAnswer({
              sessionId:
                'js-arrays-demo-01',

              exerciseId:
                'step-1',

              answer:
                'a',
            });

        expect(
          result.kind,
        ).toBe(
          'scored',
        );

        if (
          result.kind ===
          'scored'
        ) {
          expect(
            result.isCorrect,
          ).toBe(
            false,
          );
        }
      },
    );

    it(
      'keeps option comparison case-sensitive',
      () => {
        const result =
          createVerifier()
            .verifyAnswer({
              sessionId:
                'js-arrays-demo-01',

              exerciseId:
                'step-2',

              answer:
                'A',
            });

        expect(
          result.kind,
        ).toBe(
          'scored',
        );

        if (
          result.kind ===
          'scored'
        ) {
          expect(
            result.isCorrect,
          ).toBe(
            false,
          );
        }
      },
    );

    it(
      'requires both line and error type for find-error',
      () => {
        const verifier =
          createVerifier();

        const correct =
          verifier.verifyAnswer({
            sessionId:
              'js-arrays-demo-01',

            exerciseId:
              'step-3',

            answer: {
              line:
                2,

              errorType:
                'conceptual',
            },
          });

        const wrongType =
          verifier.verifyAnswer({
            sessionId:
              'js-arrays-demo-01',

            exerciseId:
              'step-3',

            answer: {
              line:
                2,

              errorType:
                'scope',
            },
          });

        const wrongLine =
          verifier.verifyAnswer({
            sessionId:
              'js-arrays-demo-01',

            exerciseId:
              'step-3',

            answer: {
              line:
                99,

              errorType:
                'conceptual',
            },
          });

        expect(
          correct.kind ===
            'scored'
          && correct.isCorrect,
        ).toBe(
          true,
        );

        expect(
          wrongType.kind ===
            'scored'
          && wrongType.isCorrect,
        ).toBe(
          false,
        );

        expect(
          wrongLine.kind ===
            'scored'
          && wrongLine.isCorrect,
        ).toBe(
          false,
        );
      },
    );

    it(
      'does not execute fix-code inside the verifier',
      () => {
        const result =
          createVerifier()
            .verifyAnswer({
              sessionId:
                'js-arrays-demo-01',

              exerciseId:
                'step-4',

              answer:
                'function dobles(input) { return input.map((value) => value * 2); }',
            });

        expect(
          result,
        ).toMatchObject({
          kind:
            'requires-code-execution',

          exerciseType:
            'fix-code',

          userCode:
            'function dobles(input) { return input.map((value) => value * 2); }',
        });

        if (
          result.kind ===
          'requires-code-execution'
        ) {
          expect(
            result.testCases,
          ).toHaveLength(
            1,
          );
        }
      },
    );

    it(
      'rejects an invalid answer shape',
      () => {
        expect(
          () =>
            createVerifier()
              .verifyAnswer({
                sessionId:
                  'js-arrays-demo-01',

                exerciseId:
                  'step-3',

                answer:
                  'conceptual',
              }),
        ).toThrow(
          InvalidVerifierAnswerError,
        );
      },
    );

    it(
      'rejects an unknown session',
      () => {
        expect(
          () =>
            createVerifier()
              .verifyAnswer({
                sessionId:
                  'unknown-session',

                exerciseId:
                  'step-1',

                answer:
                  'a',
              }),
        ).toThrow(
          VerifierSessionNotFoundError,
        );
      },
    );

    it(
      'rejects an exercise that does not belong to the session',
      () => {
        expect(
          () =>
            createVerifier()
              .verifyAnswer({
                sessionId:
                  'js-arrays-demo-01',

                exerciseId:
                  'step-99',

                answer:
                  'a',
              }),
        ).toThrow(
          VerifierExerciseNotFoundError,
        );
      },
    );
  },
);

describe(
  'StaticVerifierManifestRepository',
  () => {
    it(
      'rejects an inconsistent exercise count',
      () => {
        expect(
          () =>
            new StaticVerifierManifestRepository({
              ...manifest,

              sessions: [
                {
                  ...manifest.sessions[0],

                  totalExercises:
                    99,
                },
              ],
            }),
        ).toThrow(
          InvalidVerifierManifestError,
        );
      },
    );

    it(
      'rejects duplicate exercise identifiers',
      () => {
        const session =
          manifest.sessions[0];

        expect(
          () =>
            new StaticVerifierManifestRepository({
              schemaVersion:
                1,

              sessions: [
                {
                  ...session,

                  totalExercises:
                    2,

                  steps: [
                    session.steps[0],
                    {
                      ...session.steps[1],

                      id:
                        'step-1',
                    },
                  ],
                },
              ],
            }),
        ).toThrow(
          InvalidVerifierManifestError,
        );
      },
    );
  },
);
