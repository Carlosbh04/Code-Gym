export type PublicContentStatus =
  | 'draft'
  | 'published'
  | 'updated'
  | 'deprecated'
  | 'legacy';

export type PublicDifficulty =
  | 'beginner'
  | 'intermediate'
  | 'advanced';

export type PublicExerciseStepType =
  | 'code-reading'
  | 'predict-output'
  | 'find-error'
  | 'fix-code';

export type PublicLearningSection =
  | {
      readonly type:
        | 'intro'
        | 'explanation'
        | 'key-point'
        | 'warning';
      readonly levelId: PublicLearningLevelId;
      readonly title: string;
      readonly body: string;
    }
  | {
      readonly type: 'objectives';
      readonly levelId: PublicLearningLevelId;
      readonly title: string;
      readonly items: readonly string[];
    }
  | {
      readonly type: 'code';
      readonly levelId: PublicLearningLevelId;
      readonly title: string;
      readonly code: string;
      readonly language: string;
      readonly caption?: string;
    }
  | {
      readonly type: 'comparison';
      readonly levelId: PublicLearningLevelId;
      readonly title: string;
      readonly left: {
        readonly title: string;
        readonly body: string;
      };
      readonly right: {
        readonly title: string;
        readonly body: string;
      };
    }
  | {
      readonly type: 'quick-check';
      readonly levelId: PublicLearningLevelId;
      readonly question: string;
      readonly answer: string;
    };

export interface PublicTechnology {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly description: string;
}

export interface PublicTopic {
  readonly id: string;
  readonly name: string;
  readonly technologyId: string;
  readonly description: string;
}

export interface PublicLearningLevel {
  readonly id: PublicLearningLevelId;
  readonly name: string;
  readonly description: string;
  readonly position: number;
}

export interface PublicConcept {
  readonly id: string;
  readonly name: string;
  readonly topicId: string;
  readonly technologyId: string;
  readonly contentMarkdown: string;
  readonly levels: readonly PublicLearningLevel[];
  readonly content: {
    readonly sections: readonly PublicLearningSection[];
  };
}

export interface PublicAnswerOption {
  readonly id: string;
  readonly text: string;
}

export interface PublicExerciseStep {
  readonly id: string;
  readonly type: PublicExerciseStepType;
  readonly prompt: string;
  readonly code: string | null;
  readonly language: string | null;
  readonly options: readonly PublicAnswerOption[] | null;
  readonly requirements: readonly string[];
  readonly hintCount: number;
  readonly stepOrder: number;
}

export type PublicExerciseSessionKind =
  | 'quiz'
  | 'practice'
  | 'checkpoint';

export type PublicLearningLevelId =
  | 'foundation'
  | 'deepening'
  | 'mastery';

export interface PublicExerciseSession {
  readonly id: string;
  readonly title: string;
  readonly conceptId: string;
  readonly technologyId: string;
  readonly difficulty: PublicDifficulty;
  readonly kind: PublicExerciseSessionKind;
  readonly levelId: PublicLearningLevelId;
  readonly passingPercentage: number | null;
  readonly requiredForProgression: boolean;
  readonly version: string;
  readonly status: PublicContentStatus;
  readonly createdAt: string;
  readonly updatedAt: string | null;
  readonly steps: readonly PublicExerciseStep[];
}
