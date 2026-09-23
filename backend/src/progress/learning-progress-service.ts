import type {
  ConceptId,
  TechnologyId,
} from '../content/content-id.js';

import type {
  ConceptGateRecord,
  ConfiguredLearningLevelRecord,
  LearningLevelId,
  LearningLevelProgressRecord,
  LearningProgressRecord,
  LearningProgressRepository,
} from './learning-progress-repository.js';

export type LearningStageStatus =
  | 'locked'
  | 'available'
  | 'completed';

export type ConceptLearningStatus =
  | 'locked'
  | 'available'
  | 'in_progress'
  | 'completed';

export type LearningLockReason =
  | 'previous-concept-incomplete';

export interface LearningStageView {
  readonly status:
    LearningStageStatus;

  readonly completedAt:
    string | null;
}

export interface ConceptLearningStateView {
  readonly conceptId:
    ConceptId;

  readonly previousConceptId:
    ConceptId | null;

  readonly locked:
    boolean;

  readonly lockReason:
    LearningLockReason | null;

  readonly status:
    ConceptLearningStatus;

  readonly stages: {
    readonly theory:
      LearningStageView;

    readonly quiz:
      LearningStageView;

    readonly practice:
      LearningStageView;

    readonly checkpoint:
      LearningStageView;
  };

  readonly completed:
    boolean;

  readonly completedAt:
    string | null;
}

export type LearningLevelLockReason =
  | 'previous-concept-incomplete'
  | 'previous-level-incomplete';

export interface LearningLevelStateView {
  readonly conceptId: ConceptId;
  readonly levelId: LearningLevelId;
  readonly previousLevelId:
    LearningLevelId | null;
  readonly nextLevelId:
    LearningLevelId | null;
  readonly locked: boolean;
  readonly lockReason:
    LearningLevelLockReason | null;
  readonly stages: {
    readonly theory:
      LearningStageView;
    readonly quiz:
      LearningStageView;
    readonly practice:
      LearningStageView;
    readonly checkpoint:
      LearningStageView;
  };
  readonly completed: boolean;
  readonly completedAt:
    string | null;
}

export interface LearningTrainingCompletionInput {
  readonly conceptId:
    ConceptId;

  readonly kind:
    | 'QUIZ'
    | 'PRACTICE'
    | 'CHECKPOINT';

  readonly passingPercentage:
    number | null;

  readonly requiredForProgression:
    boolean;

  readonly totalExercises:
    number;

  readonly correctExercises:
    number;

  readonly completedAt:
    Date;
}

export interface LearningLevelTrainingCompletionInput {
  readonly conceptId:
    ConceptId;
  readonly levelId:
    LearningLevelId;
  readonly kind:
    | 'QUIZ'
    | 'PRACTICE'
    | 'CHECKPOINT';
  readonly passingPercentage:
    number | null;
  readonly requiredForProgression:
    boolean;
  readonly totalExercises:
    number;
  readonly correctExercises:
    number;
  readonly completedAt:
    Date;
}

export interface TechnologyLearningConceptStateView {
  readonly conceptId:
    ConceptId;

  readonly state:
    ConceptLearningStateView;

  readonly levels:
    readonly LearningLevelStateView[];
}

export interface TechnologyLearningStateView {
  readonly technologyId:
    TechnologyId;

  readonly concepts:
    readonly TechnologyLearningConceptStateView[];
}

export type LearningProgressClock =
  () => Date;

export class LearningProgressService {
  public constructor(
    private readonly repository:
      LearningProgressRepository,

    private readonly clock:
      LearningProgressClock =
        () => new Date(),
  ) {}

