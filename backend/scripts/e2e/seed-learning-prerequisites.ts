import {
  createPrismaClient,
} from '../../src/database/prisma.js';

import {
  loadConfig,
} from '../../src/config/load-config.js';

const DEFAULT_TARGET_CONCEPT_ID =
  'js-array-iteration';

function assertTestDatabase(): void {
  const config =
    loadConfig();

  if (
    !config.isTest
    || !config.database.name.endsWith(
      '_test',
    )
  ) {
    throw new Error(
      'E2E progression seed requires NODE_ENV=test and a database ending in _test',
    );
  }

  if (
    config.database.name
    === 'codegym'
  ) {
    throw new Error(
      'Refusing to seed E2E progression in the development/production database',
    );
  }
}

async function main():
Promise<void> {
  assertTestDatabase();

  const userIdentifier =
    process.argv[2];

  const targetConceptId =
    process.argv[3]
    ?? DEFAULT_TARGET_CONCEPT_ID;

  if (
    typeof userIdentifier !== 'string'
    || userIdentifier.length === 0
  ) {
    throw new Error(
      'E2E progression seed requires a user id or email',
    );
  }

  if (
    typeof targetConceptId !== 'string'
    || targetConceptId.length === 0
  ) {
    throw new Error(
      'E2E progression seed requires a target concept id',
    );
  }

  const config =
    loadConfig();

  const prisma =
    createPrismaClient(
      config.database,
    );

  try {
    const user =
      await prisma.user.findFirst({
        where: {
          OR: [
            {
              id:
                userIdentifier,
            },
            {
              email:
                userIdentifier,
            },
          ],
        },

        select: {
          id:
            true,

          email:
            true,
        },
      });

    if (user === null) {
      throw new Error(
        `E2E user not found for prerequisite seed: ${userIdentifier}`,
      );
    }

    const targetConcept =
      await prisma.concept.findUnique({
        where: {
          id:
            targetConceptId,
        },

        select: {
          id:
            true,

          technologyId:
            true,
        },
      });

    if (targetConcept === null) {
      throw new Error(
        `Target E2E concept does not exist: ${targetConceptId}`,
      );
    }

    const topics =
      await prisma.topic.findMany({
        where: {
          technologyId:
            targetConcept.technologyId,

          isPublished:
            true,
        },

        orderBy: {
          position:
            'asc',
        },

        select: {
          id:
            true,

          concepts: {
            where: {
              isPublished:
                true,
            },

            orderBy: {
              position:
                'asc',
            },

            select: {
              id:
                true,
            },
          },
        },
      });

    const orderedConceptIds =
      topics.flatMap(
        (topic) =>
          topic.concepts.map(
            (concept) =>
              concept.id,
          ),
      );

    const targetIndex =
      orderedConceptIds.indexOf(
        targetConceptId,
      );

    if (targetIndex < 0) {
      throw new Error(
        `Target E2E concept is not part of the published canonical journey: ${targetConceptId}`,
      );
    }

    const prerequisiteConceptIds =
      orderedConceptIds.slice(
        0,
        targetIndex,
      );

    const completedAt =
      new Date();

    for (
      const conceptId
      of prerequisiteConceptIds
    ) {
      const levels =
        await prisma
          .conceptLearningLevel
          .findMany({
            where: {
              conceptId,
            },

            orderBy: {
              position:
                'asc',
            },

            select: {
              levelId:
                true,
            },
          });

      for (
        const level
        of levels
      ) {
        await prisma
          .conceptLearningLevelProgress
          .upsert({
            where: {
              userId_conceptId_levelId: {
                userId:
                  user.id,

                conceptId,

                levelId:
                  level.levelId,
              },
            },

            create: {
              userId:
                user.id,

              conceptId,

              levelId:
                level.levelId,

              theoryCompletedAt:
                completedAt,

              quizPassedAt:
                completedAt,

              practiceCompletedAt:
                completedAt,

              checkpointCompletedAt:
                completedAt,

              completedAt,
            },

            update: {
              theoryCompletedAt:
                completedAt,

              quizPassedAt:
                completedAt,

              practiceCompletedAt:
                completedAt,

              checkpointCompletedAt:
                completedAt,

              completedAt,
            },
          });
      }

      await prisma
        .conceptLearningProgress
        .upsert({
          where: {
            userId_conceptId: {
              userId:
                user.id,

              conceptId,
            },
          },

          create: {
            userId:
              user.id,

            conceptId,

            theoryCompletedAt:
              completedAt,

            quizPassedAt:
              completedAt,

            practiceCompletedAt:
              completedAt,

            checkpointCompletedAt:
              completedAt,

            completedAt,
          },

          update: {
            theoryCompletedAt:
              completedAt,

            quizPassedAt:
              completedAt,

            practiceCompletedAt:
              completedAt,

            checkpointCompletedAt:
              completedAt,

            completedAt,
          },
        });
    }

    console.log(
      [
        'E2E prerequisite seed: OK',
        `user=${user.email}`,
        `target=${targetConceptId}`,
        `completedPreviousConcepts=${String(prerequisiteConceptIds.length)}`,
      ].join(
        ' ',
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

await main();
