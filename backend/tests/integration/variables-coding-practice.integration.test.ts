import {
  randomBytes,
  randomUUID,
} from 'node:crypto';

import express from 'express';
import pino from 'pino';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import {
  AccessTokenService,
} from '../../src/auth/access-token-service.js';

import {
  PrismaAuthSessionRepository,
} from '../../src/auth/auth-session-repository.js';

import {
  ProcessCodeExecutionService,
} from '../../src/code-execution/process-code-execution-service.js';

import {
  loadConfig,
} from '../../src/config/load-config.js';

import {
  conceptIdSchema,
} from '../../src/content/content-id.js';

import {
  ContentVerifier,
} from '../../src/content/content-verifier.js';

import {
  PrismaContentRepository,
} from '../../src/content/content-repository.js';

import {
  verifierManifest,
} from '../../src/content/generated/verifier-manifest.js';

import {
  StaticVerifierManifestRepository,
} from '../../src/content/verifier-manifest-repository.js';

import {
  createPrismaClient,
} from '../../src/database/prisma.js';

import {
  createErrorHandler,
} from '../../src/middleware/error-handler.js';

import {
  createRequireAuth,
} from '../../src/middleware/require-auth.js';

import {
  PrismaLearningProgressRepository,
} from '../../src/progress/learning-progress-repository.js';

import {
  LearningProgressService,
} from '../../src/progress/learning-progress-service.js';

import {
  createTrainingRouter,
} from '../../src/routes/training.js';

import {
  PrismaTrainingRepository,
} from '../../src/training/training-repository.js';

import {
  TrainingService,
} from '../../src/training/training-service.js';


const config =
  loadConfig();


if (
  !config.isTest
  || !config.database.name.endsWith(
    '_test',
  )
  || config.database.name === 'codegym'
) {
  throw new Error(
    'Variables coding-practice integration requires NODE_ENV=test and a DB_NAME ending in _test',
  );
}


const prisma =
  createPrismaClient(
    config.database,
  );


const logger =
  pino({
    level:
      'silent',
  });


const testId =
  randomUUID()
    .replaceAll(
      '-',
      '',
    );


const email =
  `variables-coding-practice-${testId}@example.test`;


let userId:
  string | null =
    null;


let baseline:
  {
    readonly runs:
      number;

    readonly attempts:
      number;

    readonly completions:
      number;
  } | null =
    null;


async function variablesCounts() {
  const [
    runs,
    attempts,
    completions,
  ] =
    await Promise.all([
      prisma.trainingRun.count({
        where: {
          sessionId:
            'js-variables-basics-01',
        },
      }),

      prisma.attempt.count({
        where: {
          sessionId:
            'js-variables-basics-01',
        },
      }),

      prisma.completedSession.count({
        where: {
          sessionId:
            'js-variables-basics-01',
        },
      }),
    ]);


  return {
    runs,
    attempts,
    completions,
  };
}



function asRecord(
  value:
    unknown,
  label:
    string,
): Record<string, unknown> {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(
      value,
    )
  ) {
    throw new Error(
      `Expected ${label} to be an object`,
    );
  }

  return value as Record<
    string,
    unknown
  >;
}


function readRecordField(
  value:
    unknown,
  field:
    string,
  label:
    string,
): Record<string, unknown> {
  const record =
    asRecord(
      value,
      label,
    );

  return asRecord(
    record[field],
    `${label}.${field}`,
  );
}


