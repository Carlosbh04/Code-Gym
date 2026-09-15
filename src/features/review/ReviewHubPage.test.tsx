import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
import { DashboardContext } from '@/contexts/dashboard-context';
import { HistoryContext } from '@/contexts/history-context';
import { ProgressContext } from '@/contexts/progress-context';
import { SessionRecoveryContext } from '@/contexts/session-recovery-context';
import type { ContentContextValue, Concept, Technology, Topic } from '@/types/content';
import type { ExerciseSession, ExerciseStep } from '@/types/exercise';
import type { HistoryContextValue } from '@/types/history';
import type { CompletedSession, ConceptProgress, ProgressContextValue } from '@/types/progress';
import type { ISessionRecoveryStore } from '@/lib/recovery/ISessionRecoveryStore';
import ReviewHubPage from './ReviewHubPage';

const TECHNOLOGY: Technology = { id: 'javascript', name: 'JavaScript', icon: 'javascript', description: '' };
const TOPIC: Topic = { id: 'arrays', name: 'Arrays', technologyId: TECHNOLOGY.id, description: '' };
const CONCEPT: Concept = { id: 'array-iteration', name: 'Métodos de iteración', topicId: TOPIC.id, technologyId: TECHNOLOGY.id, contentMarkdown: '' };
const STEP: ExerciseStep = { id: 'step-1', type: 'code-reading', prompt: 'Pregunta', code: null, language: null, options: [], requirements: [], hintCount: 0, stepOrder: 1 };
const SESSION: ExerciseSession = { id: 'arrays-session', title: 'Filter no debería mutar', conceptId: CONCEPT.id, technologyId: TECHNOLOGY.id, difficulty: 'beginner', version: '1', status: 'published', createdAt: '2026-09-01T10:00:00.000Z', updatedAt: null, steps: [STEP, { ...STEP, id: 'step-2', stepOrder: 2 }] };
const COMPLETION: CompletedSession = { id: 'completion-1', sessionId: SESSION.id, technologyId: TECHNOLOGY.id, conceptId: CONCEPT.id, totalSteps: 2, correctSteps: 1, accuracy: 50, timeSpentMs: 62_000, completedAt: '2026-09-06T10:00:00.000Z' };
const PROGRESS: ConceptProgress = { conceptId: CONCEPT.id, domain: 0, totalAttempts: 6, correctAttempts: 3, difficultyDistribution: { beginner: { total: 6, correct: 3 }, intermediate: { total: 0, correct: 0 }, advanced: { total: 0, correct: 0 } }, recentErrors: [], lastPracticed: '2026-09-06T10:00:00.000Z', schemaVersion: 1 };

const EMPTY_RECOVERY: ISessionRecoveryStore = { load: () => null, save: vi.fn(), clear: vi.fn() };

function renderHub({
  progress = new Map([[CONCEPT.id, PROGRESS]]),
  completions = [COMPLETION],
  recoveryStore = EMPTY_RECOVERY,
  progressError = null,
  historyError = null,
  contentLoading = false,
}: {
  progress?: Map<string, ConceptProgress>;
  completions?: CompletedSession[];
  recoveryStore?: ISessionRecoveryStore;
  progressError?: string | null;
  historyError?: string | null;
  contentLoading?: boolean;
} = {}) {
  const content: ContentContextValue = {
    technologies: [TECHNOLOGY],
    getTechnology: vi.fn((id) => id === TECHNOLOGY.id ? TECHNOLOGY : undefined),
    getTopics: vi.fn().mockResolvedValue([TOPIC]),
    getConceptsByTopic: vi.fn().mockResolvedValue([CONCEPT]),
    getConcept: vi.fn().mockResolvedValue(CONCEPT),
    getSessionsByConcept: vi.fn().mockResolvedValue([SESSION]),
    getSession: vi.fn().mockResolvedValue(SESSION),
    isLoading: contentLoading,
  };
  const history: HistoryContextValue = {
    recentCompletedSessions: completions,
    completedSessionsLoading: false,
    completedSessionsError: historyError,
    getCompletedSession: vi.fn(async (sessionId) => completions.find((item) => item.sessionId === sessionId) ?? null),
    getAttemptsBySession: vi.fn().mockResolvedValue([]),
    attemptsLoading: false,
    attemptsError: null,
  };
  const progressValue: ProgressContextValue = {
    progress,
    updateProgress: vi.fn(),
    getConceptDomain: vi.fn(() => 0),
    isLoading: false,
    error: progressError,
  };
  const dashboardValue = {
    dashboard: null,
    isLoading: false,
    error: null,
    refresh: vi.fn().mockResolvedValue(undefined),
    resetState: vi.fn(),
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <DashboardContext.Provider value={dashboardValue}>
      <ProgressContext.Provider value={progressValue}>
        <HistoryContext.Provider value={history}>
          <SessionRecoveryContext.Provider value={recoveryStore}>
            <ContentContext.Provider value={content}>
              <MemoryRouter initialEntries={['/review']}>
                <Routes>
                  <Route path="/review" element={children} />
                  <Route path="/review/:sessionId" element={<p>Detalle</p>} />
                  <Route path="/results/:sessionId" element={<p>Resultado</p>} />
                  <Route path="/practice/:sessionId" element={<p>Práctica</p>} />
                  <Route path="/tech" element={<p>Entrenar</p>} />
                  <Route path="/tech/:technologyId/:topicId" element={<p>Tema</p>} />
                </Routes>
              </MemoryRouter>
            </ContentContext.Provider>
          </SessionRecoveryContext.Provider>
        </HistoryContext.Provider>
      </ProgressContext.Provider>
    </DashboardContext.Provider>
  );
  return render(<ReviewHubPage />, { wrapper });
}

