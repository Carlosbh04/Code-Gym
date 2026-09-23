import {
  conceptIdSchema,
  type ConceptId,
  type TechnologyId,
} from '../content/content-id.js';

import type {
  PrismaClient,
} from '../generated/prisma/client.js';

export type LearningLevelId =
  | 'FOUNDATION'
  | 'DEEPENING'
  | 'MASTERY';

export interface ConfiguredLearningLevelRecord {
  readonly conceptId: ConceptId;
  readonly levelId: LearningLevelId;
  readonly name: string;
  readonly description: string;
  readonly position: number;
}

export interface LearningLevelProgressRecord {
  readonly id: string;
  readonly userId: string;
  readonly conceptId: ConceptId;
  readonly levelId: LearningLevelId;
  readonly theoryCompletedAt: Date | null;
  readonly quizPassedAt: Date | null;
  readonly practiceCompletedAt: Date | null;
  readonly checkpointCompletedAt: Date | null;
  readonly completedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface LearningProgressRecord {
  readonly id: string;
  readonly userId: string;
  readonly conceptId: ConceptId;
  readonly theoryCompletedAt: Date | null;
  readonly quizPassedAt: Date | null;
  readonly practiceCompletedAt: Date | null;
  readonly checkpointCompletedAt: Date | null;
  readonly completedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ConceptGateRecord {
  readonly conceptId: ConceptId;
  readonly topicId: string;
  readonly position: number;
  readonly previousConceptId: ConceptId | null;
}

export interface PreviousRequiredPracticeStatus {
  readonly previousSessionId:
    string | null;

  readonly completed:
    boolean;
}

export interface RequiredPracticeCompletionStatus {
  readonly requiredSessionCount:
    number;

  readonly completedRequiredSessionCount:
    number;

  readonly allCompleted:
    boolean;
}

export interface LearningProgressRepository {
  /*
   * TECHNOLOGY_LEARNING_SNAPSHOT
   *
   * Opcional para no romper doubles legacy.
   * Prisma implementa la capacidad real.
   */
  listPublishedConceptIdsByTechnology?(
    technologyId: TechnologyId,
  ): Promise<readonly ConceptId[]>;

  getConfiguredLearningLevels(
    conceptId: ConceptId,
  ): Promise<
    readonly ConfiguredLearningLevelRecord[]
  >;

  getTheorySectionCountForLevel(
    conceptId: ConceptId,
    levelId: LearningLevelId,
  ): Promise<number>;

  findLevelByUserAndConceptId(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
  ): Promise<LearningLevelProgressRecord | null>;

  getPreviousRequiredPracticeStatusForLevel(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
    position: number,
  ): Promise<PreviousRequiredPracticeStatus>;

  getRequiredPracticeCompletionStatusForLevel(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
  ): Promise<RequiredPracticeCompletionStatus>;

  completeLevelTheory(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
    completedAt: Date,
  ): Promise<LearningLevelProgressRecord>;

  markLevelQuizPassed(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
    completedAt: Date,
  ): Promise<LearningLevelProgressRecord>;

  markLevelPracticeCompleted(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
    completedAt: Date,
  ): Promise<LearningLevelProgressRecord>;

  markLevelCheckpointCompleted(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
    completedAt: Date,
  ): Promise<LearningLevelProgressRecord>;

  markConceptCompleted(
    userId: string,
    conceptId: ConceptId,
    completedAt: Date,
  ): Promise<LearningProgressRecord>;

  findByUserAndConceptId(
    userId: string,
    conceptId: ConceptId,
  ): Promise<LearningProgressRecord | null>;

  findConceptGate(
    conceptId: ConceptId,
  ): Promise<ConceptGateRecord | null>;


  repairFromCompletedSessions(
    userId: string,
    conceptId: ConceptId,
  ): Promise<void>;

  getPreviousRequiredPracticeStatus(
    userId: string,
    conceptId: ConceptId,
    position: number,
  ): Promise<PreviousRequiredPracticeStatus>;

  getRequiredPracticeCompletionStatus(
    userId: string,
    conceptId: ConceptId,
  ): Promise<RequiredPracticeCompletionStatus>;

  completeTheory(
    userId: string,
    conceptId: ConceptId,
    completedAt: Date,
  ): Promise<LearningProgressRecord>;

  markQuizPassed(
    userId: string,
    conceptId: ConceptId,
    completedAt: Date,
  ): Promise<LearningProgressRecord>;

  markPracticeCompleted(
    userId: string,
    conceptId: ConceptId,
    completedAt: Date,
  ): Promise<LearningProgressRecord>;

  markCheckpointAndConceptCompleted(
    userId: string,
    conceptId: ConceptId,
    completedAt: Date,
  ): Promise<LearningProgressRecord>;
}

export class PrismaLearningProgressRepository
implements LearningProgressRepository {
  public constructor(
    private readonly prisma: PrismaClient,
  ) {}

  public async listPublishedConceptIdsByTechnology(
    technologyId: TechnologyId,
  ): Promise<readonly ConceptId[]> {
    const concepts =
      await this.prisma.concept.findMany({
        where: {
          technologyId,
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

        orderBy: [
          {
            topic: {
              position:
                'asc',
            },
          },
          {
            position:
              'asc',
          },
          {
            id:
              'asc',
          },
        ],

        select: {
          id:
            true,
        },
      });

    return concepts.map(
      concept =>
        conceptIdSchema.parse(
          concept.id,
        ),
    );
  }


  public async getConfiguredLearningLevels(
    conceptId: ConceptId,
  ): Promise<
    readonly ConfiguredLearningLevelRecord[]
  > {
    const levels =
      await this.prisma
        .conceptLearningLevel
        .findMany({
          where: {
            conceptId,
          },
          orderBy: [
            {
              position:
                'asc',
            },
            {
              levelId:
                'asc',
            },
          ],
          select: {
            conceptId:
              true,
            levelId:
              true,
            name:
              true,
            description:
              true,
            position:
              true,
          },
        });

    return Object.freeze(
      levels.map(
        level =>
          Object.freeze({
            conceptId:
              conceptIdSchema.parse(
                level.conceptId,
              ),
            levelId:
              level.levelId,
            name:
              level.name,
            description:
              level.description,
            position:
              level.position,
          }),
      ),
    );
  }

  public async findLevelByUserAndConceptId(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
  ): Promise<LearningLevelProgressRecord | null> {
    const record =
      await this.prisma
        .conceptLearningLevelProgress
        .findUnique({
          where: {
            userId_conceptId_levelId: {
              userId,
              conceptId,
              levelId,
            },
          },
        });

    return record === null
      ? null
      : mapLearningLevelProgress(
          record,
        );
  }

  public async getPreviousRequiredPracticeStatusForLevel(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
    position: number,
  ): Promise<PreviousRequiredPracticeStatus> {
    const previous =
      await this.prisma.exerciseSession
        .findFirst({
          where: {
            conceptId,
            levelId,
            kind:
              'PRACTICE',
            requiredForProgression:
              true,
            position: {
              lt:
                position,
            },
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
          orderBy: [
            {
              position:
                'desc',
            },
            {
              id:
                'desc',
            },
          ],
          select: {
            id:
              true,
          },
        });

    if (
      previous === null
    ) {
      return Object.freeze({
        previousSessionId:
          null,
        completed:
          true,
      });
    }

    const completed =
      await this.prisma.completedSession
        .findFirst({
          where: {
            userId,
            sessionId:
              previous.id,
          },
          select: {
            id:
              true,
          },
        });

    return Object.freeze({
      previousSessionId:
        previous.id,
      completed:
        completed !== null,
    });
  }

  public async getRequiredPracticeCompletionStatusForLevel(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
  ): Promise<RequiredPracticeCompletionStatus> {
    const requiredSessions =
      await this.prisma.exerciseSession
        .findMany({
          where: {
            conceptId,
            levelId,
            kind:
              'PRACTICE',
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
      requiredSessions.length
      === 0
    ) {
      return Object.freeze({
        requiredSessionCount:
          0,
        completedRequiredSessionCount:
          0,
        allCompleted:
          true,
      });
    }

    const requiredIds =
      requiredSessions.map(
        session =>
          session.id,
      );

    const completed =
      await this.prisma.completedSession
        .findMany({
          where: {
            userId,
            sessionId: {
              in:
                requiredIds,
            },
          },
          select: {
            sessionId:
              true,
          },
        });

    const completedIds =
      new Set(
        completed.map(
          session =>
            session.sessionId,
        ),
      );

    const completedRequiredSessionCount =
      requiredIds.reduce(
        (
          count,
          sessionId,
        ) =>
          completedIds.has(
            sessionId,
          )
            ? count + 1
            : count,
        0,
      );

    return Object.freeze({
      requiredSessionCount:
        requiredIds.length,
      completedRequiredSessionCount,
      allCompleted:
        completedRequiredSessionCount
        === requiredIds.length,
    });
  }

  public async getTheorySectionCountForLevel(
    conceptId: ConceptId,
    levelId: LearningLevelId,
  ): Promise<number> {
    return this.prisma.learningSection.count({
      where: {
        conceptId,
        levelId,
      },
    });
  }

  public async completeLevelTheory(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
    completedAt: Date,
  ): Promise<LearningLevelProgressRecord> {
    return this.setLevelTimestampOnce(
      userId,
      conceptId,
      levelId,
      'theoryCompletedAt',
      completedAt,
    );
  }

  public async markLevelQuizPassed(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
    completedAt: Date,
  ): Promise<LearningLevelProgressRecord> {
    return this.setLevelTimestampOnce(
      userId,
      conceptId,
      levelId,
      'quizPassedAt',
      completedAt,
    );
  }

  public async markLevelPracticeCompleted(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
    completedAt: Date,
  ): Promise<LearningLevelProgressRecord> {
    return this.setLevelTimestampOnce(
      userId,
      conceptId,
      levelId,
      'practiceCompletedAt',
      completedAt,
    );
  }

  public async markLevelCheckpointCompleted(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
    completedAt: Date,
  ): Promise<LearningLevelProgressRecord> {
    const record =
      await this.prisma.$transaction(
        async transaction => {
          await transaction
            .conceptLearningLevelProgress
            .upsert({
              where: {
                userId_conceptId_levelId: {
                  userId,
                  conceptId,
                  levelId,
                },
              },
              create: {
                userId,
                conceptId,
                levelId,
                checkpointCompletedAt:
                  completedAt,
                completedAt,
              },
              update: {},
            });

          await transaction
            .conceptLearningLevelProgress
            .updateMany({
              where: {
                userId,
                conceptId,
                levelId,
                checkpointCompletedAt:
                  null,
              },
              data: {
                checkpointCompletedAt:
                  completedAt,
              },
            });

          await transaction
            .conceptLearningLevelProgress
            .updateMany({
              where: {
                userId,
                conceptId,
                levelId,
                completedAt:
                  null,
              },
              data: {
                completedAt,
              },
            });

          return transaction
            .conceptLearningLevelProgress
            .findUniqueOrThrow({
              where: {
                userId_conceptId_levelId: {
                  userId,
                  conceptId,
                  levelId,
                },
              },
            });
        },
      );

    return mapLearningLevelProgress(
      record,
    );
  }

  public async markConceptCompleted(
    userId: string,
    conceptId: ConceptId,
    completedAt: Date,
  ): Promise<LearningProgressRecord> {
    const record =
      await this.prisma.$transaction(
        async transaction => {
          await transaction
            .conceptLearningProgress
            .upsert({
              where: {
                userId_conceptId: {
                  userId,
                  conceptId,
                },
              },
              create: {
                userId,
                conceptId,
                completedAt,
              },
              update: {},
            });

          await transaction
            .conceptLearningProgress
            .updateMany({
              where: {
                userId,
                conceptId,
                completedAt:
                  null,
              },
              data: {
                completedAt,
              },
            });

          return transaction
            .conceptLearningProgress
            .findUniqueOrThrow({
              where: {
                userId_conceptId: {
                  userId,
                  conceptId,
                },
              },
            });
        },
      );

    return mapLearningProgress(
      record,
    );
  }

  public async findByUserAndConceptId(
    userId: string,
    conceptId: ConceptId,
  ): Promise<LearningProgressRecord | null> {
    const record =
      await this.prisma.conceptLearningProgress
        .findUnique({
          where: {
            userId_conceptId: {
              userId,
              conceptId,
            },
          },
        });

    return record === null
      ? null
      : mapLearningProgress(
          record,
        );
  }

  public async findConceptGate(
    conceptId: ConceptId,
  ): Promise<ConceptGateRecord | null> {
    const current =
      await this.prisma.concept.findFirst({
        where: {
          id: conceptId,
          isPublished: true,
          topic: {
            isPublished: true,
            technology: {
              isPublished: true,
            },
          },
        },
        select: {
          id: true,
          topicId: true,
          technologyId: true,
          position: true,
          topic: {
            select: {
              position: true,
            },
          },
        },
      });

    if (current === null) {
      return null;
    }

    const previousInTopic =
      await this.prisma.concept.findFirst({
        where: {
          topicId:
            current.topicId,

          isPublished:
            true,

          position: {
            lt:
              current.position,
          },

          topic: {
            isPublished:
              true,

            technology: {
              isPublished:
                true,
            },
          },
        },

        orderBy: [
          {
            position:
              'desc',
          },
          {
            id:
              'desc',
          },
        ],

        select: {
          id:
            true,
        },
      });

    const previousTopic =
      previousInTopic === null
        ? await this.prisma.topic.findFirst({
            where: {
              technologyId:
                current.technologyId,
              isPublished:
                true,
              OR: [
                {
                  position: {
                    lt:
                      current.topic.position,
                  },
                },
                {
                  position:
                    current.topic.position,
                  id: {
                    lt:
                      current.topicId,
                  },
                },
              ],
              concepts: {
                some: {
                  isPublished:
                    true,
                },
              },
            },
            orderBy: [
              {
                position:
                  'desc',
              },
              {
                id:
                  'desc',
              },
            ],
            select: {
              concepts: {
                where: {
                  isPublished:
                    true,
                },
                orderBy: [
                  {
                    position:
                      'desc',
                  },
                  {
                    id:
                      'desc',
                  },
                ],
                take:
                  1,
                select: {
                  id:
                    true,
                },
              },
            },
          })
        : null;

    const previousConceptId =
      previousInTopic?.id
      ?? previousTopic?.concepts[0]?.id
      ?? null;

    return Object.freeze({
      conceptId:
        conceptIdSchema.parse(
          current.id,
        ),

      topicId:
        current.topicId,

      position:
        current.position,

      previousConceptId:
        previousConceptId === null
          ? null
          : conceptIdSchema.parse(
              previousConceptId,
            ),
    });
  }

  public async repairFromCompletedSessions(
    userId: string,
    conceptId: ConceptId,
  ): Promise<void> {
    await this.prisma.$transaction(
      async transaction => {
        const configuredLevelCount =
          await transaction
            .conceptLearningLevel
            .count({
              where: {
                conceptId,
              },
            });

        /*
         * The legacy repair projects completed training sessions
         * directly onto aggregate concept progress.
         *
         * That is valid only for the legacy single-level model.
         * Multi-level concepts must derive aggregate completion
         * exclusively from the final configured learning level.
         */
        if (
          configuredLevelCount > 1
        ) {
          return;
        }

        const current =
          await transaction
            .conceptLearningProgress
            .findUnique({
              where: {
                userId_conceptId: {
                  userId,
                  conceptId,
                },
              },
            });

        /*
         * Theory has no CompletedSession evidence.
         *
         * If theory was never durably recorded we must
         * not manufacture it from training history.
         */
        if (
          current === null
          || current.theoryCompletedAt
            === null
        ) {
          return;
        }

        const sessions =
          await transaction
            .exerciseSession
            .findMany({
              where: {
                conceptId,

                requiredForProgression:
                  true,

                status: {
                  in: [
                    'PUBLISHED',
                    'UPDATED',
                  ],
                },

                kind: {
                  in: [
                    'QUIZ',
                    'PRACTICE',
                    'CHECKPOINT',
                  ],
                },
              },

              select: {
                id:
                  true,

                kind:
                  true,

                passingPercentage:
                  true,

                position:
                  true,
              },
            });

        const quizzes =
          sessions.filter(
            session =>
              session.kind
              === 'QUIZ',
          );

        /*
         * No required quiz means this concept is still
         * in the legacy rollout path. Do not project the
         * new staged progression onto it.
         */
        if (
          quizzes.length === 0
        ) {
          return;
        }

        const sessionIds =
          sessions.map(
            session =>
              session.id,
          );

        const completions =
          sessionIds.length === 0
            ? []
            : await transaction
                .completedSession
                .findMany({
                  where: {
                    userId,

                    sessionId: {
                      in:
                        sessionIds,
                    },
                  },

                  select: {
                    sessionId:
                      true,

                    totalExercises:
                      true,

                    correctExercises:
                      true,

                    completedAt:
                      true,
                  },
                });

        const earlier = (
          left: Date | null,
          right: Date,
        ): Date =>
          left === null
          || right.getTime()
            < left.getTime()
            ? right
            : left;

        const later = (
          left: Date,
          right: Date,
        ): Date =>
          left.getTime()
          >= right.getTime()
            ? left
            : right;

        let durableQuizPassedAt:
          Date | null = null;

        for (
          const quiz
          of quizzes
        ) {
          if (
            quiz.passingPercentage
            === null
          ) {
            continue;
          }

          for (
            const completion
            of completions
          ) {
            if (
              completion.sessionId
                !== quiz.id
              || completion.totalExercises
                <= 0
            ) {
              continue;
            }

            const passed =
              completion
                .correctExercises
              * 100
              >= quiz
                .passingPercentage
                * completion
                  .totalExercises;

            if (!passed) {
              continue;
            }

            durableQuizPassedAt =
              earlier(
                durableQuizPassedAt,
                completion.completedAt,
              );
          }
        }

        if (
          current.quizPassedAt
            === null
          && durableQuizPassedAt
            !== null
        ) {
          const normalized =
            later(
              current.theoryCompletedAt,
              durableQuizPassedAt,
            );

          await transaction
            .conceptLearningProgress
            .updateMany({
              where: {
                userId,
                conceptId,

                quizPassedAt:
                  null,
              },

              data: {
                quizPassedAt:
                  normalized,
              },
            });
        }

        const effectiveQuizPassedAt =
          current.quizPassedAt
          ?? (
            durableQuizPassedAt
              === null
              ? null
              : later(
                  current.theoryCompletedAt,
                  durableQuizPassedAt,
                )
          );

        if (
          effectiveQuizPassedAt
          === null
        ) {
          return;
        }

        const practices =
          sessions
            .filter(
              session =>
                session.kind
                === 'PRACTICE',
            )
            .sort(
              (
                left,
                right,
              ) =>
                left.position
                - right.position,
            );

        let durablePracticeCompletedAt:
          Date | null = null;

        if (
          practices.length === 0
        ) {
          durablePracticeCompletedAt =
            effectiveQuizPassedAt;
        } else {
          const firstCompletions:
            Date[] = [];

          for (
            const practice
            of practices
          ) {
            let first:
              Date | null = null;

            for (
              const completion
              of completions
            ) {
              if (
                completion.sessionId
                !== practice.id
              ) {
                continue;
              }

              first =
                earlier(
                  first,
                  completion.completedAt,
                );
            }

            if (
              first === null
            ) {
              firstCompletions.length =
                0;

              break;
            }

            firstCompletions.push(
              first,
            );
          }

          if (
            firstCompletions.length
            === practices.length
          ) {
            durablePracticeCompletedAt =
              firstCompletions.reduce(
                (
                  latest,
                  completedAt,
                ) =>
                  later(
                    latest,
                    completedAt,
                  ),
              );

            durablePracticeCompletedAt =
              later(
                effectiveQuizPassedAt,
                durablePracticeCompletedAt,
              );
          }
        }

        if (
          current.practiceCompletedAt
            === null
          && durablePracticeCompletedAt
            !== null
        ) {
          await transaction
            .conceptLearningProgress
            .updateMany({
              where: {
                userId,
                conceptId,

                practiceCompletedAt:
                  null,
              },

              data: {
                practiceCompletedAt:
                  durablePracticeCompletedAt,
              },
            });
        }

        const effectivePracticeCompletedAt =
          current.practiceCompletedAt
          ?? durablePracticeCompletedAt;

        if (
          effectivePracticeCompletedAt
          === null
        ) {
          return;
        }

        const checkpoints =
          sessions.filter(
            session =>
              session.kind
              === 'CHECKPOINT',
          );

        let durableCheckpointCompletedAt:
          Date | null = null;

        for (
          const checkpoint
          of checkpoints
        ) {
          for (
            const completion
            of completions
          ) {
            if (
              completion.sessionId
                !== checkpoint.id
              || completion.totalExercises
                <= 0
              || completion
                .correctExercises
                !== completion
                  .totalExercises
            ) {
              continue;
            }

            durableCheckpointCompletedAt =
              earlier(
                durableCheckpointCompletedAt,
                completion.completedAt,
              );
          }
        }

        if (
          durableCheckpointCompletedAt
          === null
        ) {
          return;
        }

        const normalizedCheckpointAt =
          later(
            effectivePracticeCompletedAt,
            durableCheckpointCompletedAt,
          );

        await transaction
          .conceptLearningProgress
          .updateMany({
            where: {
              userId,
              conceptId,

              checkpointCompletedAt:
                null,
            },

            data: {
              checkpointCompletedAt:
                normalizedCheckpointAt,
            },
          });

        await transaction
          .conceptLearningProgress
          .updateMany({
            where: {
              userId,
              conceptId,

              completedAt:
                null,
            },

            data: {
              completedAt:
                normalizedCheckpointAt,
            },
          });
      },
    );
  }

  public async getPreviousRequiredPracticeStatus(
    userId: string,
    conceptId: ConceptId,
    position: number,
  ): Promise<PreviousRequiredPracticeStatus> {
    const previous =
      await this.prisma.exerciseSession
        .findFirst({
          where: {
            conceptId,
            kind:
              'PRACTICE',
            requiredForProgression:
              true,
            position: {
              lt:
                position,
            },
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
          orderBy: [
            {
              position:
                'desc',
            },
            {
              id:
                'desc',
            },
          ],
          select: {
            id:
              true,
          },
        });

    if (previous === null) {
      return Object.freeze({
        previousSessionId:
          null,
        completed:
          true,
      });
    }

    const completed =
      await this.prisma.completedSession
        .findFirst({
          where: {
            userId,
            sessionId:
              previous.id,
          },
          select: {
            id:
              true,
          },
        });

    return Object.freeze({
      previousSessionId:
        previous.id,
      completed:
        completed !== null,
    });
  }

  public async getRequiredPracticeCompletionStatus(
    userId: string,
    conceptId: ConceptId,
  ): Promise<RequiredPracticeCompletionStatus> {
    const requiredSessions =
      await this.prisma.exerciseSession
        .findMany({
          where: {
            conceptId,

            kind:
              'PRACTICE',

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
      requiredSessions.length === 0
    ) {
      return Object.freeze({
        requiredSessionCount:
          0,

        completedRequiredSessionCount:
          0,

        allCompleted:
          true,
      });
    }

    const requiredIds =
      requiredSessions.map(
        session =>
          session.id,
      );

    const completed =
      await this.prisma.completedSession
        .findMany({
          where: {
            userId,

            sessionId: {
              in:
                requiredIds,
            },
          },

          select: {
            sessionId:
              true,
          },
        });

    const completedIds =
      new Set(
        completed.map(
          session =>
            session.sessionId,
        ),
      );

    const completedRequiredSessionCount =
      requiredIds.reduce(
        (
          count,
          sessionId,
        ) =>
          completedIds.has(
            sessionId,
          )
            ? count + 1
            : count,
        0,
      );

    return Object.freeze({
      requiredSessionCount:
        requiredIds.length,

      completedRequiredSessionCount,

      allCompleted:
        completedRequiredSessionCount
        === requiredIds.length,
    });
  }

  public async completeTheory(
    userId: string,
    conceptId: ConceptId,
    completedAt: Date,
  ): Promise<LearningProgressRecord> {
    return this.setTimestampOnce(
      userId,
      conceptId,
      'theoryCompletedAt',
      completedAt,
    );
  }

  public async markQuizPassed(
    userId: string,
    conceptId: ConceptId,
    completedAt: Date,
  ): Promise<LearningProgressRecord> {
    return this.setTimestampOnce(
      userId,
      conceptId,
      'quizPassedAt',
      completedAt,
    );
  }

  public async markPracticeCompleted(
    userId: string,
    conceptId: ConceptId,
    completedAt: Date,
  ): Promise<LearningProgressRecord> {
    return this.setTimestampOnce(
      userId,
      conceptId,
      'practiceCompletedAt',
      completedAt,
    );
  }

  public async markCheckpointAndConceptCompleted(
    userId: string,
    conceptId: ConceptId,
    completedAt: Date,
  ): Promise<LearningProgressRecord> {
    const record =
      await this.prisma.$transaction(
        async transaction => {
          await transaction
            .conceptLearningProgress
            .upsert({
              where: {
                userId_conceptId: {
                  userId,
                  conceptId,
                },
              },

              create: {
                userId,
                conceptId,
                checkpointCompletedAt:
                  completedAt,
                completedAt,
              },

              update: {},
            });

          await transaction
            .conceptLearningProgress
            .updateMany({
              where: {
                userId,
                conceptId,
                checkpointCompletedAt:
                  null,
              },

              data: {
                checkpointCompletedAt:
                  completedAt,
              },
            });

          await transaction
            .conceptLearningProgress
            .updateMany({
              where: {
                userId,
                conceptId,
                completedAt:
                  null,
              },

              data: {
                completedAt,
              },
            });

          return transaction
            .conceptLearningProgress
            .findUniqueOrThrow({
              where: {
                userId_conceptId: {
                  userId,
                  conceptId,
                },
              },
            });
        },
      );

    return mapLearningProgress(
      record,
    );
  }

  private async setLevelTimestampOnce(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
    field:
      | 'theoryCompletedAt'
      | 'quizPassedAt'
      | 'practiceCompletedAt',
    completedAt: Date,
  ): Promise<LearningLevelProgressRecord> {
    const record =
      await this.prisma.$transaction(
        async transaction => {
          await transaction
            .conceptLearningLevelProgress
            .upsert({
              where: {
                userId_conceptId_levelId: {
                  userId,
                  conceptId,
                  levelId,
                },
              },
              create: {
                userId,
                conceptId,
                levelId,
                [field]:
                  completedAt,
              },
              update: {},
            });

          await transaction
            .conceptLearningLevelProgress
            .updateMany({
              where: {
                userId,
                conceptId,
                levelId,
                [field]:
                  null,
              },
              data: {
                [field]:
                  completedAt,
              },
            });

          return transaction
            .conceptLearningLevelProgress
            .findUniqueOrThrow({
              where: {
                userId_conceptId_levelId: {
                  userId,
                  conceptId,
                  levelId,
                },
              },
            });
        },
      );

    return mapLearningLevelProgress(
      record,
    );
  }

  private async setTimestampOnce(
    userId: string,
    conceptId: ConceptId,
    field:
      | 'theoryCompletedAt'
      | 'quizPassedAt'
      | 'practiceCompletedAt',
    completedAt: Date,
  ): Promise<LearningProgressRecord> {
    const record =
      await this.prisma.$transaction(
        async transaction => {
          await transaction
            .conceptLearningProgress
            .upsert({
              where: {
                userId_conceptId: {
                  userId,
                  conceptId,
                },
              },

              create: {
                userId,
                conceptId,
                [field]:
                  completedAt,
              },

              update: {},
            });

          await transaction
            .conceptLearningProgress
            .updateMany({
              where: {
                userId,
                conceptId,
                [field]:
                  null,
              },

              data: {
                [field]:
                  completedAt,
              },
            });

          return transaction
            .conceptLearningProgress
            .findUniqueOrThrow({
              where: {
                userId_conceptId: {
                  userId,
                  conceptId,
                },
              },
            });
        },
      );

    return mapLearningProgress(
      record,
    );
  }
}

interface PersistedLearningLevelProgress {
  readonly id: string;
  readonly userId: string;
  readonly conceptId: string;
  readonly levelId: LearningLevelId;
  readonly theoryCompletedAt: Date | null;
  readonly quizPassedAt: Date | null;
  readonly practiceCompletedAt: Date | null;
  readonly checkpointCompletedAt: Date | null;
  readonly completedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function mapLearningLevelProgress(
  record: PersistedLearningLevelProgress,
): LearningLevelProgressRecord {
  return Object.freeze({
    id:
      record.id,
    userId:
      record.userId,
    conceptId:
      conceptIdSchema.parse(
        record.conceptId,
      ),
    levelId:
      record.levelId,
    theoryCompletedAt:
      record.theoryCompletedAt,
    quizPassedAt:
      record.quizPassedAt,
    practiceCompletedAt:
      record.practiceCompletedAt,
    checkpointCompletedAt:
      record.checkpointCompletedAt,
    completedAt:
      record.completedAt,
    createdAt:
      record.createdAt,
    updatedAt:
      record.updatedAt,
  });
}

interface PersistedLearningProgress {
  readonly id: string;
  readonly userId: string;
  readonly conceptId: string;
  readonly theoryCompletedAt: Date | null;
  readonly quizPassedAt: Date | null;
  readonly practiceCompletedAt: Date | null;
  readonly checkpointCompletedAt: Date | null;
  readonly completedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function mapLearningProgress(
  record: PersistedLearningProgress,
): LearningProgressRecord {
  return Object.freeze({
    id:
      record.id,

    userId:
      record.userId,

    conceptId:
      conceptIdSchema.parse(
        record.conceptId,
      ),

    theoryCompletedAt:
      record.theoryCompletedAt,

    quizPassedAt:
      record.quizPassedAt,

    practiceCompletedAt:
      record.practiceCompletedAt,

    checkpointCompletedAt:
      record.checkpointCompletedAt,

    completedAt:
      record.completedAt,

    createdAt:
      record.createdAt,

    updatedAt:
      record.updatedAt,
  });
}
