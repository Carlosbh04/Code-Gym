import { type ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
import { HistoryContext } from '@/contexts/history-context';
import { ProgressContext } from '@/contexts/progress-context';
import { SessionRecoveryContext } from '@/contexts/session-recovery-context';
import { FakeSessionRecoveryStore } from '@/test/fake-session-recovery';
import type { Concept, ContentContextValue, Technology, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { HistoryContextValue } from '@/types/history';
import type { CompletedSession, ConceptProgress, ProgressContextValue } from '@/types/progress';
import TechnologyPage from './TechnologyPage';

const JAVASCRIPT: Technology = {
  id: 'javascript',
  name: 'JavaScript',
  icon: 'js',
  description: 'El lenguaje de la web.',
};

const HTML: Technology = {
  id: 'html',
  name: 'HTML',
  icon: 'html',
  description: 'Estructura documentos accesibles.',
};

const TOPICS: Topic[] = [
  {
    id: 'arrays',
    name: 'Arrays',
    technologyId: 'javascript',
    description: 'Trabaja con colecciones y métodos de iteración.',
  },
  {
    id: 'functions',
    name: 'Functions',
    technologyId: 'javascript',
    description: 'Practica parámetros, ámbito y retorno.',
  },
];

const STATUS_TOPICS: Topic[] = [
  TOPICS[0],
  TOPICS[1],
  {
    id: 'closures',
    name: 'Closures',
    technologyId: 'javascript',
    description: 'Practica el estado capturado por funciones internas.',
  },
];

const STATUS_CONCEPTS: Concept[] = STATUS_TOPICS.map((topic) => ({
  id: `${topic.id}-concept`,
  name: `Concepto de ${topic.name}`,
  topicId: topic.id,
  technologyId: 'javascript',
  contentMarkdown: `# ${topic.name}`,
}));

function sessionFor(concept: Concept): ExerciseSession {
  return {
    id: `${concept.id}-session`,
    title: `Práctica de ${concept.name}`,
    conceptId: concept.id,
    technologyId: 'javascript',
    difficulty: 'beginner',
    version: '1.0.0',
    status: 'published',
    createdAt: '2026-09-01',
    updatedAt: null,
    steps: [{
      id: `${concept.id}-step`,
      type: 'code-reading',
      prompt: 'Lee el código.',
      code: 'const value = 1;',
      language: 'javascript',
      options: [],
      requirements: [],
      hintCount: 0,
      stepOrder: 1,
    }],
  };
}

const STATUS_SESSIONS = STATUS_CONCEPTS.map(sessionFor);

function progressFor(conceptId: string): ConceptProgress {
  return {
    conceptId,
    domain: 0,
    totalAttempts: 2,
    correctAttempts: 1,
    difficultyDistribution: {
      beginner: { total: 2, correct: 1 },
      intermediate: { total: 0, correct: 0 },
      advanced: { total: 0, correct: 0 },
    },
    recentErrors: [],
    lastPracticed: '2026-09-06T10:00:00.000Z',
    schemaVersion: 1,
  };
}

function renderTechnologyPage({
  technologyId = 'javascript',
  technologies = [JAVASCRIPT],
  isLoading = false,
  getTopics = vi.fn().mockResolvedValue(TOPICS),
  getConceptsByTopic = vi.fn().mockResolvedValue([]),
  getSessionsByConcept = vi.fn().mockResolvedValue([]),
  progress = new Map<string, ConceptProgress>(),
  getCompletedSession = vi.fn().mockResolvedValue(null),
  initialSearch = '',
  recoveryStore = new FakeSessionRecoveryStore(),
}: {
  technologyId?: string;
  technologies?: Technology[];
  isLoading?: boolean;
  getTopics?: ContentContextValue['getTopics'];
  getConceptsByTopic?: ContentContextValue['getConceptsByTopic'];
  getSessionsByConcept?: ContentContextValue['getSessionsByConcept'];
  progress?: Map<string, ConceptProgress>;
  getCompletedSession?: HistoryContextValue['getCompletedSession'];
  initialSearch?: string;
  recoveryStore?: FakeSessionRecoveryStore;
} = {}) {
  const content: ContentContextValue = {
    technologies,
    isLoading,
    getTechnology: (id) => technologies.find((technology) => technology.id === id),
    getTopics,
    getConceptsByTopic,
    getConcept: vi.fn(),
    getSessionsByConcept,
    getSession: vi.fn(),
  };
  const progressValue: ProgressContextValue = {
    progress,
    updateProgress: vi.fn(),
    getConceptDomain: (conceptId) => progress.get(conceptId)?.domain ?? 0,
    isLoading: false,
    error: null,
  };
  const historyValue: HistoryContextValue = {
    recentCompletedSessions: [],
    completedSessionsLoading: false,
    completedSessionsError: null,
    getCompletedSession,
    getAttemptsBySession: vi.fn().mockResolvedValue([]),
    attemptsLoading: false,
    attemptsError: null,
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ContentContext.Provider value={content}>
      <ProgressContext.Provider value={progressValue}>
        <HistoryContext.Provider value={historyValue}>
          <SessionRecoveryContext.Provider value={recoveryStore}>
            <MemoryRouter initialEntries={[`/tech/${technologyId}${initialSearch}`]}>
              <main><Routes><Route path="/tech/:technologyId" element={children} /></Routes></main>
            </MemoryRouter>
          </SessionRecoveryContext.Provider>
        </HistoryContext.Provider>
      </ProgressContext.Provider>
    </ContentContext.Provider>
  );

  return { ...render(<TechnologyPage />, { wrapper }), content };
}

describe('TechnologyPage (T056)', () => {
  it('anuncia la carga inicial sin mostrar un falso recurso no disponible', () => {
    const getTopics = vi.fn();
    renderTechnologyPage({ isLoading: true, technologies: [], getTopics });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Cargando tecnología…',
    );
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Tecnología no disponible')).not.toBeInTheDocument();
    expect(getTopics).not.toHaveBeenCalled();
  });

  it('muestra la tecnología y sus topics reales con enlaces a TopicPage', async () => {
    renderTechnologyPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'JavaScript' }),
    ).toBeInTheDocument();
    expect(screen.getByText('El lenguaje de la web.')).toBeInTheDocument();
    const topics = screen.getByRole('region', { name: 'Temas de JavaScript' });
    expect(await within(topics).findByText('Arrays')).toBeInTheDocument();
    expect(within(topics).getByText('Trabaja con colecciones y métodos de iteración.')).toBeInTheDocument();
    expect(within(topics).getByRole('link', { name: /Arrays/i })).toHaveAttribute(
      'href',
      '/tech/javascript/arrays',
    );
    expect(within(topics).getByRole('link', { name: /Functions/i })).toHaveAttribute(
      'href',
      '/tech/javascript/functions',
    );
  });

  it('deriva los topics de cualquier tecnología publicada, sin asumir JavaScript', async () => {
    const getTopics = vi.fn().mockResolvedValue([
      {
        id: 'html-document',
        name: 'Estructura de documentos',
        technologyId: 'html',
        description: 'Construye una base válida.',
      },
    ] satisfies Topic[]);

    renderTechnologyPage({ technologyId: 'html', technologies: [JAVASCRIPT, HTML], getTopics });

    expect(await screen.findByRole('heading', { level: 1, name: 'HTML' })).toBeInTheDocument();
    expect(getTopics).toHaveBeenCalledWith('html');
    expect(screen.getByRole('link', { name: /Estructura de documentos/i })).toHaveAttribute(
      'href', '/tech/html/html-document',
    );
  });

  it('muestra un recurso local no disponible y no consulta topics para un id inválido', () => {
    const getTopics = vi.fn();
    renderTechnologyPage({ technologyId: 'no-existe', getTopics });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Tecnología no disponible' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No hemos encontrado la tecnología solicitada.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a tecnologías' })).toHaveAttribute(
      'href',
      '/tech',
    );
    expect(getTopics).not.toHaveBeenCalled();
  });

  it('distingue una tecnología válida sin topics de una tecnología inexistente', async () => {
    renderTechnologyPage({ getTopics: vi.fn().mockResolvedValue([]) });

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Todavía no hay temas disponibles' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'JavaScript' })).toBeInTheDocument();
    expect(screen.queryByText('Tecnología no disponible')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('representa el fallo de topics localmente sin convertirlo en un estado vacío', async () => {
    renderTechnologyPage({
      getTopics: vi.fn().mockRejectedValue(new Error('índice inaccesible')),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar esta tecnología. índice inaccesible',
    );
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Todavía no hay temas disponibles' }),
    ).not.toBeInTheDocument();
  });

  it('deriva métricas desde conceptos y sesiones, sin consultar contenido ajeno', async () => {
    const rendered = renderTechnologyPage();

    await screen.findByRole('link', { name: /Arrays/i });
    await screen.findAllByText('0 ejercicios');
    expect(rendered.content.getConceptsByTopic).toHaveBeenCalledWith('arrays');
    expect(rendered.content.getSessionsByConcept).not.toHaveBeenCalled();
    expect(rendered.content.getConcept).not.toHaveBeenCalled();
    expect(rendered.content.getSession).not.toHaveBeenCalled();
  });

  it('mantiene la semántica de página, lista y enlaces accesibles', async () => {
    renderTechnologyPage();

    await screen.findByRole('link', { name: /Arrays/i });
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const topics = screen.getByRole('region', { name: 'Temas de JavaScript' });
    expect(within(topics).getByRole('list')).toBeInTheDocument();
    expect(within(topics).getAllByRole('listitem')).toHaveLength(2);
    expect(within(topics).getAllByRole('link')).toHaveLength(2);
  });

  it('deriva resumen, siguiente práctica y estados desde progreso e historial reales', async () => {
    const completed: CompletedSession = {
      id: 'completed-arrays',
      sessionId: STATUS_SESSIONS[0].id,
      technologyId: 'javascript',
      conceptId: STATUS_CONCEPTS[0].id,
      totalSteps: 1,
      correctSteps: 1,
      accuracy: 100,
      timeSpentMs: 30_000,
      completedAt: '2026-09-06T10:00:00.000Z',
    };
    const progress = new Map([
      [STATUS_CONCEPTS[1].id, progressFor(STATUS_CONCEPTS[1].id)],
    ]);

    renderTechnologyPage({
      getTopics: vi.fn().mockResolvedValue(STATUS_TOPICS),
      getConceptsByTopic: vi.fn(async (topicId) =>
        STATUS_CONCEPTS.filter((concept) => concept.topicId === topicId),
      ),
      getSessionsByConcept: vi.fn(async (conceptId) =>
        STATUS_SESSIONS.filter((session) => session.conceptId === conceptId),
      ),
      progress,
      getCompletedSession: vi.fn(async (sessionId) =>
        sessionId === STATUS_SESSIONS[0].id ? completed : null,
      ),
    });

    const summary = await screen.findByRole('region', {
      name: 'Resumen de progreso en JavaScript',
    });
    expect(within(summary).getByText('33%')).toBeInTheDocument();
    expect(summary).toHaveTextContent('1 / 3');
    expect(within(summary).getByText(STATUS_SESSIONS[1].title)).toBeInTheDocument();
    expect(within(summary).getByRole('link', { name: /Continuar/i })).toHaveAttribute(
      'href',
      `/practice/${STATUS_SESSIONS[1].id}`,
    );

    const topics = screen.getByRole('region', { name: 'Temas de JavaScript' });
    expect(within(topics).getByText('Completado')).toBeInTheDocument();
    expect(within(topics).getByText('En progreso')).toBeInTheDocument();
    expect(within(topics).getByText('Pendiente')).toBeInTheDocument();
    expect(within(topics).getAllByText('1 ejercicio')).toHaveLength(3);

    const arraysProgress = within(topics).getByRole('progressbar', {
      name: 'Progreso de Arrays',
    });
    expect(arraysProgress).toHaveAttribute('aria-valuenow', '1');
    expect(arraysProgress).toHaveAttribute(
      'aria-valuetext',
      '1 de 1 concepto completado',
    );
  });

  it('expone las tres secciones como enlaces y activa Temas por defecto', async () => {
    renderTechnologyPage();

    await screen.findByRole('link', { name: /Arrays/i });
    const tabs = screen.getByRole('navigation', { name: 'Secciones de tecnología' });
    expect(within(tabs).getByRole('link', { name: 'Temas' })).toHaveAttribute('aria-current', 'page');
    expect(within(tabs).getByRole('link', { name: 'Ejercicios' })).toHaveAttribute('href', '/tech/javascript?tab=exercises');
    expect(within(tabs).getByRole('link', { name: 'Resultados' })).toHaveAttribute('href', '/tech/javascript?tab=results');
  });

  it('respeta el tab explícito y hace fallback a Temas con un valor inválido', async () => {
    const exercises = renderTechnologyPage({ initialSearch: '?tab=exercises' });
    const tabs = await screen.findByRole('navigation', { name: 'Secciones de tecnología' });
    expect(within(tabs).getByRole('link', { name: 'Ejercicios' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: 'Ejercicios de JavaScript' })).toBeInTheDocument();
    exercises.unmount();

    renderTechnologyPage({ initialSearch: '?tab=desconocido' });
    const fallbackTabs = await screen.findByRole('navigation', { name: 'Secciones de tecnología' });
    expect(within(fallbackTabs).getByRole('link', { name: 'Temas' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByRole('region', { name: 'Temas de JavaScript' })).toBeInTheDocument();
  });

  it('deriva estados, recuperación, CTAs y filtros de Ejercicios desde datos reales', async () => {
    const completed: CompletedSession = {
      id: 'completed-arrays',
      sessionId: STATUS_SESSIONS[0].id,
      technologyId: 'javascript',
      conceptId: STATUS_CONCEPTS[0].id,
      totalSteps: 1,
      correctSteps: 1,
      accuracy: 100,
      timeSpentMs: 30_000,
      completedAt: '2026-09-06T10:00:00.000Z',
    };
    const recoveryStore = new FakeSessionRecoveryStore();
    recoveryStore.snapshot = {
      sessionId: STATUS_SESSIONS[1].id,
      currentStep: 0,
      answers: [],
      elapsedMs: 4_000,
      revealedHints: [],
      startTime: 1,
    };
    const getCompletedSession = vi.fn(async (sessionId: string) =>
      sessionId === STATUS_SESSIONS[0].id ? completed : null,
    );

    renderTechnologyPage({
      initialSearch: '?tab=exercises',
      getTopics: vi.fn().mockResolvedValue(STATUS_TOPICS),
      getConceptsByTopic: vi.fn(async (topicId) =>
        STATUS_CONCEPTS.filter((concept) => concept.topicId === topicId),
      ),
      getSessionsByConcept: vi.fn(async (conceptId) =>
        STATUS_SESSIONS.filter((session) => session.conceptId === conceptId),
      ),
      getCompletedSession,
      recoveryStore,
    });

    const exercises = await screen.findByRole('region', { name: 'Ejercicios de JavaScript' });
    expect(within(exercises).getByText('Completado')).toBeInTheDocument();
    expect(within(exercises).getAllByText('En progreso')).toHaveLength(2);
    expect(within(exercises).getByText('Disponible')).toBeInTheDocument();
    expect(within(exercises).getByText('1/1 ejercicios')).toBeInTheDocument();
    expect(within(exercises).getByRole('link', { name: /Repetir/i })).toHaveAttribute('href', `/practice/${STATUS_SESSIONS[0].id}`);
    expect(within(exercises).getByRole('link', { name: 'Ver resultado' })).toHaveAttribute('href', `/results/${STATUS_SESSIONS[0].id}`);
    expect(within(exercises).getByRole('link', { name: /Continuar/i })).toHaveAttribute('href', `/practice/${STATUS_SESSIONS[1].id}`);
    expect(within(exercises).getByRole('link', { name: /Empezar/i })).toHaveAttribute('href', `/practice/${STATUS_SESSIONS[2].id}`);
    expect(getCompletedSession).toHaveBeenCalledTimes(3);

    fireEvent.click(within(exercises).getByRole('button', { name: 'Completados' }));
    expect(within(exercises).getByText(STATUS_SESSIONS[0].title)).toBeInTheDocument();
    expect(within(exercises).queryByText(STATUS_SESSIONS[1].title)).not.toBeInTheDocument();
    expect(within(exercises).getByRole('button', { name: 'Completados' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('pagina los ejercicios filtrados de ocho en ocho y reinicia al cambiar filtro', async () => {
    const topic = STATUS_TOPICS[0];
    const concept = STATUS_CONCEPTS[0];
    const paginatedSessions = Array.from({ length: 10 }, (_, index) => ({
      ...sessionFor(concept),
      id: `pagination-session-${index + 1}`,
      title: `Sesión paginada ${index + 1}`,
    }));

    renderTechnologyPage({
      initialSearch: '?tab=exercises&page=2',
      getTopics: vi.fn().mockResolvedValue([topic]),
      getConceptsByTopic: vi.fn().mockResolvedValue([concept]),
      getSessionsByConcept: vi.fn().mockResolvedValue(paginatedSessions),
    });

    const exercises = await screen.findByRole('region', { name: 'Ejercicios de JavaScript' });
    const pagination = within(exercises).getByRole('navigation', { name: 'Paginación de ejercicios' });
    expect(within(exercises).getAllByRole('article')).toHaveLength(2);
    expect(within(exercises).getByText('Sesión paginada 9')).toBeInTheDocument();
    expect(pagination).toHaveTextContent('Mostrando 9–10 de 10 ejercicios');
    expect(within(exercises).getByRole('button', { name: 'Ir a la página 2' })).toHaveAttribute('aria-current', 'page');
    expect(within(exercises).getByRole('button', { name: 'Página siguiente' })).toBeDisabled();

    fireEvent.click(within(exercises).getByRole('button', { name: 'Página anterior' }));
    expect(await within(exercises).findByText('Sesión paginada 1')).toBeInTheDocument();
    expect(within(exercises).getAllByRole('article')).toHaveLength(8);
    expect(within(exercises).queryByText('Sesión paginada 9')).not.toBeInTheDocument();

    fireEvent.click(within(exercises).getByRole('button', { name: 'Completados' }));
    expect(within(exercises).getByText('No hay ejercicios completados todavía')).toBeInTheDocument();
    expect(within(exercises).queryByRole('navigation', { name: 'Paginación de ejercicios' })).not.toBeInTheDocument();

    fireEvent.click(within(exercises).getByRole('button', { name: 'Todos' }));
    expect(await within(exercises).findByText('Sesión paginada 1')).toBeInTheDocument();
    expect(within(exercises).queryByText('Sesión paginada 9')).not.toBeInTheDocument();
  });

  it('muestra resultados persistidos con métricas honestas y enlaces de detalle', async () => {
    const completed: CompletedSession = {
      id: 'completed-arrays',
      sessionId: STATUS_SESSIONS[0].id,
      technologyId: 'javascript',
      conceptId: STATUS_CONCEPTS[0].id,
      totalSteps: 5,
      correctSteps: 4,
      accuracy: 80,
      timeSpentMs: 90_000,
      completedAt: '2026-09-06T10:00:00.000Z',
    };

    renderTechnologyPage({
      initialSearch: '?tab=results',
      getTopics: vi.fn().mockResolvedValue(STATUS_TOPICS),
      getConceptsByTopic: vi.fn(async (topicId) =>
        STATUS_CONCEPTS.filter((concept) => concept.topicId === topicId),
      ),
      getSessionsByConcept: vi.fn(async (conceptId) =>
        STATUS_SESSIONS.filter((session) => session.conceptId === conceptId),
      ),
      progress: new Map([[STATUS_CONCEPTS[0].id, progressFor(STATUS_CONCEPTS[0].id)]]),
      getCompletedSession: vi.fn(async (sessionId) =>
        sessionId === STATUS_SESSIONS[0].id ? completed : null,
      ),
    });

    const results = await screen.findByRole('region', { name: 'Resultados de JavaScript' });
    const summary = within(results).getByLabelText('Resumen de resultados en JavaScript');
    expect(summary).toHaveTextContent('Resultados guardados1');
    expect(summary).toHaveTextContent('Precisión media80%');
    expect(summary).toHaveTextContent('Conceptos practicados1 / 3');
    expect(summary).toHaveTextContent('Tiempo registrado1 min 30 s');
    expect(within(results).getByText('4/5')).toBeInTheDocument();
    expect(within(results).getByRole('link', { name: /Ver resultado/i })).toHaveAttribute('href', `/results/${STATUS_SESSIONS[0].id}`);
    expect(within(results).getByRole('link', { name: /Revisar/i })).toHaveAttribute('href', `/review/${STATUS_SESSIONS[0].id}`);
  });

  it('distingue historial vacío de un fallo al consultar resultados', async () => {
    const empty = renderTechnologyPage({ initialSearch: '?tab=results' });
    expect(await screen.findByRole('heading', { name: 'Todavía no tienes resultados de JavaScript' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorar ejercicios' })).toHaveAttribute('href', '/tech/javascript?tab=exercises');
    empty.unmount();

    renderTechnologyPage({
      initialSearch: '?tab=results',
      getTopics: vi.fn().mockResolvedValue([STATUS_TOPICS[0]]),
      getConceptsByTopic: vi.fn().mockResolvedValue([STATUS_CONCEPTS[0]]),
      getSessionsByConcept: vi.fn().mockResolvedValue([STATUS_SESSIONS[0]]),
      getCompletedSession: vi.fn().mockRejectedValue(new Error('historial inaccesible')),
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo consultar el resultado de 1 sesión');
    expect(screen.getByRole('heading', { name: 'No pudimos cargar resultados verificables' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Explorar ejercicios' })).not.toBeInTheDocument();
  });
});
