import type { StepType } from './content';

export interface DifficultyDistribution {
  beginner: { total: number; correct: number };
  intermediate: { total: number; correct: number };
  advanced: { total: number; correct: number };
}

export interface ErrorRecord {
  stepType: string;
  errorType: string;
  timestamp: string;
  sessionId: string;
}

export interface ConceptProgress {
  conceptId: string;
  domain: number;
  totalAttempts: number;
  correctAttempts: number;
  difficultyDistribution: DifficultyDistribution;
  recentErrors: ErrorRecord[];
  lastPracticed: string;
  schemaVersion: number;
}

export interface Attempt {
  id: string;
  sessionId: string;
  stepId: string;
  stepType: string;
  answer: unknown;
  isCorrect: boolean;
  timeSpentMs: number;
  hintsUsed: number;
  createdAt: string;
}

export interface CompletedSession {
  id: string;
  sessionId: string;
  technologyId: string;
  conceptId: string;
  totalSteps: number;
  correctSteps: number;
  accuracy: number;
  timeSpentMs: number;
  completedAt: string;
}

export interface UserAnswer {
  stepId: string;
  stepType: StepType;
  answer: string | number;
  timeSpentMs: number;
  hintsUsed: number;
}

export interface DomainImpact {
  previousDomain: number;
  newDomain: number;
  change: number;
}

export interface SessionScore {
  totalSteps: number;
  correctSteps: number;
  accuracy: number;
  timeSpentMs: number;
  hintsUsed: number;
  domainImpact: DomainImpact;
}

export interface ProgressContextValue {
  progress: Map<string, ConceptProgress>;
  updateProgress: (
    conceptId: string,
    update: Partial<ConceptProgress>,
  ) => Promise<void>;
  getConceptDomain: (conceptId: string) => number;
  isLoading: boolean;
  error: string | null;
}