  public async getTechnologyState(
    userId: string,
    technologyId: TechnologyId,
  ): Promise<TechnologyLearningStateView> {
    /*
     * TECHNOLOGY_SNAPSHOT_REQUEST_CACHE
     *
     * El snapshot sigue delegando todas las reglas en
     * getState()/getLevelState().
     *
     * Únicamente deduplicamos lecturas/reconciliaciones que
     * esos métodos vuelven a solicitar para el mismo concepto
     * durante ESTA petición.
     */
    const listConceptIds =
      this.repository
        .listPublishedConceptIdsByTechnology
        ?.bind(
          this.repository,
        );

    if (
      listConceptIds === undefined
    ) {
      throw new Error(
        'Technology learning snapshot repository capability is unavailable',
      );
    }

    const conceptIds =
      await listConceptIds(
        technologyId,
      );

    const gateCache =
      new Map<
        string,
        ReturnType<
          LearningProgressRepository[
            'findConceptGate'
          ]
        >
      >();

    const repairCache =
      new Map<
        string,
        ReturnType<
          LearningProgressRepository[
            'repairFromCompletedSessions'
          ]
        >
      >();

    const conceptProgressCache =
      new Map<
        string,
        ReturnType<
          LearningProgressRepository[
            'findByUserAndConceptId'
          ]
        >
      >();

    const configuredLevelsCache =
      new Map<
        string,
        ReturnType<
          LearningProgressRepository[
            'getConfiguredLearningLevels'
          ]
        >
      >();

    const levelProgressCache =
      new Map<
        string,
        ReturnType<
          LearningProgressRepository[
            'findLevelByUserAndConceptId'
          ]
        >
      >();

    const sourceRepository =
      this.repository;

    /*
     * Repository decorator explícito.
     *
     * Conserva exactamente el contrato original y solamente
     * cachea las cinco lecturas repetidas del snapshot.
     * Los demás métodos se delegan sin alterar semántica.
     */
    const cachedRepository:
      LearningProgressRepository = {
        getConfiguredLearningLevels:
          conceptId => {
            const key =
              conceptId;

            const existing =
              configuredLevelsCache
                .get(
                  key,
                );

            if (
              existing !== undefined
            ) {
              return existing;
            }

            const pending =
              sourceRepository
                .getConfiguredLearningLevels(
                  conceptId,
                );

            configuredLevelsCache
              .set(
                key,
                pending,
              );

            return pending;
          },

        getTheorySectionCountForLevel:
          (
            conceptId,
            levelId,
          ) =>
            sourceRepository
              .getTheorySectionCountForLevel(
                conceptId,
                levelId,
              ),

        findLevelByUserAndConceptId:
          (
            cachedUserId,
            conceptId,
            levelId,
          ) => {
            const key =
              [
                cachedUserId,
                conceptId,
                levelId,
              ].join(
                '\u0000',
              );

            const existing =
              levelProgressCache
                .get(
                  key,
                );

            if (
              existing !== undefined
            ) {
              return existing;
            }

            const pending =
              sourceRepository
                .findLevelByUserAndConceptId(
                  cachedUserId,
                  conceptId,
                  levelId,
                );

            levelProgressCache
              .set(
                key,
                pending,
              );

            return pending;
          },

        getPreviousRequiredPracticeStatusForLevel:
          (
            cachedUserId,
            conceptId,
            levelId,
            position,
          ) =>
            sourceRepository
              .getPreviousRequiredPracticeStatusForLevel(
                cachedUserId,
                conceptId,
                levelId,
                position,
              ),

        getRequiredPracticeCompletionStatusForLevel:
          (
            cachedUserId,
            conceptId,
            levelId,
          ) =>
            sourceRepository
              .getRequiredPracticeCompletionStatusForLevel(
                cachedUserId,
                conceptId,
                levelId,
              ),

        completeLevelTheory:
          (
            cachedUserId,
            conceptId,
            levelId,
            completedAt,
          ) =>
            sourceRepository
              .completeLevelTheory(
                cachedUserId,
                conceptId,
                levelId,
                completedAt,
              ),

        markLevelQuizPassed:
          (
            cachedUserId,
            conceptId,
            levelId,
            completedAt,
          ) =>
            sourceRepository
              .markLevelQuizPassed(
                cachedUserId,
                conceptId,
                levelId,
                completedAt,
              ),

        markLevelPracticeCompleted:
          (
            cachedUserId,
            conceptId,
            levelId,
            completedAt,
          ) =>
            sourceRepository
              .markLevelPracticeCompleted(
                cachedUserId,
                conceptId,
                levelId,
                completedAt,
              ),

        markLevelCheckpointCompleted:
          (
            cachedUserId,
            conceptId,
            levelId,
            completedAt,
          ) =>
            sourceRepository
              .markLevelCheckpointCompleted(
                cachedUserId,
                conceptId,
                levelId,
                completedAt,
              ),

        markConceptCompleted:
          (
            cachedUserId,
            conceptId,
            completedAt,
          ) =>
            sourceRepository
              .markConceptCompleted(
                cachedUserId,
                conceptId,
                completedAt,
              ),

        findByUserAndConceptId:
          (
            cachedUserId,
            conceptId,
          ) => {
            const key =
              `${cachedUserId}\u0000${conceptId}`;

            const existing =
              conceptProgressCache
                .get(
                  key,
                );

            if (
              existing !== undefined
            ) {
              return existing;
            }

            const pending =
              sourceRepository
                .findByUserAndConceptId(
                  cachedUserId,
                  conceptId,
                );

            conceptProgressCache
              .set(
                key,
                pending,
              );

            return pending;
          },

        findConceptGate:
          conceptId => {
            const key =
              conceptId;

            const existing =
              gateCache.get(
                key,
              );

            if (
              existing !== undefined
            ) {
              return existing;
            }

            const pending =
              sourceRepository
                .findConceptGate(
                  conceptId,
                );

            gateCache.set(
              key,
              pending,
            );

            return pending;
          },

        repairFromCompletedSessions:
          (
            cachedUserId,
            conceptId,
          ) => {
            const key =
              `${cachedUserId}\u0000${conceptId}`;

            const existing =
              repairCache.get(
                key,
              );

            if (
              existing !== undefined
            ) {
              return existing;
            }

            const pending =
              sourceRepository
                .repairFromCompletedSessions(
                  cachedUserId,
                  conceptId,
                );

            repairCache.set(
              key,
              pending,
            );

            return pending;
          },

        getPreviousRequiredPracticeStatus:
          (
            cachedUserId,
            conceptId,
            position,
          ) =>
            sourceRepository
              .getPreviousRequiredPracticeStatus(
                cachedUserId,
                conceptId,
                position,
              ),

        getRequiredPracticeCompletionStatus:
          (
            cachedUserId,
            conceptId,
          ) =>
            sourceRepository
              .getRequiredPracticeCompletionStatus(
                cachedUserId,
                conceptId,
              ),

        completeTheory:
          (
            cachedUserId,
            conceptId,
            completedAt,
          ) =>
            sourceRepository
              .completeTheory(
                cachedUserId,
                conceptId,
                completedAt,
              ),

        markQuizPassed:
          (
            cachedUserId,
            conceptId,
            completedAt,
          ) =>
            sourceRepository
              .markQuizPassed(
                cachedUserId,
                conceptId,
                completedAt,
              ),

        markPracticeCompleted:
          (
            cachedUserId,
            conceptId,
            completedAt,
          ) =>
            sourceRepository
              .markPracticeCompleted(
                cachedUserId,
                conceptId,
                completedAt,
              ),

        markCheckpointAndConceptCompleted:
          (
            cachedUserId,
            conceptId,
            completedAt,
          ) =>
            sourceRepository
              .markCheckpointAndConceptCompleted(
                cachedUserId,
                conceptId,
                completedAt,
              ),
      };

    const snapshotService =
      new LearningProgressService(
        cachedRepository,
        this.clock,
      );

    /*
     * Evitamos disparar simultáneamente todos los conceptos
     * de la tecnología contra MySQL.
     *
     * Cuatro conceptos mantienen paralelismo útil sin recrear
     * el fan-out masivo anterior.
     */
    const conceptBatchSize =
      4;

    const concepts:
      TechnologyLearningConceptStateView[] =
        [];

    for (
      let offset = 0;
      offset < conceptIds.length;
      offset += conceptBatchSize
    ) {
      const batch =
        conceptIds.slice(
          offset,
          offset
            + conceptBatchSize,
        );

      const batchStates =
        await Promise.all(
          batch.map(
            async conceptId => {
              const configuredLevels =
                await cachedRepository
                  .getConfiguredLearningLevels(
                    conceptId,
                  );

              const [
                state,
                levels,
              ] =
                await Promise.all([
                  snapshotService
                    .getState(
                      userId,
                      conceptId,
                    ),

                  Promise.all(
                    configuredLevels.map(
                      level =>
                        snapshotService
                          .getLevelState(
                            userId,
                            conceptId,
                            level.levelId,
                          ),
                    ),
                  ),
                ]);

              return Object.freeze({
                conceptId,

                state,

                levels:
                  Object.freeze([
                    ...levels,
                  ]),
              });
            },
          ),
        );

      concepts.push(
        ...batchStates,
      );
    }

    return Object.freeze({
      technologyId,

      concepts:
        Object.freeze([
          ...concepts,
        ]),
    });
  }

