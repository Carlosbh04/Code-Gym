import type { StepAnswer, StepType } from './exercise';

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
  /** @deprecated No forma parte del progreso autoritativo del backend. */
  domain?: number;
  totalAttempts: number;
  correctAttempts: number;
  /** @deprecated No forma parte del progreso autoritativo del backend. */
  difficultyDistribution?: DifficultyDistribution;
  /** @deprecated No forma parte del progreso autoritativo del backend. */
  recentErrors?: ErrorRecord[];
  lastPracticed: string;
  /** @deprecated Solo pertenecía a la persistencia local antigua. */
  schemaVersion?: number;
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
  answer: StepAnswer;
  isCorrect: boolean;
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

/**
 * Proyección mínima y veraz del progreso confirmado por el backend.
 *
 * No contiene domain, difficultyDistribution, recentErrors ni schemaVersion
 * porque el Dashboard API no expone esos datos.
 */
export interface ProgressSummary {
  readonly conceptId: string;
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly lastPracticed: string;
}

export interface ProgressContextValue {
  readonly progress: Map<string, ProgressSummary>;
  readonly isLoading: boolean;
  readonly error: string | null;

  /**
   * Compatibilidad temporal para fixtures antiguos.
   * El provider backend-authoritative no implementa escritura local.
   */
  readonly updateProgress?: (
    conceptId: string,
    update: Partial<ConceptProgress>,
  ) => Promise<void>;

  readonly getConceptDomain?: (
    conceptId: string,
  ) => number;

  readonly resetState?: () => void;
}
