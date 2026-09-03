import { type ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
import { HistoryContext } from '@/contexts/history-context';
import { ProgressContext } from '@/contexts/progress-context';
import { ResetProgressContext } from '@/contexts/reset-progress-context';
import type { ContentContextValue, Concept } from '@/types/content';
import type { HistoryContextValue } from '@/types/history';
import type { ExerciseSession } from '@/types/exercise';
import type {
  CompletedSession,
  ConceptProgress,
  ProgressContextValue,
} from '@/types/progress';
import DashboardPage from './DashboardPage';

const CONCEPTS: Record<string, Concept> = {
  arrays: {
    id: 'arrays',
    name: 'Arrays',
    topicId: 'js-arrays',
    technologyId: 'javascript',
    contentMarkdown: '# Arrays',
  },
  functions: {
    id: 'functions',
    name: 'Functions',
    topicId: 'js-functions',
    technologyId: 'javascript',
    contentMarkdown: '# Functions',
  },
};

const SESSION: ExerciseSession = {
  id: 'arrays-session',
  title: 'Filter no debería mutar',
  conceptId: 'arrays',
  technologyId: 'javascript',
  difficulty: 'beginner',
  version: '1.0.0',
  status: 'published',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
  steps: [
    {
      id: 'step-1',
      type: 'find-error',
      prompt: 'Localiza la línea relevante',
      code: 'const active = users.filter((user) => {\n  return user.active = true;\n});',
      language: 'javascript',
      options: null,
      errorLines: [2],
      errorType: 'mutacion',
      testCases: null,
      expectedPatterns: null,
      explanation: 'El callback asigna en lugar de comparar.',
      hints: [],
      stepOrder: 1,
    },
  ],
};

const COMPLETED: CompletedSession = {
  id: 'completion-1',
  sessionId: SESSION.id,
  technologyId: 'javascript',
  conceptId: 'arrays',
  totalSteps: 4,
  correctSteps: 3,
  accuracy: 75,
  timeSpentMs: 62_000,
  completedAt: '2026-09-02T10:00:00.000Z',
};

const progressOf = (
  conceptId: string,
  totalAttempts: number,
  correctAttempts: number,
  lastPracticed = '2026-09-02T10:00:00.000Z',
): ConceptProgress => ({
  conceptId,
  domain: 0,
  totalAttempts,
  correctAttempts,
  difficultyDistribution: {
    beginner: { total: totalAttempts, correct: correctAttempts },
    intermediate: { total: 0, correct: 0 },
    advanced: { total: 0, correct: 0 },
  },
  recentErrors: [],
  lastPracticed,
  schemaVersion: 1,
});

interface RenderOptions {
  progress?: ConceptProgress[];
  progressLoading?: boolean;
  progressError?: string | null;
  completed?: CompletedSession[];
  historyLoading?: boolean;
  historyError?: string | null;
  sessions?: ExerciseSession[];
  contentError?: Error;
  resetProgress?: () => Promise<void>;
}

function renderDashboard({
  progress = [],
  progressLoading = false,
  progressError = null,
  completed = [],
  historyLoading = false,
  historyError = null,
  sessions = [SESSION],
  contentError,
  resetProgress = async () => {},
}: RenderOptions = {}) {
  const progressValue: ProgressContextValue = {
    progress: new Map(progress.map((item) => [item.conceptId, item])),
    updateProgress: vi.fn(),
    getConceptDomain: vi.fn(),
    isLoading: progressLoading,
    error: progressError,
  };
  const historyValue: HistoryContextValue = {
    recentCompletedSessions: completed,
    completedSessionsLoading: historyLoading,
    completedSessionsError: historyError,
    getCompletedSession: vi.fn(),
    getAttemptsBySession: vi.fn(),
    attemptsLoading: false,
    attemptsError: null,
  };
  const getSessionsByConcept = vi.fn(async () => {
    if (contentError) throw contentError;
    return sessions;
  });
  const contentValue: ContentContextValue = {
    technologies: [],
    getTechnology: vi.fn(),
    getTopics: vi.fn(),
    getConceptsByTopic: vi.fn(),
    getConcept: vi.fn(async (id: string) => CONCEPTS[id] ?? null),
    getSessionsByConcept,
    getSession: vi.fn(async (id: string) => (id === SESSION.id ? SESSION : null)),
    isLoading: false,
  };

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ProgressContext.Provider value={progressValue}>
        <HistoryContext.Provider value={historyValue}>
          <ContentContext.Provider value={contentValue}>
            <ResetProgressContext.Provider value={{ resetProgress }}><MemoryRouter><main>{children}</main></MemoryRouter></ResetProgressContext.Provider>
          </ContentContext.Provider>
        </HistoryContext.Provider>
      </ProgressContext.Provider>
    );
  }

  return {
    ...render(<DashboardPage />, { wrapper: Wrapper }),
    getSessionsByConcept,
  };
}

