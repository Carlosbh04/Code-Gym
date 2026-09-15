import {
  readFile,
  readdir,
} from 'node:fs/promises';
import {
  join,
} from 'node:path';

import type {
  Prisma,
} from '../../src/generated/prisma/client.js';

import {
  createPrismaClient,
} from '../../src/database/prisma.js';

import {
  loadConfig,
} from '../../src/config/load-config.js';

const FRONTEND_ROOT =
  join(
    process.cwd(),
    '..',
    'codeGYM',
  );

const CONTENT_ROOT =
  join(
    FRONTEND_ROOT,
    'src',
    'data',
    'content',
  );

const TECHNOLOGIES_PATH =
  join(
    FRONTEND_ROOT,
    'src',
    'data',
    'technologies.json',
  );

interface StaticTechnology {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly description: string;
}

interface StaticTopic {
  readonly id: string;
  readonly name: string;
  readonly technologyId: string;
  readonly description: string;
}

interface StaticLearningSection {
  readonly type: string;
  readonly title?: string;
  readonly [key: string]: unknown;
}

interface StaticConcept {
  readonly id: string;
  readonly name: string;
  readonly topicId: string;
  readonly technologyId: string;
  readonly content: {
    readonly sections:
      readonly StaticLearningSection[];
  };
}

interface StaticExerciseStep {
  readonly id: string;
  readonly type: string;
  readonly prompt: string;
  readonly code: string | null;
  readonly language: string | null;
  readonly options: unknown;
  readonly errorLines: unknown;
  readonly errorType: string | null;
  readonly testCases: unknown;
  readonly expectedPatterns: unknown;
  readonly explanation: string;
  readonly hints: unknown;
  readonly stepOrder: number;
}

interface StaticExerciseSession {
  readonly id: string;
  readonly title: string;
  readonly difficulty: string;
  readonly conceptId: string;
  readonly technologyId: string;
  readonly version: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string | null;
  readonly steps:
    readonly StaticExerciseStep[];
}

function asJsonInput(
  value: unknown,
): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}


function mapDifficulty(
  value: string,
):
  | 'BEGINNER'
  | 'INTERMEDIATE'
  | 'ADVANCED' {
  switch (value) {
    case 'beginner':
      return 'BEGINNER';

    case 'intermediate':
      return 'INTERMEDIATE';

    case 'advanced':
      return 'ADVANCED';

    default:
      throw new Error(
        `Difficulty desconocida: ${value}`,
      );
  }
}

function mapStatus(
  value: string,
):
  | 'DRAFT'
  | 'PUBLISHED'
  | 'UPDATED'
  | 'DEPRECATED'
  | 'LEGACY' {
  switch (value) {
    case 'draft':
      return 'DRAFT';

    case 'published':
      return 'PUBLISHED';

    case 'updated':
      return 'UPDATED';

    case 'deprecated':
      return 'DEPRECATED';

    case 'legacy':
      return 'LEGACY';

    default:
      throw new Error(
        `Status desconocido: ${value}`,
      );
  }
}

function mapSectionType(
  value: string,
):
  | 'INTRO'
  | 'EXPLANATION'
  | 'KEY_POINT'
  | 'WARNING'
  | 'OBJECTIVES'
  | 'CODE'
  | 'COMPARISON'
  | 'QUICK_CHECK' {
  switch (value) {
    case 'intro':
      return 'INTRO';

    case 'explanation':
      return 'EXPLANATION';

    case 'key-point':
      return 'KEY_POINT';

    case 'warning':
      return 'WARNING';

    case 'objectives':
      return 'OBJECTIVES';

    case 'code':
      return 'CODE';

    case 'comparison':
      return 'COMPARISON';

    case 'quick-check':
      return 'QUICK_CHECK';

    default:
      throw new Error(
        `LearningSectionType desconocido: ${value}`,
      );
  }
}

function mapStepType(
  value: string,
):
  | 'CODE_READING'
  | 'PREDICT_OUTPUT'
  | 'FIND_ERROR'
  | 'FIX_CODE' {
  switch (value) {
    case 'code-reading':
      return 'CODE_READING';

    case 'predict-output':
      return 'PREDICT_OUTPUT';

    case 'find-error':
      return 'FIND_ERROR';

    case 'fix-code':
      return 'FIX_CODE';

    default:
      throw new Error(
        `ExerciseStepType desconocido: ${value}`,
      );
  }
}

