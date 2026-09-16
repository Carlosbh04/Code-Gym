import { type ReactNode } from 'react';
import {
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  DashboardContext,
  type DashboardContextValue,
} from '@/contexts/dashboard-context';
import { ContentContext } from '@/contexts/content-context';
import { HistoryContext } from '@/contexts/history-context';
import { ProgressContext } from '@/contexts/progress-context';
import { SessionRecoveryContext } from '@/contexts/session-recovery-context';

import type {
  DashboardSnapshot,
} from '@/features/dashboard/dashboard-api';
import type {
  SessionRecoverySnapshot,
} from '@/lib/recovery/ISessionRecoveryStore';
import type {
  ContentContextValue,
  Concept,
  Technology,
  Topic,
} from '@/types/content';
import type {
  ExerciseSession,
  ExerciseStep,
} from '@/types/exercise';
import type {
  HistoryContextValue,
} from '@/types/history';
import type {
  CompletedSession,
  ConceptProgress,
  ProgressContextValue,
} from '@/types/progress';

import HomePage from './HomePage';

const JAVASCRIPT: Technology = {
  id: 'javascript',
  name: 'JavaScript',
  icon: 'JS',
  description: 'El lenguaje de la web.',
};

const HTML: Technology = {
  id: 'html',
  name: 'HTML',
  icon: 'HTML',
  description: 'Estructura para la web.',
};

const CSS: Technology = {
  id: 'css',
  name: 'CSS',
  icon: 'CSS',
  description: 'Estilos para la web.',
};

const REACT: Technology = {
  id: 'react',
  name: 'React',
  icon: 'React',
  description: 'Interfaces con componentes.',
};

const NODE: Technology = {
  id: 'nodejs',
  name: 'Node.js',
  icon: 'Node',
  description: 'JavaScript en el servidor.',
};

const SQL: Technology = {
  id: 'sql',
  name: 'SQL',
  icon: 'SQL',
  description: 'Consultas y bases de datos.',
};

const ARRAYS: Topic = {
  id: 'js-arrays',
  name: 'Arrays',
  technologyId: 'javascript',
  description: 'Colecciones.',
};

const DOCUMENT: Topic = {
  id: 'html-document',
  name: 'Documento',
  technologyId: 'html',
  description: 'Estructura.',
};

const ITERATION: Concept = {
  id: 'js-array-iteration',
  name: 'Métodos de iteración',
  topicId: ARRAYS.id,
  technologyId: JAVASCRIPT.id,
  contentMarkdown: '',
};

const SEMANTICS: Concept = {
  id: 'html-semantics',
  name: 'Semántica',
  topicId: DOCUMENT.id,
  technologyId: HTML.id,
  contentMarkdown: '',
};

const STEP: ExerciseStep = {
  id: 'step-1',
  type: 'code-reading',
  prompt: 'Lee el código',
  code: 'const value = 1;',
  language: 'javascript',
  options: [
    {
      id: 'one',
      text: '1',
    },
  ],
  requirements: [],
  hintCount: 0,
  stepOrder: 1,
};

const JS_SESSION: ExerciseSession = {
  id: 'js-arrays-session',
  title: 'Taller: transformar precios',
  conceptId: ITERATION.id,
  technologyId: JAVASCRIPT.id,
  difficulty: 'beginner',
  version: '1.0.0',
  status: 'published',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: null,
  steps: [
    STEP,
    {
      ...STEP,
      id: 'step-2',
      stepOrder: 2,
    },
    {
      ...STEP,
      id: 'step-3',
      stepOrder: 3,
    },
    {
      ...STEP,
      id: 'step-4',
      stepOrder: 4,
    },
  ],
};

const HTML_SESSION: ExerciseSession = {
  ...JS_SESSION,
  id: 'html-document-session',
  title: 'Estructura semántica',
  conceptId: SEMANTICS.id,
  technologyId: HTML.id,
  steps: [STEP],
};

const COMPLETION: CompletedSession = {
  id: 'completion-1',
  sessionId: JS_SESSION.id,
  technologyId: JAVASCRIPT.id,
  conceptId: ITERATION.id,
  totalSteps: 4,
  correctSteps: 3,
  accuracy: 75,
  timeSpentMs: 62_000,
  completedAt: '2026-09-06T10:00:00.000Z',
};

const PROGRESS: ConceptProgress = {
  conceptId: ITERATION.id,
  domain: 0,
  totalAttempts: 4,
  correctAttempts: 3,
  difficultyDistribution: {
    beginner: {
      total: 4,
      correct: 3,
    },
    intermediate: {
      total: 0,
      correct: 0,
    },
    advanced: {
      total: 0,
      correct: 0,
    },
  },
  recentErrors: [],
  lastPracticed: '2026-09-06T10:00:00.000Z',
  schemaVersion: 1,
};

