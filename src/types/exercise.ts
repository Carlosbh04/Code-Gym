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
