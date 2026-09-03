import { type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
import { HistoryContext } from '@/contexts/history-context';
import type { ContentContextValue } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { HistoryContextValue } from '@/types/history';
import type { CompletedSession } from '@/types/progress';
import ResultsPage from './ResultsPage';

const COMPLETED_SESSION: CompletedSession = {
  id: 'completion-1',
  sessionId: 'session-1',
  technologyId: 'javascript',
  conceptId: 'js-array-iteration',
  totalSteps: 10,
  correctSteps: 8,
  accuracy: 80,
  timeSpentMs: 272_000,
  completedAt: '2026-09-03T10:00:00.000Z',
};

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
  steps: [],
};

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

function renderResultsPage({
  sessionId = 'session-1',
  getCompletedSession = vi.fn().mockResolvedValue(COMPLETED_SESSION),
  getSession = vi.fn().mockResolvedValue(SESSION),
}: {
  sessionId?: string;
  getCompletedSession?: HistoryContextValue['getCompletedSession'];
  getSession?: ContentContextValue['getSession'];
} = {}) {
  const history: HistoryContextValue = {
    recentCompletedSessions: [],
    completedSessionsLoading: false,
    completedSessionsError: null,
    getCompletedSession,
    getAttemptsBySession: vi.fn(),
    attemptsLoading: false,
    attemptsError: null,
  };
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
  const wrapper = ({ children }: { children: ReactNode }) => (
    <HistoryContext.Provider value={history}>
      <ContentContext.Provider value={content}>
        <MemoryRouter initialEntries={[`/results/${sessionId}`]}>
          <main>
            <Routes>
              <Route path="/results/:sessionId" element={children} />
              <Route path="/dashboard" element={<p>Progreso</p>} />
            </Routes>
          </main>
        </MemoryRouter>
      </ContentContext.Provider>
    </HistoryContext.Provider>
  );

  return { ...render(<ResultsPage />, { wrapper }), getCompletedSession, getSession };
}

describe('ResultsPage (T058)', () => {
  it('muestra carga sin anticipar un resultado inexistente', () => {
    const result = deferred<CompletedSession | null>();
    renderResultsPage({ getCompletedSession: vi.fn(() => result.promise) });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Cargando resultado…',
    );
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Resultado no disponible')).not.toBeInTheDocument();
  });

  it('muestra solo las métricas persistidas y metadata real de la sesión', async () => {
    const rendered = renderResultsPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Resultado de la sesión' }),
    ).toBeInTheDocument();
    expect(screen.getByText('map frente a forEach')).toBeInTheDocument();
    expect(screen.getByText('Has acertado 8 de 10 ejercicios.')).toBeInTheDocument();
    const definitions = screen.getAllByRole('definition');
    expect(definitions.map((definition) => definition.textContent)).toEqual([
      '8 de 10',
      '80%',
      '4 min 32 s',
    ]);
    expect(rendered.getCompletedSession).toHaveBeenCalledWith('session-1');
    expect(rendered.getSession).toHaveBeenCalledWith('session-1');
    expect(screen.getByRole('link', { name: 'Ver mi progreso' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(screen.queryByText(/dominio|score|puntuación/i)).not.toBeInTheDocument();
  });

  it('distingue un resultado inexistente y no carga metadata ni attempts', async () => {
    const getSession = vi.fn();
    const rendered = renderResultsPage({
      getCompletedSession: vi.fn().mockResolvedValue(null),
      getSession,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Resultado no disponible' }),
    ).toBeInTheDocument();
    expect(rendered.getCompletedSession).toHaveBeenCalledWith('session-1');
    expect(getSession).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Ir al progreso' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });

  it('distingue un error de lectura de la ausencia de resultado', async () => {
    renderResultsPage({
      getCompletedSession: vi.fn().mockRejectedValue(new Error('storage inaccesible')),
    });

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'No pudimos cargar el resultado',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('storage inaccesible');
    expect(screen.queryByText('Resultado no disponible')).not.toBeInTheDocument();
  });

  it('conserva el resumen si solo falla la metadata secundaria', async () => {
    renderResultsPage({
      getSession: vi.fn().mockRejectedValue(new Error('contenido no disponible')),
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Resultado de la sesión' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'No se pudo cargar el nombre de la sesión, pero las métricas se han conservado.',
    );
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('mantiene un único main, un h1 y métricas semánticas etiquetadas', async () => {
    renderResultsPage();

    await screen.findByRole('heading', { level: 1, name: 'Resultado de la sesión' });
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const terms = screen.getAllByRole('term');
    expect(terms.map((term) => term.textContent)).toEqual([
      'Respuestas correctas',
      'Precisión',
      'Tiempo empleado',
    ]);
  });
});
