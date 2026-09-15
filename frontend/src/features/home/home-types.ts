import type { Concept, Technology, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { CompletedSession } from '@/types/progress';

export interface HomeCatalogSession {
  session: ExerciseSession;
  concept: Concept;
  topic: Topic;
}

export interface HomeCatalogTechnology {
  technology: Technology;
  topics: Topic[];
  concepts: Concept[];
  sessions: HomeCatalogSession[];
}

export interface HomeCatalog {
  technologies: HomeCatalogTechnology[];
  completionBySession: ReadonlyMap<string, CompletedSession | null>;
  completionErrors: number;
}

export interface HomeContinueItem extends HomeCatalogSession {
  technology: Technology;
  state: 'in-progress' | 'available' | 'completed';
  completedSteps: number;
  source: 'recovery' | 'recommended' | 'available' | 'repeat';
}

export type HomePrimaryCardState = 'first-time' | 'recovery' | 'returning';

export interface HomeTechnologyProgress {
  technology: Technology;
  totalConcepts: number;
  practicedConcepts: number;
}

export interface HomeActivity {
  completedSession: CompletedSession;
  sessionTitle: string;
  technologyId: string;
  technologyName: string;
  topicName?: string;
}
