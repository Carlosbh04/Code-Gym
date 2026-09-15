import type { Concept, Technology, Topic } from './content';
import type { ExerciseSession } from './exercise';

export interface IContentRepository {
  getTechnologies(): Promise<Technology[]>;
  getTopicsByTechnology(technologyId: string): Promise<Topic[]>;
  getConceptsByTopic(topicId: string): Promise<Concept[]>;
  getConceptById(conceptId: string): Promise<Concept | null>;
  getSessionsByConcept(conceptId: string): Promise<ExerciseSession[]>;
  getSessionById(sessionId: string): Promise<ExerciseSession | null>;
}