  public async getLevelState(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
  ): Promise<LearningLevelStateView> {
    const context =
      await this.getLearningLevelContext(
        userId,
        conceptId,
        levelId,
      );

    return toLearningLevelState(
      conceptId,
      levelId,
      context.currentLevel,
      context.previousLevelId,
      context.nextLevelId,
      context.locked,
      context.lockReason,
    );
  }

  public async completeLevelTheory(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
  ): Promise<LearningLevelStateView> {
    const context =
      await this.getLearningLevelContext(
        userId,
        conceptId,
        levelId,
      );

    this.assertLearningLevelUnlocked(
      conceptId,
      levelId,
      context,
    );

    const theorySectionCount =
      await this.repository
        .getTheorySectionCountForLevel(
          conceptId,
          levelId,
        );

    if (
      theorySectionCount === 0
    ) {
      throw new LearningLevelTheoryUnavailableError(
        conceptId,
        levelId,
      );
    }

    const completedAt =
      this.clock();

    const record =
      await this.repository
        .completeLevelTheory(
          userId,
          conceptId,
          levelId,
          completedAt,
        );

    return toLearningLevelState(
      conceptId,
      levelId,
      record,
      context.previousLevelId,
      context.nextLevelId,
      false,
      null,
    );
  }

  public async markLevelQuizPassed(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
    completedAt: Date,
  ): Promise<LearningLevelStateView> {
    const context =
      await this.getLearningLevelContext(
        userId,
        conceptId,
        levelId,
      );

    this.assertLearningLevelUnlocked(
      conceptId,
      levelId,
      context,
    );

    if (
      context.currentLevel === null
      || context.currentLevel
        .theoryCompletedAt === null
    ) {
      throw new LearningStageLockedError(
        'quiz',
        'theory',
      );
    }

    const record =
      await this.repository
        .markLevelQuizPassed(
          userId,
          conceptId,
          levelId,
          completedAt,
        );

    return toLearningLevelState(
      conceptId,
      levelId,
      record,
      context.previousLevelId,
      context.nextLevelId,
      false,
      null,
    );
  }

