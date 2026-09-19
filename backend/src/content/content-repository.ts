import type {
  Concept,
  ExerciseSession,
  ExerciseStep,
  LearningSection,
  Prisma,
  PrismaClient,
  Technology,
  Topic,
} from '../generated/prisma/client.js';

import type {
  PublicConcept,
  PublicExerciseSession,
  PublicExerciseStep,
  PublicLearningSection,
  PublicTechnology,
  PublicTopic,
} from './content-model.js';

export interface CanonicalTrainingSessionMetadata {
  readonly id: string;
  readonly conceptId: string;
  readonly technologyId: string;
  readonly kind:
    | 'QUIZ'
    | 'PRACTICE'
    | 'CHECKPOINT';
  readonly levelId:
    | 'FOUNDATION'
    | 'DEEPENING'
    | 'MASTERY';
  readonly passingPercentage:
    number | null;
  readonly requiredForProgression:
    boolean;
  readonly position:
    number;
  readonly progressionEnabled:
    boolean;
  readonly status:
    | 'PUBLISHED'
    | 'UPDATED';
}

export interface ContentRepository {
  getTechnologies(): Promise<readonly PublicTechnology[]>;

  getTopicsByTechnology(
    technologyId: string,
  ): Promise<readonly PublicTopic[]>;

  getConceptsByTopic(
    topicId: string,
  ): Promise<readonly PublicConcept[]>;

  getConceptById(
    conceptId: string,
  ): Promise<PublicConcept | null>;

  getSessionsByConcept(
    conceptId: string,
  ): Promise<readonly PublicExerciseSession[]>;

  getSessionById(
    sessionId: string,
  ): Promise<PublicExerciseSession | null>;

  getCanonicalTrainingSessionMetadata(
    sessionId: string,
  ): Promise<CanonicalTrainingSessionMetadata | null>;
}

