export type LearningStageStatus =
  | 'locked'
  | 'available'
  | 'completed';

export type LearningStage =
  | 'theory'
  | 'quiz'
  | 'practice'
  | 'checkpoint';

export interface LearningStageView {
  readonly status:
    LearningStageStatus;

  readonly completedAt:
    string | null;
}

export interface LearningStageState {
  readonly locked:
    boolean;

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

export interface ConceptLearningState
extends LearningStageState {
  readonly conceptId:
    string;

  readonly previousConceptId:
    string | null;

  readonly lockReason:
    'previous-concept-incomplete'
    | null;
}

export type LearningLevelId =
  | 'foundation'
  | 'deepening'
  | 'mastery';

export interface LearningLevelState
extends LearningStageState {
  readonly conceptId:
    string;

  readonly levelId:
    LearningLevelId;

  readonly previousLevelId:
    LearningLevelId | null;

  readonly nextLevelId:
    LearningLevelId | null;

  readonly locked:
    boolean;

  readonly lockReason:
    | 'previous-concept-incomplete'
    | 'previous-level-incomplete'
    | null;

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

export interface LearningLevelStateResponse {
  readonly state:
    LearningLevelState;
}

export interface LearningStateResponse {
  readonly state:
    ConceptLearningState;
}
