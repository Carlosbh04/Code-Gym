import type { Concept, Technology, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { CompletedSession } from '@/types/progress';

export interface CatalogTechnology {
  technology: Technology;
  topics: Topic[];
  concepts: Concept[];
}

export interface TechnologyProgress {
  technology: Technology;
  totalConcepts: number;
  practicedConcepts: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number | undefined;
  lastPracticedAt: string | undefined;
}

export interface DashboardActivity {
  completedSession: CompletedSession;
  sessionTitle: string;
  technologyName: string;
  topicName?: string;
}

export interface DashboardRecommendation {
  conceptName: string;
  technologyName: string;
  session: ExerciseSession;
}
