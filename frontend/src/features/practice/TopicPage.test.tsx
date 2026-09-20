import { type ReactNode } from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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
import { browserLearningApi } from '@/features/learning/learning-api';
import TopicPage from './TopicPage';

const authMockState =
  vi.hoisted(
    () => ({
      accessToken:
        null as string | null,
    }),
  );

vi.mock(
  '@/features/auth/AuthContext',
  () => ({
    useAuth:
      () => ({
        accessToken:
          authMockState.accessToken,
      }),
  }),
);

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
  initialEntry = `/tech/${technologyId}/${topicId}`,
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
  initialEntry?: string;
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
            <MemoryRouter initialEntries={[initialEntry]}>
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
    expect(
      await screen.findByText(
        '# Iteración',
      ),
    ).toBeInTheDocument();
    const concepts = screen.getByRole('region', { name: 'Teoría y conceptos' });
    expect(within(concepts).getByRole('heading', { level: 2, name: 'Arrays' })).toBeInTheDocument();
    expect(within(concepts).getAllByRole('heading', { level: 3 }).map((item) => item.textContent)).toEqual([
      'Métodos de iteración de arrays', 'Mutación de arrays',
    ]);
  });

  it(
    'selecciona un concepto válido desde ?concept=',
    async () => {
      // CONCEPT_URL_SELECTION_REGRESSION
      renderTopicPage({
        initialEntry:
          `/tech/javascript/arrays?concept=${CONCEPTS[1].id}`,
      });

      expect(
        await screen.findByRole(
          'heading',
          {
            level: 3,
            name: 'Mutación de arrays',
          },
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByRole(
          'button',
          {
            name: /Mutación de arrays/i,
          },
        ),
      ).toHaveAttribute(
        'aria-current',
        'step',
      );
    },
  );

  it(
    'mantiene deshabilitado un concepto staged mientras su estado canónico está verificándose',
    async () => {
      // STAGED_CONCEPT_PENDING_CLICK_REGRESSION
      authMockState.accessToken =
        'pending-concept-token';

      const firstConcept =
        CONCEPTS[0];

      const basePendingConcept =
        CONCEPTS[1];

      if (
        firstConcept === undefined
        || basePendingConcept === undefined
      ) {
        throw new Error(
          'La fixture necesita al menos dos conceptos',
        );
      }

      const pendingConcept: Concept = {
        ...basePendingConcept,

        levels: [
          {
            id:
              'foundation',
            name:
              'Fundamentos',
            description:
              'Nivel inicial.',
            position:
              0,
          },
        ],

        content: {
          sections: [
            {
              type:
                'intro',
              levelId:
                'foundation',
              title:
                'Fundamentos pendientes',
              body:
                'Contenido staged pendiente de verificación.',
            },
          ],
        },
      };

      let resolveConceptState:
        | ((
            value:
              Awaited<
                ReturnType<
                  typeof browserLearningApi.getConceptState
                >
              >,
          ) => void)
        | undefined;

      const getConceptState =
        vi.spyOn(
          browserLearningApi,
          'getConceptState',
        ).mockImplementation(
          conceptId => {
            if (
              conceptId
              === pendingConcept.id
            ) {
              return new Promise(
                resolve => {
                  resolveConceptState =
                    resolve;
                },
              );
            }

            return Promise.resolve({
              conceptId,
              previousConceptId:
                null,
              locked:
                false,
              lockReason:
                null,
              stages: {
                theory: {
                  status:
                    'available',
                  completedAt:
                    null,
                },
                quiz: {
                  status:
                    'locked',
                  completedAt:
                    null,
                },
                practice: {
                  status:
                    'locked',
                  completedAt:
                    null,
                },
                checkpoint: {
                  status:
                    'locked',
                  completedAt:
                    null,
                },
              },
              completed:
                false,
              completedAt:
                null,
            });
          },
        );

      const getLevelState =
        vi.spyOn(
          browserLearningApi,
          'getLevelState',
        ).mockImplementation(
          async (
            conceptId,
            levelId,
          ) => ({
            conceptId,
            levelId,
            previousLevelId:
              null,
            nextLevelId:
              null,
            locked:
              false,
            lockReason:
              null,
            stages: {
              theory: {
                status:
                  'available',
                completedAt:
                  null,
              },
              quiz: {
                status:
                  'locked',
                completedAt:
                  null,
              },
              practice: {
                status:
                  'locked',
                completedAt:
                  null,
              },
              checkpoint: {
                status:
                  'locked',
                completedAt:
                  null,
              },
            },
            completed:
              false,
            completedAt:
              null,
          }),
        );

      const rendered =
        renderTopicPage({
          getConceptsByTopic:
            vi.fn().mockResolvedValue([
              firstConcept,
              pendingConcept,
            ]),
        });

      try {
        const workspace =
          await screen.findByRole(
            'region',
            {
              name:
                'Teoría y conceptos',
            },
          );

        await waitFor(
          () => {
            expect(
              getConceptState,
            ).toHaveBeenCalledWith(
              pendingConcept.id,
              'pending-concept-token',
            );
          },
        );

        const pendingButton =
          within(workspace).getByRole(
            'button',
            {
              name:
                new RegExp(
                  pendingConcept.name,
                  'i',
                ),
            },
          );

        expect(
          pendingButton,
        ).toBeDisabled();

        expect(
          pendingButton,
        ).toHaveTextContent(
          'Verificando',
        );

        fireEvent.click(
          pendingButton,
        );

        expect(
          pendingButton,
        ).not.toHaveAttribute(
          'aria-current',
          'step',
        );

        const firstButton =
          within(workspace).getByRole(
            'button',
            {
              name:
                new RegExp(
                  firstConcept.name,
                  'i',
                ),
            },
          );

        expect(
          firstButton,
        ).toHaveAttribute(
          'aria-current',
          'step',
        );

        if (
          resolveConceptState
          === undefined
        ) {
          throw new Error(
            'No se capturó el resolver del estado canónico',
          );
        }

        resolveConceptState({
          conceptId:
            pendingConcept.id,
          previousConceptId:
            firstConcept.id,
          locked:
            false,
          lockReason:
            null,
          stages: {
            theory: {
              status:
                'available',
              completedAt:
                null,
            },
            quiz: {
              status:
                'locked',
              completedAt:
                null,
            },
            practice: {
              status:
                'locked',
              completedAt:
                null,
            },
            checkpoint: {
              status:
                'locked',
              completedAt:
                null,
            },
          },
          completed:
            false,
          completedAt:
            null,
        });

        await waitFor(
          () => {
            expect(
              pendingButton,
            ).not.toBeDisabled();
          },
        );

        expect(
          pendingButton,
        ).toHaveTextContent(
          'Pendiente',
        );

        expect(
          getLevelState,
        ).toHaveBeenCalled();
      } finally {
        rendered.unmount();

        authMockState.accessToken =
          null;

        getConceptState.mockRestore();
        getLevelState.mockRestore();
      }
    },
  );

  it(
    'no permite seleccionar por ?concept= un concepto staged bloqueado por el backend',
    async () => {
      // LOCKED_CONCEPT_URL_INTEGRATION_REGRESSION
      authMockState.accessToken =
        'locked-concept-url-token';

      const firstConcept =
        CONCEPTS[0];

      const baseLockedConcept =
        CONCEPTS[1];

      if (
        firstConcept === undefined
        || baseLockedConcept === undefined
      ) {
        throw new Error(
          'La fixture necesita al menos dos conceptos',
        );
      }

      /*
       * El catálogo base de este test es legacy.
       * Para probar el gate canónico necesitamos
       * que el concepto solicitado por URL sea
       * realmente staged.
       */
      const lockedConcept: Concept = {
        ...baseLockedConcept,

        levels: [
          {
            id:
              'foundation',
            name:
              'Fundamentos',
            description:
              'Nivel inicial.',
            position:
              0,
          },
        ],

        content: {
          sections: [
            {
              type:
                'intro',
              levelId:
                'foundation',
              title:
                'Fundamentos de mutación',
              body:
                'Contenido staged para probar el bloqueo canónico.',
            },
          ],
        },
      };

      const getConceptState =
        vi.spyOn(
          browserLearningApi,
          'getConceptState',
        ).mockImplementation(
          async conceptId => ({
            conceptId,

            previousConceptId:
              conceptId === lockedConcept.id
                ? firstConcept.id
                : null,

            locked:
              conceptId === lockedConcept.id,

            lockReason:
              conceptId === lockedConcept.id
                ? 'previous-concept-incomplete'
                : null,

            stages: {
              theory: {
                status:
                  conceptId === lockedConcept.id
                    ? 'locked'
                    : 'available',
                completedAt:
                  null,
              },

              quiz: {
                status:
                  'locked',
                completedAt:
                  null,
              },

              practice: {
                status:
                  'locked',
                completedAt:
                  null,
              },

              checkpoint: {
                status:
                  'locked',
                completedAt:
                  null,
              },
            },

            completed:
              false,

            completedAt:
              null,
          }),
        );

      const getLevelState =
        vi.spyOn(
          browserLearningApi,
          'getLevelState',
        ).mockImplementation(
          async (
            conceptId,
            levelId,
          ) => ({
            conceptId,
            levelId,

            previousLevelId:
              null,

            nextLevelId:
              null,

            locked:
              conceptId === lockedConcept.id,

            lockReason:
              conceptId === lockedConcept.id
                ? 'previous-concept-incomplete'
                : null,

            stages: {
              theory: {
                status:
                  conceptId === lockedConcept.id
                    ? 'locked'
                    : 'available',
                completedAt:
                  null,
              },

              quiz: {
                status:
                  'locked',
                completedAt:
                  null,
              },

              practice: {
                status:
                  'locked',
                completedAt:
                  null,
              },

              checkpoint: {
                status:
                  'locked',
                completedAt:
                  null,
              },
            },

            completed:
              false,

            completedAt:
              null,
          }),
        );

      const rendered =
        renderTopicPage({
          getConceptsByTopic:
            vi.fn().mockResolvedValue([
              firstConcept,
              lockedConcept,
            ]),

          initialEntry:
            `/tech/javascript/arrays?concept=${lockedConcept.id}`,
        });

      try {
        const workspace =
          await screen.findByRole(
            'region',
            {
              name:
                'Teoría y conceptos',
            },
          );

        await waitFor(
          () => {
            expect(
              getConceptState,
            ).toHaveBeenCalledWith(
              lockedConcept.id,
              'locked-concept-url-token',
            );
          },
        );

        const lockedButton =
          within(workspace).getByRole(
            'button',
            {
              name:
                new RegExp(
                  lockedConcept.name,
                  'i',
                ),
            },
          );

        expect(
          lockedButton,
        ).toBeDisabled();

        expect(
          lockedButton,
        ).not.toHaveAttribute(
          'aria-current',
          'step',
        );

        const firstButton =
          within(workspace).getByRole(
            'button',
            {
              name:
                new RegExp(
                  firstConcept.name,
                  'i',
                ),
            },
          );

        expect(
          firstButton,
        ).toHaveAttribute(
          'aria-current',
          'step',
        );

        expect(
          getLevelState,
        ).toHaveBeenCalled();
      } finally {
        rendered.unmount();

        authMockState.accessToken =
          null;

        vi.restoreAllMocks();
      }
    },
  );

  it(
    'ignora un ?concept= inexistente y conserva el primer concepto',
    async () => {
      renderTopicPage({
        initialEntry:
          '/tech/javascript/arrays?concept=no-existe',
      });

      expect(
        await screen.findByRole(
          'heading',
          {
            level: 3,
            name: 'Métodos de iteración de arrays',
          },
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByRole(
          'button',
          {
            name: /Métodos de iteración de arrays/i,
          },
        ),
      ).toHaveAttribute(
        'aria-current',
        'step',
      );
    },
  );

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
    // PRACTICE_WORKSPACE_UI_REGRESSION
    expect(
      screen.getByRole(
        'heading',
        {
          name:
            'Prácticas del nivel',
        },
      ),
    ).toBeInTheDocument();

    // PRACTICE_PROGRESS_ASYNC_REGRESSION
    expect(
      await screen.findByRole(
        'heading',
        {
          name:
            'Progreso de práctica',
        },
      ),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole(
        'progressbar',
        {
          name:
            'Sesiones completadas',
        },
      ),
    ).toBeInTheDocument();

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

  it(
    'abre teoría al entrar explícitamente en modo repaso aunque el siguiente stage sea quiz',
    async () => {
      // TOPIC_THEORY_REVIEW_ENTRY_REGRESSION
      authMockState.accessToken =
        'topic-theory-review-token';

      const stagedConcept:
        Concept = {
          ...CONCEPTS[0],
          id:
            'js-array-iteration',
          levels: [
            {
              id:
                'foundation',
              name:
                'Fundamentos',
              description:
                'Base del concepto.',
              position:
                0,
            },
          ],
          content: {
            sections: [
              {
                type:
                  'intro',
                levelId:
                  'foundation',
                title:
                  'Teoría de Fundamentos',
                body:
                  'Contenido de teoría para repaso.',
              },
            ],
          },
        };

      const quizSession:
        ExerciseSession = {
          ...ARRAY_SESSION,
          id:
            'arrays-foundation-quiz',
          conceptId:
            stagedConcept.id,
          kind:
            'quiz',
          levelId:
            'foundation',
          requiredForProgression:
            true,
        };

      const conceptState = {
        conceptId:
          stagedConcept.id,
        previousConceptId:
          null,
        locked:
          false,
        lockReason:
          null,
        stages: {
          theory: {
            status:
              'completed',
            completedAt:
              '2026-09-19T10:00:00.000Z',
          },
          quiz: {
            status:
              'available',
            completedAt:
              null,
          },
          practice: {
            status:
              'locked',
            completedAt:
              null,
          },
          checkpoint: {
            status:
              'locked',
            completedAt:
              null,
          },
        },
        completed:
          false,
        completedAt:
          null,
      } as const;

      const levelState = {
        conceptId:
          stagedConcept.id,
        levelId:
          'foundation',
        previousLevelId:
          null,
        nextLevelId:
          null,
        locked:
          false,
        lockReason:
          null,
        stages: {
          theory: {
            status:
              'completed',
            completedAt:
              '2026-09-19T10:00:00.000Z',
          },
          quiz: {
            status:
              'available',
            completedAt:
              null,
          },
          practice: {
            status:
              'locked',
            completedAt:
              null,
          },
          checkpoint: {
            status:
              'locked',
            completedAt:
              null,
          },
        },
        completed:
          false,
        completedAt:
          null,
      } as const;

      const getConceptState =
        vi.spyOn(
          browserLearningApi,
          'getConceptState',
        ).mockResolvedValue(
          conceptState,
        );

      const getLevelState =
        vi.spyOn(
          browserLearningApi,
          'getLevelState',
        ).mockResolvedValue(
          levelState,
        );

      const rendered =
        renderTopicPage({
          getConceptsByTopic:
            vi.fn().mockResolvedValue([
              stagedConcept,
            ]),
          getSessionsByConcept:
            vi.fn().mockImplementation(
              async conceptId =>
                conceptId === stagedConcept.id
                  ? [quizSession]
                  : [],
            ),
          initialEntry:
            `/tech/javascript/arrays?concept=${stagedConcept.id}&stage=theory`,
        });

      try {
        expect(
          await screen.findByRole(
            'button',
            {
              name:
                /Teoría/i,
            },
          ),
        ).toHaveAttribute(
          'aria-current',
          'step',
        );

        expect(
          await screen.findByText(
            'Contenido de teoría para repaso.',
          ),
        ).toBeInTheDocument();

        expect(
          screen.queryByRole(
            'link',
            {
              name:
                'Empezar test',
            },
          ),
        ).not.toBeInTheDocument();

        expect(
          getConceptState,
        ).toHaveBeenCalledWith(
          stagedConcept.id,
          'topic-theory-review-token',
        );

        expect(
          getLevelState,
        ).toHaveBeenCalledWith(
          stagedConcept.id,
          'foundation',
          'topic-theory-review-token',
        );
      } finally {
        rendered.unmount();

        authMockState.accessToken =
          null;

        vi.restoreAllMocks();
      }
    },
  );

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
  it(
    'carga y completa la teoría de foundation antes de desbloquear el test',
    async () => {
      authMockState.accessToken =
        'access-token-test';

      const stagedConcept:
        Concept = {
          ...CONCEPTS[0],

          levels: [
            {
              id:
                'foundation',
              name:
                'Fundamentos',
              description:
                'Base del concepto.',
              position:
                0,
            },
            {
              id:
                'deepening',
              name:
                'Profundización',
              description:
                'Contenido posterior.',
              position:
                1,
            },
          ],

          content: {
            sections: [
              {
                type:
                  'intro',
                levelId:
                  'foundation',
                title:
                  'Teoría Fundamentos',
                body:
                  'Contenido exclusivo de Fundamentos.',
              },
              {
                type:
                  'intro',
                levelId:
                  'deepening',
                title:
                  'Teoría Profundización',
                body:
                  'No debe mostrarse todavía.',
              },
            ],
          },
        };

      const quizSession:
        ExerciseSession = {
          ...ARRAY_SESSION,

          id:
            'arrays-foundation-quiz',

          title:
            'Test de Fundamentos',

          kind:
            'quiz',

          levelId:
            'foundation',

          requiredForProgression:
            true,
        };

      const conceptState = {
        conceptId:
          stagedConcept.id,

        previousConceptId:
          null,

        locked:
          false,

        lockReason:
          null,

        stages: {
          theory: {
            status:
              'available',
            completedAt:
              null,
          },

          quiz: {
            status:
              'locked',
            completedAt:
              null,
          },

          practice: {
            status:
              'locked',
            completedAt:
              null,
          },

          checkpoint: {
            status:
              'locked',
            completedAt:
              null,
          },
        },

        completed:
          false,

        completedAt:
          null,
      } as const;

      const initialLevelState = {
        conceptId:
          stagedConcept.id,

        levelId:
          'foundation',

        previousLevelId:
          null,

        nextLevelId:
          'deepening',

        locked:
          false,

        lockReason:
          null,

        stages: {
          theory: {
            status:
              'available',
            completedAt:
              null,
          },

          quiz: {
            status:
              'locked',
            completedAt:
              null,
          },

          practice: {
            status:
              'locked',
            completedAt:
              null,
          },

          checkpoint: {
            status:
              'locked',
            completedAt:
              null,
          },
        },

        completed:
          false,

        completedAt:
          null,
      } as const;

      const theoryCompletedLevelState = {
        ...initialLevelState,

        stages: {
          ...initialLevelState.stages,

          theory: {
            status:
              'completed',
            completedAt:
              '2026-09-17T20:00:00.000Z',
          },

          quiz: {
            status:
              'available',
            completedAt:
              null,
          },
        },
      } as const;

      const deepeningLevelState = {
        conceptId:
          stagedConcept.id,

        levelId:
          'deepening',

        previousLevelId:
          'foundation',

        nextLevelId:
          null,

        locked:
          true,

        lockReason:
          'previous-level-incomplete',

        stages: {
          theory: {
            status:
              'locked',
            completedAt:
              null,
          },

          quiz: {
            status:
              'locked',
            completedAt:
              null,
          },

          practice: {
            status:
              'locked',
            completedAt:
              null,
          },

          checkpoint: {
            status:
              'locked',
            completedAt:
              null,
          },
        },

        completed:
          false,

        completedAt:
          null,
      } as const;

      const getConceptState =
        vi.spyOn(
          browserLearningApi,
          'getConceptState',
        ).mockResolvedValue(
          conceptState,
        );

      const getLevelState =
        vi.spyOn(
          browserLearningApi,
          'getLevelState',
        ).mockImplementation(
          async (
            _conceptId,
            levelId,
          ) => {
            if (
              levelId
              === 'foundation'
            ) {
              return initialLevelState;
            }

            if (
              levelId
              === 'deepening'
            ) {
              return deepeningLevelState;
            }

            throw new Error(
              `Nivel inesperado en test: ${levelId}`,
            );
          },
        );

      const completeLevelTheory =
        vi.spyOn(
          browserLearningApi,
          'completeLevelTheory',
        ).mockResolvedValue(
          theoryCompletedLevelState,
        );

      const rendered =
        renderTopicPage({
          getConceptsByTopic:
            vi.fn().mockResolvedValue([
              stagedConcept,
            ]),

          getSessionsByConcept:
            vi.fn().mockResolvedValue([
              quizSession,
            ]),
        });

      try {
        expect(
          await screen.findByText(
            'Contenido exclusivo de Fundamentos.',
          ),
        ).toBeInTheDocument();

        expect(
          screen.queryByText(
            'No debe mostrarse todavía.',
          ),
        ).not.toBeInTheDocument();

        const levelNavigation =
          screen.getByRole(
            'navigation',
            {
              name:
                'Niveles del concepto',
            },
          );

        const foundationLevel =
          within(levelNavigation)
            .getByText(
              'Fundamentos',
            )
            .closest('li');

        const deepeningLevel =
          within(levelNavigation)
            .getByText(
              'Profundización',
            )
            .closest('li');

        expect(
          foundationLevel,
        ).toHaveAttribute(
          'aria-current',
          'step',
        );

        expect(
          within(
            foundationLevel as HTMLElement,
          ).getByText(
            'En curso',
          ),
        ).toBeInTheDocument();

        expect(
          within(
            deepeningLevel as HTMLElement,
          ).getByText(
            'Bloqueado',
          ),
        ).toBeInTheDocument();

        await waitFor(
          () => {
            expect(
              getConceptState,
            ).toHaveBeenCalledWith(
              stagedConcept.id,
              'access-token-test',
            );

            expect(
              getLevelState,
            ).toHaveBeenCalledWith(
              stagedConcept.id,
              'foundation',
              'access-token-test',
            );

            expect(
              getLevelState,
            ).toHaveBeenCalledWith(
              stagedConcept.id,
              'deepening',
              'access-token-test',
            );

            expect(
              getLevelState,
            ).toHaveBeenCalledTimes(
              2,
            );
          },
        );

        const testButtonBefore =
          screen.getByRole(
            'button',
            {
              name:
                /Test/,
            },
          );

        expect(
          testButtonBefore,
        ).toBeDisabled();

        // STAGE_JOURNEY_VISUAL_STATUS
        const theoryButtonBefore =
          screen.getByRole(
            'button',
            {
              name:
                /Teoría/,
            },
          );

        expect(
          within(
            theoryButtonBefore,
          ).getByText(
            'Actual',
          ),
        ).toBeInTheDocument();

        expect(
          within(
            testButtonBefore,
          ).getByText(
            'Bloqueado',
          ),
        ).toBeInTheDocument();

        expect(
          theoryButtonBefore,
        ).toHaveAttribute(
          'data-learning-stage-status',
          'available',
        );

        expect(
          testButtonBefore,
        ).toHaveAttribute(
          'data-learning-stage-status',
          'locked',
        );

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'He entendido esto',
            },
          ),
        );

        await waitFor(
          () => {
            expect(
              completeLevelTheory,
            ).toHaveBeenCalledWith(
              stagedConcept.id,
              'foundation',
              'access-token-test',
            );
          },
        );

        await waitFor(
          () => {
            expect(
              screen.getByRole(
                'button',
                {
                  name:
                    /Test/,
                },
              ),
            ).not.toBeDisabled();
          },
        );

        const theoryButtonAfter =
          screen.getByRole(
            'button',
            {
              name:
                /Teoría/,
            },
          );

        const testButtonAfter =
          screen.getByRole(
            'button',
            {
              name:
                /Test/,
            },
          );

        expect(
          within(
            theoryButtonAfter,
          ).getByText(
            'Completado',
          ),
        ).toBeInTheDocument();

        expect(
          within(
            testButtonAfter,
          ).getByText(
            'Actual',
          ),
        ).toBeInTheDocument();

        expect(
          theoryButtonAfter,
        ).toHaveAttribute(
          'data-learning-stage-status',
          'completed',
        );

        expect(
          testButtonAfter,
        ).toHaveAttribute(
          'data-learning-stage-status',
          'available',
        );

        expect(
          testButtonAfter,
        ).toHaveAttribute(
          'aria-current',
          'step',
        );
      } finally {
        rendered.unmount();

        authMockState.accessToken =
          null;

        vi.restoreAllMocks();
      }
    },
  );

  it(
    'avanza a deepening sin reutilizar la teoría de foundation cuando el nivel está vacío',
    async () => {
      authMockState.accessToken =
        'active-level-access-token';

      const stagedConcept:
        Concept = {
          ...CONCEPTS[0],

          levels: [
            {
              id:
                'foundation',
              name:
                'Fundamentos',
              description:
                'Base del concepto.',
              position:
                0,
            },
            {
              id:
                'deepening',
              name:
                'Profundización',
              description:
                'Nivel posterior.',
              position:
                1,
            },
          ],

          content: {
            sections: [
              {
                type:
                  'intro',
                levelId:
                  'foundation',
                title:
                  'Teoría Fundamentos',
                body:
                  'Contenido exclusivo de Fundamentos.',
              },
            ],
          },

          contentMarkdown:
            '# Markdown legacy de Foundation',
        };

      const foundationQuiz:
        ExerciseSession = {
          ...ARRAY_SESSION,

          id:
            'arrays-foundation-active-level-quiz',

          title:
            'Test de Fundamentos',

          kind:
            'quiz',

          levelId:
            'foundation',

          requiredForProgression:
            true,
        };

      const conceptState = {
        conceptId:
          stagedConcept.id,

        previousConceptId:
          null,

        locked:
          false,

        lockReason:
          null,

        stages: {
          theory: {
            status:
              'completed',
            completedAt:
              '2026-09-17T20:00:00.000Z',
          },

          quiz: {
            status:
              'completed',
            completedAt:
              '2026-09-17T20:01:00.000Z',
          },

          practice: {
            status:
              'completed',
            completedAt:
              '2026-09-17T20:02:00.000Z',
          },

          checkpoint: {
            status:
              'available',
            completedAt:
              null,
          },
        },

        completed:
          false,

        completedAt:
          null,
      } as const;

      const foundationLevelState = {
        conceptId:
          stagedConcept.id,

        levelId:
          'foundation',

        previousLevelId:
          null,

        nextLevelId:
          'deepening',

        locked:
          false,

        lockReason:
          null,

        stages: {
          theory: {
            status:
              'completed',
            completedAt:
              '2026-09-17T20:00:00.000Z',
          },

          quiz: {
            status:
              'completed',
            completedAt:
              '2026-09-17T20:01:00.000Z',
          },

          practice: {
            status:
              'completed',
            completedAt:
              '2026-09-17T20:02:00.000Z',
          },

          checkpoint: {
            status:
              'completed',
            completedAt:
              '2026-09-17T20:03:00.000Z',
          },
        },

        completed:
          true,

        completedAt:
          '2026-09-17T20:03:00.000Z',
      } as const;

      const deepeningLevelState = {
        conceptId:
          stagedConcept.id,

        levelId:
          'deepening',

        previousLevelId:
          'foundation',

        nextLevelId:
          null,

        locked:
          false,

        lockReason:
          null,

        stages: {
          theory: {
            status:
              'available',
            completedAt:
              null,
          },

          quiz: {
            status:
              'locked',
            completedAt:
              null,
          },

          practice: {
            status:
              'locked',
            completedAt:
              null,
          },

          checkpoint: {
            status:
              'locked',
            completedAt:
              null,
          },
        },

        completed:
          false,

        completedAt:
          null,
      } as const;

      const getConceptState =
        vi.spyOn(
          browserLearningApi,
          'getConceptState',
        ).mockResolvedValue(
          conceptState,
        );

      const getLevelState =
        vi.spyOn(
          browserLearningApi,
          'getLevelState',
        ).mockImplementation(
          async (
            _conceptId,
            levelId,
          ) => {
            if (
              levelId
              === 'foundation'
            ) {
              return foundationLevelState;
            }

            if (
              levelId
              === 'deepening'
            ) {
              return deepeningLevelState;
            }

            throw new Error(
              `Nivel inesperado en test: ${levelId}`,
            );
          },
        );

      const rendered =
        renderTopicPage({
          getConceptsByTopic:
            vi.fn().mockResolvedValue([
              stagedConcept,
            ]),

          getSessionsByConcept:
            vi.fn().mockResolvedValue([
              foundationQuiz,
            ]),
        });

      try {
        expect(
          await screen.findByRole(
            'heading',
            {
              name:
                'Contenido de nivel no disponible',
            },
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            'El nivel Profundización todavía no tiene contenido publicado.',
          ),
        ).toBeInTheDocument();

        expect(
          screen.queryByText(
            'Contenido exclusivo de Fundamentos.',
          ),
        ).not.toBeInTheDocument();

        expect(
          screen.queryByText(
            '# Markdown legacy de Foundation',
          ),
        ).not.toBeInTheDocument();

        expect(
          screen.queryByLabelText(
            'Etapas del aprendizaje',
          ),
        ).not.toBeInTheDocument();

        await waitFor(
          () => {
            expect(
              getConceptState,
            ).toHaveBeenCalledWith(
              stagedConcept.id,
              'active-level-access-token',
            );

            expect(
              getLevelState,
            ).toHaveBeenCalledWith(
              stagedConcept.id,
              'foundation',
              'active-level-access-token',
            );

            expect(
              getLevelState,
            ).toHaveBeenCalledWith(
              stagedConcept.id,
              'deepening',
              'active-level-access-token',
            );

            expect(
              getLevelState,
            ).toHaveBeenCalledTimes(
              2,
            );
          },
        );
      } finally {
        rendered.unmount();

        authMockState.accessToken =
          null;

        vi.restoreAllMocks();
      }
    },
  );

  it(
    'completa la teoría del nivel deepening cuando es el nivel activo',
    async () => {
      authMockState.accessToken =
        'deepening-access-token';

      const stagedConcept:
        Concept = {
          ...CONCEPTS[0],

          levels: [
            {
              id:
                'foundation',
              name:
                'Fundamentos',
              description:
                'Base del concepto.',
              position:
                0,
            },
            {
              id:
                'deepening',
              name:
                'Profundización',
              description:
                'Nivel posterior.',
              position:
                1,
            },
          ],

          content: {
            sections: [
              {
                type:
                  'intro',
                levelId:
                  'foundation',
                title:
                  'Teoría Fundamentos',
                body:
                  'Contenido exclusivo de Fundamentos.',
              },
              {
                type:
                  'intro',
                levelId:
                  'deepening',
                title:
                  'Teoría Profundización',
                body:
                  'Contenido exclusivo de Profundización.',
              },
            ],
          },
        };

      const foundationQuiz:
        ExerciseSession = {
          ...ARRAY_SESSION,

          id:
            'arrays-foundation-complete-quiz',

          title:
            'Test de Fundamentos',

          kind:
            'quiz',

          levelId:
            'foundation',

          requiredForProgression:
            true,
        };

      const deepeningQuiz:
        ExerciseSession = {
          ...ARRAY_SESSION,

          id:
            'arrays-deepening-quiz',

          title:
            'Test de Profundización',

          kind:
            'quiz',

          levelId:
            'deepening',

          requiredForProgression:
            true,
        };

      const conceptState = {
        conceptId:
          stagedConcept.id,

        previousConceptId:
          null,

        locked:
          false,

        lockReason:
          null,

        stages: {
          theory: {
            status:
              'completed',
            completedAt:
              '2026-09-17T20:00:00.000Z',
          },

          quiz: {
            status:
              'completed',
            completedAt:
              '2026-09-17T20:01:00.000Z',
          },

          practice: {
            status:
              'completed',
            completedAt:
              '2026-09-17T20:02:00.000Z',
          },

          checkpoint: {
            status:
              'available',
            completedAt:
              null,
          },
        },

        completed:
          false,

        completedAt:
          null,
      } as const;

      const foundationLevelState = {
        conceptId:
          stagedConcept.id,

        levelId:
          'foundation',

        previousLevelId:
          null,

        nextLevelId:
          'deepening',

        locked:
          false,

        lockReason:
          null,

        stages: {
          theory: {
            status:
              'completed',
            completedAt:
              '2026-09-17T20:00:00.000Z',
          },

          quiz: {
            status:
              'completed',
            completedAt:
              '2026-09-17T20:01:00.000Z',
          },

          practice: {
            status:
              'completed',
            completedAt:
              '2026-09-17T20:02:00.000Z',
          },

          checkpoint: {
            status:
              'completed',
            completedAt:
              '2026-09-17T20:03:00.000Z',
          },
        },

        completed:
          true,

        completedAt:
          '2026-09-17T20:03:00.000Z',
      } as const;

      const deepeningLevelState = {
        conceptId:
          stagedConcept.id,

        levelId:
          'deepening',

        previousLevelId:
          'foundation',

        nextLevelId:
          null,

        locked:
          false,

        lockReason:
          null,

        stages: {
          theory: {
            status:
              'available',
            completedAt:
              null,
          },

          quiz: {
            status:
              'locked',
            completedAt:
              null,
          },

          practice: {
            status:
              'locked',
            completedAt:
              null,
          },

          checkpoint: {
            status:
              'locked',
            completedAt:
              null,
          },
        },

        completed:
          false,

        completedAt:
          null,
      } as const;

      const deepeningTheoryCompletedState = {
        ...deepeningLevelState,

        stages: {
          ...deepeningLevelState.stages,

          theory: {
            status:
              'completed',
            completedAt:
              '2026-09-17T21:00:00.000Z',
          },

          quiz: {
            status:
              'available',
            completedAt:
              null,
          },
        },
      } as const;

      vi.spyOn(
        browserLearningApi,
        'getConceptState',
      ).mockResolvedValue(
        conceptState,
      );

      vi.spyOn(
        browserLearningApi,
        'getLevelState',
      ).mockImplementation(
        async (
          _conceptId,
          levelId,
        ) => {
          if (
            levelId
            === 'foundation'
          ) {
            return foundationLevelState;
          }

          if (
            levelId
            === 'deepening'
          ) {
            return deepeningLevelState;
          }

          throw new Error(
            `Nivel inesperado en test: ${levelId}`,
          );
        },
      );

      const completeLevelTheory =
        vi.spyOn(
          browserLearningApi,
          'completeLevelTheory',
        ).mockResolvedValue(
          deepeningTheoryCompletedState,
        );

      const rendered =
        renderTopicPage({
          getConceptsByTopic:
            vi.fn().mockResolvedValue([
              stagedConcept,
            ]),

          getSessionsByConcept:
            vi.fn().mockResolvedValue([
              foundationQuiz,
              deepeningQuiz,
            ]),
        });

      try {
        expect(
          await screen.findByText(
            'Contenido exclusivo de Profundización.',
          ),
        ).toBeInTheDocument();

        // UI_LEVEL_COMPLETED_ACTIVE_LOCKED
        const levelNavigation =
          screen.getByRole(
            'navigation',
            {
              name:
                'Niveles del concepto',
            },
          );

        const foundationLevel =
          within(levelNavigation)
            .getByText(
              'Fundamentos',
            )
            .closest('li');

        const deepeningLevel =
          within(levelNavigation)
            .getByText(
              'Profundización',
            )
            .closest('li');

        expect(
          foundationLevel,
        ).not.toHaveAttribute(
          'aria-current',
        );

        expect(
          within(
            foundationLevel as HTMLElement,
          ).getByText(
            'Completado',
          ),
        ).toBeInTheDocument();

        expect(
          deepeningLevel,
        ).toHaveAttribute(
          'aria-current',
          'step',
        );

        expect(
          within(
            deepeningLevel as HTMLElement,
          ).getByText(
            'En curso',
          ),
        ).toBeInTheDocument();

        expect(
          screen.queryByText(
            'Contenido exclusivo de Fundamentos.',
          ),
        ).not.toBeInTheDocument();

        const testButtonBefore =
          screen.getByRole(
            'button',
            {
              name:
                /Test/,
            },
          );

        expect(
          testButtonBefore,
        ).toBeDisabled();

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'He entendido esto',
            },
          ),
        );

        await waitFor(
          () => {
            expect(
              completeLevelTheory,
            ).toHaveBeenCalledWith(
              stagedConcept.id,
              'deepening',
              'deepening-access-token',
            );

            expect(
              completeLevelTheory,
            ).toHaveBeenCalledTimes(
              1,
            );
          },
        );

        await waitFor(
          () => {
            expect(
              screen.getByRole(
                'button',
                {
                  name:
                    /Test/,
                },
              ),
            ).not.toBeDisabled();
          },
        );
      } finally {
        rendered.unmount();

        authMockState.accessToken =
          null;

        vi.restoreAllMocks();
      }
    },
  );

});
