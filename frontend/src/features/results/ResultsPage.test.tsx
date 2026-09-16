import { type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
import { HistoryContext } from '@/contexts/history-context';
import type { Concept, ContentContextValue, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { HistoryContextValue } from '@/types/history';
import type { Attempt, CompletedSession } from '@/types/progress';
import ResultsPage from './ResultsPage';

const COMPLETED_SESSION: CompletedSession = {
  id: 'completion-1', sessionId: 'session-1', technologyId: 'javascript', conceptId: 'js-array-iteration', totalSteps: 10, correctSteps: 8, accuracy: 80, timeSpentMs: 272_000, completedAt: '2026-09-03T10:00:00.000Z',
};
const SESSION: ExerciseSession = {
  id: 'session-1', title: 'map frente a forEach', conceptId: 'js-array-iteration', technologyId: 'javascript', difficulty: 'beginner', version: '1', status: 'published', createdAt: '2026-09-01T10:00:00.000Z', updatedAt: null,
  steps: [
    { id: 'step-1', type: 'code-reading', prompt: '¿Qué devuelve este código?', code: null, language: null, options: null, requirements: [], hintCount: 0, stepOrder: 1 },
    { id: 'step-2', type: 'predict-output', prompt: '¿Cuál es el resultado?', code: null, language: null, options: null, requirements: [], hintCount: 0, stepOrder: 2 },
  ],
};
const CONCEPT: Concept = { id: 'js-array-iteration', technologyId: 'javascript', topicId: 'arrays', name: 'Iteración de arrays', contentMarkdown: '' };
const TOPIC: Topic = { id: 'arrays', technologyId: 'javascript', name: 'Arrays', description: '' };
const ATTEMPTS: Attempt[] = [
  { id: 'attempt-1', sessionId: 'session-1', stepId: 'step-1', stepType: 'code-reading', answer: 'a', isCorrect: true, timeSpentMs: 1_000, hintsUsed: 0, createdAt: '2026-09-03T10:00:00.000Z' },
  { id: 'attempt-2', sessionId: 'session-1', stepId: 'step-2', stepType: 'predict-output', answer: 'b', isCorrect: false, timeSpentMs: 1_000, hintsUsed: 0, createdAt: '2026-09-03T10:00:00.000Z' },
];

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

function renderResultsPage({
  sessionId = 'session-1',
  getCompletedSession = vi.fn().mockResolvedValue(COMPLETED_SESSION),
  getSession = vi.fn().mockResolvedValue(SESSION),
  getAttemptsBySession = vi.fn().mockResolvedValue(ATTEMPTS),
  getConcept = vi.fn().mockResolvedValue(CONCEPT),
  getTopics = vi.fn().mockResolvedValue([TOPIC]),
}: {
  sessionId?: string;
  getCompletedSession?: HistoryContextValue['getCompletedSession'];
  getSession?: ContentContextValue['getSession'];
  getAttemptsBySession?: HistoryContextValue['getAttemptsBySession'];
  getConcept?: ContentContextValue['getConcept'];
  getTopics?: ContentContextValue['getTopics'];
} = {}) {
  const history: HistoryContextValue = { recentCompletedSessions: [], completedSessionsLoading: false, completedSessionsError: null, getCompletedSession, getAttemptsBySession, attemptsLoading: false, attemptsError: null };
  const content: ContentContextValue = {
    technologies: [], getTechnology: vi.fn().mockReturnValue({ id: 'javascript', name: 'JavaScript', icon: 'javascript', description: '' }), getTopics, getConceptsByTopic: vi.fn(), getConcept, getSessionsByConcept: vi.fn(), getSession, isLoading: false,
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <HistoryContext.Provider value={history}>
      <ContentContext.Provider value={content}>
        <MemoryRouter initialEntries={[`/results/${sessionId}`]}>
          <main><Routes><Route path="/results/:sessionId" element={children} /><Route path="/review/:sessionId" element={<p>Revisión</p>} /><Route path="/practice/:sessionId" element={<p>Práctica</p>} /><Route path="/tech/:technologyId/:topicId" element={<p>Tema</p>} /><Route path="/dashboard" element={<p>Progreso</p>} /></Routes></main>
        </MemoryRouter>
      </ContentContext.Provider>
    </HistoryContext.Provider>
  );
  return { ...render(<ResultsPage />, { wrapper }), getCompletedSession, getSession, getAttemptsBySession };
}

describe('ResultsPage', () => {
  it('muestra carga sin anticipar un resultado inexistente', () => {
    const result = deferred<CompletedSession | null>();
    renderResultsPage({ getCompletedSession: vi.fn(() => result.promise) });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cargando resultado…');
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Resultado no disponible')).not.toBeInTheDocument();
  });

  it('presenta el resultado con datos persistidos, navegación real y revisión por paso', async () => {
    const rendered = renderResultsPage();
    expect(await screen.findByRole('heading', { level: 1, name: '¡Muy buen trabajo!' })).toBeInTheDocument();
    expect(screen.getByText('map frente a forEach')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '8 de 10 respuestas correctas, 80% de precisión' })).toBeInTheDocument();
    expect(screen.getByText('4 min 32 s')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getAllByText('Arrays')).toHaveLength(2);
    expect(screen.getByText('Correcta')).toBeInTheDocument();
    expect(screen.getByText('Incorrecta')).toBeInTheDocument();
    expect(rendered.getCompletedSession).toHaveBeenCalledWith('session-1');
    expect(rendered.getSession).toHaveBeenCalledWith('session-1');
    expect(rendered.getAttemptsBySession).toHaveBeenCalledWith('session-1');
    expect(screen.getByRole('link', { name: 'Seguir practicando' })).toHaveAttribute('href', '/practice/session-1');
    expect(screen.getByRole('link', { name: 'Repasar tema' })).toHaveAttribute('href', '/tech/javascript/arrays');
    expect(screen.getByRole('link', { name: 'Revisar respuestas' })).toHaveAttribute('href', '/review/session-1');
    expect(screen.getByRole('link', { name: 'Revisar respuesta 1: ¿Qué devuelve este código?' })).toHaveAttribute('href', '/review/session-1');
    expect(screen.getByRole('link', { name: 'Entrenar' })).toHaveAttribute('href', '/tech');
    expect(rendered.container.querySelector('[data-confetti-event="results:completion-1"]')).toBeInTheDocument();
    expect(screen.queryByText(/XP|racha|nivel|insignia/i)).not.toBeInTheDocument();
  });

  it('distingue un resultado inexistente y no carga metadata ni attempts', async () => {
    const getSession = vi.fn();
    const getAttemptsBySession = vi.fn();
    const rendered = renderResultsPage({ getCompletedSession: vi.fn().mockResolvedValue(null), getSession, getAttemptsBySession });
    expect(await screen.findByRole('heading', { level: 1, name: 'Resultado no disponible' })).toBeInTheDocument();
    expect(rendered.getCompletedSession).toHaveBeenCalledWith('session-1');
    expect(getSession).not.toHaveBeenCalled();
    expect(getAttemptsBySession).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Ir al progreso' })).toHaveAttribute('href', '/dashboard');
  });

  it('distingue un error de lectura de la ausencia de resultado', async () => {
    renderResultsPage({ getCompletedSession: vi.fn().mockRejectedValue(new Error('storage inaccesible')) });
    expect(await screen.findByRole('heading', { level: 1, name: 'No pudimos cargar el resultado' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('storage inaccesible');
  });

  it('conserva el resumen si falla la metadata secundaria', async () => {
    renderResultsPage({ getSession: vi.fn().mockRejectedValue(new Error('contenido no disponible')) });
    expect(await screen.findByRole('heading', { level: 1, name: '¡Muy buen trabajo!' })).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent('No se pudo cargar el detalle de la sesión, pero las métricas se han conservado.');
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('mantiene un único main, un h1 y un breadcrumb semántico', async () => {
    renderResultsPage();
    await screen.findByRole('heading', { level: 1, name: '¡Muy buen trabajo!' });
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByText('Tu resultado')).toBeInTheDocument();
    expect(screen.getByText('Revisión de respuestas')).toBeInTheDocument();
  });
});
