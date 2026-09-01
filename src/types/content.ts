export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type ContentStatus =
  | 'draft'
  | 'published'
  | 'updated'
  | 'deprecated'
  | 'legacy';

export type StepType =
  | 'code-reading'
  | 'predict-output'
  | 'find-error'
  | 'fix-code';

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

export interface ExerciseSession {
  id: string;
  title: string;
  conceptId: string;
  technologyId: string;
  difficulty: Difficulty;
  version: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string | null;
  steps: ExerciseStep[];
}

export interface ExerciseStep {
  id: string;
  type: StepType;
  prompt: string;
  code: string | null;
  language: string | null;
  options: AnswerOption[] | null;
  errorLines: number[] | null;
  errorType: string | null;
  testCases: TestCase[] | null;
  expectedPatterns: string[] | null;
  explanation: string;
  hints: string[];
  stepOrder: number;
}

export interface AnswerOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface TestCase {
  input: unknown;
  expected: unknown;
  call: string;
  description: string;
}

export interface ContentContextValue {
  technologies: Technology[];
  getTechnology: (id: string) => Technology | undefined;
  getTopics: (technologyId: string) => Promise<Topic[]>;
  getConcept: (conceptId: string) => Promise<Concept | null>;
  getSession: (sessionId: string) => Promise<ExerciseSession | null>;
  isLoading: boolean;
}
