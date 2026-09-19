import {
  describe,
  expect,
  it,
  vi,
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

import type {
  TrainingRepository,
  TrainingRunRecord,
} from '../src/training/training-repository.js';

import {
  TrainingService,
} from '../src/training/training-service.js';

const attemptedAt =
  new Date(
    '2026-09-19T16:00:00.000Z',
  );

function createVerifier():
ContentVerifier {
  return new ContentVerifier(
    new StaticVerifierManifestRepository(
      verifierManifest,
    ),
  );
}

function createHarness() {
  const verifier =
    createVerifier();

  const definition =
    verifier.getSessionDefinition(
      'js-arrays-filter-mutation-01',
    );

  if (definition === null) {
    throw new Error(
      'Arrays filter pilot session not found',
    );
  }

  const finalExerciseId =
    definition.exerciseIds[
      definition.exerciseIds.length - 1
    ];

  if (finalExerciseId === undefined) {
    throw new Error(
      'Arrays filter pilot has no exercises',
    );
  }

  const run:
  TrainingRunRecord = {
    id:
      'run-pedagogical-1',

    userId:
      'user-1',

    sessionId:
      definition.sessionId,

    technologyId:
      definition.technologyId,

    topicId:
      definition.topicId,

    conceptId:
      definition.conceptId,

    status:
      'ACTIVE',

    totalExercises:
      definition.totalExercises,

    answeredExercises:
      definition.totalExercises - 1,

    correctExercises:
      definition.totalExercises - 1,

    durationMs:
      3_000,

    hintsUsed:
      0,

    startedAt:
      new Date(
        '2026-09-19T15:55:00.000Z',
      ),

    completedAt:
      null,
  };

  const reconcile =
    vi.fn();

  const record =
    vi.fn<
      TrainingRepository[
        'recordScoredAnswerAndMaybeComplete'
      ]
    >()
      .mockImplementation(
        async (input) => {
          const correctExercises =
            run.correctExercises
            + (
              input.isCorrect
                ? 1
                : 0
            );

          return {
            attempt: {
              id:
                'attempt-pedagogical-1',

              exerciseId:
                input.exerciseId,

              isCorrect:
                input.isCorrect,

              attemptedAt:
                input.attemptedAt,

              durationMs:
                input.durationMs,

              hintsUsed:
                0,
            },

            run: {
              ...run,

              status:
                'COMPLETED',

              answeredExercises:
                run.totalExercises,

              correctExercises,

              durationMs:
                run.durationMs
                + input.durationMs,

              completedAt:
                input.attemptedAt,
            },

            completion: {
              id:
                'completion-pedagogical-1',

              completedAt:
                input.attemptedAt,

              totalExercises:
                run.totalExercises,

              correctExercises,

              durationMs:
                run.durationMs
                + input.durationMs,

              hintsUsed:
                0,
            },
          };
        },
      );

  const repository:
  TrainingRepository = {
    createRun:
      vi.fn(),

    findOwnedRun:
      vi.fn()
        .mockResolvedValue(
          run,
        ),

    revealNextHint:
      vi.fn(),

    recordScoredAnswerAndMaybeComplete:
      record,
  };

  const execute =
    vi.fn()
      .mockResolvedValue({
        passed:
          true,

        reason:
          'passed' as const,
      });

  const service =
    new TrainingService(
      repository,
      verifier,
      () => attemptedAt,
      {
        execute,
      },
      {
        getLevelState:
          vi.fn(),

        reconcileTrainingCompletionForLevel:
          reconcile,

        canStartRequiredPracticeForLevel:
          vi.fn(),
      },
      {
        getCanonicalTrainingSessionMetadata:
          vi.fn()
            .mockResolvedValue({
              id:
                definition.sessionId,

              conceptId:
                definition.conceptId,

              technologyId:
                definition.technologyId,

              kind:
                'PRACTICE',

              passingPercentage:
                100,

              requiredForProgression:
                true,

              position:
                0,

              progressionEnabled:
                true,

              status:
                'PUBLISHED',
            }),
      },
    );

  return {
    service,
    record,
    reconcile,
    execute,
    run,
    finalExerciseId,
  };
}

describe(
  'TrainingService pedagogical authority',
  () => {
    it(
      'persists a functionally correct but pedagogically invalid solution as incorrect',
      async () => {
        const {
          service,
          record,
          reconcile,
          execute,
          run,
          finalExerciseId,
        } =
          createHarness();

        const result =
          await service.submitAnswer({
            userId:
              'user-1',

            runId:
              run.id,

            exerciseId:
              finalExerciseId,

            answer: `
              function positivos(numeros) {
                const resultado = [];

                for (const numero of numeros) {
                  if (numero > 0) {
                    resultado.push(numero);
                  }
                }

                return resultado;
              }
            `,

            durationMs:
              750,
          });

        expect(
          execute,
        ).toHaveBeenCalledOnce();

        expect(
          execute,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            code:
              expect.stringContaining(
                'for (const numero of numeros)',
              ),

            testCases:
              expect.any(Array),
          }),
        );

        /*
         * La ejecución funcional es correcta.
         * La técnica pedagógica requerida no.
         */
        expect(
          result.execution,
        ).toEqual({
          passed:
            true,

          reason:
            'passed',
        });

        /*
         * El veredicto persistido debe ser el global,
         * no execution.passed.
         */
        expect(
          record,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            isCorrect:
              false,
          }),
        );

        expect(
          result.attempt.isCorrect,
        ).toBe(
          false,
        );

        expect(
          result.verification,
        ).toEqual({
          functionalCorrect:
            true,

          pedagogicalRequirementsMet:
            false,

          overallPassed:
            false,

          feedback: [
            'El resultado es correcto, pero este ejercicio requiere practicar Array.filter().',
          ],
        });

        /*
         * La respuesta pública puede explicar el fallo,
         * pero no expone ningún test oculto.
         */
        const serialized =
          JSON.stringify(
            result.verification,
          );

        expect(
          serialized,
        ).not.toContain(
          'testCases',
        );

        expect(
          serialized,
        ).not.toContain(
          '"input"',
        );

        expect(
          serialized,
        ).not.toContain(
          '"expected"',
        );

        expect(
          serialized,
        ).not.toContain(
          '"call"',
        );

        /*
         * La progresión recibe el conteo real:
         * 3 correctos de 4, no 4/4.
         */
        expect(
          reconcile,
        ).toHaveBeenCalledWith(
          'user-1',
          expect.objectContaining({
            totalExercises:
              run.totalExercises,

            correctExercises:
              run.totalExercises - 1,

            passingPercentage:
              100,
          }),
        );
      },
    );

    it(
      'persists a functionally and pedagogically valid solution as correct',
      async () => {
        const {
          service,
          record,
          reconcile,
          run,
          finalExerciseId,
        } =
          createHarness();

        const result =
          await service.submitAnswer({
            userId:
              'user-1',

            runId:
              run.id,

            exerciseId:
              finalExerciseId,

            answer: `
              function positivos(numeros) {
                return numeros.filter(
                  (numero) => numero > 0,
                );
              }
            `,

            durationMs:
              750,
          });

        expect(
          record,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            isCorrect:
              true,
          }),
        );

        expect(
          result.attempt.isCorrect,
        ).toBe(
          true,
        );

        expect(
          result.verification,
        ).toEqual({
          functionalCorrect:
            true,

          pedagogicalRequirementsMet:
            true,

          overallPassed:
            true,

          feedback:
            [],
        });

        expect(
          reconcile,
        ).toHaveBeenCalledWith(
          'user-1',
          expect.objectContaining({
            totalExercises:
              run.totalExercises,

            correctExercises:
              run.totalExercises,

            passingPercentage:
              100,
          }),
        );
      },
    );
  },
);