  public async markLevelPracticeCompleted(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
    completedAt: Date,
  ): Promise<LearningLevelStateView> {
    const context =
      await this.getLearningLevelContext(
        userId,
        conceptId,
        levelId,
      );

    this.assertLearningLevelUnlocked(
      conceptId,
      levelId,
      context,
    );

    if (
      context.currentLevel === null
      || context.currentLevel
        .quizPassedAt === null
    ) {
      throw new LearningStageLockedError(
        'practice',
        'quiz',
      );
    }

    const record =
      await this.repository
        .markLevelPracticeCompleted(
          userId,
          conceptId,
          levelId,
          completedAt,
        );

    return toLearningLevelState(
      conceptId,
      levelId,
      record,
      context.previousLevelId,
      context.nextLevelId,
      false,
      null,
    );
  }

  public async markLevelCheckpointCompleted(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
    completedAt: Date,
  ): Promise<LearningLevelStateView> {
    const context =
      await this.getLearningLevelContext(
        userId,
        conceptId,
        levelId,
      );

    this.assertLearningLevelUnlocked(
      conceptId,
      levelId,
      context,
    );

    if (
      context.currentLevel === null
      || context.currentLevel
        .practiceCompletedAt === null
    ) {
      throw new LearningStageLockedError(
        'checkpoint',
        'practice',
      );
    }

    const record =
      await this.repository
        .markLevelCheckpointCompleted(
          userId,
          conceptId,
          levelId,
          completedAt,
        );

    if (
      context.nextLevelId === null
    ) {
      await this.repository
        .markConceptCompleted(
          userId,
          conceptId,
          completedAt,
        );
    }

    return toLearningLevelState(
      conceptId,
      levelId,
      record,
      context.previousLevelId,
      context.nextLevelId,
      false,
      null,
    );
  }

  public async canStartRequiredPracticeForLevel(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
    position: number,
  ): Promise<boolean> {
    if (
      !Number.isSafeInteger(position)
      || position < 0
    ) {
      return false;
    }

    const context =
      await this.getLearningLevelContext(
        userId,
        conceptId,
        levelId,
      );

    if (
      context.locked
    ) {
      return false;
    }

    const previous =
      await this.repository
        .getPreviousRequiredPracticeStatusForLevel(
          userId,
          conceptId,
          levelId,
          position,
        );

    return previous.completed;
  }

  public async reconcileTrainingCompletionForLevel(
    userId: string,
    input: LearningLevelTrainingCompletionInput,
  ): Promise<LearningLevelStateView> {
    if (
      !input.requiredForProgression
    ) {
      return this.getLevelState(
        userId,
        input.conceptId,
        input.levelId,
      );
    }

    if (
      input.totalExercises <= 0
      || input.correctExercises < 0
      || input.correctExercises
        > input.totalExercises
    ) {
      throw new InvalidLearningTrainingCompletionError();
    }

    if (
      input.kind === 'QUIZ'
    ) {
      if (
        input.passingPercentage === null
      ) {
        throw new InvalidLearningTrainingCompletionError();
      }

      const passed =
        input.correctExercises
        * 100
        >= input.passingPercentage
          * input.totalExercises;

      if (
        !passed
      ) {
        return this.getLevelState(
          userId,
          input.conceptId,
          input.levelId,
        );
      }

      await this.markLevelQuizPassed(
        userId,
        input.conceptId,
        input.levelId,
        input.completedAt,
      );

      const practiceStatus =
        await this.repository
          .getRequiredPracticeCompletionStatusForLevel(
            userId,
            input.conceptId,
            input.levelId,
          );

      if (
        practiceStatus.requiredSessionCount
        === 0
      ) {
        return this.markLevelPracticeCompleted(
          userId,
          input.conceptId,
          input.levelId,
          input.completedAt,
        );
      }

      return this.getLevelState(
        userId,
        input.conceptId,
        input.levelId,
      );
    }

    if (
      input.kind === 'PRACTICE'
    ) {
      const practiceStatus =
        await this.repository
          .getRequiredPracticeCompletionStatusForLevel(
            userId,
            input.conceptId,
            input.levelId,
          );

      if (
        practiceStatus.allCompleted
      ) {
        return this.markLevelPracticeCompleted(
          userId,
          input.conceptId,
          input.levelId,
          input.completedAt,
        );
      }

      return this.getLevelState(
        userId,
        input.conceptId,
        input.levelId,
      );
    }

    const checkpointPassed =
      input.correctExercises
      === input.totalExercises;

    if (
      !checkpointPassed
    ) {
      return this.getLevelState(
        userId,
        input.conceptId,
        input.levelId,
      );
    }

    return this.markLevelCheckpointCompleted(
      userId,
      input.conceptId,
      input.levelId,
      input.completedAt,
    );
  }