export class PrismaContentRepository
implements ContentRepository {
  public constructor(
    private readonly prisma: PrismaClient,
  ) {}

  public async getTechnologies():
  Promise<readonly PublicTechnology[]> {
    const technologies =
      await this.prisma.technology.findMany({
        where: {
          isPublished: true,
        },
        orderBy: [
          {
            position: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      });

    return technologies.map(mapTechnology);
  }

  public async getTopicsByTechnology(
    technologyId: string,
  ): Promise<readonly PublicTopic[]> {
    const topics =
      await this.prisma.topic.findMany({
        where: {
          technologyId,
          isPublished: true,
          technology: {
            isPublished: true,
          },
        },
        orderBy: [
          {
            position: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      });

    return topics.map(mapTopic);
  }

  public async getConceptsByTopic(
    topicId: string,
  ): Promise<readonly PublicConcept[]> {
    const concepts =
      await this.prisma.concept.findMany({
        where: {
          topicId,
          isPublished: true,
          topic: {
            isPublished: true,
          },
        },
        include: {
          learningSections: {
            orderBy: [
              {
                position: 'asc',
              },
              {
                id: 'asc',
              },
            ],
          },

          learningLevels: {
            orderBy: [
              {
                position: 'asc',
              },
              {
                id: 'asc',
              },
            ],
          },
        },
        orderBy: [
          {
            position: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      });

    return concepts.map(mapConceptWithSections);
  }

  public async getConceptById(
    conceptId: string,
  ): Promise<PublicConcept | null> {
    const concept =
      await this.prisma.concept.findFirst({
        where: {
          id: conceptId,
          isPublished: true,
          topic: {
            isPublished: true,
          },
        },
        include: {
          learningSections: {
            orderBy: [
              {
                position: 'asc',
              },
              {
                id: 'asc',
              },
            ],
          },

          learningLevels: {
            orderBy: [
              {
                position: 'asc',
              },
              {
                id: 'asc',
              },
            ],
          },
        },
      });

    return concept === null
      ? null
      : mapConceptWithSections(concept);
  }

  public async getSessionsByConcept(
    conceptId: string,
  ): Promise<readonly PublicExerciseSession[]> {
    const sessions =
      await this.prisma.exerciseSession.findMany({
        where: {
          conceptId,
          status: {
            in: [
              'PUBLISHED',
              'UPDATED',
            ],
          },
          concept: {
            isPublished: true,
          },
        },
        include: {
          steps: {
            orderBy: [
              {
                position: 'asc',
              },
              {
                id: 'asc',
              },
            ],
          },
        },
        orderBy: [
          {
            position: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      });

    return sessions.map(mapSessionWithSteps);
  }

  public async getCanonicalTrainingSessionMetadata(
    sessionId: string,
  ): Promise<CanonicalTrainingSessionMetadata | null> {
    const session =
      await this.prisma.exerciseSession.findFirst({
        where: {
          id:
            sessionId,

          status: {
            in: [
              'PUBLISHED',
              'UPDATED',
            ],
          },

          concept: {
            isPublished:
              true,

            topic: {
              isPublished:
                true,

              technology: {
                isPublished:
                  true,
              },
            },
          },
        },

        select: {
          id:
            true,

          conceptId:
            true,

          technologyId:
            true,

          kind:
            true,

          levelId:
            true,

          passingPercentage:
            true,

          requiredForProgression:
            true,
          position:
            true,

          status:
            true,
        },
      });

    if (session === null) {
      return null;
    }


    const requiredQuiz =
      await this.prisma.exerciseSession
        .findFirst({
          where: {
            conceptId:
              session.conceptId,

            levelId:
              session.levelId,

            kind:
              'QUIZ',

            requiredForProgression:
              true,

            status: {
              in: [
                'PUBLISHED',
                'UPDATED',
              ],
            },

            concept: {
              isPublished:
                true,

              topic: {
                isPublished:
                  true,

                technology: {
                  isPublished:
                    true,
                },
              },
            },
          },

          select: {
            id:
              true,
          },
        });

    if (
      session.status !== 'PUBLISHED'
      && session.status !== 'UPDATED'
    ) {
      return null;
    }

    return Object.freeze({
      id:
        session.id,

      conceptId:
        session.conceptId,

      technologyId:
        session.technologyId,

      kind:
        session.kind,

      levelId:
        session.levelId,

      passingPercentage:
        session.passingPercentage,

      requiredForProgression:
        session.requiredForProgression,
      position:
        session.position,

      progressionEnabled:
        requiredQuiz !== null,

      status:
        session.status,
    });
  }

  public async getSessionById(
    sessionId: string,
  ): Promise<PublicExerciseSession | null> {
    const session =
      await this.prisma.exerciseSession.findFirst({
        where: {
          id: sessionId,
          status: {
            in: [
              'PUBLISHED',
              'UPDATED',
            ],
          },
          concept: {
            isPublished: true,
          },
        },
        include: {
          steps: {
            orderBy: [
              {
                position: 'asc',
              },
              {
                id: 'asc',
              },
            ],
          },
        },
      });

    return session === null
      ? null
      : mapSessionWithSteps(session);
  }
}

function mapTechnology(
  technology: Technology,
): PublicTechnology {
  return Object.freeze({
    id: technology.id,
    name: technology.name,
    icon: technology.icon,
    description:
      technology.description,
  });
}

function mapTopic(
  topic: Topic,
): PublicTopic {
  return Object.freeze({
    id: topic.id,
    name: topic.name,
    technologyId:
      topic.technologyId,
    description:
      topic.description,
  });
}

type ConceptWithSections =
  Concept & {
    readonly learningSections:
      readonly LearningSection[];

    readonly learningLevels:
      readonly {
        readonly levelId:
          LearningSection['levelId'];

        readonly name:
          string;

        readonly description:
          string;

        readonly position:
          number;
      }[];
  };

function mapConceptWithSections(
  concept: ConceptWithSections,
): PublicConcept {
  return Object.freeze({
    id: concept.id,
    name: concept.name,
    topicId: concept.topicId,
    technologyId:
      concept.technologyId,
    contentMarkdown:
      concept.contentMarkdown ?? '',

    levels:
      Object.freeze(
        concept.learningLevels.map(
          level =>
            Object.freeze({
              id:
                mapPublicLearningLevel(
                  level.levelId,
                ),

              name:
                level.name,

              description:
                level.description,

              position:
                level.position,
            }),
        ),
      ),

    content: Object.freeze({
      sections:
        concept.learningSections.map(
          mapLearningSection,
        ),
    }),
  });
}

function mapPublicLearningLevel(
  levelId:
    LearningSection['levelId'],
):
  | 'foundation'
  | 'deepening'
  | 'mastery' {
  switch (levelId) {
    case 'FOUNDATION':
      return 'foundation';

    case 'DEEPENING':
      return 'deepening';

    case 'MASTERY':
      return 'mastery';
  }
}

function mapLearningSection(
  section: LearningSection,
): PublicLearningSection {
  const content =
    asJsonObject(section.content);

  switch (section.type) {
    case 'INTRO':
    case 'EXPLANATION':
    case 'KEY_POINT':
    case 'WARNING':
      return Object.freeze({
        type:
          section.type === 'INTRO'
            ? 'intro'
            : section.type === 'EXPLANATION'
              ? 'explanation'
              : section.type === 'KEY_POINT'
                ? 'key-point'
                : 'warning',
        levelId:
          mapPublicLearningLevel(
            section.levelId,
          ),
        title:
          requireTitle(section),
        body:
          requireString(
            content,
            'body',
          ),
      });

    case 'OBJECTIVES':
      return Object.freeze({
        type: 'objectives',
        levelId:
          mapPublicLearningLevel(
            section.levelId,
          ),
        title:
          requireTitle(section),
        items:
          requireStringArray(
            content,
            'items',
          ),
      });

    case 'CODE': {
      const caption =
        optionalString(
          content,
          'caption',
        );

      return Object.freeze({
        type: 'code',
        levelId:
          mapPublicLearningLevel(
            section.levelId,
          ),
        title:
          requireTitle(section),
        code:
          requireString(
            content,
            'code',
          ),
        language:
          requireString(
            content,
            'language',
          ),
        ...(caption === undefined
          ? {}
          : {
              caption,
            }),
      });
    }

    case 'COMPARISON':
      return Object.freeze({
        type: 'comparison',
        levelId:
          mapPublicLearningLevel(
            section.levelId,
          ),
        title:
          requireTitle(section),
        left:
          requireComparisonSide(
            content,
            'left',
          ),
        right:
          requireComparisonSide(
            content,
            'right',
          ),
      });

    case 'QUICK_CHECK':
      return Object.freeze({
        type: 'quick-check',
        levelId:
          mapPublicLearningLevel(
            section.levelId,
          ),
        question:
          requireString(
            content,
            'question',
          ),
        answer:
          requireString(
            content,
            'answer',
          ),
      });
  }
}

type SessionWithSteps =
  ExerciseSession & {
    readonly steps:
      readonly ExerciseStep[];
  };

function mapSessionWithSteps(
  session: SessionWithSteps,
): PublicExerciseSession {
  return Object.freeze({
    id: session.id,
    title: session.title,
    conceptId: session.conceptId,
    technologyId:
      session.technologyId,
    difficulty:
      session.difficulty === 'BEGINNER'
        ? 'beginner'
        : session.difficulty === 'INTERMEDIATE'
          ? 'intermediate'
          : 'advanced',
    kind:
      session.kind === 'QUIZ'
        ? 'quiz'
        : session.kind === 'CHECKPOINT'
          ? 'checkpoint'
          : 'practice',
    levelId:
      session.levelId === 'FOUNDATION'
        ? 'foundation'
        : session.levelId === 'DEEPENING'
          ? 'deepening'
          : 'mastery',
    passingPercentage:
      session.passingPercentage,
    requiredForProgression:
      session.requiredForProgression,
    version: session.version,
    status:
      session.status === 'DRAFT'
        ? 'draft'
        : session.status === 'PUBLISHED'
          ? 'published'
          : session.status === 'UPDATED'
            ? 'updated'
            : session.status === 'DEPRECATED'
              ? 'deprecated'
              : 'legacy',
    createdAt:
      session.createdAt.toISOString(),
    updatedAt:
      session.updatedAt.toISOString(),
    steps:
      session.steps.map(
        mapExerciseStep,
      ),
  });
}

function mapExerciseStep(
  step: ExerciseStep,
): PublicExerciseStep {
  return Object.freeze({
    id: step.id,
    type:
      step.type === 'CODE_READING'
        ? 'code-reading'
        : step.type === 'PREDICT_OUTPUT'
          ? 'predict-output'
          : step.type === 'FIND_ERROR'
            ? 'find-error'
            : 'fix-code',
    prompt: step.prompt,
    code: step.code,
    language: step.language,
    options:
      parseOptions(step.options),
    requirements:
      parseRequirements(
        step.testCases,
      ),
    hintCount:
      requireJsonStringArray(
        step.hints,
      ).length,
    stepOrder:
      step.position,
  });
}

function asJsonObject(
  value: Prisma.JsonValue | undefined,
): Prisma.JsonObject {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    throw new ContentDataInvariantError();
  }

  return value;
}

function requireTitle(
  section: LearningSection,
): string {
  if (
    section.title === null
    || section.title.length === 0
  ) {
    throw new ContentDataInvariantError();
  }

  return section.title;
}

function requireString(
  object:
    Prisma.JsonObject,
  key: string,
): string {
  const value = object[key];

  if (
    typeof value !== 'string'
    || value.length === 0
  ) {
    throw new ContentDataInvariantError();
  }

  return value;
}

function optionalString(
  object:
    Prisma.JsonObject,
  key: string,
): string | undefined {
  const value = object[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new ContentDataInvariantError();
  }

  return value;
}

function requireStringArray(
  object:
    Prisma.JsonObject,
  key: string,
): readonly string[] {
  return requireJsonStringArray(
    object[key],
  );
}

function requireJsonStringArray(
  value: Prisma.JsonValue | undefined,
): readonly string[] {
  if (
    !Array.isArray(value)
    || !value.every(
      (item) =>
        typeof item === 'string',
    )
  ) {
    throw new ContentDataInvariantError();
  }

  return Object.freeze([
    ...value,
  ]);
}

function parseOptions(
  value:
    Prisma.JsonValue | null,
): readonly {
  readonly id: string;
  readonly text: string;
}[] | null {
  if (value === null) {
    return null;
  }

  if (!Array.isArray(value)) {
    throw new ContentDataInvariantError();
  }

  return Object.freeze(
    value.map((item) => {
      const object =
        asJsonObject(item);

      const id =
        requireString(
          object,
          'id',
        );

      const text =
        requireString(
          object,
          'text',
        );
      return Object.freeze({
        id,
        text,
      });

    }),
  );
}

function parseRequirements(
  value:
    Prisma.JsonValue | null,
): readonly string[] {
  if (value === null) {
    return Object.freeze([]);
  }

  if (!Array.isArray(value)) {
    throw new ContentDataInvariantError();
  }

  return Object.freeze(
    value.map((item) => {
      const object =
        asJsonObject(item);

      return requireString(
        object,
        'description',
      );
    }),
  );
}

function requireComparisonSide(
  object:
    Prisma.JsonObject,
  key: string,
): {
  readonly title: string;
  readonly body: string;
} {
  const value =
    object[key];

  const side =
    asJsonObject(value);

  return Object.freeze({
    title:
      requireString(
        side,
        'title',
      ),
    body:
      requireString(
        side,
        'body',
      ),
  });
}

export class ContentDataInvariantError
extends Error {
  public constructor() {
    super(
      'Persisted content does not match the public content contract',
    );

    this.name =
      'ContentDataInvariantError';
  }
}
