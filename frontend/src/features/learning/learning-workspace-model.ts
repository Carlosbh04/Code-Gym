import type {
  ConceptLearningState,
  LearningLevelState,
  LearningStage,
  LearningStageState,
  LearningStageStatus,
} from './learning-types';

import type {
  LearningContent,
  LearningLevel,
  LearningLevelId,
  LearningSection,
} from '@/types/content';
import type {
  ExerciseSession,
} from '@/types/exercise';

export const DEFAULT_LEARNING_LEVEL_ID:
  LearningLevelId =
    'foundation';

export interface LearningConceptConfiguration {
  readonly levels?:
    readonly LearningLevel[];
}

export function isStagedLearningConcept(
  concept:
    LearningConceptConfiguration,
): concept is LearningConceptConfiguration & {
  readonly levels:
    readonly LearningLevel[];
} {
  return (
    concept.levels !== undefined
    && concept.levels.length > 0
  );
}

export function getConfiguredLearningLevelIds(
  concept:
    LearningConceptConfiguration,
): readonly LearningLevelId[] {
  if (
    !isStagedLearningConcept(
      concept,
    )
  ) {
    return Object.freeze([
      DEFAULT_LEARNING_LEVEL_ID,
    ]);
  }

  return Object.freeze(
    [...concept.levels]
      .sort(
        (left, right) =>
          left.position
          - right.position,
      )
      .map(
        level =>
          level.id,
      ),
  );
}

export function resolveActiveLearningLevelId(
  levels:
    readonly LearningLevel[]
    | undefined,

  states:
    Readonly<
      Partial<
        Record<
          LearningLevelId,
          LearningLevelState
        >
      >
    >,
): LearningLevelId {
  if (
    levels === undefined
    || levels.length === 0
  ) {
    return DEFAULT_LEARNING_LEVEL_ID;
  }

  const orderedLevels =
    [...levels].sort(
      (left, right) =>
        left.position
        - right.position,
    );

  const firstIncomplete =
    orderedLevels.find(
      level =>
        states[level.id]
          ?.completed
        !== true,
    );

  if (
    firstIncomplete
    !== undefined
  ) {
    return firstIncomplete.id;
  }

  return orderedLevels[
    orderedLevels.length - 1
  ].id;
}

export interface LearningLevelSessionGroups
extends LearningSessionGroups {
  readonly levelId:
    LearningLevelId;
}

export function getLearningSectionLevelId(
  section:
    LearningSection,
): LearningLevelId {
  return (
    section.levelId
    ?? DEFAULT_LEARNING_LEVEL_ID
  );
}

export function filterLearningContentByLevel(
  content:
    LearningContent | undefined,
  levelId:
    LearningLevelId,
): LearningContent | undefined {
  if (content === undefined) {
    return undefined;
  }

  const sections =
    content.sections.filter(
      section =>
        getLearningSectionLevelId(
          section,
        )
        === levelId,
    );

  if (sections.length === 0) {
    return undefined;
  }

  return {
    sections,
  };
}

export function getSessionLearningLevelId(
  session:
    ExerciseSession,
): LearningLevelId {
  return (
    session.levelId
    ?? DEFAULT_LEARNING_LEVEL_ID
  );
}

export function groupLearningSessionsByLevel(
  sessions:
    readonly ExerciseSession[],
  levelIds:
    readonly LearningLevelId[],
): Readonly<
  Partial<
    Record<
      LearningLevelId,
      LearningLevelSessionGroups
    >
  >
> {
  const entries =
    levelIds.map(
      levelId => {
        const grouped =
          groupLearningSessions(
            sessions.filter(
              session =>
                getSessionLearningLevelId(
                  session,
                )
                === levelId,
            ),
          );

        return [
          levelId,
          Object.freeze({
            levelId,
            ...grouped,
          }),
        ] as const;
      },
    );

  return Object.freeze(
    Object.fromEntries(
      entries,
    ) as Partial<
      Record<
        LearningLevelId,
        LearningLevelSessionGroups
      >
    >,
  );
}

export interface LearningSessionGroups {
  readonly quiz:
    ExerciseSession | null;

  readonly practices:
    readonly ExerciseSession[];

  readonly checkpoint:
    ExerciseSession | null;

  readonly staged:
    boolean;
}

export function groupLearningSessions(
  sessions:
    readonly ExerciseSession[],
): LearningSessionGroups {
  const quiz =
    sessions.find(
      session =>
        session.kind === 'quiz'
        && session.requiredForProgression
          !== false,
    )
    ?? null;

  const checkpoint =
    sessions.find(
      session =>
        session.kind
        === 'checkpoint',
    )
    ?? null;

  const practices =
    sessions.filter(
      session =>
        session.kind === undefined
        || session.kind
          === 'practice',
    );

  return Object.freeze({
    quiz,

    practices:
      Object.freeze(
        practices,
      ),

    checkpoint,

    staged:
      quiz !== null,
  });
}

export function resolveCurrentLearningStage(
  state:
    LearningStageState,
): LearningStage {
  if (
    state.stages.theory.status
    !== 'completed'
  ) {
    return 'theory';
  }

  if (
    state.stages.quiz.status
    !== 'completed'
  ) {
    return 'quiz';
  }

  if (
    state.stages.practice.status
    !== 'completed'
  ) {
    return 'practice';
  }

  return 'checkpoint';
}

export function canOpenLearningStage(
  state:
    LearningStageState,
  stage:
    LearningStage,
): boolean {
  if (state.locked) {
    return false;
  }

  return state.stages[
    stage
  ].status !== 'locked';
}

export function learningStageStatus(
  state:
    LearningStageState | undefined,
  stage:
    LearningStage,
): LearningStageStatus {
  if (state === undefined) {
    return 'locked';
  }

  return state.stages[
    stage
  ].status;
}

export function countCompletedConcepts(
  concepts:
    readonly {
      readonly id:
        string;
    }[],
  states:
    Readonly<
      Record<
        string,
        ConceptLearningState
      >
    >,
): number {
  return concepts.reduce(
    (
      total,
      concept,
    ) =>
      states[
        concept.id
      ]?.completed
        ? total + 1
        : total,
    0,
  );
}

// LOCKED_CONCEPT_URL_GATE_MODEL
export function canSelectRequestedConceptFromUrl(
  staged:
    boolean,
  state:
    | {
        readonly locked:
          boolean;
      }
    | undefined,
): boolean {
  /*
   * Los conceptos legacy no dependen del contrato
   * staged de LearningState y conservan su
   * comportamiento anterior.
   */
  if (!staged) {
    return true;
  }

  /*
   * Para contenido staged, "estado desconocido"
   * NO equivale a "desbloqueado".
   *
   * La URL puede solicitar navegación, pero no
   * conceder acceso antes de que responda el
   * backend.
   */
  return (
    state !== undefined
    && state.locked === false
  );
}