const RECOVERY: SessionRecoverySnapshot = {
  sessionId: JS_SESSION.id,
  currentStep: 1,
  answers: [
    {
      stepId: STEP.id,
      stepType: STEP.type,
      answer: 'one',
      isCorrect: true,
      timeSpentMs: 1_000,
      hintsUsed: 0,
    },
  ],
  elapsedMs: 1_000,
  revealedHints: [],
  startTime: 1,
};

const EMPTY_DASHBOARD: DashboardSnapshot = {
  progress: [],
  recentCompletedSessions: [],
  review: {
    overview: {
      totalAttempts: 0,
      correctAttempts: 0,
      accuracy: null,
      evidenceLevel: 'none',
    },
    candidates: [],
  },
  badges: {
    summary: {
      totalAttempts: 0,
      correctAttempts: 0,
      completedSessions: 0,
      accuracy: null,
    },
    badges: [],
  },
};

const ACTIVE_DASHBOARD: DashboardSnapshot = {
  progress: [
    {
      conceptId: ITERATION.id,
      technologyId: JAVASCRIPT.id,
      totalAttempts: 4,
      correctAttempts: 3,
      completedSessions: 1,
      accuracy: 0.75,
      lastPracticedAt: '2026-09-06T10:00:00.000Z',
    },
  ],
  recentCompletedSessions: [
    {
      id: COMPLETION.id,
      sessionId: COMPLETION.sessionId,
      technologyId: COMPLETION.technologyId,
      topicId: ARRAYS.id,
      conceptId: COMPLETION.conceptId,
      totalExercises: COMPLETION.totalSteps,
      correctExercises: COMPLETION.correctSteps,
      accuracy: 0.75,
      durationMs: COMPLETION.timeSpentMs,
      hintsUsed: 0,
      completedAt: COMPLETION.completedAt,
    },
  ],
  review: {
    overview: {
      totalAttempts: 4,
      correctAttempts: 3,
      accuracy: 0.75,
      evidenceLevel: 'initial',
    },
    candidates: [],
  },
  badges: {
    summary: {
      totalAttempts: 4,
      correctAttempts: 3,
      completedSessions: 1,
      accuracy: 0.75,
    },
    badges: [],
  },
};

interface RenderHomeOptions {
  technologies?: Technology[];
  contentLoading?: boolean;

  dashboard?: DashboardSnapshot | null;
  dashboardLoading?: boolean;
  dashboardError?: string | null;
  progressLoading?: boolean;

  progress?: Map<string, ConceptProgress>;
  completedSessions?: CompletedSession[];
  completionBySession?: Map<
    string,
    CompletedSession | null
  >;

  historyLoading?: boolean;
  historyError?: string | null;

  recovery?: SessionRecoverySnapshot | null;
}

function renderHome({
  technologies = [
    JAVASCRIPT,
    HTML,
    CSS,
    REACT,
    NODE,
    SQL,
  ],
  contentLoading = false,

  dashboard = EMPTY_DASHBOARD,
  dashboardLoading = false,
  dashboardError = null,
  progressLoading = false,

  progress = new Map(),
  completedSessions = [],
  completionBySession = new Map(),

  historyLoading = false,
  historyError = null,

  recovery = null,
}: RenderHomeOptions = {}) {
  const content: ContentContextValue = {
    technologies,
    isLoading: contentLoading,

    getTechnology: vi.fn(
      (id) =>
        technologies.find(
          (technology) =>
            technology.id === id,
        ),
    ),

    getTopics: vi.fn(
      async (technologyId) =>
        technologyId === JAVASCRIPT.id
          ? [ARRAYS]
          : technologyId === HTML.id
            ? [DOCUMENT]
            : [],
    ),

    getConceptsByTopic: vi.fn(
      async (topicId) =>
        topicId === ARRAYS.id
          ? [ITERATION]
          : topicId === DOCUMENT.id
            ? [SEMANTICS]
            : [],
    ),

    getConcept: vi.fn(),

    getSessionsByConcept: vi.fn(
      async (conceptId) =>
        conceptId === ITERATION.id
          ? [JS_SESSION]
          : conceptId === SEMANTICS.id
            ? [HTML_SESSION]
            : [],
    ),

    getSession: vi.fn(),
  };

  const dashboardValue:
    DashboardContextValue = {
      dashboard,
      isLoading:
        dashboardLoading
        || progressLoading,
      error:
        dashboardError,
      refresh:
        vi.fn(),
      resetState:
        vi.fn(),
    };

  const history:
    HistoryContextValue = {
      recentCompletedSessions:
        completedSessions,
      completedSessionsLoading:
        historyLoading,
      completedSessionsError:
        historyError,

      getCompletedSession: vi.fn(
        async (sessionId) =>
          completionBySession.get(
            sessionId,
          ) ?? null,
      ),

      getAttemptsBySession:
        vi.fn(),

      attemptsLoading: false,
      attemptsError: null,
    };

  const progressValue:
    ProgressContextValue = {
      progress,
      updateProgress: vi.fn(),
      getConceptDomain: vi.fn(),
      isLoading:
        dashboardLoading,
      error:
        dashboardError,
    };

  const recoveryStore = {
    load: vi.fn(
      () => recovery,
    ),
    save: vi.fn(),
    clear: vi.fn(),
  };

  const wrapper = ({
    children,
  }: {
    children: ReactNode;
  }) => (
    <DashboardContext.Provider
      value={dashboardValue}
    >
      <ContentContext.Provider
        value={content}
      >
        <HistoryContext.Provider
          value={history}
        >
          <ProgressContext.Provider
            value={progressValue}
          >
            <SessionRecoveryContext.Provider
              value={recoveryStore}
            >
              <MemoryRouter>
                <main>
                  {children}
                </main>
              </MemoryRouter>
            </SessionRecoveryContext.Provider>
          </ProgressContext.Provider>
        </HistoryContext.Provider>
      </ContentContext.Provider>
    </DashboardContext.Provider>
  );

  return {
    ...render(
      <HomePage />,
      {
        wrapper,
      },
    ),
    content,
    history,
    recoveryStore,
  };
}

