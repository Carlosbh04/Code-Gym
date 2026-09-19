import type { ReactNode } from 'react';
import {
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
import { browserLearningApi } from '@/features/learning/learning-api';
import { HistoryContext } from '@/contexts/history-context';
import type { Concept, ContentContextValue, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { HistoryContextValue } from '@/types/history';
import type { Attempt, CompletedSession } from '@/types/progress';
import ResultsPage from './ResultsPage';

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
  getConceptsByTopic = vi.fn().mockResolvedValue([CONCEPT]),
  getTopics = vi.fn().mockResolvedValue([TOPIC]),
}: {
  sessionId?: string;
  getCompletedSession?: HistoryContextValue['getCompletedSession'];
  getSession?: ContentContextValue['getSession'];
  getAttemptsBySession?: HistoryContextValue['getAttemptsBySession'];
  getConcept?: ContentContextValue['getConcept'];
  getConceptsByTopic?: ContentContextValue['getConceptsByTopic'];
  getTopics?: ContentContextValue['getTopics'];
} = {}) {
  const history: HistoryContextValue = { recentCompletedSessions: [], completedSessionsLoading: false, completedSessionsError: null, getCompletedSession, getAttemptsBySession, attemptsLoading: false, attemptsError: null };
  const content: ContentContextValue = {
    // RESULTS_NEXT_CONCEPT_HELPER_FIX
    technologies: [], getTechnology: vi.fn().mockReturnValue({ id: 'javascript', name: 'JavaScript', icon: 'javascript', description: '' }), getTopics, getConceptsByTopic, getConcept, getSessionsByConcept: vi.fn(), getSession, isLoading: false,
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

  it(
    'no ofrece Seguir practicando si la sesión staged ya está bloqueada',
    async () => {
      // RESULT_REPEAT_CANONICAL_REGRESSION
      authMockState.accessToken =
        'results-repeat-token';

      const stagedPractice:
        ExerciseSession = {
          ...SESSION,

          kind:
            'practice',

          levelId:
            'foundation',

          requiredForProgression:
            true,
        };

      const getLevelState =
        vi.spyOn(
          browserLearningApi,
          'getLevelState',
        ).mockResolvedValue({
          conceptId:
            stagedPractice.conceptId,

          levelId:
            'foundation',

          previousLevelId:
            null,

          nextLevelId:
            null,

          locked:
            true,

          lockReason:
            'previous-concept-incomplete',

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
        });

      const rendered =
        renderResultsPage({
          getSession:
            vi.fn().mockResolvedValue(
              stagedPractice,
            ),
        });

      try {
        expect(
          await screen.findByRole(
            'heading',
            {
              level:
                1,
              name:
                '¡Muy buen trabajo!',
            },
          ),
        ).toBeInTheDocument();

        await waitFor(
          () => {
            expect(
              getLevelState,
            ).toHaveBeenCalledWith(
              stagedPractice.conceptId,
              'foundation',
              'results-repeat-token',
            );
          },
        );

        expect(
          screen.queryByRole(
            'link',
            {
              name:
                'Seguir practicando',
            },
          ),
        ).not.toBeInTheDocument();

        expect(
          screen.getByRole(
            'link',
            {
              name:
                'Volver al tema',
            },
          ),
        ).toHaveAttribute(
          'href',
          '/tech/javascript/arrays',
        );
      } finally {
        rendered.unmount();

        authMockState.accessToken =
          null;

        getLevelState.mockRestore();
      }
    },
  );

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

  it(
    'muestra la transición canónica al siguiente nivel después de superar un checkpoint',
    async () => {
      // CHECKPOINT_LEVEL_TRANSITION_REGRESSION
      authMockState.accessToken =
        'results-checkpoint-token';

      const checkpointSession:
        ExerciseSession = {
          ...SESSION,
          title:
            'Checkpoint: fundamentos de iteración',
          kind:
            'checkpoint',
          levelId:
            'foundation',
          requiredForProgression:
            true,
        };

      const stagedConcept:
        Concept = {
          ...CONCEPT,
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
                'Nivel siguiente.',
              position:
                1,
            },
          ],
        };

      const getLevelState =
        vi.spyOn(
          browserLearningApi,
          'getLevelState',
        ).mockResolvedValue({
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
                '2026-09-19T10:00:00.000Z',
            },
            quiz: {
              status:
                'completed',
              completedAt:
                '2026-09-19T10:01:00.000Z',
            },
            practice: {
              status:
                'completed',
              completedAt:
                '2026-09-19T10:02:00.000Z',
            },
            checkpoint: {
              status:
                'completed',
              completedAt:
                '2026-09-19T10:03:00.000Z',
            },
          },
          completed:
            true,
          completedAt:
            '2026-09-19T10:03:00.000Z',
        });

      const rendered =
        renderResultsPage({
          getSession:
            vi.fn().mockResolvedValue(
              checkpointSession,
            ),
          getConcept:
            vi.fn().mockResolvedValue(
              stagedConcept,
            ),
        });

      try {
        expect(
          await screen.findByRole(
            'heading',
            {
              name:
                'Fundamentos completado',
            },
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            'Has desbloqueado Profundización.',
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByRole(
            'link',
            {
              name:
                'Continuar a Profundización',
            },
          ),
        ).toHaveAttribute(
          'href',
          '/tech/javascript/arrays',
        );

        expect(
          getLevelState,
        ).toHaveBeenCalledWith(
          stagedConcept.id,
          'foundation',
          'results-checkpoint-token',
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
    'ofrece continuar al siguiente concepto cuando el backend confirma que está desbloqueado',
    async () => {
      // NEXT_CONCEPT_RESULT_TRANSITION_REGRESSION
      authMockState.accessToken =
        'results-next-concept-token';

      const checkpointSession:
        ExerciseSession = {
          ...SESSION,
          title:
            'Checkpoint final',
          kind:
            'checkpoint',
          levelId:
            'mastery',
          requiredForProgression:
            true,
        };

      const currentConcept:
        Concept = {
          ...CONCEPT,
          levels: [
            {
              id:
                'mastery',
              name:
                'Dominio',
              description:
                'Nivel final.',
              position:
                0,
            },
          ],
        };

      const nextConcept:
        Concept = {
          ...CONCEPT,
          id:
            'array-mutation',
          name:
            'Mutación de arrays',
        };

      vi.spyOn(
        browserLearningApi,
        'getLevelState',
      ).mockResolvedValue({
        conceptId:
          currentConcept.id,
        levelId:
          'mastery',
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
            status: 'completed',
            completedAt:
              '2026-09-19T12:00:00.000Z',
          },
          quiz: {
            status: 'completed',
            completedAt:
              '2026-09-19T12:01:00.000Z',
          },
          practice: {
            status: 'completed',
            completedAt:
              '2026-09-19T12:02:00.000Z',
          },
          checkpoint: {
            status: 'completed',
            completedAt:
              '2026-09-19T12:03:00.000Z',
          },
        },
        completed:
          true,
        completedAt:
          '2026-09-19T12:03:00.000Z',
      });

      const getConceptState =
        vi.spyOn(
          browserLearningApi,
          'getConceptState',
        ).mockResolvedValue({
          conceptId:
            nextConcept.id,
          previousConceptId:
            currentConcept.id,
          locked:
            false,
          lockReason:
            null,
          stages: {
            theory: {
              status: 'available',
              completedAt: null,
            },
            quiz: {
              status: 'locked',
              completedAt: null,
            },
            practice: {
              status: 'locked',
              completedAt: null,
            },
            checkpoint: {
              status: 'locked',
              completedAt: null,
            },
          },
          completed:
            false,
          completedAt:
            null,
        });

      const rendered =
        renderResultsPage({
          getSession:
            vi.fn().mockResolvedValue(
              checkpointSession,
            ),
          getConcept:
            vi.fn().mockResolvedValue(
              currentConcept,
            ),
          getConceptsByTopic:
            vi.fn().mockResolvedValue([
              currentConcept,
              nextConcept,
            ]),
        });

      try {
        expect(
          await screen.findByRole(
            'link',
            {
              name:
                'Continuar aprendiendo',
            },
          ),
        ).toHaveAttribute(
          'href',
          '/tech/javascript/arrays?concept=array-mutation',
        );

        expect(
          screen.getByText(
            /Siguiente: Mutación de arrays\./,
          ),
        ).toBeInTheDocument();

        expect(
          getConceptState,
        ).toHaveBeenCalledWith(
          nextConcept.id,
          'results-next-concept-token',
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
    'cierra el concepto cuando el checkpoint completa el último nivel configurado',
    async () => {
      // FINAL_CONCEPT_COMPLETION_REGRESSION
      authMockState.accessToken =
        'results-final-level-token';

      const checkpointSession:
        ExerciseSession = {
          ...SESSION,
          title:
            'Checkpoint: dominio de iteración',
          kind:
            'checkpoint',
          levelId:
            'mastery',
          requiredForProgression:
            true,
        };

      const stagedConcept:
        Concept = {
          ...CONCEPT,
          levels: [
            {
              id:
                'foundation',
              name:
                'Fundamentos',
              description:
                'Base.',
              position:
                0,
            },
            {
              id:
                'deepening',
              name:
                'Profundización',
              description:
                'Profundización.',
              position:
                1,
            },
            {
              id:
                'mastery',
              name:
                'Dominio',
              description:
                'Dominio.',
              position:
                2,
            },
          ],
        };

      const getLevelState =
        vi.spyOn(
          browserLearningApi,
          'getLevelState',
        ).mockResolvedValue({
          conceptId:
            stagedConcept.id,
          levelId:
            'mastery',
          previousLevelId:
            'deepening',
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
                '2026-09-19T11:00:00.000Z',
            },
            quiz: {
              status:
                'completed',
              completedAt:
                '2026-09-19T11:01:00.000Z',
            },
            practice: {
              status:
                'completed',
              completedAt:
                '2026-09-19T11:02:00.000Z',
            },
            checkpoint: {
              status:
                'completed',
              completedAt:
                '2026-09-19T11:03:00.000Z',
            },
          },
          completed:
            true,
          completedAt:
            '2026-09-19T11:03:00.000Z',
        });

      const rendered =
        renderResultsPage({
          getSession:
            vi.fn().mockResolvedValue(
              checkpointSession,
            ),
          getConcept:
            vi.fn().mockResolvedValue(
              stagedConcept,
            ),
        });

      try {
        expect(
          await screen.findByRole(
            'heading',
            {
              name:
                'Dominio completado',
            },
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            'Has completado todos los niveles de este concepto.',
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByRole(
            'link',
            {
              name:
                'Volver al tema',
            },
          ),
        ).toHaveAttribute(
          'href',
          '/tech/javascript/arrays',
        );

        expect(
          screen.queryByRole(
            'link',
            {
              name:
                /Continuar a/,
            },
          ),
        ).not.toBeInTheDocument();

        expect(
          getLevelState,
        ).toHaveBeenCalledWith(
          stagedConcept.id,
          'mastery',
          'results-final-level-token',
        );
      } finally {
        rendered.unmount();

        authMockState.accessToken =
          null;

        vi.restoreAllMocks();
      }
    },
  );

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
