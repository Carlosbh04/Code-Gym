import type {
  Concept,
  ExerciseSession,
  Technology,
  Topic,
} from './content';
import type { Attempt, CompletedSession, ConceptProgress } from './progress';

export interface IProgressRepository {
  getConceptProgress(conceptId: string): Promise<ConceptProgress | null>;
  getAllProgress(): Promise<ConceptProgress[]>;
  updateProgress(conceptId: string, progress: ConceptProgress): Promise<void>;
  clearProgress(): Promise<void>;
}

export interface IAttemptRepository {
  saveAttempt(attempt: Attempt): Promise<void>;
  getAttemptsBySession(sessionId: string): Promise<Attempt[]>;
  getRecentAttempts(limit: number): Promise<Attempt[]>;
  clearAttempts(): Promise<void>;
}

export interface ICompletedSessionRepository {
  save(session: CompletedSession): Promise<void>;
  getBySessionId(sessionId: string): Promise<CompletedSession | null>;
  getRecent(limit: number): Promise<CompletedSession[]>;
  clear(): Promise<void>;
}

export interface IContentRepository {
  getTechnologies(): Promise<Technology[]>;
  getTopicsByTechnology(technologyId: string): Promise<Topic[]>;
  getConceptById(conceptId: string): Promise<Concept | null>;
  getSessionsByConcept(conceptId: string): Promise<ExerciseSession[]>;
  getSessionById(sessionId: string): Promise<ExerciseSession | null>;
}
