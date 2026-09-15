import { createPrismaClient } from '../../src/database/prisma.js';
import { loadConfig } from '../../src/config/load-config.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const prisma = createPrismaClient(config.database);

  try {
    await prisma.$connect();

    const technology = await prisma.technology.findUnique({
      where: {
        id: 'javascript',
      },
      include: {
        topics: {
          where: {
            id: 'js-fundamentals',
          },
          include: {
            concepts: {
              where: {
                id: 'js-variables-basics',
              },
              include: {
                learningSections: {
                  orderBy: {
                    position: 'asc',
                  },
                },
                sessions: {
                  where: {
                    id: 'js-variables-basics-01',
                  },
                  include: {
                    steps: {
                      orderBy: {
                        position: 'asc',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (technology === null) {
      throw new Error('Technology javascript no encontrada');
    }

    const topic = technology.topics[0];

    if (topic === undefined) {
      throw new Error('Topic js-fundamentals no encontrado');
    }

    const concept = topic.concepts[0];

    if (concept === undefined) {
      throw new Error('Concept js-variables-basics no encontrado');
    }

    const session = concept.sessions[0];

    if (session === undefined) {
      throw new Error('Session js-variables-basics-01 no encontrada');
    }

    console.log('===== PILOTO EN BASE DE DATOS =====');
    console.log({
      technology: {
        id: technology.id,
        name: technology.name,
        published: technology.isPublished,
      },
      topic: {
        id: topic.id,
        name: topic.name,
        published: topic.isPublished,
      },
      concept: {
        id: concept.id,
        name: concept.name,
        published: concept.isPublished,
      },
      learningSections: concept.learningSections.length,
      session: {
        id: session.id,
        title: session.title,
        difficulty: session.difficulty,
        status: session.status,
      },
      exerciseSteps: session.steps.length,
    });

    console.log();
    console.log('===== LEARNING SECTIONS =====');

    for (const section of concept.learningSections) {
      console.log(
        `${String(section.position)}. ${section.type} - ${section.title ?? '(sin título)'}`,
      );
    }

    console.log();
    console.log('===== EXERCISE STEPS =====');

    for (const step of session.steps) {
      console.log(
        `${String(step.position)}. ${step.id} - ${step.type}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