describe(
  'Variables coding-practice real HTTP integration',
  () => {

    beforeAll(
      async () => {

        await prisma.$connect();


        const variables =
          await prisma.exerciseSession
            .findUnique({
              where: {
                id:
                  'js-variables-basics-01',
              },

              include: {
                steps: {
                  orderBy: {
                    position:
                      'asc',
                  },
                },
              },
            });


        if (variables === null) {
          throw new Error(
            'Expected js-variables-basics-01 in the integration-test database',
          );
        }


        const step4 =
          variables.steps[3];

        if (
          variables.version !== '1.1.0'
          || variables.steps.length !== 4
          || step4 === undefined
          || step4.id !== 'step-4'
          || step4.type !== 'FIX_CODE'
        ) {
          throw new Error(
            'Variables integration fixture must be version 1.1.0 with step-4 FIX_CODE',
          );
        }


        baseline =
          await variablesCounts();

      },
      20_000,
    );


    afterAll(
      async () => {

        try {

          if (userId !== null) {

            const candidate =
              await prisma.user.findUnique({
                where: {
                  id:
                    userId,
                },

                select: {
                  id:
                    true,

                  email:
                    true,
                },
              });


            if (candidate !== null) {

              if (
                candidate.email !== email
                || !candidate.email.startsWith(
                  'variables-coding-practice-',
                )
                || !candidate.email.endsWith(
                  '@example.test',
                )
              ) {
                throw new Error(
                  'Refusing unsafe Variables coding-practice integration cleanup',
                );
              }


              await prisma.user.delete({
                where: {
                  id:
                    candidate.id,
                },
              });

            }

          }


          const leftoverUsers =
            await prisma.user.count({
              where: {
                email,
              },
            });


          expect(
            leftoverUsers,
          ).toBe(
            0,
          );


          if (baseline !== null) {

            await expect(
              variablesCounts(),
            ).resolves.toEqual(
              baseline,
            );

          }

        } finally {

          await prisma.$disconnect();

        }

      },
      20_000,
    );


    it(
      'keeps Ejecutar non-persistent and persists only authoritative Comprobar solución',
      async () => {

        const user =
          await prisma.user.create({
            data: {
              email,

              displayName:
                'Variables Coding Practice Integration',
            },

            select: {
              id:
                true,
            },
          });


        userId =
          user.id;


        const authSessionRepository =
          new PrismaAuthSessionRepository(
            prisma,
          );


        const authSession =
          await authSessionRepository
            .createSession({
              userId:
                user.id,

              refreshTokenDigest:
                randomBytes(
                  32,
                ),

              expiresAt:
                new Date(
                  Date.now()
                  + 60 * 60 * 1000,
                ),

              remembered:
                false,
            });


        const accessTokenService =
          new AccessTokenService(
            config.auth,
          );


        const accessToken =
          await accessTokenService.sign({
            userId:
              user.id,

            sessionId:
              authSession.id,
          });


        const trainingRepository =
          new PrismaTrainingRepository(
            prisma,
          );


        const contentRepository =
          new PrismaContentRepository(
            prisma,
          );


        const learningProgressService =
          new LearningProgressService(
            new PrismaLearningProgressRepository(
              prisma,
            ),
          );


        const trainingService =
          new TrainingService(
            trainingRepository,

            new ContentVerifier(
              new StaticVerifierManifestRepository(
                verifierManifest,
              ),
            ),

            undefined,

            new ProcessCodeExecutionService(),

            learningProgressService,

            contentRepository,
          );


        const requireAuth =
          createRequireAuth({
            accessTokenService,

            authSessionRepository,

            idleSessionTimeoutSeconds:
              config.auth
                .idleSessionTimeoutSeconds,
          });


        const app =
          express();


        app.use(
          express.json({
            limit:
              '100kb',

            strict:
              true,
          }),
        );


        app.use(
          createTrainingRouter({
            trainingService,
            requireAuth,
          }),
        );


        app.use(
          createErrorHandler(
            logger,
          ),
        );


        const post =
          (
            path:
              string,
          ) =>
            request(
              app,
            )
              .post(
                path,
              )
              .set(
                'Authorization',
                `Bearer ${accessToken}`,
              );


        const variablesConceptId =
          conceptIdSchema.parse(
            'js-variables-basics',
          );

        const progressionAt =
          new Date();

        await learningProgressService
          .completeLevelTheory(
            user.id,
            variablesConceptId,
            'FOUNDATION',
          );

        await learningProgressService
          .markLevelQuizPassed(
            user.id,
            variablesConceptId,
            'FOUNDATION',
            progressionAt,
          );

        const start =
          await post(
            '/training/runs',
          )
            .send({
              sessionId:
                'js-variables-basics-01',
            });


        expect(
          start.status,
        ).toBe(
          201,
        );


        const startRun =
          readRecordField(
            start.body as unknown,
            'run',
            'start response body',
          );

        expect(
          startRun,
        ).toMatchObject({
          sessionId:
            'js-variables-basics-01',

          status:
            'active',

          totalExercises:
            4,

          answeredExercises:
            0,

          correctExercises:
            0,
        });


        const runId:
          unknown =
            startRun.id;


        expect(
          typeof runId,
        ).toBe(
          'string',
        );


        if (
          typeof runId
          !== 'string'
        ) {
          throw new Error(
            'Expected training run id',
          );
        }


        const step1 =
          await post(
            `/training/runs/${runId}/answers`,
          )
            .send({
              exerciseId:
                'step-1',

              answer:
                'option-a',

              durationMs:
                100,
            });


        expect(
          step1.status,
        ).toBe(
          200,
        );


        const step1Result =
          readRecordField(
            step1.body as unknown,
            'result',
            'step1 response body',
          );

        expect(
          step1Result.attempt,
        ).toMatchObject({
          exerciseId:
            'step-1',

          isCorrect:
            true,
        });


        const step2 =
          await post(
            `/training/runs/${runId}/answers`,
          )
            .send({
              exerciseId:
                'step-2',

              answer:
                'option-b',

              durationMs:
                100,
            });


        expect(
          step2.status,
        ).toBe(
          200,
        );


        const step2Result =
          readRecordField(
            step2.body as unknown,
            'result',
            'step2 response body',
          );

        expect(
          step2Result.attempt,
        ).toMatchObject({
          exerciseId:
            'step-2',

          isCorrect:
            true,
        });


        const step3 =
          await post(
            `/training/runs/${runId}/answers`,
          )
            .send({
              exerciseId:
                'step-3',

              answer: {
                line:
                  2,

                errorType:
                  'assignment-to-constant',
              },

              durationMs:
                100,
            });


        expect(
          step3.status,
        ).toBe(
          200,
        );


        const step3Result =
          readRecordField(
            step3.body as unknown,
            'result',
            'step3 response body',
          );

        expect(
          step3Result.attempt,
        ).toMatchObject({
          exerciseId:
            'step-3',

          isCorrect:
            true,
        });


        expect(
          step3Result.run,
        ).toMatchObject({
          status:
            'active',

          answeredExercises:
            3,

          correctExercises:
            3,
        });


        const attemptsBeforePreview =
          await prisma.attempt.count({
            where: {
              trainingRunId:
                runId,
            },
          });


        const runBeforePreview =
          await prisma.trainingRun
            .findUniqueOrThrow({
              where: {
                id:
                  runId,
              },
            });


        expect(
          attemptsBeforePreview,
        ).toBe(
          3,
        );


        expect(
          runBeforePreview
            .answeredExercises,
        ).toBe(
          3,
        );


        const validCode =
          [
            'function incrementarContador(inicial) {',
            '  return inicial + 1;',
            '}',
          ].join(
            '\n',
          );


        const preview =
          await post(
            `/training/runs/${runId}/execute`,
          )
            .send({
              exerciseId:
                'step-4',

              code:
                validCode,
            });


        expect(
          preview.status,
        ).toBe(
          200,
        );


        const previewResult =
          readRecordField(
            preview.body as unknown,
            'result',
            'preview response body',
          );

        expect(
          previewResult.execution,
        ).toMatchObject({
          passed:
            true,

          reason:
            'passed',
        });


        const [
          runAfterPreview,
          attemptsAfterPreview,
          completionAfterPreview,
        ] =
          await Promise.all([
            prisma.trainingRun
              .findUniqueOrThrow({
                where: {
                  id:
                    runId,
                },
              }),

            prisma.attempt.count({
              where: {
                trainingRunId:
                  runId,
              },
            }),

            prisma.completedSession
              .findUnique({
                where: {
                  trainingRunId:
                    runId,
                },
              }),
          ]);


        expect(
          runAfterPreview
            .answeredExercises,
        ).toBe(
          runBeforePreview
            .answeredExercises,
        );


        expect(
          runAfterPreview
            .correctExercises,
        ).toBe(
          runBeforePreview
            .correctExercises,
        );


        expect(
          attemptsAfterPreview,
        ).toBe(
          attemptsBeforePreview,
        );


        expect(
          completionAfterPreview,
        ).toBeNull();


        const check =
          await post(
            `/training/runs/${runId}/answers`,
          )
            .send({
              exerciseId:
                'step-4',

              answer:
                validCode,

              durationMs:
                200,
            });


        expect(
          check.status,
        ).toBe(
          200,
        );


        const checkResult =
          readRecordField(
            check.body as unknown,
            'result',
            'check response body',
          );

        expect(
          checkResult.verification,
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
          checkResult.attempt,
        ).toMatchObject({
          exerciseId:
            'step-4',

          isCorrect:
            true,

          durationMs:
            200,
        });


        expect(
          checkResult.run,
        ).toMatchObject({
          status:
            'completed',

          totalExercises:
            4,

          answeredExercises:
            4,

          correctExercises:
            4,

          durationMs:
            500,
        });


        expect(
          checkResult.completion,
        ).toMatchObject({
          totalExercises:
            4,

          correctExercises:
            4,

          durationMs:
            500,

          hintsUsed:
            0,

          accuracy:
            1,
        });


        const [
          storedRun,
          storedAttempts,
          storedCompletion,
        ] =
          await Promise.all([
            prisma.trainingRun
              .findUniqueOrThrow({
                where: {
                  id:
                    runId,
                },
              }),

            prisma.attempt.findMany({
              where: {
                trainingRunId:
                  runId,
              },

              select: {
                exerciseId:
                  true,

                isCorrect:
                  true,
              },

              orderBy: {
                attemptedAt:
                  'asc',
              },
            }),

            prisma.completedSession
              .findUnique({
                where: {
                  trainingRunId:
                    runId,
                },
              }),
          ]);


        expect(
          storedRun,
        ).toMatchObject({
          status:
            'COMPLETED',

          answeredExercises:
            4,

          correctExercises:
            4,

          durationMs:
            500,
        });


        expect(
          storedAttempts,
        ).toEqual([
          {
            exerciseId:
              'step-1',

            isCorrect:
              true,
          },
          {
            exerciseId:
              'step-2',

            isCorrect:
              true,
          },
          {
            exerciseId:
              'step-3',

            isCorrect:
              true,
          },
          {
            exerciseId:
              'step-4',

            isCorrect:
              true,
          },
        ]);


        expect(
          storedCompletion,
        ).not.toBeNull();

      },
      30_000,
    );

  },
);