describe('HomePage', () => {
  it('muestra onboarding para un usuario realmente nuevo sin métricas vacías', async () => {
    renderHome();

    expect(
      await screen.findByRole(
        'heading',
        {
          level: 1,
          name:
            'Todo empieza con la primera práctica.',
        },
      ),
    ).toBeInTheDocument();


    expect(
      screen.getByText(
        'Practica, aprende y construye las habilidades que te llevarán más lejos.',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole(
        'link',
        {
          name: /^Empezar$/,
        },
      ),
    ).toHaveAttribute(
      'href',
      '/tech',
    );

    expect(
      screen.getByRole(
        'heading',
        {
          name:
            'Elige tu tecnología',
        },
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'Seis caminos. Un mismo destino: ser mejor desarrollador.',
      ),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole(
        'link',
        {
          name:
            'Comenzar JavaScript',
        },
      ),
    ).toHaveAttribute(
      'href',
      '/tech/javascript',
    );

    expect(
      screen.getByRole(
        'link',
        {
          name: 'Comenzar HTML',
        },
      ),
    ).toHaveAttribute(
      'href',
      '/tech/html',
    );

    for (const [name, path] of [
      ['CSS', '/tech/css'],
      ['React', '/tech/react'],
      ['Node.js', '/tech/nodejs'],
      ['SQL', '/tech/sql'],
    ] as const) {
      expect(
        screen.getByRole(
          'link',
          {
            name: `Comenzar ${name}`,
          },
        ),
      ).toHaveAttribute(
        'href',
        path,
      );
    }

    expect(
      screen.getAllByRole(
        'link',
        {
          name: /^Comenzar /,
        },
      ),
    ).toHaveLength(6);

    expect(
      screen.queryByText(
        'Continúa tu práctica',
      ),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole(
        'region',
        {
          name: 'Tu progreso',
        },
      ),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole(
        'region',
        {
          name:
            'Actividad reciente',
        },
      ),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText(
        '0%',
        {
          exact: true,
        },
      ),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText(
        /Sin datos/i,
      ),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText(
        'Hola, Carlos',
      ),
    ).not.toBeInTheDocument();
  });

  it('no interpreta loading del dashboard como usuario nuevo', () => {
    renderHome({
      dashboard: null,
      dashboardLoading: true,
      contentLoading: true,
    });

    expect(
      screen.getByRole(
        'region',
        {
          name: 'Cargando tu inicio…',
        },
      ),
    ).toHaveAttribute(
      'aria-busy',
      'true',
    );

    expect(
      screen.queryByRole(
        'heading',
        {
          name:
            'Todo empieza con la primera práctica.',
        },
      ),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText(
        'DESARROLLA TU FUTURO',
      ),
    ).not.toBeInTheDocument();
  });

  it.each([
    ['progreso', { progressLoading: true }],
    ['historial', { historyLoading: true }],
  ] as const)('no muestra onboarding mientras carga %s', async (_source, options) => {
    renderHome(options);

    await waitFor(() => {
      expect(
        screen.getByRole(
          'region',
          {
            name: 'Cargando tu inicio…',
          },
        ),
      ).toHaveAttribute(
        'aria-busy',
        'true',
      );
    });

    expect(
      screen.queryByRole(
        'heading',
        {
          name: 'Todo empieza con la primera práctica.',
        },
      ),
    ).not.toBeInTheDocument();
  });

  it('no interpreta un error de dashboard como usuario nuevo', () => {
    renderHome({
      dashboard: null,
      dashboardError:
        'Dashboard unavailable',
      contentLoading: true,
    });

    expect(
      screen.getByRole(
        'alert',
      ),
    ).toHaveTextContent(
      'No pudimos cargar tu inicio',
    );

    expect(
      screen.queryByRole(
        'heading',
        {
          name:
            'Todo empieza con la primera práctica.',
        },
      ),
    ).not.toBeInTheDocument();
  });

  it('un recovery válido abre la Home avanzada aunque no exista progreso persistido', async () => {
    renderHome({
      recovery: RECOVERY,
    });

    expect(
      await screen.findByRole(
        'heading',
        {
          name:
            '¿Qué quieres entrenar hoy?',
        },
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'Continúa tu práctica',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole(
        'link',
        {
          name:
            /Continuar práctica/,
        },
      ),
    ).toHaveAttribute(
      'href',
      `/practice/${JS_SESSION.id}`,
    );

    expect(
      screen.getByText(
        '1 de 4 ejercicios',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole(
        'progressbar',
        {
          name:
            `Progreso de ${JS_SESSION.title}`,
        },
      ),
    ).toHaveAttribute(
      'aria-valuetext',
      '1 de 4 ejercicios',
    );
  });

  it('ignora un recovery inválido y muestra onboarding', async () => {
    renderHome({
      recovery: {
        ...RECOVERY,
        sessionId:
          'sesion-inexistente',
      },
    });

    expect(
      await screen.findByRole(
        'heading',
        {
          level: 1,
          name:
            'Todo empieza con la primera práctica.',
        },
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByText(
        'Continúa tu práctica',
      ),
    ).not.toBeInTheDocument();
  });

  it('muestra Home avanzada usando únicamente actividad persistida real', async () => {
    renderHome({
      dashboard:
        ACTIVE_DASHBOARD,
      progress:
        new Map([
          [
            PROGRESS.conceptId,
            PROGRESS,
          ],
        ]),
      completedSessions: [
        COMPLETION,
      ],
      completionBySession:
        new Map([
          [
            JS_SESSION.id,
            COMPLETION,
          ],
        ]),
    });

    expect(
      await screen.findByRole(
        'heading',
        {
          name:
            '¿Qué quieres entrenar hoy?',
        },
      ),
    ).toBeInTheDocument();

    const summary =
      screen.getByRole(
        'region',
        {
          name:
            'Tu progreso',
        },
      );

    await waitFor(() => {
      expect(
        within(summary)
          .getByText(
            'Conceptos',
          )
          .parentElement,
      ).toHaveTextContent(
        '1 de 2',
      );
    });

    expect(
      within(summary)
        .getByText(
          'Precisión actual',
        )
        .parentElement,
    ).toHaveTextContent(
      '75%',
    );

    expect(
      within(summary)
        .getByText(
          'Sesiones recientes',
        )
        .parentElement,
    ).toHaveTextContent(
      '1',
    );

    expect(
      within(summary)
        .getByRole(
          'progressbar',
          {
            name:
              'Progreso general',
          },
        ),
    ).toHaveAttribute(
      'aria-valuenow',
      '50',
    );

    expect(
      within(summary)
        .getByRole(
          'link',
          {
            name:
              /Ver progreso completo/,
          },
        ),
    ).toHaveAttribute(
      'href',
      '/dashboard',
    );

    const activity =
      screen.getByRole(
        'region',
        {
          name:
            'Actividad reciente',
        },
      );

    expect(
      within(activity)
        .getByRole(
          'link',
          {
            name:
              JS_SESSION.title,
          },
        ),
    ).toHaveAttribute(
      'href',
      `/results/${JS_SESSION.id}`,
    );

    expect(
      screen.queryByRole(
        'heading',
        {
          name:
            'Todo empieza con la primera práctica.',
        },
      ),
    ).not.toBeInTheDocument();
  });

  it('limita el selector de tecnologías de Home a seis opciones reales', async () => {
    const extraTechnologies =
      Array.from(
        {
          length: 6,
        },
        (
          _,
          index,
        ): Technology => ({
          id:
            `extra-${index + 1}`,
          name:
            `Extra ${index + 1}`,
          icon:
            `E${index + 1}`,
          description:
            'Tecnología adicional.',
        }),
      );

    renderHome({
      technologies: [
        JAVASCRIPT,
        HTML,
        ...extraTechnologies,
      ],
    });

    await screen.findByRole(
      'heading',
      {
        name:
          'Elige tu tecnología',
      },
    );

    await waitFor(() => {
      expect(
        screen.getAllByRole(
          'link',
          {
            name:
              /^Comenzar /,
          },
        ),
      ).toHaveLength(6);
    });
  });
});