function sectionContent(
  section: StaticLearningSection,
): Prisma.InputJsonValue {
  const content =
    Object.fromEntries(
      Object.entries(section)
        .filter(
          ([key]) =>
            key !== 'type'
            && key !== 'title',
        ),
    );

  return asJsonInput(
    content,
  );
}

async function readJson<T>(
  path: string,
): Promise<T> {
  const text =
    await readFile(
      path,
      'utf8',
    );

  return JSON.parse(
    text,
  ) as T;
}

async function sortedDirectories(
  path: string,
): Promise<string[]> {
  const entries =
    await readdir(
      path,
      {
        withFileTypes: true,
      },
    );

  return entries
    .filter(
      entry =>
        entry.isDirectory(),
    )
    .map(
      entry =>
        entry.name,
    )
    .sort();
}

async function sortedJsonFiles(
  path: string,
): Promise<string[]> {
  const entries =
    await readdir(
      path,
      {
        withFileTypes: true,
      },
    );

  return entries
    .filter(
      entry =>
        entry.isFile()
        && entry.name.endsWith(
          '.json',
        ),
    )
    .map(
      entry =>
        entry.name,
    )
    .sort();
}

async function main():
Promise<void> {
  const config =
    loadConfig();

  const prisma =
    createPrismaClient(
      config.database,
    );

  const counters = {
    technologies: 0,
    topics: 0,
    concepts: 0,
    sections: 0,
    sessions: 0,
    steps: 0,
  };

  try {
    await prisma.$connect();

    const technologies =
      await readJson<
        StaticTechnology[]
      >(
        TECHNOLOGIES_PATH,
      );

    for (
      const [
        technologyPosition,
        technology,
      ]
      of technologies.entries()
    ) {
      await prisma.technology.upsert({
        where: {
          id: technology.id,
        },

        create: {
          id:
            technology.id,
          name:
            technology.name,
          icon:
            technology.icon,
          description:
            technology.description,
          position:
            technologyPosition,
          isPublished:
            true,
        },

        update: {
          name:
            technology.name,
          icon:
            technology.icon,
          description:
            technology.description,
          position:
            technologyPosition,
          isPublished:
            true,
        },
      });

      counters.technologies += 1;

      const technologyDirectory =
        join(
          CONTENT_ROOT,
          technology.id,
        );

      const topics =
        await readJson<
          StaticTopic[]
        >(
          join(
            technologyDirectory,
            'index.json',
          ),
        );

      for (
        const [
          topicPosition,
          topic,
        ]
        of topics.entries()
      ) {
        if (
          topic.technologyId
          !== technology.id
        ) {
          throw new Error(
            `Topic ${topic.id}: technologyId ${topic.technologyId} no coincide con ${technology.id}`,
          );
        }

        await prisma.topic.upsert({
          where: {
            id: topic.id,
          },

          create: {
            id:
              topic.id,
            technologyId:
              topic.technologyId,
            name:
              topic.name,
            description:
              topic.description,
            position:
              topicPosition,
            isPublished:
              true,
          },

          update: {
            technologyId:
              topic.technologyId,
            name:
              topic.name,
            description:
              topic.description,
            position:
              topicPosition,
            isPublished:
              true,
          },
        });

        counters.topics += 1;
      }

      const conceptDirectories =
        await sortedDirectories(
          technologyDirectory,
        );

      for (
        const conceptDirectoryName
        of conceptDirectories
      ) {
        const conceptDirectory =
          join(
            technologyDirectory,
            conceptDirectoryName,
          );

        const concept =
          await readJson<
            StaticConcept
          >(
            join(
              conceptDirectory,
              'index.json',
            ),
          );

        const markdown =
          await readFile(
            join(
              conceptDirectory,
              'concept.md',
            ),
            'utf8',
          );

        if (
          concept.technologyId
          !== technology.id
        ) {
          throw new Error(
            `Concept ${concept.id}: technologyId ${concept.technologyId} no coincide con ${technology.id}`,
          );
        }

        const topic =
          topics.find(
            candidate =>
              candidate.id
              === concept.topicId,
          );

        if (
          topic === undefined
        ) {
          throw new Error(
            `Concept ${concept.id}: topic ${concept.topicId} no existe en ${technology.id}/index.json`,
          );
        }

        await prisma.concept.upsert({
          where: {
            id: concept.id,
          },

          create: {
            id:
              concept.id,
            topicId:
              concept.topicId,
            technologyId:
              concept.technologyId,
            name:
              concept.name,
            contentMarkdown:
              markdown,
            position:
              0,
            isPublished:
              true,
          },

          update: {
            topicId:
              concept.topicId,
            technologyId:
              concept.technologyId,
            name:
              concept.name,
            contentMarkdown:
              markdown,
            position:
              0,
            isPublished:
              true,
          },
        });

        counters.concepts += 1;

        await prisma.learningSection.deleteMany({
          where: {
            conceptId:
              concept.id,
          },
        });

        if (
          concept.content.sections.length
          > 0
        ) {
          await prisma.learningSection.createMany({
            data:
              concept.content.sections.map(
                (
                  section,
                  position,
                ) => ({
                  conceptId:
                    concept.id,
                  type:
                    mapSectionType(
                      section.type,
                    ),
                  title:
                    section.title
                    ?? null,
                  content:
                    sectionContent(
                      section,
                    ),
                  position,
                }),
              ),
          });
        }

        counters.sections +=
          concept.content.sections.length;

        const sessionsDirectory =
          join(
            conceptDirectory,
            'sessions',
          );

        const sessionFiles =
          await sortedJsonFiles(
            sessionsDirectory,
          );

        for (
          const [
            sessionPosition,
            sessionFile,
          ]
          of sessionFiles.entries()
        ) {
          const session =
            await readJson<
              StaticExerciseSession
            >(
              join(
                sessionsDirectory,
                sessionFile,
              ),
            );

          if (
            session.conceptId
            !== concept.id
          ) {
            throw new Error(
              `Session ${session.id}: conceptId ${session.conceptId} no coincide con ${concept.id}`,
            );
          }

          if (
            session.technologyId
            !== technology.id
          ) {
            throw new Error(
              `Session ${session.id}: technologyId ${session.technologyId} no coincide con ${technology.id}`,
            );
          }

          const createdAt =
            new Date(
              `${session.createdAt}T00:00:00.000Z`,
            );

          if (
            Number.isNaN(
              createdAt.getTime(),
            )
          ) {
            throw new Error(
              `Session ${session.id}: createdAt inválido ${session.createdAt}`,
            );
          }

          await prisma.exerciseSession.upsert({
            where: {
              id:
                session.id,
            },

            create: {
              id:
                session.id,
              conceptId:
                session.conceptId,
              technologyId:
                session.technologyId,
              title:
                session.title,
              difficulty:
                mapDifficulty(
                  session.difficulty,
                ),
              version:
                session.version,
              status:
                mapStatus(
                  session.status,
                ),
              position:
                sessionPosition,
              createdAt,
            },

            update: {
              conceptId:
                session.conceptId,
              technologyId:
                session.technologyId,
              title:
                session.title,
              difficulty:
                mapDifficulty(
                  session.difficulty,
                ),
              version:
                session.version,
              status:
                mapStatus(
                  session.status,
                ),
              position:
                sessionPosition,
            },
          });

          counters.sessions += 1;

          await prisma.exerciseStep.deleteMany({
            where: {
              sessionId:
                session.id,
            },
          });

          if (
            session.steps.length
            > 0
          ) {
            await prisma.exerciseStep.createMany({
              data:
                session.steps.map(
                  step => ({
                    id:
                      step.id,
                    sessionId:
                      session.id,
                    type:
                      mapStepType(
                        step.type,
                      ),
                    prompt:
                      step.prompt,
                    code:
                      step.code,
                    language:
                      step.language,

                    ...(
                      step.options
                      === null
                        ? {}
                        : {
                            options:
                              asJsonInput(
                                step.options,
                              ),
                          }
                    ),

                    ...(
                      step.errorLines
                      === null
                        ? {}
                        : {
                            errorLines:
                              asJsonInput(
                                step.errorLines,
                              ),
                          }
                    ),

                    errorType:
                      step.errorType,

                    ...(
                      step.testCases
                      === null
                        ? {}
                        : {
                            testCases:
                              asJsonInput(
                                step.testCases,
                              ),
                          }
                    ),

                    ...(
                      step.expectedPatterns
                      === null
                        ? {}
                        : {
                            expectedPatterns:
                              asJsonInput(
                                step.expectedPatterns,
                              ),
                          }
                    ),

                    explanation:
                      step.explanation,
                    hints:
                      asJsonInput(
                        step.hints,
                      ),

                    // Se conserva EXACTAMENTE
                    // el stepOrder histórico.
                    position:
                      step.stepOrder,
                  }),
                ),
            });
          }

          counters.steps +=
            session.steps.length;
        }
      }
    }

    console.log(
      '===== STATIC CATALOG IMPORT READY =====',
    );

    console.log(
      counters,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
