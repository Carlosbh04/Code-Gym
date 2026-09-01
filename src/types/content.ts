import type { ExerciseSession } from './exercise';

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
}

export interface ContentContextValue {
  technologies: Technology[];
  getTechnology: (id: string) => Technology | undefined;
  getTopics: (technologyId: string) => Promise<Topic[]>;
  getConcept: (conceptId: string) => Promise<Concept | null>;
  getSession: (sessionId: string) => Promise<ExerciseSession | null>;
  isLoading: boolean;
}
