const authMockState =
  vi.hoisted(
    () => ({
      accessToken:
        null as string | null,
    }),
  );

// SEARCH_TEST_AUTH_MOCK
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

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ContentContextValue, Concept, Technology, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import { browserLearningApi } from '@/features/learning/learning-api';
import { SEARCH_HISTORY_KEY } from './search-history';
import { SearchPopover } from './SearchPopover';

const technologies: Technology[] = [
  { id: 'javascript', name: 'JavaScript', icon: 'js', description: 'Lenguaje web' },
  { id: 'react', name: 'React', icon: 'react', description: 'Interfaces' },
  { id: 'sql', name: 'SQL', icon: 'sql', description: 'Datos' },
];
const topics: Record<string, Topic[]> = {
  javascript: [{ id: 'js-arrays', name: 'Arrays', technologyId: 'javascript', description: 'Colecciones' }],
  react: [{ id: 'react-effects', name: 'useEffect', technologyId: 'react', description: 'Efectos' }],
  sql: [{ id: 'sql-select', name: 'SELECT', technologyId: 'sql', description: 'Consultas' }],
};
const concepts: Record<string, Concept[]> = {
  'js-arrays': [{ id: 'js-array-iteration', name: 'Métodos de iteración', topicId: 'js-arrays', technologyId: 'javascript', contentMarkdown: '' }],
  'react-effects': [],
  'sql-select': [],
};
const session: ExerciseSession = {
  id: 'js-arrays-filter-01',
  title: 'Filter no debería mutar',
  conceptId: 'js-array-iteration',
  technologyId: 'javascript',
  difficulty: 'beginner',
  version: '1.0.0',
  status: 'published',
  createdAt: '2026-09-01',
  updatedAt: null,
  steps: [{ id: 'step-1', type: 'code-reading', prompt: '¿Cuántos elementos quedan?', code: '', language: 'javascript', options: [], requirements: [], hintCount: 0, stepOrder: 1 }],
};


// SEARCH_STAGED_SESSION_FIXTURE
const stagedSession: ExerciseSession = {
  ...session,

  id:
    'js-arrays-staged-search',

  title:
    'Práctica staged buscable',

  levelId:
    'foundation',

  kind:
    'practice',

  requiredForProgression:
    true,

  steps: [
    {
      ...session.steps[0],
      id:
        'staged-search-step',
      prompt:
        'Ejercicio staged buscable',
    },
  ],
};

const content: ContentContextValue = {
  technologies,
  getTechnology: (id) => technologies.find((technology) => technology.id === id),
  getTopics: async (technologyId) => topics[technologyId] ?? [],
  getConceptsByTopic: async (topicId) => concepts[topicId] ?? [],
  getConcept: async () => null,
  getSessionsByConcept: async (conceptId) => conceptId === session.conceptId ? [session] : [],
  getSession: async () => null,
  isLoading: false,
};

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Ruta actual">{location.pathname}</output>;
}

