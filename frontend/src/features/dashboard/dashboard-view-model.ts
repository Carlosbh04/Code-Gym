import type { ExerciseSession, ExerciseStep } from '@/types/exercise';
import type { ProgressSummary } from '@/types/progress';

export type EvidenceLevel = 'none' | 'initial' | 'sufficient';
export type DashboardStatus = 'ok' | 'attention' | 'improvement';
export type DashboardState = 'empty' | 'early' | 'full';

export interface DashboardConcept {
  conceptId: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number | undefined;
  evidenceLevel: EvidenceLevel;
  status: DashboardStatus | undefined;
  lastPracticed: string;
}

export interface DashboardOverview {
  totalAnswers: number;
  totalCorrect: number;
  globalAccuracy: number | undefined;
  conceptsPracticed: number;
  lastPracticed: string | undefined;
}

export interface DashboardViewModel {
  state: DashboardState;
  priorityConcept: DashboardConcept | null;
  otherConcepts: DashboardConcept[];
  observedConcepts: DashboardConcept[];
  overview: DashboardOverview;
}

export interface DashboardVerdict {
  status: DashboardStatus | null;
  headline: string;
  explanation: string;
}

const STATUS_PRIORITY: Record<DashboardStatus, number> = {
  improvement: 0,
  attention: 1,
  ok: 2,
};

export function calculateAccuracy(
  correctAttempts: number,
  totalAttempts: number,
): number | undefined {
  if (totalAttempts <= 0) return undefined;
  return Math.round((correctAttempts / totalAttempts) * 100);
}

export function getEvidenceLevel(totalAttempts: number): EvidenceLevel {
  if (totalAttempts <= 0) return 'none';
  if (totalAttempts < 5) return 'initial';
  return 'sufficient';
}

export function getDashboardStatus(
  accuracy: number | undefined,
  evidenceLevel: EvidenceLevel,
): DashboardStatus | undefined {
  if (evidenceLevel !== 'sufficient' || accuracy === undefined) return undefined;
  if (accuracy >= 80) return 'ok';
  if (accuracy >= 60) return 'attention';
  return 'improvement';
}

export function createDashboardViewModel(
  progressItems: Iterable<ProgressSummary>,
): DashboardViewModel {
  const progress = Array.from(progressItems);
  const concepts = progress.map(toDashboardConcept);
  const sufficient = concepts
    .filter((concept) => concept.evidenceLevel === 'sufficient')
    .sort(comparePriority);
  const priorityConcept = sufficient[0] ?? null;

  return {
    state:
      progress.length === 0
        ? 'empty'
        : priorityConcept === null
          ? 'early'
          : 'full',
    priorityConcept,
    otherConcepts: sufficient.slice(1).sort(compareOtherConcepts),
    observedConcepts: concepts.filter(
      (concept) => concept.evidenceLevel === 'initial',
    ),
    overview: createOverview(progress),
  };
}

export function createDashboardVerdict(
  model: DashboardViewModel,
  conceptName?: string,
): DashboardVerdict {
  const priority = model.priorityConcept;
  if (priority === null || priority.status === undefined) {
    return {
      status: null,
      headline: 'Tu progreso todavía está tomando forma.',
      explanation:
        'Completa algunas prácticas más para obtener un diagnóstico útil.',
    };
  }

  const name = conceptName ?? priority.conceptId;
  if (priority.status === 'ok') {
    return {
      status: 'ok',
      headline: `Tu progreso es sólido en los conceptos practicados; puedes seguir consolidando ${name}.`,
      explanation: `${name} es la siguiente práctica por consolidar entre los conceptos con evidencia suficiente.`,
    };
  }

  if (priority.status === 'attention') {
    return {
      status: 'attention',
      headline: `Tu progreso es estable, pero ${name} necesita más práctica.`,
      explanation: `${name} tiene una precisión de ${priority.accuracy} % en tus respuestas registradas.`,
    };
  }

  return {
    status: 'improvement',
    headline: `Tu progreso muestra margen de mejora; ${name} es el concepto que conviene reforzar primero.`,
    explanation: `${name} tiene una precisión de ${priority.accuracy} % en tus respuestas registradas.`,
  };
}

export function selectRecommendedSession(
  sessions: readonly ExerciseSession[],
): ExerciseSession | null {
  return (
    sessions.find((session) =>
      session.steps.some(
        (step) => step.type === 'find-error' && hasCode(step),
      ),
    ) ??
    sessions.find((session) => session.steps.some(hasCode)) ??
    sessions[0] ??
    null
  );
}

export function selectCodePiece(
  session: ExerciseSession,
): ExerciseStep | null {
  return (
    session.steps.find(
      (step) => step.type === 'find-error' && hasCode(step),
    ) ??
    session.steps.find(hasCode) ??
    null
  );
}

function hasCode(step: ExerciseStep): boolean {
  return typeof step.code === 'string' && step.code.trim().length > 0;
}

function toDashboardConcept(progress: ProgressSummary): DashboardConcept {
  const accuracy = calculateAccuracy(
    progress.correctAttempts,
    progress.totalAttempts,
  );
  const evidenceLevel = getEvidenceLevel(progress.totalAttempts);

  return {
    conceptId: progress.conceptId,
    totalAttempts: progress.totalAttempts,
    correctAttempts: progress.correctAttempts,
    accuracy,
    evidenceLevel,
    status: getDashboardStatus(accuracy, evidenceLevel),
    lastPracticed: progress.lastPracticed,
  };
}

function comparePriority(a: DashboardConcept, b: DashboardConcept): number {
  const byAccuracy = (a.accuracy ?? Infinity) - (b.accuracy ?? Infinity);
  if (byAccuracy !== 0) return byAccuracy;

  const byLastPracticed = a.lastPracticed.localeCompare(b.lastPracticed);
  if (byLastPracticed !== 0) return byLastPracticed;

  return a.conceptId.localeCompare(b.conceptId);
}

function compareOtherConcepts(a: DashboardConcept, b: DashboardConcept): number {
  const byStatus =
    STATUS_PRIORITY[a.status ?? 'ok'] - STATUS_PRIORITY[b.status ?? 'ok'];
  if (byStatus !== 0) return byStatus;
  return comparePriority(a, b);
}

function createOverview(progress: ProgressSummary[]): DashboardOverview {
  const totalAnswers = progress.reduce(
    (total, item) => total + item.totalAttempts,
    0,
  );
  const totalCorrect = progress.reduce(
    (total, item) => total + item.correctAttempts,
    0,
  );
  const practiced = progress.filter((item) => item.totalAttempts > 0);
  const lastPracticed = practiced.reduce<string | undefined>(
    (latest, item) =>
      latest === undefined || item.lastPracticed > latest
        ? item.lastPracticed
        : latest,
    undefined,
  );

  return {
    totalAnswers,
    totalCorrect,
    globalAccuracy: calculateAccuracy(totalCorrect, totalAnswers),
    conceptsPracticed: practiced.length,
    lastPracticed,
  };
}
