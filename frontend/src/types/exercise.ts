export type ExerciseSessionKind =
  | 'quiz'
  | 'practice'
  | 'checkpoint';

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
  readonly kind?: ExerciseSessionKind;
  /**
   * Nivel pedagógico al que pertenece esta sesión.
   * Ausente únicamente para contenido legacy.
   */
  readonly levelId?:
    | 'foundation'
    | 'deepening'
    | 'mastery';
  readonly passingPercentage?: number | null;
  readonly requiredForProgression?: boolean;
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
  requirements: string[];
  hintCount: number;
  stepOrder: number;
}

export interface RevealedHint {
  readonly index: number;
  readonly text: string;
}

export interface AnswerOption {
  id: string;
  text: string;
}

/**
 * Respuesta de un paso `find-error` (D014).
 *
 * §7 pide dos cosas al usuario —«Seleccionar línea + clasificar error»— y §24
 * valida ambas contra `errorLines` y `errorType`. Un solo escalar no puede
 * transportarlas, así que la respuesta de este tipo es compuesta.
 *
 * `line` es un número de línea 1-based del `code` del paso, tal como se
 * numeran en `errorLines`.
 */
export interface FindErrorAnswer {
  line: number;
  errorType: string;
}

/**
 * Respuesta que un paso puede recibir, según su tipo (D014).
 *
 * Los pasos de opción única —code-reading y predict-output— responden con el
 * id de la opción; find-error responde con `FindErrorAnswer`. El `number`
 * ya estaba admitido en §17 y se conserva.
 */
export type StepAnswer = string | number | FindErrorAnswer;
