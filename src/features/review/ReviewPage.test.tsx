import { type ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
import { HistoryContext } from '@/contexts/history-context';
import type { ContentContextValue } from '@/types/content';
import type { ExerciseSession, ExerciseStep } from '@/types/exercise';
import type { HistoryContextValue } from '@/types/history';
import type { Attempt } from '@/types/progress';
import ReviewPage from './ReviewPage';

const step = (id: string, prompt: string, type: ExerciseStep['type'] = 'code-reading'): ExerciseStep => ({
  id,
  type,
  prompt,
  code: null,
  language: 'javascript',
  options: [
    { id: `${id}-a`, text: `${prompt} respuesta`, correct: true },
    { id: `${id}-b`, text: 'Otra respuesta', correct: false },
  ],
  errorLines: null,
  errorType: null,
  testCases: null,
  expectedPatterns: null,
  explanation: `${prompt} explicación.`,
  hints: [],
  stepOrder: 1,
});

const FIRST = step('step-first', 'Primer prompt');
const SECOND = step('step-second', 'Segundo prompt', 'predict-output');
const SESSION: ExerciseSession = {
  id: 'session-1',
  title: 'map frente a forEach',
  conceptId: 'js-array-iteration',
  technologyId: 'javascript',
  difficulty: 'beginner',
  version: '1',
  status: 'published',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: null,
  steps: [FIRST, SECOND],
};

const attempt = (stepId: string, answer: unknown, isCorrect: boolean): Attempt => ({
  id: `attempt-${stepId}`,
  sessionId: SESSION.id,
  stepId,
  stepType: 'code-reading',
  answer,
  isCorrect,
  timeSpentMs: 1_000,
  hintsUsed: 0,
  createdAt: '2026-09-03T10:00:00.000Z',
});

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function renderReviewPage({
  sessionId = SESSION.id,
  getSession = vi.fn().mockResolvedValue(SESSION),
  getAttemptsBySession = vi.fn().mockResolvedValue([
    attempt(SECOND.id, `${SECOND.id}-a`, false),
    attempt(FIRST.id, `${FIRST.id}-a`, true),
  ]),
}: {
  sessionId?: string;
  getSession?: ContentContextValue['getSession'];
  getAttemptsBySession?: HistoryContextValue['getAttemptsBySession'];
} = {}) {
  const content: ContentContextValue = {
    technologies: [],
    getTechnology: vi.fn(),
    getTopics: vi.fn(),
    getConceptsByTopic: vi.fn(),
    getConcept: vi.fn(),
    getSessionsByConcept: vi.fn(),
    getSession,
    isLoading: false,
  };
  const history: HistoryContextValue = {
    recentCompletedSessions: [],
    completedSessionsLoading: false,
    completedSessionsError: null,
    getCompletedSession: vi.fn(),
    getAttemptsBySession,
    attemptsLoading: false,
    attemptsError: null,
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ContentContext.Provider value={content}>
      <HistoryContext.Provider value={history}>
        <MemoryRouter initialEntries={[`/review/${sessionId}`]}>
          <main>
            <Routes>
              <Route path="/review/:sessionId" element={children} />
              <Route path="/results/:sessionId" element={<p>Resultado</p>} />
              <Route path="/dashboard" element={<p>Progreso</p>} />
            </Routes>
          </main>
        </MemoryRouter>
      </HistoryContext.Provider>
    </ContentContext.Provider>
  );

  return { ...render(<ReviewPage />, { wrapper }), getSession, getAttemptsBySession };
}

describe('ReviewPage (T060)', () => {
  it('carga mediante la ruta canónica sin mostrar una sesión inexistente antes de resolver', () => {
    const pending = deferred<ExerciseSession | null>();
    renderReviewPage({ getSession: vi.fn(() => pending.promise) });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cargando revisión…');
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Sesión no disponible')).not.toBeInTheDocument();
  });

  it('respeta el orden de la sesión y asocia attempts por stepId, no por índice', async () => {
    const rendered = renderReviewPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Revisión de la sesión' })).toBeInTheDocument();
    expect(screen.getByText('map frente a forEach')).toBeInTheDocument();
    expect(screen.getByText('Concepto: js-array-iteration')).toBeInTheDocument();
    const articles = screen.getAllByRole('article');
    expect(articles.map((article) => within(article).getByRole('heading', { level: 3 }).textContent)).toEqual([
      'Primer prompt',
      'Segundo prompt',
    ]);
    expect(within(articles[0]).getByText('Correcto')).toBeInTheDocument();
    expect(within(articles[1]).getByText('Incorrecto')).toBeInTheDocument();
    expect(rendered.getSession).toHaveBeenCalledWith(SESSION.id);
    expect(rendered.getAttemptsBySession).toHaveBeenCalledWith(SESSION.id);
    expect(screen.getByRole('link', { name: 'Volver al resultado' })).toHaveAttribute(
      'href',
      '/results/session-1',
    );
  });

  it('distingue una sesión inexistente sin cargar attempts', async () => {
    const getAttemptsBySession = vi.fn();
    renderReviewPage({ getSession: vi.fn().mockResolvedValue(null), getAttemptsBySession });

    expect(await screen.findByRole('heading', { level: 1, name: 'Sesión no disponible' })).toBeInTheDocument();
    expect(getAttemptsBySession).not.toHaveBeenCalled();
  });

  it('distingue el error de sesión de su ausencia', async () => {
    renderReviewPage({ getSession: vi.fn().mockRejectedValue(new Error('contenido inaccesible')) });

    expect(await screen.findByRole('heading', { level: 1, name: 'No pudimos cargar la sesión' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('contenido inaccesible');
  });

  it('muestra un estado vacío de attempts sin inventar respuestas', async () => {
    renderReviewPage({ getAttemptsBySession: vi.fn().mockResolvedValue([]) });

    expect(await screen.findByText('No hay respuestas registradas para revisar.')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('conserva metadata y muestra un error local si falla la lectura de attempts', async () => {
    renderReviewPage({
      getAttemptsBySession: vi.fn().mockRejectedValue(new Error('historial inaccesible')),
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Revisión de la sesión' })).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar las respuestas registradas. historial inaccesible',
    );
    expect(screen.getByText('map frente a forEach')).toBeInTheDocument();
  });

  it('degrada steps sin attempt e ignora attempts huérfanos sin alterar el orden', async () => {
    renderReviewPage({
      getAttemptsBySession: vi.fn().mockResolvedValue([
        attempt('orphan-step', 'respuesta huérfana', false),
        attempt(FIRST.id, `${FIRST.id}-a`, true),
      ]),
    });

    const articles = await screen.findAllByRole('article');
    expect(within(articles[0]).getByText('Primer prompt')).toBeInTheDocument();
    expect(within(articles[1]).getByText('Segundo prompt')).toBeInTheDocument();
    expect(within(articles[1]).getByText('Sin respuesta registrada')).toBeInTheDocument();
    expect(screen.queryByText('respuesta huérfana')).not.toBeInTheDocument();
  });

  it('mantiene un único main, un h1 y una lista semántica de ejercicios', async () => {
    renderReviewPage();

    await screen.findByRole('heading', { level: 1, name: 'Revisión de la sesión' });
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