  public async reconcileTrainingCompletion(
    userId: string,
    input: LearningTrainingCompletionInput,
  ): Promise<ConceptLearningStateView> {
    if (
      !input.requiredForProgression
    ) {
      return this.getState(
        userId,
        input.conceptId,
      );
    }

    if (
      input.totalExercises <= 0
      || input.correctExercises < 0
      || input.correctExercises
        > input.totalExercises
    ) {
      throw new InvalidLearningTrainingCompletionError();
    }

    if (
      input.kind === 'QUIZ'
    ) {
      if (
        input.passingPercentage === null
      ) {
        throw new InvalidLearningTrainingCompletionError();
      }

      const passed =
        input.correctExercises
        * 100
        >= input.passingPercentage
          * input.totalExercises;

      if (!passed) {
        return this.getState(
          userId,
          input.conceptId,
        );
      }

      await this.markQuizPassed(
        userId,
        input.conceptId,
        input.completedAt,
      );

      const practiceStatus =
        await this.repository
          .getRequiredPracticeCompletionStatus(
            userId,
            input.conceptId,
          );

      if (
        practiceStatus.requiredSessionCount
        === 0
      ) {
        return this.markPracticeCompleted(
          userId,
          input.conceptId,
          input.completedAt,
        );
      }

      return this.getState(
        userId,
        input.conceptId,
      );
    }

    if (
      input.kind === 'PRACTICE'
    ) {
      const practiceStatus =
        await this.repository
          .getRequiredPracticeCompletionStatus(
            userId,
            input.conceptId,
          );

      if (
        practiceStatus.allCompleted
      ) {
        return this.markPracticeCompleted(
          userId,
          input.conceptId,
          input.completedAt,
        );
      }

      return this.getState(
        userId,
        input.conceptId,
      );
    }

    const checkpointPassed =
      input.correctExercises
      === input.totalExercises;

    if (!checkpointPassed) {
      return this.getState(
        userId,
        input.conceptId,
      );
    }

    return this.markCheckpointCompleted(
      userId,
      input.conceptId,
      input.completedAt,
    );
  }

  public async canStartRequiredPractice(
    userId: string,
    conceptId: ConceptId,
    position: number,
  ): Promise<boolean> {
    if (
      !Number.isSafeInteger(position)
      || position < 0
    ) {
      return false;
    }

    const previous =
      await this.repository
        .getPreviousRequiredPracticeStatus(
          userId,
          conceptId,
          position,
        );

    return previous.completed;
  }

  public async getState(
    userId: string,
    conceptId: ConceptId,
  ): Promise<ConceptLearningStateView> {
    const context =
      await this.getConceptContext(
        userId,
        conceptId,
      );

    return toLearningState(
      conceptId,
      context.current,
      context.gate,
      context.locked,
      context.canonicalProgress,
    );
  }

  public async completeTheory(
    userId: string,
    conceptId: ConceptId,
  ): Promise<ConceptLearningStateView> {
    const context =
      await this.getConceptContext(
        userId,
        conceptId,
      );

    if (context.locked) {
      throw new LearningConceptLockedError(
        conceptId,
        context.gate.previousConceptId,
      );
    }

    const completedAt =
      this.clock();

    const record =
      await this.repository
        .completeTheory(
          userId,
          conceptId,
          completedAt,
        );

    return toLearningState(
      conceptId,
      record,
      context.gate,
      false,
    );
  }

  public async markQuizPassed(
    userId: string,
    conceptId: ConceptId,
    completedAt: Date,
  ): Promise<ConceptLearningStateView> {
    const context =
      await this.getConceptContext(
        userId,
        conceptId,
      );

    if (context.locked) {
      throw new LearningConceptLockedError(
        conceptId,
        context.gate.previousConceptId,
      );
    }

    if (
      context.current
        ?.theoryCompletedAt
      === null
      || context.current === null
    ) {
      throw new LearningStageLockedError(
        'quiz',
        'theory',
      );
    }

    const record =
      await this.repository
        .markQuizPassed(
          userId,
          conceptId,
          completedAt,
        );

    return toLearningState(
      conceptId,
      record,
      context.gate,
      false,
    );
  }

  public async markPracticeCompleted(
    userId: string,
    conceptId: ConceptId,
    completedAt: Date,
  ): Promise<ConceptLearningStateView> {
    const context =
      await this.getConceptContext(
        userId,
        conceptId,
      );

    if (context.locked) {
      throw new LearningConceptLockedError(
        conceptId,
        context.gate.previousConceptId,
      );
    }

    if (
      context.current
        ?.quizPassedAt
      === null
      || context.current === null
    ) {
      throw new LearningStageLockedError(
        'practice',
        'quiz',
      );
    }

    const record =
      await this.repository
        .markPracticeCompleted(
          userId,
          conceptId,
          completedAt,
        );

    return toLearningState(
      conceptId,
      record,
      context.gate,
      false,
    );
  }

  public async markCheckpointCompleted(
    userId: string,
    conceptId: ConceptId,
    completedAt: Date,
  ): Promise<ConceptLearningStateView> {
    const context =
      await this.getConceptContext(
        userId,
        conceptId,
      );

    if (context.locked) {
      throw new LearningConceptLockedError(
        conceptId,
        context.gate.previousConceptId,
      );
    }

    if (
      context.current
        ?.practiceCompletedAt
      === null
      || context.current === null
    ) {
      throw new LearningStageLockedError(
        'checkpoint',
        'practice',
      );
    }

    const record =
      await this.repository
        .markCheckpointAndConceptCompleted(
          userId,
          conceptId,
          completedAt,
        );

    return toLearningState(
      conceptId,
      record,
      context.gate,
      false,
    );
  }