describe('ReviewHubPage', () => {
  it('convierte progreso, historial y catálogo reales en acciones de repaso', async () => {
    const { container } = renderHub();

    expect(await screen.findByRole('region', { name: 'Conceptos a reforzar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Repasar' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Precisión general' })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('Conviene reforzar algunos temas')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Conceptos más débiles' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: CONCEPT.name })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: `Precisión de ${CONCEPT.name} en la tarjeta de repaso` })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('Completada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Repetir/ })).toHaveAttribute('href', `/practice/${SESSION.id}`);
    expect(screen.getByRole('region', { name: 'Últimos repasos' })).toBeInTheDocument();
    expect(container.querySelector('time')).toHaveTextContent(/^hace /);
    expect(screen.getByRole('link', { name: 'Abrir repaso' })).toHaveAttribute('href', `/review/${SESSION.id}`);
    expect(screen.getByRole('link', { name: 'Ver resultado' })).toHaveAttribute('href', `/results/${SESSION.id}`);
  });

  it('prioriza una recovery existente como sesión en progreso', async () => {
    renderHub({
      recoveryStore: {
        ...EMPTY_RECOVERY,
        load: () => ({ sessionId: SESSION.id, currentStep: 1, answers: [], elapsedMs: 1_000, revealedHints: [], startTime: 1 }),
      },
    });

    expect(await screen.findByRole('link', { name: /Continuar/ })).toHaveAttribute('href', `/practice/${SESSION.id}`);
    expect(screen.getByText((_, element) => element?.tagName === 'SPAN' && element.textContent?.includes('En progreso · Paso 2 de 2') === true)).toBeInTheDocument();
  });

  it('muestra un empty state útil cuando no existe actividad real', async () => {
    renderHub({ progress: new Map(), completions: [] });

    expect(await screen.findByRole('heading', { name: 'Todavía no hay suficiente actividad para generar un repaso personalizado.' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Precisión general todavía no disponible' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Conceptos más débiles' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ir a entrenar/ })).toHaveAttribute('href', '/tech');
    expect(screen.queryByRole('region', { name: 'Conceptos a reforzar' })).not.toBeInTheDocument();
  });

  it('no presenta un porcentaje general como diagnóstico con evidencia insuficiente', async () => {
    renderHub({
      progress: new Map([[CONCEPT.id, { ...PROGRESS, totalAttempts: 4, correctAttempts: 2 }]]),
      completions: [],
    });

    expect(await screen.findByRole('img', { name: 'Precisión general todavía no disponible' })).toBeInTheDocument();
    expect(screen.getByText('Practica algunas sesiones para generar un diagnóstico.')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: 'Precisión general' })).not.toBeInTheDocument();
  });

  it('mantiene el diagnóstico cuando falla una fuente secundaria', async () => {
    renderHub({ historyError: 'historial temporalmente inaccesible' });

    expect(await screen.findByRole('progressbar', { name: 'Precisión general' })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByRole('alert')).toHaveTextContent('historial temporalmente inaccesible');
    expect(screen.getByRole('region', { name: 'Conceptos a reforzar' })).toBeInTheDocument();
  });

  it('usa skeletons con la composición final mientras carga contenido', () => {
    const { container } = renderHub({ contentLoading: true });

    expect(screen.getByRole('heading', { level: 1, name: 'Repasar' })).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(12);
  });

  it('diferencia un fallo de progreso del estado vacío', async () => {
    renderHub({ progress: new Map(), completions: [], progressError: 'progreso inaccesible' });

    expect(await screen.findByRole('heading', { name: 'No pudimos preparar el repaso' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('progreso inaccesible');
    expect(screen.queryByText('Todavía no hay suficiente actividad para generar un repaso personalizado.')).not.toBeInTheDocument();
  });
});