function renderSearch(
  currentContent:
    ContentContextValue = content,
) {
  return render(
    <MemoryRouter>
      <SearchPopover content={currentContent} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function getDesktopInput() {
  return screen.getAllByRole('combobox', { name: 'Buscar temas, ejercicios o tecnologías' })[0];
}

describe(
  'SearchPopover · canonical practice gate',
  () => {
    it(
      'no indexa sesión ni ejercicios staged cuando backend la bloquea',
      async () => {
        // SEARCH_CANONICAL_PRACTICE_REGRESSION
        authMockState.accessToken =
          'search-test-token';

        const getLevelState =
          vi.spyOn(
            browserLearningApi,
            'getLevelState',
          ).mockResolvedValue({
            conceptId:
              stagedSession.conceptId,

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

        const stagedContent: ContentContextValue = {
          ...content,

          getSessionsByConcept:
            async conceptId =>
              conceptId
              === stagedSession.conceptId
                ? [
                    stagedSession,
                  ]
                : [],
        };

        const rendered =
          renderSearch(
            stagedContent,
          );

        try {
          const input =
            getDesktopInput();

          fireEvent.focus(
            input,
          );

          fireEvent.change(
            input,
            {
              target: {
                value:
                  'staged',
              },
            },
          );

          await waitFor(
            () => {
              expect(
                getLevelState,
              ).toHaveBeenCalledWith(
                stagedSession.conceptId,
                'foundation',
                'search-test-token',
              );
            },
          );

          expect(
            screen.queryByRole(
              'option',
              {
                name:
                  /Práctica staged buscable/i,
              },
            ),
          ).not.toBeInTheDocument();

          expect(
            screen.queryByRole(
              'option',
              {
                name:
                  /Ejercicio staged buscable/i,
              },
            ),
          ).not.toBeInTheDocument();
        } finally {
          rendered.unmount();

          authMockState.accessToken =
            null;

          getLevelState.mockRestore();
        }
      },
    );

    it(
      'indexa sesión y ejercicios staged cuando backend confirma acceso',
      async () => {
        authMockState.accessToken =
          'search-test-token';

        const getLevelState =
          vi.spyOn(
            browserLearningApi,
            'getLevelState',
          ).mockResolvedValue({
            conceptId:
              stagedSession.conceptId,

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
                  null,
              },

              quiz: {
                status:
                  'completed',
                completedAt:
                  null,
              },

              practice: {
                status:
                  'available',
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

        const stagedContent: ContentContextValue = {
          ...content,

          getSessionsByConcept:
            async conceptId =>
              conceptId
              === stagedSession.conceptId
                ? [
                    stagedSession,

                    {
                      ...stagedSession,

                      // SEARCH_LEVEL_STATE_DEDUPE_REGRESSION
                      id:
                        'js-arrays-staged-search-2',

                      title:
                        'Otra práctica Foundation',

                      steps: [
                        {
                          ...stagedSession.steps[0],

                          id:
                            'staged-search-step-2',

                          prompt:
                            'Otro ejercicio Foundation',
                        },
                      ],
                    },
                  ]
                : [],
        };

        const rendered =
          renderSearch(
            stagedContent,
          );

        try {
          const input =
            getDesktopInput();

          fireEvent.focus(
            input,
          );

          fireEvent.change(
            input,
            {
              target: {
                value:
                  'staged',
              },
            },
          );

          expect(
            await screen.findByRole(
              'option',
              {
                name:
                  /Práctica staged buscable/i,
              },
            ),
          ).toBeInTheDocument();

          expect(
            getLevelState,
          ).toHaveBeenCalledWith(
            stagedSession.conceptId,
            'foundation',
            'search-test-token',
          );


          expect(
            getLevelState.mock.calls.filter(
              ([
                conceptId,
                levelId,
              ]) =>
                conceptId
                  === stagedSession.conceptId
                && levelId
                  === 'foundation',
            ),
          ).toHaveLength(
            1,
          );
        } finally {
          rendered.unmount();

          authMockState.accessToken =
            null;

          getLevelState.mockRestore();
        }
      },
    );

    it(
      'falla cerrado para staged si getLevelState falla y mantiene legacy buscable',
      async () => {
        authMockState.accessToken =
          'search-error-token';

        const getLevelState =
          vi.spyOn(
            browserLearningApi,
            'getLevelState',
          ).mockRejectedValue(
            new Error(
              'learning unavailable',
            ),
          );

        const mixedContent: ContentContextValue = {
          ...content,

          getSessionsByConcept:
            async conceptId =>
              conceptId
              === session.conceptId
                ? [
                    session,
                    stagedSession,
                  ]
                : [],
        };

        const rendered =
          renderSearch(
            mixedContent,
          );

        try {
          const input =
            getDesktopInput();

          fireEvent.focus(
            input,
          );

          fireEvent.change(
            input,
            {
              target: {
                value:
                  'filter',
              },
            },
          );

          expect(
            await screen.findByRole(
              'option',
              {
                name:
                  /Filter no debería mutar/i,
              },
            ),
          ).toBeInTheDocument();

          fireEvent.change(
            input,
            {
              target: {
                value:
                  'staged',
              },
            },
          );

          await waitFor(
            () => {
              expect(
                getLevelState,
              ).toHaveBeenCalled();
            },
          );

          expect(
            screen.queryByRole(
              'option',
              {
                name:
                  /Práctica staged buscable/i,
              },
            ),
          ).not.toBeInTheDocument();
        } finally {
          rendered.unmount();

          authMockState.accessToken =
            null;

          getLevelState.mockRestore();
        }
      },
    );
  },
);

describe('SearchPopover', () => {
  beforeEach(() => localStorage.clear());

  it('abre al enfocar y muestra recientes y sugerencias del catálogo', async () => {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(['arrays', 'react']));
    renderSearch();
    fireEvent.focus(getDesktopInput());

    expect(screen.getByRole('heading', { name: 'Búsquedas recientes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'arrays' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sugeridos para ti' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: /JavaScript Tecnología · JavaScript/ })).toBeInTheDocument();
  });

  it('abre y enfoca la búsqueda con Cmd+K o Ctrl+K', async () => {
    renderSearch();
    const input = getDesktopInput();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Panel de búsqueda')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.keyDown(document, { key: 'K', ctrlKey: true });
    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('no intercepta el shortcut mientras se escribe en otro campo', () => {
    renderSearch();
    const externalInput = document.createElement('input');
    document.body.append(externalInput);
    externalInput.focus();

    fireEvent.keyDown(externalInput, { key: 'k', ctrlKey: true });

    expect(externalInput).toHaveFocus();
    expect(getDesktopInput()).toHaveAttribute('aria-expanded', 'false');
    externalInput.remove();
  });

  it('limpia el historial inmediatamente', () => {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(['arrays']));
    renderSearch();
    fireEvent.focus(getDesktopInput());
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

    expect(screen.queryByRole('button', { name: 'arrays' })).not.toBeInTheDocument();
    expect(screen.getByText('Aún no hay búsquedas recientes.')).toBeInTheDocument();
  });

  it('filtra por texto, muestra tipos reales y navega al hacer click', async () => {
    renderSearch();
    const input = getDesktopInput();
    input.focus();
    fireEvent.change(input, { target: { value: 'arrays' } });

    const option = await screen.findByRole('option', { name: /Arrays Tema · JavaScript/ });
    fireEvent.click(option);
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('/tech/javascript/js-arrays');
    expect(JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) ?? '[]')).toEqual(['arrays']);
    expect(screen.queryByLabelText('Panel de búsqueda')).not.toBeInTheDocument();
  });

  it('usa ArrowDown, ArrowUp y Enter conservando el foco', async () => {
    renderSearch();
    const input = getDesktopInput();
    input.focus();
    fireEvent.change(input, { target: { value: 'react' } });
    await screen.findByRole('option', { name: /React Tecnología/ });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getAllByRole('option').at(-1)).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('/tech/react');
  });

  it('cierra con Escape y click fuera', async () => {
    renderSearch();
    const input = getDesktopInput();
    fireEvent.focus(input);
    expect(screen.getByLabelText('Panel de búsqueda')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByLabelText('Panel de búsqueda')).not.toBeInTheDocument();

    fireEvent.focus(input);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByLabelText('Panel de búsqueda')).not.toBeInTheDocument();
  });

  it('muestra un empty state compacto cuando no encuentra resultados', async () => {
    renderSearch();
    fireEvent.change(getDesktopInput(), { target: { value: 'lenguaje-inexistente' } });
    await waitFor(() => expect(screen.getByText('No encontramos resultados para “lenguaje-inexistente”.')).toBeInTheDocument());
    expect(screen.getByText('Prueba con otra palabra.')).toBeInTheDocument();
  });

  it('abre el input adaptado desde el control móvil', () => {
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir búsqueda' }));
    const panel = screen.getByLabelText('Panel de búsqueda');
    expect(within(panel).getByRole('combobox')).toBeInTheDocument();
  });
});