  private async getLearningLevelContext(
    userId: string,
    conceptId: ConceptId,
    levelId: LearningLevelId,
  ): Promise<{
    readonly configuredLevels:
      readonly ConfiguredLearningLevelRecord[];
    readonly currentLevel:
      LearningLevelProgressRecord | null;
    readonly previousLevel:
      LearningLevelProgressRecord | null;
    readonly previousLevelId:
      LearningLevelId | null;
    readonly nextLevelId:
      LearningLevelId | null;
    readonly locked: boolean;
    readonly lockReason:
      LearningLevelLockReason | null;
  }> {
    const conceptContext =
      await this.getConceptContext(
        userId,
        conceptId,
      );

    const configuredLevels =
      await this.repository
        .getConfiguredLearningLevels(
          conceptId,
        );

    const levelIndex =
      configuredLevels.findIndex(
        level =>
          level.levelId
          === levelId,
      );

    if (
      levelIndex < 0
    ) {
      throw new LearningLevelNotConfiguredError(
        conceptId,
        levelId,
      );
    }

    const previousConfiguredLevel =
      levelIndex === 0
        ? null
        : configuredLevels[
            levelIndex - 1
          ] ?? null;

    const nextConfiguredLevel =
      configuredLevels[
        levelIndex + 1
      ] ?? null;

    const [
      currentLevel,
      previousLevel,
    ] =
      await Promise.all([
        this.repository
          .findLevelByUserAndConceptId(
            userId,
            conceptId,
            levelId,
          ),
        previousConfiguredLevel === null
          ? Promise.resolve(null)
          : this.repository
              .findLevelByUserAndConceptId(
                userId,
                conceptId,
                previousConfiguredLevel
                  .levelId,
              ),
      ]);

    if (
      conceptContext.locked
    ) {
      return {
        configuredLevels,
        currentLevel,
        previousLevel,
        previousLevelId:
          previousConfiguredLevel
            ?.levelId
          ?? null,
        nextLevelId:
          nextConfiguredLevel
            ?.levelId
          ?? null,
        locked:
          true,
        lockReason:
          'previous-concept-incomplete',
      };
    }

    const previousLevelIncomplete =
      previousConfiguredLevel !== null
      && (
        previousLevel === null
        || previousLevel.completedAt
          === null
      );

    return {
      configuredLevels,
      currentLevel,
      previousLevel,
      previousLevelId:
        previousConfiguredLevel
          ?.levelId
        ?? null,
      nextLevelId:
        nextConfiguredLevel
          ?.levelId
        ?? null,
      locked:
        previousLevelIncomplete,
      lockReason:
        previousLevelIncomplete
          ? 'previous-level-incomplete'
          : null,
    };
  }

  private assertLearningLevelUnlocked(
    conceptId: ConceptId,
    levelId: LearningLevelId,
    context: {
      readonly locked: boolean;
      readonly lockReason:
        LearningLevelLockReason | null;
      readonly previousLevelId:
        LearningLevelId | null;
    },
  ): void {
    if (
      !context.locked
    ) {
      return;
    }

    if (
      context.lockReason
      === 'previous-concept-incomplete'
    ) {
      throw new LearningConceptLockedError(
        conceptId,
        null,
      );
    }

    throw new LearningLevelLockedError(
      conceptId,
      levelId,
      context.previousLevelId,
    );
  }

  private async getConceptContext(
    userId: string,
    conceptId: ConceptId,
  ): Promise<{
    readonly gate:
      ConceptGateRecord;

    readonly current:
      LearningProgressRecord | null;

    readonly previous:
      LearningProgressRecord | null;

    readonly locked:
      boolean;

    readonly canonicalProgress:
      CanonicalConceptProgress | undefined;
  }> {
    const gate =
      await this.repository
        .findConceptGate(
          conceptId,
        );

    if (gate === null) {
      throw new LearningConceptNotFoundError(
        conceptId,
      );
    }

    await this.repository
      .repairFromCompletedSessions(
        userId,
        conceptId,
      );

    const current =
      await this.repository
        .findByUserAndConceptId(
          userId,
          conceptId,
        );

    const canonicalProgress =
      await this.getCanonicalConceptProgress(
        userId,
        conceptId,
      );

    if (
      gate.previousConceptId
      === null
    ) {
      return {
        gate,
        current,
        previous:
          null,
        locked:
          false,
        canonicalProgress,
      };
    }

    await this.repository
      .repairFromCompletedSessions(
        userId,
        gate.previousConceptId,
      );

    const previous =
      await this.repository
        .findByUserAndConceptId(
          userId,
          gate.previousConceptId,
        );

    const previousCanonicalProgress =
      await this.getCanonicalConceptProgress(
        userId,
        gate.previousConceptId,
      );

    const previousCompleted =
      previousCanonicalProgress
      === undefined
        ? previous?.completedAt
          !== null
          && previous !== null
        : previousCanonicalProgress.completedAt
          !== null;

    return {
      gate,
      current,
      previous,
      locked:
        !previousCompleted,
      canonicalProgress,
    };
  }