describe('DashboardPage (T055)', () => {
  it('confirma el reset exactamente una vez', async () => {
    const resetProgress = vi.fn(async () => {});
    renderDashboard({ progress: [progressOf('arrays', 3, 2)], resetProgress });
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer progreso' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restablecer progreso' }));
    await waitFor(() => expect(resetProgress).toHaveBeenCalledOnce());
  });

  it('muestra el error y permite reintentar el reset', async () => {
    const resetProgress = vi.fn().mockRejectedValueOnce(new Error('storage bloqueado')).mockResolvedValueOnce(undefined);
    renderDashboard({ progress: [progressOf('arrays', 3, 2)], resetProgress });
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer progreso' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Restablecer progreso' })[1]);
    expect(await screen.findByRole('alert')).toHaveTextContent('storage bloqueado');
    fireEvent.click(screen.getAllByRole('button', { name: 'Restablecer progreso' })[1]);
    await waitFor(() => expect(resetProgress).toHaveBeenCalledTimes(2));
  });
  it('confirma el restablecimiento y cancelar no ejecuta la operación', () => {
    const resetProgress = vi.fn(async () => {});
    renderDashboard({ progress: [progressOf('arrays', 3, 2)], resetProgress });
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer progreso' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Esta acción no se puede deshacer');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(resetProgress).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('muestra un estado loading accesible sin solicitar recomendaciones', () => {
    const { getSessionsByConcept } = renderDashboard({ progressLoading: true });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Cargando progreso',
    );
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(getSessionsByConcept).not.toHaveBeenCalled();
  });

  it('muestra empty state y lleva a la selección existente sin diagnóstico ficticio', () => {
    renderDashboard();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Todavía no hay nada que diagnosticar.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Elegir una tecnología' })).toHaveAttribute(
      'href',
      '/#technologies',
    );
    expect(screen.queryByText('MEJORA')).toBeNull();
    expect(screen.queryByText(/muestra real de la práctica/i)).toBeNull();
  });

  it('presenta evidencia inicial con agregados y conceptos en observación', async () => {
    renderDashboard({ progress: [progressOf('arrays', 4, 3)] });

    expect(screen.getByText('EVIDENCIA INICIAL')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1 }),
    ).toHaveTextContent('Tu progreso todavía está tomando forma');
    expect(
      await screen.findByRole('heading', { name: 'Conceptos en observación' }),
    ).toBeInTheDocument();
    expect(screen.getByText('4 respuestas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continuar practicando' })).toHaveAttribute(
      'href',
      '/#technologies',
    );
    expect(screen.queryByText('MEJORA')).toBeNull();
  });

  it('muestra MEJORA, recomendación real y líneas relevantes sin atribuirlas al usuario', async () => {
    renderDashboard({ progress: [progressOf('arrays', 10, 5)] });

    expect(await screen.findByText('MEJORA')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Tu progreso muestra margen de mejora',
    );
    expect(await screen.findByText('Filter no debería mutar')).toBeInTheDocument();
    expect(screen.getByText(/Líneas relevantes del ejercicio: 2/)).toBeInTheDocument();
    expect(screen.getByText(/no a tu historial/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Practicar este concepto' }),
    ).toHaveAttribute('href', '/practice/arrays-session');
    expect(screen.queryByText(/aquí cometiste|fallaste en la línea/i)).toBeNull();
  });

  it('muestra ATENCIÓN en el límite intermedio', async () => {
    renderDashboard({ progress: [progressOf('arrays', 10, 7)] });

    expect(await screen.findByText('ATENCIÓN')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Tu progreso es estable',
    );
  });

  it('muestra OK y lenguaje de consolidación cuando todos los conceptos están bien', async () => {
    renderDashboard({ progress: [progressOf('arrays', 10, 8)] });

    expect(await screen.findByText('OK')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'puedes seguir consolidando Arrays',
    );
    expect(
      await screen.findByRole('heading', { name: 'Concepto para consolidar' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Seguir entrenando' })).toBeInTheDocument();
  });

  it('degrada solo Activity cuando falla History', async () => {
    renderDashboard({
      progress: [progressOf('arrays', 10, 7)],
      historyError: 'Storage no disponible',
    });

    expect(await screen.findByText('ATENCIÓN')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo cargar la actividad reciente: Storage no disponible',
    );
    expect(screen.getByRole('heading', { name: 'Resumen de progreso' })).toBeInTheDocument();
  });

  it('no produce verdict si Progress falla y conserva Activity disponible', async () => {
    renderDashboard({ progressError: 'No se pudo leer progress', completed: [COMPLETED] });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'No pudimos leer tu progreso',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo leer progress');
    expect(await screen.findByText('Filter no debería mutar')).toBeInTheDocument();
    expect(screen.getByText('3/4 aciertos · 1 min 2 s')).toBeInTheDocument();
    expect(screen.queryByText('OK')).toBeNull();
  });

  it('mantiene verdict y resumen cuando falla el contenido recomendado', async () => {
    renderDashboard({
      progress: [progressOf('arrays', 10, 5)],
      contentError: new Error('contenido no disponible'),
    });

    expect(await screen.findByText('MEJORA')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cargar la práctica recomendada: contenido no disponible',
    );
    expect(screen.getByRole('heading', { name: 'Resumen de progreso' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Elegir otra práctica' })).toHaveAttribute(
      'href',
      '/#technologies',
    );
  });

  it('muestra actividad real y el ProgressOverview autorizado', async () => {
    renderDashboard({
      progress: [progressOf('arrays', 10, 7), progressOf('functions', 4, 4)],
      completed: [COMPLETED],
    });

    const activity = screen.getByRole('region', { name: 'Actividad reciente' });
    expect(await within(activity).findByText('Filter no debería mutar')).toBeInTheDocument();
    expect(within(activity).getByText('75 %')).toBeInTheDocument();
    expect(within(activity).getByText('3/4 aciertos · 1 min 2 s')).toBeInTheDocument();

    const overview = screen.getByRole('region', { name: 'Resumen de progreso' });
    expect(within(overview).getByText('14')).toBeInTheDocument();
    expect(within(overview).getByText('11')).toBeInTheDocument();
    expect(within(overview).getByText('79 %')).toBeInTheDocument();
    expect(within(overview).getByText('2')).toBeInTheDocument();
  });

  it('mantiene un único main, un único h1, regiones y métricas semánticas', async () => {
    renderDashboard({ progress: [progressOf('arrays', 10, 7)] });
    await screen.findByText('ATENCIÓN');

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('region', { name: /Tu progreso es estable/ })).toBeInTheDocument();
    expect(document.querySelectorAll('dl').length).toBeGreaterThanOrEqual(2);
  });

  it('no afirma deltas, regresiones, racha ni inteligencia artificial', async () => {
    const { container } = renderDashboard({ progress: [progressOf('arrays', 10, 5)] });
    await screen.findByText('MEJORA');

    expect(container).not.toHaveTextContent(/racha|regresi[oó]n|inteligencia artificial|\bia\b/i);
    expect(container).not.toHaveTextContent(/\+\d+|→/);
    expect(container).not.toHaveTextContent(/dominio/i);
  });
});
