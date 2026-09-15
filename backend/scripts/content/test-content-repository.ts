import {
  PrismaContentRepository,
} from '../../src/content/content-repository.js';

import {
  ContentService,
} from '../../src/content/content-service.js';

import {
  loadConfig,
} from '../../src/config/load-config.js';

import {
  createPrismaClient,
} from '../../src/database/prisma.js';

async function main(): Promise<void> {
  const config =
    loadConfig();

  const prisma =
    createPrismaClient(
      config.database,
    );

  try {
    await prisma.$connect();

    const repository =
      new PrismaContentRepository(
        prisma,
      );

    const service =
      new ContentService(
        repository,
      );

    const technologies =
      await service
        .getTechnologies();

    const javascript =
      technologies.find(
        (technology) =>
          technology.id
          === 'javascript',
      );

    if (javascript === undefined) {
      throw new Error(
        'javascript no aparece en technologies',
      );
    }

    const topics =
      await service
        .getTopicsByTechnology(
          'javascript',
        );

    const fundamentals =
      topics.find(
        (topic) =>
          topic.id
          === 'js-fundamentals',
      );

    if (fundamentals === undefined) {
      throw new Error(
        'js-fundamentals no aparece en topics',
      );
    }

    const concepts =
      await service
        .getConceptsByTopic(
          'js-fundamentals',
        );

    const variables =
      concepts.find(
        (concept) =>
          concept.id
          === 'js-variables-basics',
      );

    if (variables === undefined) {
      throw new Error(
        'js-variables-basics no aparece en concepts',
      );
    }

    const concept =
      await service.getConcept(
        'js-variables-basics',
      );

    if (concept === null) {
      throw new Error(
        'getConcept devolvió null',
      );
    }

    const sessions =
      await service
        .getSessionsByConcept(
          'js-variables-basics',
        );

    const session =
      sessions.find(
        (candidate) =>
          candidate.id
          === 'js-variables-basics-01',
      );

    if (session === undefined) {
      throw new Error(
        'js-variables-basics-01 no aparece en sessions',
      );
    }

    const directSession =
      await service.getSession(
        'js-variables-basics-01',
      );

    if (directSession === null) {
      throw new Error(
        'getSession devolvió null',
      );
    }

    console.log(
      '===== CONTENT SERVICE OK =====',
    );

    console.log({
      technology:
        javascript.id,
      topic:
        fundamentals.id,
      concept:
        variables.id,
      learningSections:
        concept.content
          .sections.length,
      session:
        directSession.id,
      exerciseSteps:
        directSession
          .steps.length,
    });

    console.log();
    console.log(
      '===== TEORÍA =====',
    );

    for (
      const section
      of concept.content.sections
    ) {
      console.log(
        section.type,
      );
    }

    console.log();
    console.log(
      '===== EJERCICIOS =====',
    );

    for (
      const step
      of directSession.steps
    ) {
      console.log(
        step.stepOrder,
        step.id,
        step.type,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
