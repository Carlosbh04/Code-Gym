import type { ExerciseSession } from './exercise';

export type LearningSection =
  | { type: 'intro' | 'explanation' | 'key-point' | 'warning'; levelId?: LearningLevelId; title: string; body: string }
  | { type: 'objectives'; levelId?: LearningLevelId; title: string; items: string[] }
  | { type: 'code'; levelId?: LearningLevelId; title: string; code: string; language: string; caption?: string }
  | {
      type: 'comparison';
      levelId?: LearningLevelId;
      title: string;
      left: { title: string; body: string };
      right: { title: string; body: string };
    }
  | { type: 'quick-check'; levelId?: LearningLevelId; question: string; answer: string };

export interface LearningContent {
  sections: LearningSection[];
}

export type LearningLevelId =
  | 'foundation'
  | 'deepening'
  | 'mastery';

export interface LearningLevel {
  readonly id: LearningLevelId;
  readonly name: string;
  readonly description: string;
  readonly position: number;
}

export interface Technology {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface Topic {
  id: string;
  name: string;
  technologyId: string;
  description: string;
}

export interface Concept {
  id: string;
  name: string;
  topicId: string;
  technologyId: string;
  contentMarkdown: string;
  /** Lección estructurada opcional; `contentMarkdown` mantiene compatibilidad. */
  content?: LearningContent;
  /** Niveles pedagógicos disponibles dentro del concepto. */
  levels?: readonly LearningLevel[];
}

export interface ContentContextValue {
  technologies: Technology[];
  getTechnology: (id: string) => Technology | undefined;
  getTopics: (technologyId: string) => Promise<Topic[]>;
  getConceptsByTopic: (topicId: string) => Promise<Concept[]>;
  getConcept: (conceptId: string) => Promise<Concept | null>;
  getSessionsByConcept: (conceptId: string) => Promise<ExerciseSession[]>;
  getSession: (sessionId: string) => Promise<ExerciseSession | null>;
  isLoading: boolean;
}