  private async getCanonicalConceptProgress(
    userId: string,
    conceptId: ConceptId,
  ): Promise<CanonicalConceptProgress | undefined> {
    const configuredLevels =
      await this.repository
        .getConfiguredLearningLevels(
          conceptId,
        );

    /*
     * Los conceptos legacy conservan su agregado histórico. En cuanto
     * el catálogo configura el recorrido multinivel, la única autoridad
     * de completitud son los tres niveles persistidos.
     */
    if (
      configuredLevels.length
        <= 1
    ) {
      return undefined;
    }

    const canonicalLevelIds:
      readonly LearningLevelId[] = [
        'FOUNDATION',
        'DEEPENING',
        'MASTERY',
      ];

    const configuredLevelIds =
      new Set(
        configuredLevels.map(
          level =>
            level.levelId,
        ),
      );

    if (
      canonicalLevelIds.some(
        levelId =>
          !configuredLevelIds.has(
            levelId,
          ),
      )
    ) {
      return {
        completedAt:
          null,
        started:
          false,
      };
    }

    const progressRecords =
      await Promise.all(
        configuredLevels.map(
          level =>
            this.repository
              .findLevelByUserAndConceptId(
                userId,
                conceptId,
                level.levelId,
              ),
        ),
      );

    const started =
      progressRecords.some(
        record =>
          record !== null
          && (
            record.theoryCompletedAt
              !== null
            || record.quizPassedAt
              !== null
            || record.practiceCompletedAt
              !== null
            || record.checkpointCompletedAt
              !== null
            || record.completedAt
              !== null
          ),
      );

    if (
      progressRecords.some(
        record =>
          record?.completedAt
          === null
          || record === null,
      )
    ) {
      return {
        completedAt:
          null,
        started,
      };
    }

    const completedAt =
      progressRecords.reduce<Date | null>(
        (
          latest,
          record,
        ) => {
          const recordCompletedAt =
            record?.completedAt
            ?? null;

          if (
            recordCompletedAt === null
          ) {
            return latest;
          }

          if (
            latest === null
            || recordCompletedAt > latest
          ) {
            return recordCompletedAt;
          }

          return latest;
        },
        null,
      );

    return {
      completedAt,
      started:
        true,
    };
  }
}

interface CanonicalConceptProgress {
  readonly completedAt:
    Date | null;
  readonly started:
    boolean;
}

export class InvalidLearningTrainingCompletionError
extends Error {
  public constructor() {
    super(
      'Learning training completion metadata is invalid',
    );

    this.name =
      'InvalidLearningTrainingCompletionError';
  }
}

export class LearningConceptNotFoundError
extends Error {
  public constructor(
    public readonly conceptId:
      ConceptId,
  ) {
    super(
      `Learning concept ${conceptId} was not found`,
    );

    this.name =
      'LearningConceptNotFoundError';
  }
}

export class LearningConceptLockedError
extends Error {
  public readonly reason:
    LearningLockReason =
      'previous-concept-incomplete';

  public constructor(
    public readonly conceptId:
      ConceptId,

    public readonly previousConceptId:
      ConceptId | null,
  ) {
    super(
      previousConceptId === null
        ? `Learning concept ${conceptId} is locked`
        : `Learning concept ${conceptId} requires completed concept ${previousConceptId}`,
    );

    this.name =
      'LearningConceptLockedError';
  }
}

export class LearningLevelTheoryUnavailableError
extends Error {
  public constructor(
    public readonly conceptId:
      ConceptId,
    public readonly levelId:
      LearningLevelId,
  ) {
    super(
      `Learning level ${levelId} has no theory content for concept ${conceptId}`,
    );

    this.name =
      'LearningLevelTheoryUnavailableError';
  }
}

export class LearningLevelNotConfiguredError
extends Error {
  public constructor(
    public readonly conceptId:
      ConceptId,
    public readonly levelId:
      LearningLevelId,
  ) {
    super(
      `Learning level ${levelId} is not configured for concept ${conceptId}`,
    );

    this.name =
      'LearningLevelNotConfiguredError';
  }
}

export class LearningLevelLockedError
extends Error {
  public constructor(
    public readonly conceptId:
      ConceptId,
    public readonly levelId:
      LearningLevelId,
    public readonly previousLevelId:
      LearningLevelId | null,
  ) {
    super(
      previousLevelId === null
        ? `Learning level ${levelId} is locked`
        : `Learning level ${levelId} requires completed level ${previousLevelId}`,
    );

    this.name =
      'LearningLevelLockedError';
  }
}

export class LearningStageLockedError
extends Error {
  public constructor(
    public readonly stage:
      | 'quiz'
      | 'practice'
      | 'checkpoint',

    public readonly requiredStage:
      | 'theory'
      | 'quiz'
      | 'practice',
  ) {
    super(
      `Learning stage ${stage} requires completed ${requiredStage}`,
    );

    this.name =
      'LearningStageLockedError';
  }
}

