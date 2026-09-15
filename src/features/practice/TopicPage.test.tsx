import { type ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
import { HistoryContext } from '@/contexts/history-context';
import { ProgressContext } from '@/contexts/progress-context';
import { SessionRecoveryContext } from '@/contexts/session-recovery-context';
import type { Concept, ContentContextValue, Technology, Topic } from '@/types/content';
import type { ExerciseSession, ExerciseStep } from '@/types/exercise';
import type { HistoryContextValue } from '@/types/history';
import type { CompletedSession, ConceptProgress, ProgressContextValue } from '@/types/progress';
import type { ISessionRecoveryStore, SessionRecoverySnapshot } from '@/lib/recovery/ISessionRecoveryStore';
import TopicPage from './TopicPage';

const JAVASCRIPT: Technology = {
  id: 'javascript',
  name: 'JavaScript',
  icon: 'js',
  description: 'El lenguaje de la web.',
};

const ARRAYS: Topic = {
  id: 'arrays',
  name: 'Arrays',
  technologyId: 'javascript',
  description: 'Métodos de iteración y colecciones.',
};

const FUNCTIONS: Topic = {
  id: 'functions',
  name: 'Functions',
  technologyId: 'javascript',
  description: 'Parámetros, ámbito y retorno.',
};

const CONCEPTS: Concept[] = [
  {
    id: 'array-iteration',
    name: 'Métodos de iteración de arrays',
    topicId: ARRAYS.id,
    technologyId: 'javascript',
    contentMarkdown: '# Iteración',
  },
  {
    id: 'array-mutation',
    name: 'Mutación de arrays',
    topicId: ARRAYS.id,
    technologyId: 'javascript',
    contentMarkdown: '# Mutación',
  },
];

const STEP: ExerciseStep = {
  id: 'step-1',
  type: 'predict-output',
  prompt: '¿Qué devuelve?',
  code: '[1, 2].map((value) => value * 2)',
  language: 'javascript',
  options: [
    { id: 'a', text: '[2, 4]' },
    { id: 'b', text: '[1, 2]' },
  ],
  requirements: [],
  hintCount: 0,
  stepOrder: 1,
};

const SECOND_STEP: ExerciseStep = {
  ...STEP,
  id: 'step-2',
  prompt: '¿Qué método filtra?',
  stepOrder: 2,
};

const ARRAY_SESSION: ExerciseSession = {
  id: 'arrays-01', title: 'Practica iteración', conceptId: 'array-iteration',
  technologyId: 'javascript', difficulty: 'beginner', version: '1.0.0',
  status: 'published', createdAt: '2026-09-01', updatedAt: null, steps: [STEP, SECOND_STEP],
};

const COMPLETED_SESSION: CompletedSession = {
  id: 'completed-arrays-01', sessionId: ARRAY_SESSION.id, technologyId: 'javascript',
  conceptId: 'array-iteration', totalSteps: 4, correctSteps: 3, accuracy: 75,
  timeSpentMs: 60_000, completedAt: '2026-09-06T10:00:00.000Z',
};

const RECOVERY: ISessionRecoveryStore = {
  load: () => null,
  save: () => {},
  clear: () => {},
};

function renderTopicPage({
  technologyId = 'javascript',
  topicId = 'arrays',
  technologies = [JAVASCRIPT],
  isLoading = false,
  getTopics = vi.fn().mockResolvedValue([ARRAYS, FUNCTIONS]),
  getConceptsByTopic = vi.fn().mockResolvedValue(CONCEPTS),
  getSessionsByConcept = vi.fn().mockResolvedValue([]),
  progress = new Map<string, ConceptProgress>(),
  getCompletedSession = vi.fn().mockResolvedValue(null),
  recoveryStore = RECOVERY,
}: {
  technologyId?: string;
  topicId?: string;
  technologies?: Technology[];
  isLoading?: boolean;
  getTopics?: ContentContextValue['getTopics'];
  getConceptsByTopic?: ContentContextValue['getConceptsByTopic'];
  getSessionsByConcept?: ContentContextValue['getSessionsByConcept'];
  progress?: Map<string, ConceptProgress>;
  getCompletedSession?: HistoryContextValue['getCompletedSession'];
  recoveryStore?: ISessionRecoveryStore;
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
    <ProgressContext.Provider value={progressValue}>
      <HistoryContext.Provider value={historyValue}>
        <SessionRecoveryContext.Provider value={recoveryStore}>
          <ContentContext.Provider value={content}>
            <MemoryRouter initialEntries={[`/tech/${technologyId}/${topicId}`]}>
              <main>
                <Routes>
                  <Route path="/tech/:technologyId/:topicId" element={children} />
                </Routes>
              </main>
            </MemoryRouter>
          </ContentContext.Provider>
        </SessionRecoveryContext.Provider>
      </HistoryContext.Provider>
    </ProgressContext.Provider>
  );

  return { ...render(<TopicPage />, { wrapper }), content };
}

describe('TopicPage (T057)', () => {
  it('anuncia la carga inicial sin mostrar recursos inexistentes', () => {
    const getTopics = vi.fn();
    const getConceptsByTopic = vi.fn();
    renderTopicPage({
      isLoading: true,
      technologies: [],
      getTopics,
      getConceptsByTopic,
    });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Cargando tema…',
    );
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Tecnología no disponible')).not.toBeInTheDocument();
    expect(screen.queryByText('Tema no disponible')).not.toBeInTheDocument();
    expect(getTopics).not.toHaveBeenCalled();
    expect(getConceptsByTopic).not.toHaveBeenCalled();
  });

  it('muestra el topic y los conceptos reales en el orden entregado', async () => {
    renderTopicPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Arrays' })).toBeInTheDocument();
    await screen.findByRole('heading', { level: 3, name: 'Métodos de iteración de arrays' });
    expect(screen.getByText('Métodos de iteración y colecciones.')).toBeInTheDocument();
    expect(screen.getByText('# Iteración')).toBeInTheDocument();
    const concepts = screen.getByRole('region', { name: 'Teoría y conceptos' });
    expect(within(concepts).getByRole('heading', { level: 2, name: 'Teoría y conceptos' })).toBeInTheDocument();
    expect(within(concepts).getAllByRole('heading', { level: 3 }).map((item) => item.textContent)).toEqual([
      'Métodos de iteración de arrays', 'Mutación de arrays',
    ]);
  });

  it('renderiza el LearningContent estructurado real sin convertirlo en texto genérico', async () => {
    const structuredConcept: Concept = {
      ...CONCEPTS[0],
      content: {
        sections: [
          { type: 'intro', title: 'Qué vas a aprender', body: 'Transformar colecciones sin mutarlas.' },
          { type: 'objectives', title: 'Objetivos', items: ['Elegir map o filter'] },
          { type: 'code', title: 'Ejemplo', code: 'const dobles = valores.map(x => x * 2);', language: 'javascript' },
          {
            type: 'comparison',
            title: 'Compara',
            left: { title: 'map', body: 'Transforma cada elemento.' },
            right: { title: 'filter', body: 'Selecciona elementos.' },
          },
          { type: 'quick-check', question: '¿map muta el array?', answer: 'No, devuelve uno nuevo.' },
        ],
      },
    };
    renderTopicPage({ getConceptsByTopic: vi.fn().mockResolvedValue([structuredConcept]) });

    expect(await screen.findByRole('heading', { level: 4, name: 'Qué vas a aprender' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Objetivos' })).toBeInTheDocument();
    expect(screen.getByText('Elegir map o filter')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Ejemplo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Compara' })).toBeInTheDocument();
    expect(screen.getByText('¿map muta el array?')).toBeInTheDocument();
    expect(screen.getByText('Ver respuesta')).toBeInTheDocument();
  });

  it('muestra una tecnología no disponible sin consultar topics ni conceptos', () => {
    const getTopics = vi.fn();
    const getConceptsByTopic = vi.fn();
    renderTopicPage({
      technologyId: 'no-existe',
      getTopics,
      getConceptsByTopic,
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Tecnología no disponible' }),
    ).toBeInTheDocument();
    expect(getTopics).not.toHaveBeenCalled();
    expect(getConceptsByTopic).not.toHaveBeenCalled();
  });

  it('distingue un topic inexistente y permite volver a su tecnología', async () => {
    const getConceptsByTopic = vi.fn();
    renderTopicPage({ topicId: 'no-existe', getConceptsByTopic });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tema no disponible' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a JavaScript' })).toHaveAttribute(
      'href',
      '/tech/javascript',
    );
    expect(getConceptsByTopic).not.toHaveBeenCalled();
  });

  it('muestra un empty state de conceptos sin tratarlo como recurso inexistente', async () => {
    renderTopicPage({ getConceptsByTopic: vi.fn().mockResolvedValue([]) });

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: 'Todavía no hay conceptos disponibles',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Arrays' })).toBeInTheDocument();
    expect(screen.queryByText('Tema no disponible')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('representa un error de conceptos sin convertirlo en una lista vacía', async () => {
    renderTopicPage({
      getConceptsByTopic: vi.fn().mockRejectedValue(new Error('índice inaccesible')),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar los conceptos de este tema. índice inaccesible',
    );
    expect(
      screen.queryByRole('heading', {
        level: 3,
        name: 'Todavía no hay conceptos disponibles',
      }),
    ).not.toBeInTheDocument();
  });

  it('deriva las sesiones de cada concepto y enlaza a la práctica real', async () => {
    const getSessionsByConcept = vi.fn().mockImplementation((conceptId: string) =>
      Promise.resolve(conceptId === 'array-iteration' ? [ARRAY_SESSION] : []),
    );
    const rendered = renderTopicPage({ getSessionsByConcept });

    const sessionTitle = await screen.findByRole('heading', { level: 4, name: 'Practica iteración' });
    expect(sessionTitle).toHaveClass('break-normal', 'whitespace-normal');
    expect(sessionTitle).not.toHaveClass('break-words');
    expect(screen.getByRole('heading', { level: 3, name: 'Principiante · 1 sesión' })).toBeInTheDocument();
    expect(screen.getByText('2 ejercicios')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Empezar práctica' })).toHaveAttribute(
      'href', '/practice/arrays-01',
    );
    expect(rendered.content.getSessionsByConcept).toHaveBeenCalledWith('array-iteration');
    expect(rendered.content.getSession).not.toHaveBeenCalled();
    expect(rendered.content.getConcept).not.toHaveBeenCalled();
  });

  it('deriva completada, en progreso, disponible y bloqueada desde historial, recovery y publicación canónicos', async () => {
    const draftSession: ExerciseSession = { ...ARRAY_SESSION, id: 'arrays-draft', title: 'Sesión pendiente de publicar', difficulty: 'advanced', status: 'draft' };
    const availableSession: ExerciseSession = { ...ARRAY_SESSION, id: 'arrays-available', title: 'Practica disponible' };
    const freshSession: ExerciseSession = { ...ARRAY_SESSION, id: 'arrays-fresh', title: 'Nueva práctica disponible', difficulty: 'intermediate', steps: [STEP] };
    const completedAvailable: CompletedSession = { ...COMPLETED_SESSION, sessionId: availableSession.id };
    const recovery: ISessionRecoveryStore = {
      ...RECOVERY,
      load: () => ({ sessionId: ARRAY_SESSION.id, currentStep: 1, answers: [], elapsedMs: 1_000, revealedHints: [], startTime: 1 } satisfies SessionRecoverySnapshot),
    };
    const getCompletedSession = vi.fn().mockImplementation(async (sessionId: string) =>
      sessionId === availableSession.id ? completedAvailable : null,
    );

    renderTopicPage({
      getSessionsByConcept: vi.fn().mockImplementation((conceptId: string) => Promise.resolve(conceptId === 'array-iteration' ? [ARRAY_SESSION, availableSession, freshSession, draftSession] : [])),
      getCompletedSession,
      recoveryStore: recovery,
    });

    expect(await screen.findByText('En progreso')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Principiante · 2 sesiones' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Intermedio · 1 sesión' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Avanzado · 1 sesión' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continuar práctica' })).toHaveAttribute('href', '/practice/arrays-01');
    expect(await screen.findByText('Completado')).toBeInTheDocument();
    expect(screen.getByText('75% de aciertos')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Sesiones completadas' })).toHaveAttribute(
      'aria-valuetext',
      '1 de 4 sesiones completadas',
    );
    expect(screen.getByRole('link', { name: 'Repetir práctica' })).toHaveAttribute('href', '/practice/arrays-available');
    expect(screen.getByRole('link', { name: 'Ver resultado' })).toHaveAttribute('href', '/results/arrays-available');
    expect(screen.getByText('Disponible')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Empezar práctica' })).toHaveAttribute('href', '/practice/arrays-fresh');
    expect(screen.getByText('Bloqueado')).toBeInTheDocument();
    expect(screen.getByText('Esta sesión aún no está publicada.')).toBeInTheDocument();
  });

  it('no inventa un estado cuando el historial o recovery no se pueden consultar', async () => {
    const recovery: ISessionRecoveryStore = { ...RECOVERY, load: () => { throw new Error('storage temporal no disponible'); } };
    renderTopicPage({
      getSessionsByConcept: vi.fn().mockImplementation((conceptId: string) => Promise.resolve(conceptId === 'array-iteration' ? [ARRAY_SESSION] : [])),
      getCompletedSession: vi.fn().mockRejectedValue(new Error('historial no disponible')),
      recoveryStore: recovery,
    });

    expect(await screen.findByText('Estado no disponible')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo comprobar el estado: historial no disponible');
    expect(screen.queryByText('Disponible')).not.toBeInTheDocument();
  });

  it('muestra el breadcrumb real y progreso únicamente cuando existe actividad', async () => {
    renderTopicPage({
      progress: new Map([
        ['array-iteration', {
          conceptId: 'array-iteration', domain: 0.5, totalAttempts: 3, correctAttempts: 2,
          difficultyDistribution: { beginner: { total: 3, correct: 2 }, intermediate: { total: 0, correct: 0 }, advanced: { total: 0, correct: 0 } },
          recentErrors: [], lastPracticed: '2026-09-04', schemaVersion: 1,
        }],
      ]),
    });

    await screen.findByRole('heading', { level: 1, name: 'Arrays' });
    await screen.findByText('# Iteración');
    expect(screen.getByRole('link', { name: 'Entrenar' })).toHaveAttribute('href', '/tech');
    expect(screen.getByRole('link', { name: 'JavaScript' })).toHaveAttribute('href', '/tech/javascript');
    expect(screen.getByLabelText('Progreso del tema')).toHaveTextContent('1 de 2 conceptos practicados');
    expect(screen.getByRole('progressbar', { name: 'Progreso en Arrays' })).toHaveAttribute(
      'aria-valuetext',
      '1 de 2 conceptos practicados',
    );
  });

  it('mantiene un único main, headings consecutivos y lista semántica', async () => {
    renderTopicPage();

    await screen.findByRole('heading', { level: 3, name: 'Métodos de iteración de arrays' });
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const concepts = screen.getByRole('region', { name: 'Teoría y conceptos' });
    expect(within(concepts).getByRole('list')).toBeInTheDocument();
    expect(within(concepts).getAllByRole('listitem')).toHaveLength(2);
  });
});