function toLearningState(
  conceptId: ConceptId,
  record:
    LearningProgressRecord
    | null,
  gate:
    ConceptGateRecord,
  locked:
    boolean,
  canonicalProgress?:
    CanonicalConceptProgress,
): ConceptLearningStateView {
  const theoryCompletedAt =
    record?.theoryCompletedAt
    ?? null;

  const quizPassedAt =
    record?.quizPassedAt
    ?? null;

  const practiceCompletedAt =
    record?.practiceCompletedAt
    ?? null;

  const checkpointCompletedAt =
    record?.checkpointCompletedAt
    ?? null;

  const completedAt =
    canonicalProgress
    === undefined
      ? record?.completedAt
        ?? null
      : canonicalProgress.completedAt;

  const started =
    canonicalProgress
      ?.started
    ?? (
      theoryCompletedAt !== null
      || quizPassedAt !== null
      || practiceCompletedAt !== null
      || checkpointCompletedAt !== null
    );

  if (locked) {
    return Object.freeze({
      conceptId,

      previousConceptId:
        gate.previousConceptId,

      locked:
        true,

      lockReason:
        'previous-concept-incomplete',

      status:
        completedAt !== null
          ? 'completed'
          : 'locked',

      stages:
        Object.freeze({
          theory:
            stageView(
              'locked',
              theoryCompletedAt,
            ),

          quiz:
            stageView(
              'locked',
              quizPassedAt,
            ),

          practice:
            stageView(
              'locked',
              practiceCompletedAt,
            ),

          checkpoint:
            stageView(
              'locked',
              checkpointCompletedAt,
            ),
        }),

      completed:
        completedAt !== null,

      completedAt:
        completedAt?.toISOString()
        ?? null,
    });
  }

  return Object.freeze({
    conceptId,

    previousConceptId:
      gate.previousConceptId,

    locked:
      false,

    lockReason:
      null,

    status:
      completedAt !== null
        ? 'completed'
        : started
          ? 'in_progress'
          : 'available',

    stages:
      Object.freeze({
        theory:
          stageView(
            'available',
            theoryCompletedAt,
          ),

        quiz:
          stageView(
            theoryCompletedAt === null
              ? 'locked'
              : 'available',
            quizPassedAt,
          ),

        practice:
          stageView(
            quizPassedAt === null
              ? 'locked'
              : 'available',
            practiceCompletedAt,
          ),

        checkpoint:
          stageView(
            practiceCompletedAt === null
              ? 'locked'
              : 'available',
            checkpointCompletedAt,
          ),
      }),

    completed:
      completedAt !== null,

    completedAt:
      completedAt?.toISOString()
      ?? null,
  });
}

function stageView(
  availableStatus:
    'available'
    | 'locked',

  completedAt:
    Date
    | null,
): LearningStageView {
  return Object.freeze({
    status:
      completedAt === null
        ? availableStatus
        : 'completed',

    completedAt:
      completedAt?.toISOString()
      ?? null,
  });
}

function toLearningLevelState(
  conceptId: ConceptId,
  levelId: LearningLevelId,
  record:
    LearningLevelProgressRecord
    | null,
  previousLevelId:
    LearningLevelId | null,
  nextLevelId:
    LearningLevelId | null,
  locked: boolean,
  lockReason:
    LearningLevelLockReason | null,
): LearningLevelStateView {
  const theoryCompletedAt =
    record?.theoryCompletedAt
    ?? null;

  const quizPassedAt =
    record?.quizPassedAt
    ?? null;

  const practiceCompletedAt =
    record?.practiceCompletedAt
    ?? null;

  const checkpointCompletedAt =
    record?.checkpointCompletedAt
    ?? null;

  const completedAt =
    record?.completedAt
    ?? null;

  const stageStatus =
    (
      prerequisiteCompleted:
        boolean,
      completedAtValue:
        Date | null,
    ): LearningStageStatus => {
      if (
        completedAtValue !== null
      ) {
        return 'completed';
      }

      if (
        locked
        || !prerequisiteCompleted
      ) {
        return 'locked';
      }

      return 'available';
    };

  return Object.freeze({
    conceptId,
    levelId,
    previousLevelId,
    nextLevelId,
    locked,
    lockReason:
      locked
        ? lockReason
        : null,
    stages:
      Object.freeze({
        theory:
          stageView(
            locked
              ? 'locked'
              : 'available',
            theoryCompletedAt,
          ),
        quiz:
          Object.freeze({
            status:
              stageStatus(
                theoryCompletedAt
                  !== null,
                quizPassedAt,
              ),
            completedAt:
              quizPassedAt
                ?.toISOString()
              ?? null,
          }),
        practice:
          Object.freeze({
            status:
              stageStatus(
                quizPassedAt
                  !== null,
                practiceCompletedAt,
              ),
            completedAt:
              practiceCompletedAt
                ?.toISOString()
              ?? null,
          }),
        checkpoint:
          Object.freeze({
            status:
              stageStatus(
                practiceCompletedAt
                  !== null,
                checkpointCompletedAt,
              ),
            completedAt:
              checkpointCompletedAt
                ?.toISOString()
              ?? null,
          }),
      }),
    completed:
      completedAt !== null,
    completedAt:
      completedAt?.toISOString()
      ?? null,
  });
}
