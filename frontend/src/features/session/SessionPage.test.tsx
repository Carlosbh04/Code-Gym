import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ContentProvider } from '@/contexts/ContentContext';
import { SessionRecoveryContext } from '@/contexts/session-recovery-context';
import { TrainingContext } from '@/contexts/training-context';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import { FakeSessionRecoveryStore } from '@/test/fake-session-recovery';
import { FakeTraining } from '@/test/fake-training';
import type { Concept, Technology, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { IContentRepository } from '@/types/repository';
import type { SessionRecoverySnapshot } from '@/lib/recovery/ISessionRecoveryStore';
import { browserLearningApi } from '@/features/learning/learning-api';
import type { LearningLevelState } from '@/features/learning/learning-types';

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

import SessionPage from './SessionPage';
import { RelativeActivityTime } from './components/SessionRecoveryDialog';

const SESSION_ID = 'js-arrays-map-vs-foreach-01';

const CHECKPOINT_SESSION_ID =
  'js-arrays-iteration-checkpoint-01';

const RETRY_LEVEL_STATE = {
  conceptId:
    'js-array-iteration',

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
        '2026-09-17T20:10:00.000Z',
    },

    practice: {
      status:
        'completed',
      completedAt:
        '2026-09-17T20:20:00.000Z',
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
} as const satisfies LearningLevelState;

const QUIZ_RETRY_LEVEL_STATE = {
  ...RETRY_LEVEL_STATE,

  stages: {
    ...RETRY_LEVEL_STATE.stages,

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
} as const satisfies LearningLevelState;

const QUIZ_PASSED_LEVEL_STATE = {
  ...QUIZ_RETRY_LEVEL_STATE,

  stages: {
    ...QUIZ_RETRY_LEVEL_STATE.stages,

    quiz: {
      status:
        'completed',
      completedAt:
        '2026-09-20T12:00:00.000Z',
    },

    practice: {
      status:
        'available',
      completedAt:
        null,
    },
  },
} as const satisfies LearningLevelState;

const repo = new StaticContentRepository();
function LocationProbe() {
  const location =
    useLocation();

  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

const renderAt = (
  sessionId: string,
  repository: IContentRepository = repo,
  _legacyExecution?: unknown,
  recovery: FakeSessionRecoveryStore = new FakeSessionRecoveryStore(),
  training: FakeTraining = new FakeTraining(),
) => {
  return render(
    <SessionRecoveryContext.Provider value={recovery}>
      <TrainingContext.Provider value={training.value}>
        <ContentProvider repository={repository}>
          <MemoryRouter
            initialEntries={[
              `/practice/${sessionId}`,
            ]}
          >
            <LocationProbe />
            <Routes>
              <Route
                path="/practice/:sessionId"
                element={<SessionPage />}
              />
              <Route
                path="/"
                element={<p>inicio</p>}
              />
            </Routes>
          </MemoryRouter>
        </ContentProvider>
      </TrainingContext.Provider>
    </SessionRecoveryContext.Provider>,
  );
};

const loaded = async (
  sessionId = SESSION_ID,
  repository: IContentRepository = repo,
  _legacyExecution?: unknown,
  recovery: FakeSessionRecoveryStore = new FakeSessionRecoveryStore(),
  training: FakeTraining = new FakeTraining(),
) => {
  const view = renderAt(
    sessionId,
    repository,
    undefined,
    recovery,
    training,
  );

  await waitFor(() =>
    expect(
      screen.queryByText(
        /Cargando la sesión/,
      ),
    ).toBeNull(),
  );

  return view;
};

const session = async (): Promise<ExerciseSession> =>
  (await repo.getSessionById(SESSION_ID))!;

const recoveryOf = (sessionId = SESSION_ID): SessionRecoverySnapshot => ({
  sessionId,
  currentStep: 0,
  answers: [],
  elapsedMs: 4_000,
  revealedHints: [],
  startTime: 1_000,
});

const checkpointSession =
  async (): Promise<ExerciseSession> => {
    const found =
      await repo.getSessionById(
        CHECKPOINT_SESSION_ID,
      );

    if (found === null) {
      throw new Error(
        'No existe el checkpoint real de Arrays',
      );
    }

    return found;
  };

/**
 * Completa los cuatro pasos del checkpoint real de Arrays.
 *
 * FakeTraining sigue siendo la autoridad del resultado durante
 * estos tests; las opciones se obtienen siempre del contenido real.
 */
const finishRealCheckpoint =
  async (): Promise<void> => {
    const real =
      await checkpointSession();

    for (
      let index = 0;
      index < real.steps.length - 1;
      index += 1
    ) {
      const step =
        real.steps[index];

      if (
        step.options === null
        || step.options.length === 0
      ) {
        throw new Error(
          `El paso ${step.id} no tiene opciones`,
        );
      }

      fireEvent.click(
        screen.getByRole(
          'radio',
          {
            name:
              step.options[0].text,
          },
        ),
      );

      await waitFor(
        () =>
          expect(
            screen.getByRole(
              'button',
              {
                name:
                  'Comprobar',
              },
            ),
          ).toBeEnabled(),
      );

      fireEvent.click(
        screen.getByRole(
          'button',
          {
            name:
              'Comprobar',
          },
        ),
      );

      await waitFor(
        () =>
          expect(
            screen.getByRole(
              'button',
              {
                name:
                  'Siguiente paso',
              },
            ),
          ).toBeEnabled(),
      );

      fireEvent.click(
        screen.getByRole(
          'button',
          {
            name:
              'Siguiente paso',
          },
        ),
      );
    }

    const lastStep =
      real.steps[
        real.steps.length - 1
      ];

    if (
      lastStep === undefined
      || lastStep.options === null
      || lastStep.options.length === 0
    ) {
      throw new Error(
        'El último paso del checkpoint no tiene opciones',
      );
    }

    fireEvent.click(
      screen.getByRole(
        'radio',
        {
          name:
            lastStep.options[0].text,
        },
      ),
    );

    await waitFor(
      () =>
        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Comprobar',
            },
          ),
        ).toBeEnabled(),
    );

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name:
            'Comprobar',
        },
      ),
    );

    await waitFor(
      () =>
        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Terminar sesión',
            },
          ),
        ).toBeEnabled(),
    );

    await act(
      async () => {
        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Terminar sesión',
            },
          ),
        );

        await Promise.resolve();
      },
    );
  };

/** Envía la respuesta ya elegida del paso visible y avanza al siguiente. */
const submitAndAdvance = async () => {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Siguiente paso' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));
};

/** Responde el paso find-error visible con la línea y el tipo indicados. */
const chooseError = (line: number, errorTypeText: string) => {
  fireEvent.click(screen.getByRole('radio', { name: new RegExp('^Línea ' + line + '\\b') }));
  fireEvent.click(screen.getByRole('radio', { name: errorTypeText }));
};

/** Responde el paso visible con la opción indicada y avanza al siguiente. */
const answerAndAdvance = async (optionText: string) => {
  fireEvent.click(screen.getByRole('radio', { name: optionText }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Siguiente paso' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));
};

/** Repositorio que falla al leer la sesión, sin ocultar el error. */
const failingRepo: IContentRepository = {
  getTechnologies: () => Promise.resolve([] as Technology[]),
  getTopicsByTechnology: () => Promise.resolve([] as Topic[]),
  getConceptsByTopic: () => Promise.resolve([] as Concept[]),
  getConceptById: () => Promise.resolve(null as Concept | null),
  getSessionsByConcept: () => Promise.resolve([]),
  getSessionById: () => Promise.reject(new Error('el contenido no se pudo leer')),
};

// SESSION_ENTRY_GATE_TEST_DEFAULT
beforeEach(
  () => {
    authMockState.accessToken =
      'session-page-test-token';

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
              'completed',
            completedAt:
              null,
          },

          quiz: {
            status:
              'available',
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
              'available',
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
  },
);

afterEach(
  () => {
    authMockState.accessToken =
      null;

    vi.restoreAllMocks();
  },
);

describe('SessionPage (T027)', () => {
  describe('carga', () => {
    it('muestra un estado de carga antes de tener la sesión', async () => {
      renderAt(SESSION_ID);

      expect(screen.getByRole('status')).toHaveTextContent(/Cargando la sesión/);
      await screen.findByRole('heading', { name: /forEach no devuelve/i });
    });

    it('carga una sesión real y muestra su título y posición', async () => {
      await loaded();
      const real = await session();

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(real.title);
      expect(screen.getByText(`Concepto: ${real.conceptId}`)).toBeInTheDocument();
      expect(screen.getByText('Principiante')).toBeInTheDocument();
      expect(screen.getByText(`Paso 1 de ${real.steps.length}`)).toBeInTheDocument();
    });

    it('renderiza el CodeReadingStep del primer paso', async () => {
      await loaded();
      const real = await session();
      const primero = real.steps[0];

      expect(primero.type).toBe('code-reading');
      expect(screen.getByRole('group', { name: primero.prompt })).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(primero.options!.length);
      expect(screen.getByRole('article', { name: 'Ejercicio actual' })).toHaveAttribute(
        'data-state',
        'default',
      );
    });
  });

  describe(
    'acceso canónico a sesiones staged',
    () => {
      it(
        'bloquea /practice/:sessionId cuando el backend marca el nivel como locked',
        async () => {
          // SESSION_ENTRY_DIRECT_ROUTE_REGRESSION
          const getLevelState =
            vi.spyOn(
              browserLearningApi,
              'getLevelState',
            ).mockResolvedValue({
              conceptId:
                'js-array-iteration',

              levelId:
                'foundation',

              previousLevelId:
                null,

              nextLevelId:
                'deepening',

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

          renderAt(
            SESSION_ID,
          );

          expect(
            await screen.findByRole(
              'heading',
              {
                name:
                  'Sesión bloqueada',
              },
            ),
          ).toBeInTheDocument();

          expect(
            getLevelState,
          ).toHaveBeenCalledWith(
            'js-array-iteration',
            'foundation',
            'session-page-test-token',
          );

          expect(
            screen.queryByRole(
              'article',
              {
                name:
                  'Ejercicio actual',
              },
            ),
          ).not.toBeInTheDocument();

          expect(
            screen.queryByRole(
              'button',
              {
                name:
                  'Comprobar',
              },
            ),
          ).not.toBeInTheDocument();
        },
      );

      it(
        'falla cerrado mientras todavía se verifica el estado del nivel',
        async () => {
          let resolveLevelState:
            | ((
                value:
                  Awaited<
                    ReturnType<
                      typeof browserLearningApi.getLevelState
                    >
                  >,
              ) => void)
            | undefined;

          vi.spyOn(
            browserLearningApi,
            'getLevelState',
          ).mockImplementation(
            () =>
              new Promise(
                resolve => {
                  resolveLevelState =
                    resolve;
                },
              ),
          );

          const rendered =
            renderAt(
              SESSION_ID,
            );

          try {
            expect(
              await screen.findByText(
                'Verificando acceso a la sesión…',
              ),
            ).toBeInTheDocument();

            expect(
              screen.queryByRole(
                'article',
                {
                  name:
                    'Ejercicio actual',
                },
              ),
            ).not.toBeInTheDocument();

            if (
              resolveLevelState
              === undefined
            ) {
              throw new Error(
                'No se capturó el resolver del estado canónico',
              );
            }

            resolveLevelState({
              conceptId:
                'js-array-iteration',
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

            expect(
              await screen.findByRole(
                'article',
                {
                  name:
                    'Ejercicio actual',
                },
              ),
            ).toBeInTheDocument();
          } finally {
            rendered.unmount();
          }
        },
      );
    },
  );

  describe('errores', () => {
    it('una sesión inexistente muestra el estado vacío con vuelta al inicio', async () => {
      await loaded('js-no-existe-99');

      expect(screen.getByText('No hemos encontrado esta sesión')).toBeInTheDocument();
      expect(screen.getByText(/Sesión no encontrada: js-no-existe-99/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
    });

    it('un fallo del repositorio no se oculta: se muestra su mensaje', async () => {
      await loaded(SESSION_ID, failingRepo);

      expect(screen.getByText('el contenido no se pudo leer')).toBeInTheDocument();
    });

    it('con error no se renderiza ningún paso', async () => {
      await loaded('js-no-existe-99');

      expect(screen.queryByRole('radio')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Comprobar' })).toBeNull();
    });
  });

  describe('flujo de respuesta', () => {
    it('Comprobar está deshabilitado hasta elegir una opción', async () => {
      await loaded();

      expect(screen.getByRole('button', { name: 'Comprobar' })).toBeDisabled();
    });

    it('al elegir una opción se habilita Comprobar', async () => {
      await loaded();
      const real = await session();

      fireEvent.click(screen.getByRole('radio', { name: real.steps[0].options![0].text }));

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled(),
      );
    });

    
    it('Siguiente está deshabilitado mientras no se haya respondido', async () => {
      await loaded();

      expect(screen.getByRole('button', { name: 'Siguiente paso' })).toBeDisabled();
    });

    it('avanza al paso siguiente tras responder', async () => {
      await loaded();
      const real = await session();

      fireEvent.click(screen.getByRole('radio', { name: real.steps[0].options![0].text }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Siguiente paso' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

      await waitFor(() =>
        expect(screen.getByText(`Paso 2 de ${real.steps.length}`)).toBeInTheDocument(),
      );
    });

    it('el paso predict-output se responde como cualquier otro (T031)', async () => {
      await loaded();
      const real = await session();
      const predictOutput = real.steps[1];

      await answerAndAdvance(real.steps[0].options![0].text);

      await waitFor(() =>
        expect(screen.getByRole('group', { name: predictOutput.prompt })).toBeInTheDocument(),
      );
      expect(predictOutput.type).toBe('predict-output');
      expect(screen.getAllByRole('radio')).toHaveLength(predictOutput.options!.length);
      expect(screen.getByRole('button', { name: 'Comprobar' })).toBeDisabled();

      fireEvent.click(screen.getByRole('radio', { name: predictOutput.options![0].text }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled(),
      );
    });

    it('el paso find-error exige línea y tipo antes de poder comprobar (T032)', async () => {
      await loaded();
      const real = await session();
      const findError = real.steps[2];

      await answerAndAdvance(real.steps[0].options![0].text);
      await answerAndAdvance(real.steps[1].options![0].text);

      await waitFor(() =>
        expect(screen.getByRole('group', { name: findError.prompt })).toBeInTheDocument(),
      );
      expect(findError.type).toBe('find-error');

      const comprobar = () => screen.getByRole('button', { name: 'Comprobar' });
      expect(comprobar()).toBeDisabled();

      // Solo la línea: sigue sin haber respuesta que enviar.
      fireEvent.click(screen.getByRole('radio', { name: /^Línea 1\b/ }));
      expect(comprobar()).toBeDisabled();

      // Línea + tipo: la respuesta ya está completa.
      fireEvent.click(screen.getByRole('radio', { name: findError.options![0].text }));
      await waitFor(() => expect(comprobar()).toBeEnabled());
    });

    
    it('find-error falla si la línea es correcta pero el tipo no (T032)', async () => {
      const training = new FakeTraining();
      training.answerIsCorrect = false;

      await loaded(
        SESSION_ID,
        repo,
        undefined,
        new FakeSessionRecoveryStore(),
        training,
      );
      const real = await session();
      const findError = real.steps[2];
      const incorrecta = findError.options![0];

      await answerAndAdvance(real.steps[0].options![0].text);
      await answerAndAdvance(real.steps[1].options![0].text);
      await waitFor(() =>
        expect(screen.getByRole('group', { name: findError.prompt })).toBeInTheDocument(),
      );

      chooseError(1, incorrecta.text);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled(),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));

      await waitFor(() =>
        expect(screen.getByText('Respuesta incorrecta')).toBeInTheDocument(),
      );
    });

    /** Avanza hasta el cuarto paso, que es el de fix-code. Requiere `loaded()`. */
    const llegarAFixCode = async () => {
      const real = await session();
      const findError = real.steps[2];

      await answerAndAdvance(real.steps[0].options![0].text);
      await answerAndAdvance(real.steps[1].options![0].text);
      await waitFor(() =>
        expect(screen.getByRole('group', { name: findError.prompt })).toBeInTheDocument(),
      );
      chooseError(1, findError.options![0].text);
      await submitAndAdvance();

      const fixCode = real.steps[3];
      await waitFor(() =>
        expect(screen.getByRole('group', { name: fixCode.prompt })).toBeInTheDocument(),
      );
      return fixCode;
    };

    /** Pone el editor en modo texto y escribe la solución dada. */
    const escribirCodigo = async (codigo: string) => {
      fireEvent.click(
        await screen.findByRole('button', { name: 'Usar editor de texto simple' }),
      );
      fireEvent.change(screen.getByRole('textbox'), { target: { value: codigo } });
    };

    const SOLUCION = 'function dobles(numeros) {\n  return numeros.map((n) => n * 2);\n}';

    it('el paso fix-code muestra el editor con el código del ejercicio (T041)', async () => {
      await loaded();
      const fixCode = await llegarAFixCode();

      expect(fixCode.type).toBe('fix-code');
      await waitFor(() => expect(document.querySelector('.cm-editor')).not.toBeNull());
      expect(screen.getByRole('textbox')).toHaveAccessibleName('Editor de código');
      expect(document.body.textContent).toContain('numeros.forEach');
    });

    it('ya no queda ningún tipo de paso sin implementar', async () => {
      await loaded();
      await llegarAFixCode();

      expect(screen.queryByText(/todavía no están disponibles/)).toBeNull();
    });

    
    
    
    
    
    it('lo que se escribe en el editor se conserva', async () => {
      await loaded();
      await llegarAFixCode();

      await escribirCodigo('const mio = 1;');

      await waitFor(() =>
        expect(screen.getByRole('textbox')).toHaveValue('const mio = 1;'),
      );
    });

    it('el editor no ejecuta el código del ejercicio', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      await loaded();
      await llegarAFixCode();

      expect(log).not.toHaveBeenCalled();
      log.mockRestore();
    });

    it('un quiz completado continúa al recorrido sin mostrar resultados finales', async () => {
      vi.spyOn(
        browserLearningApi,
        'getLevelState',
      ).mockResolvedValue(
        QUIZ_PASSED_LEVEL_STATE,
      );

      const quizRepo =
        Object.create(repo) as typeof repo;

      quizRepo.getSessionById =
        async (id: string) => {
          const real =
            await repo.getSessionById(id);

          return real === null
            ? null
            : {
                ...real,
                kind: 'quiz' as const,
              };
        };

      renderAt(
        SESSION_ID,
        quizRepo,
      );

      await screen.findByRole(
        'heading',
        {
          name: /forEach no devuelve/i,
        },
      );

      await llegarAFixCode();
      await escribirCodigo(SOLUCION);

      fireEvent.click(
        screen.getByRole(
          'button',
          {
            name: 'Comprobar',
          },
        ),
      );

      await waitFor(() =>
        expect(
          screen.getByText(
            'Respuesta correcta',
          ),
        ).toBeInTheDocument(),
      );

      fireEvent.click(
        screen.getByRole(
          'button',
          {
            name: 'Terminar sesión',
          },
        ),
      );

      expect(
        await screen.findByRole(
          'heading',
          {
            name:
              'Has desbloqueado la práctica',
          },
        ),
      ).toBeInTheDocument();

      await waitFor(
        () => {
          expect(
            screen.getByRole(
              'link',
              {
                name:
                  'Continuar a práctica',
              },
            ),
          ).toHaveAttribute(
            'href',
            '/tech/javascript/js-arrays?concept=js-array-iteration&stage=practice',
          );
        },
      );

      expect(
        screen.queryByRole(
          'link',
          {
            name:
              'Ver resultados',
          },
        ),
      ).toBeNull();
    });

    it(
      'un test finalizado pero no superado mantiene la práctica bloqueada y permite reintentar',
      async () => {
        const getLevelState =
          vi.spyOn(
            browserLearningApi,
            'getLevelState',
          ).mockResolvedValue(
            QUIZ_RETRY_LEVEL_STATE,
          );

        const quizRepo =
          Object.create(repo) as typeof repo;

        quizRepo.getSessionById =
          async (id: string) => {
            const real =
              await repo.getSessionById(id);

            return real === null
              ? null
              : {
                  ...real,
                  kind:
                    'quiz' as const,
                };
          };

        const training =
          new FakeTraining();

        training.answerIsCorrect =
          false;

        await loaded(
          SESSION_ID,
          quizRepo,
          undefined,
          new FakeSessionRecoveryStore(),
          training,
        );

        await llegarAFixCode();
        await escribirCodigo(
          SOLUCION,
        );

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Comprobar',
            },
          ),
        );

        await waitFor(
          () =>
            expect(
              screen.getByText(
                'Respuesta incorrecta',
              ),
            ).toBeInTheDocument(),
        );

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Terminar sesión',
            },
          ),
        );

        expect(
          await screen.findByRole(
            'heading',
            {
              name:
                'Aún no has superado el test',
            },
          ),
        ).toBeInTheDocument();

        expect(
          screen.queryByRole(
            'heading',
            {
              name:
                'Has desbloqueado la práctica',
            },
          ),
        ).toBeNull();

        expect(
          screen.getByText(
            /la práctica continúa bloqueada/i,
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByRole(
            'link',
            {
              name:
                'Volver al recorrido',
            },
          ),
        ).toHaveAttribute(
          'href',
          '/tech/javascript/js-arrays?concept=js-array-iteration',
        );

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Reintentar test',
            },
          ),
        );

        await waitFor(
          () => {
            expect(
              training.startCalls,
            ).toEqual([
              SESSION_ID,
              SESSION_ID,
            ]);
          },
        );

        expect(
          getLevelState,
        ).toHaveBeenCalledWith(
          'js-array-iteration',
          'foundation',
          'session-page-test-token',
        );
      },
    );


    it(
      'un checkpoint guardado que no completa el nivel no muestra celebración final',
      async () => {
        authMockState.accessToken =
          'checkpoint-access-token';

        const getLevelState =
          vi.spyOn(
            browserLearningApi,
            'getLevelState',
          ).mockResolvedValue(
            RETRY_LEVEL_STATE,
          );

        const getConceptState =
          vi.spyOn(
            browserLearningApi,
            'getConceptState',
          );

        const rendered =
          await loaded(
            CHECKPOINT_SESSION_ID,
          );

        try {
          await finishRealCheckpoint();

          expect(
            await screen.findByRole(
              'heading',
              {
                name:
                  'Casi lo tienes',
              },
            ),
          ).toBeInTheDocument();

          expect(
            await screen.findByRole(
              'progressbar',
              {
                name:
                  'Progreso de Fundamentos',
              },
            ),
          ).toHaveAttribute(
            'aria-valuenow',
            '75',
          );

          expect(
            await screen.findByText(
              (
                _content,
                element,
              ) =>
                element?.tagName
                  === 'P'
                && element.textContent
                  === '75% · Fundamentos · Nivel aún no superado',
            ),
          ).toBeInTheDocument();

          expect(
            screen.getByText(
              'Tu progreso está guardado.',
            ),
          ).toBeInTheDocument();

          expect(
            getLevelState,
          ).toHaveBeenCalledWith(
            'js-array-iteration',
            'foundation',
            'checkpoint-access-token',
          );

          await waitFor(
            () => {
              expect(
                screen.getByRole(
                  'link',
                  {
                    name:
                      'Volver al recorrido',
                  },
                ),
              ).toHaveAttribute(
                'href',
                '/tech/javascript/js-arrays?concept=js-array-iteration',
              );
            },
          );

          expect(
            screen.getByRole(
              'button',
              {
                name:
                  'Reintentar checkpoint',
              },
            ),
          ).toBeInTheDocument();

          expect(
            getConceptState,
          ).not.toHaveBeenCalled();

          expect(
            screen.queryByRole(
              'link',
              {
                name:
                  'Ver resultados',
              },
            ),
          ).toBeNull();

          expect(
            document.querySelector(
              '[data-confetti-event]',
            ),
          ).toBeNull();

          fireEvent.click(
            screen.getByRole(
              'link',
              {
                name:
                  'Volver al recorrido',
              },
            ),
          );

          await waitFor(
            () => {
              expect(
                screen.getByTestId(
                  'location',
                ),
              ).toHaveTextContent(
                '/tech/javascript/js-arrays?concept=js-array-iteration',
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
      'reintenta directamente solo el checkpoint actual con un TrainingRun nuevo',
      async () => {
        authMockState.accessToken =
          'checkpoint-access-token';

        vi.spyOn(
          browserLearningApi,
          'getLevelState',
        ).mockResolvedValue(
          RETRY_LEVEL_STATE,
        );

        const training =
          new FakeTraining();

        const rendered =
          await loaded(
            CHECKPOINT_SESSION_ID,
            repo,
            undefined,
            new FakeSessionRecoveryStore(),
            training,
          );

        try {
          await finishRealCheckpoint();

          await screen.findByRole(
            'heading',
            {
              name:
                'Casi lo tienes',
            },
          );

          expect(
            training.startCalls,
          ).toEqual([
            CHECKPOINT_SESSION_ID,
          ]);

          expect(
            training.submitCalls,
          ).toHaveLength(
            4,
          );

          fireEvent.click(
            screen.getByRole(
              'button',
              {
                name:
                  'Reintentar checkpoint',
              },
            ),
          );

          await waitFor(
            () => {
              expect(
                training.startCalls,
              ).toEqual([
                CHECKPOINT_SESSION_ID,
                CHECKPOINT_SESSION_ID,
              ]);
            },
          );

          expect(
            await screen.findByRole(
              'button',
              {
                name:
                  'Comprobar',
              },
            ),
          ).toBeDisabled();

          expect(
            training.submitCalls,
          ).toHaveLength(
            4,
          );
        } finally {
          rendered.unmount();
        }
      },
    );

    it(
      'un checkpoint de foundation completado desbloquea el siguiente nivel sin cerrar el concepto',
      async () => {
        authMockState.accessToken =
          'checkpoint-access-token';

        const getLevelState =
          vi.spyOn(
            browserLearningApi,
            'getLevelState',
          ).mockResolvedValue({
            conceptId:
              'js-array-iteration',

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
                  '2026-09-17T20:10:00.000Z',
              },

              practice: {
                status:
                  'completed',
                completedAt:
                  '2026-09-17T20:20:00.000Z',
              },

              checkpoint: {
                status:
                  'completed',
                completedAt:
                  '2026-09-17T20:30:00.000Z',
              },
            },

            completed:
              true,

            completedAt:
              '2026-09-17T20:30:00.000Z',
          });

        const getConceptState =
          vi.spyOn(
            browserLearningApi,
            'getConceptState',
          );

        const rendered =
          await loaded(
            CHECKPOINT_SESSION_ID,
          );

        try {
          await finishRealCheckpoint();

          expect(
            await screen.findByRole(
              'heading',
              {
                name:
                  'Has desbloqueado el siguiente nivel',
              },
            ),
          ).toBeInTheDocument();

          expect(
            getLevelState,
          ).toHaveBeenCalledWith(
            'js-array-iteration',
            'foundation',
            'checkpoint-access-token',
          );

          await waitFor(
            () => {
              expect(
                screen.getByRole(
                  'link',
                  {
                    name:
                      'Volver al recorrido',
                  },
                ),
              ).toHaveAttribute(
                'href',
                '/tech/javascript/js-arrays',
              );
            },
          );

          expect(
            getConceptState,
          ).not.toHaveBeenCalled();

          expect(
            screen.queryByRole(
              'heading',
              {
                name:
                  '¡Sesión completada!',
              },
            ),
          ).toBeNull();

          expect(
            screen.queryByRole(
              'heading',
              {
                name:
                  'Casi lo tienes',
              },
            ),
          ).toBeNull();

          expect(
            screen.queryByRole(
              'button',
              {
                name:
                  'Reintentar checkpoint',
              },
            ),
          ).toBeNull();

          expect(
            screen.queryByRole(
              'link',
              {
                name:
                  'Ver resultados',
              },
            ),
          ).toBeNull();

          expect(
            document.querySelector(
              '[data-confetti-event]',
            ),
          ).toBeNull();
        } finally {
          rendered.unmount();

          authMockState.accessToken =
            null;

          vi.restoreAllMocks();
        }
      },
    );

    it(
      'el checkpoint del último nivel celebra solo cuando el concepto está completado',
      async () => {
        authMockState.accessToken =
          'checkpoint-access-token';

        const getLevelState =
          vi.spyOn(
            browserLearningApi,
            'getLevelState',
          ).mockResolvedValue({
            conceptId:
              'js-array-iteration',

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
                  '2026-09-17T20:00:00.000Z',
              },

              quiz: {
                status:
                  'completed',
                completedAt:
                  '2026-09-17T20:10:00.000Z',
              },

              practice: {
                status:
                  'completed',
                completedAt:
                  '2026-09-17T20:20:00.000Z',
              },

              checkpoint: {
                status:
                  'completed',
                completedAt:
                  '2026-09-17T20:30:00.000Z',
              },
            },

            completed:
              true,

            completedAt:
              '2026-09-17T20:30:00.000Z',
          });

        const getConceptState =
          vi.spyOn(
            browserLearningApi,
            'getConceptState',
          ).mockResolvedValue({
            conceptId:
              'js-array-iteration',

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
                  '2026-09-17T20:10:00.000Z',
              },

              practice: {
                status:
                  'completed',
                completedAt:
                  '2026-09-17T20:20:00.000Z',
              },

              checkpoint: {
                status:
                  'completed',
                completedAt:
                  '2026-09-17T20:30:00.000Z',
              },
            },

            completed:
              true,

            completedAt:
              '2026-09-17T20:30:00.000Z',
          });

        const rendered =
          await loaded(
            CHECKPOINT_SESSION_ID,
          );

        try {
          await finishRealCheckpoint();

          expect(
            await screen.findByRole(
              'heading',
              {
                name:
                  '¡Sesión completada!',
              },
            ),
          ).toBeInTheDocument();

          expect(
            getLevelState,
          ).toHaveBeenCalledWith(
            'js-array-iteration',
            'foundation',
            'checkpoint-access-token',
          );

          expect(
            getConceptState,
          ).toHaveBeenCalledWith(
            'js-array-iteration',
            'checkpoint-access-token',
          );

          expect(
            screen.getByRole(
              'link',
              {
                name:
                  'Ver resultados',
              },
            ),
          ).toHaveAttribute(
            'href',
            `/results/${CHECKPOINT_SESSION_ID}`,
          );

          expect(
            document.querySelector(
              '[data-confetti-event]',
            ),
          ).not.toBeNull();
        } finally {
          rendered.unmount();

          authMockState.accessToken =
            null;

          vi.restoreAllMocks();
        }
      },
    );

    it(
      'una práctica completada guarda el progreso sin mostrar celebración final',
      async () => {
        await loaded();
        await llegarAFixCode();
        await escribirCodigo(SOLUCION);

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Comprobar',
            },
          ),
        );

        await waitFor(
          () =>
            expect(
              screen.getByText(
                'Respuesta correcta',
              ),
            ).toBeInTheDocument(),
        );

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Terminar sesión',
            },
          ),
        );

        expect(
          await screen.findByRole(
            'heading',
            {
              name:
                'Progreso guardado',
            },
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            'Práctica completada',
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByRole(
            'link',
            {
              name:
                'Continuar recorrido',
            },
          ),
        ).toHaveAttribute(
          'href',
          '/tech/javascript/js-arrays',
        );

        expect(
          screen.queryByRole(
            'heading',
            {
              name:
                '¡Sesión completada!',
            },
          ),
        ).toBeNull();

        expect(
          screen.queryByRole(
            'link',
            {
              name:
                'Ver resultados',
            },
          ),
        ).toBeNull();

        expect(
          document.querySelector(
            '[data-confetti-event]',
          ),
        ).toBeNull();
      },
    );
  });

  describe('pistas (T033)', () => {
    const pedirPista = () => screen.getByRole('button', { name: /pista/i });

    it('ofrece las pistas del paso actual sin revelarlas', async () => {
      await loaded();
      const real = await session();
      const step = real.steps[0];

      expect(screen.getByRole('region', { name: 'Pistas' })).toBeInTheDocument();
      expect(pedirPista()).toBeEnabled();
      expect(step.hintCount).toBeGreaterThan(0);
      expect(screen.queryByText('Pista autorizada 1')).toBeNull();
    });

    it('las revela de una en una y en orden', async () => {
      await loaded();
      const real = await session();
      const hintCount = real.steps[0].hintCount;

      for (let i = 0; i < hintCount; i += 1) {
        fireEvent.click(pedirPista());
        await waitFor(() =>
          expect(screen.getByText(`Pista autorizada ${i + 1}`)).toBeInTheDocument(),
        );

        // Ninguna posterior se ha adelantado.
        expect(screen.queryByText(`Pista autorizada ${i + 2}`)).toBeNull();
      }
    });

    it('al agotarlas el botón se deshabilita', async () => {
      await loaded();
      const real = await session();

      for (let i = 0; i < real.steps[0].hintCount; i += 1) {
        fireEvent.click(pedirPista());
        await waitFor(() =>
          expect(screen.getByText(`Pista autorizada ${i + 1}`)).toBeInTheDocument(),
        );
      }

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'No quedan más pistas' })).toBeDisabled(),
      );
    });

    it('tras responder ya no se piden pistas', async () => {
      await loaded();
      const real = await session();

      fireEvent.click(screen.getByRole('radio', { name: real.steps[0].options![0].text }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));

      await waitFor(() => expect(pedirPista()).toBeDisabled());
    });

    it('al pasar de paso las pistas vuelven a empezar', async () => {
      await loaded();
      const real = await session();

      fireEvent.click(pedirPista());
      await waitFor(() => expect(screen.getByText('Pista autorizada 1')).toBeInTheDocument());

      await answerAndAdvance(real.steps[0].options![0].text);

      await waitFor(() =>
        expect(screen.getByRole('group', { name: real.steps[1].prompt })).toBeInTheDocument(),
      );
      expect(screen.queryByText('Pista autorizada 1')).toBeNull();
      expect(pedirPista()).toBeEnabled();
      expect(real.steps[1].hintCount).toBeGreaterThan(0);
    });
  });

  describe('accesibilidad', () => {
    it('aporta un único h1 y ningún landmark main propio', async () => {
      const { container } = await loaded();

      expect(container.querySelectorAll('h1')).toHaveLength(1);
      expect(container.querySelectorAll('main')).toHaveLength(0);
    });

    it('los botones cumplen el área mínima de 44px', async () => {
      const { container } = await loaded();

      for (const button of container.querySelectorAll('button')) {
        expect(button.className).toContain('min-h-11');
      }
    });

    it('los radios son enfocables, y los botones en cuanto se habilitan', async () => {
      await loaded();
      const real = await session();

      // De inicio ambos botones están deshabilitados, así que no son
      // enfocables: lo alcanzable por teclado son las opciones.
      const radio = screen.getByRole('radio', { name: real.steps[0].options![0].text });
      radio.focus();
      expect(document.activeElement).toBe(radio);

      fireEvent.click(radio);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());

      const comprobar = screen.getByRole('button', { name: 'Comprobar' });
      comprobar.focus();
      expect(document.activeElement).toBe(comprobar);
    });

    it('el estado de carga se anuncia', async () => {
      renderAt(SESSION_ID);

      expect(screen.getByRole('status')).toBeInTheDocument();
      await screen.findByRole('heading', { name: /forEach no devuelve/i });
    });
  });

  describe('seguridad', () => {
    it('no ejecuta el código del ejercicio', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      await loaded();
      const real = await session();

      expect(real.steps[0].code).toContain('console.log');
      expect(log).not.toHaveBeenCalled();
      log.mockRestore();
    });
  });

  describe('integración con StepIndicator y ResultFeedback (T029/T030)', () => {
    it('muestra el indicador de pasos con el primero en curso', async () => {
      await loaded();
      const real = await session();
      const lista = screen.getByRole('list', { name: 'Progreso de la sesión' });

      expect(within(lista).getAllByRole('listitem')).toHaveLength(real.steps.length);
      expect(within(lista).getByText('Paso 1: en curso')).toBeInTheDocument();
      expect(screen.getByText(`Paso 1 de ${real.steps.length}`)).toBeInTheDocument();
    });

    it('no muestra feedback antes de responder', async () => {
      await loaded();

      expect(screen.queryByText('Respuesta correcta')).toBeNull();
      expect(screen.queryByText('Respuesta incorrecta')).toBeNull();
    });

    
    
    it('el indicador avanza al pasar de paso y marca el anterior completado', async () => {
      await loaded();
      const real = await session();

      fireEvent.click(screen.getByRole('radio', { name: real.steps[0].options![0].text }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Siguiente paso' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

      await waitFor(() => {
        const lista = screen.getByRole('list', { name: 'Progreso de la sesión' });
        expect(within(lista).getByText('Paso 1: completado')).toBeInTheDocument();
        expect(within(lista).getByText('Paso 2: en curso')).toBeInTheDocument();
      });
    });

    
    it('el indicador no permite saltar de paso', async () => {
      await loaded();
      const lista = screen.getByRole('list', { name: 'Progreso de la sesión' });

      expect(within(lista).queryAllByRole('button')).toEqual([]);
      expect(within(lista).queryAllByRole('link')).toEqual([]);
    });
  });
});

describe('SessionPage · recovery (T052)', () => {
  it('muestra la decisión canónica antes de renderizar o sobrescribir la sesión', async () => {
    const real = await session();
    const lastActivityAt = Date.now() - 12 * 60_000;
    const recovery = new FakeSessionRecoveryStore();
    recovery.snapshot = {
      ...recoveryOf(),
      currentStep: 1,
      answers: [{
        stepId: real.steps[0].id,
        stepType: real.steps[0].type,
        answer: 'b',
        isCorrect: true,
        timeSpentMs: 2_000,
        hintsUsed: 0,
      }],
      lastActivityAt,
    };
    renderAt('js-functions-return-flow-01', repo, undefined, recovery);

    const title = await screen.findByRole('heading', { name: 'Tienes una sesión incompleta' });
    const dialog = screen.getByRole('dialog');
    expect(title).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription(
      'Puedes continuar donde lo dejaste o descartar esta sesión y empezar una nueva.',
    );
    expect(await screen.findByText('JavaScript')).toBeInTheDocument();
    expect(dialog.querySelector('[data-technology-icon="javascript"] img')).toHaveAttribute(
      'src',
      expect.stringMatching(/javascript\.png$/),
    );
    expect(screen.getByText(real.title)).toBeInTheDocument();
    expect(screen.getByText('Arrays · Métodos de iteración de arrays')).toBeInTheDocument();
    expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('1 de 4 ejercicios')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progreso de la sesión recuperable' })).toHaveAttribute(
      'aria-valuetext',
      '1 de 4 ejercicios completados',
    );
    expect(screen.getByText(/Última actividad: hace 12 minutos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Empezar de nuevo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeEnabled();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continuar' }));
    expect(recovery.saves).toHaveLength(0);
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('cerrar conserva el recovery y vuelve al topic real', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.snapshot = recoveryOf();
    renderAt('js-functions-return-flow-01', repo, undefined, recovery);

    await screen.findByText('JavaScript');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/tech/javascript/js-arrays'));
    expect(recovery.clearCalls).toBe(0);
    expect(recovery.snapshot).not.toBeNull();
  });

  it('Escape cierra sin borrar el recovery', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.snapshot = recoveryOf();
    renderAt('js-functions-return-flow-01', repo, undefined, recovery);

    const dialog = await screen.findByRole('dialog');
    await screen.findByText('JavaScript');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/tech/javascript/js-arrays'));
    expect(recovery.clearCalls).toBe(0);
    expect(recovery.snapshot).not.toBeNull();
  });

  it('un snapshot anterior sin lastActivityAt usa startTime sin inventar otra fecha', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(61_000);
    const recovery = new FakeSessionRecoveryStore();
    recovery.snapshot = recoveryOf();
    renderAt('js-functions-return-flow-01', repo, undefined, recovery);

    expect(await screen.findByText(/Última actividad: hace 1 minuto/)).toBeInTheDocument();
    expect(recovery.saves).toHaveLength(0);
  });

  it('continúa el sessionId almacenado y navega a él si la URL era distinta', async () => {
    const requested = 'js-functions-return-flow-01';
    const recovery = new FakeSessionRecoveryStore();
    recovery.snapshot = recoveryOf(SESSION_ID);
    renderAt(requested, repo, undefined, recovery);

    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }));

    await screen.findByRole('heading', { name: /forEach no devuelve/i });
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/practice/${SESSION_ID}`,
    );
    expect(recovery.clearCalls).toBe(0);
  });

  it('Empezar de nuevo descarta explícitamente el recovery anterior y conserva la URL solicitada', async () => {
    const requested = 'js-functions-return-flow-01';
    const recovery = new FakeSessionRecoveryStore();
    recovery.snapshot = recoveryOf(SESSION_ID);
    renderAt(requested, repo, undefined, recovery);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Empezar de nuevo' }),
    );

    await screen.findByRole('heading', { name: /Salir de una función/i });
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/practice/${requested}`,
    );
    expect(recovery.clearCalls).toBe(1);
    await waitFor(() => expect(recovery.snapshot?.sessionId).toBe(requested));
  });

  it('INVALID_JSON muestra error page y no ofrece descarte parcial', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.loadError = 'INVALID_JSON';
    renderAt(SESSION_ID, repo, undefined, recovery);

    expect(
      await screen.findByRole('heading', {
        name: 'No se pudo leer la sesión guardada',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('JSON inválido');
    expect(screen.queryByRole('button', { name: 'Empezar de nuevo' })).toBeNull();
    expect(recovery.clearCalls).toBe(0);
  });

  it('RECOVERY_FAILED permite empezar de nuevo sin restauración parcial', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.loadError = 'RECOVERY_FAILED';
    renderAt(SESSION_ID, repo, undefined, recovery);

    expect(await screen.findByText('No se pudo recuperar')).toBeInTheDocument();
    recovery.loadError = null;
    fireEvent.click(screen.getByRole('button', { name: 'Empezar de nuevo' }));

    await screen.findByRole('heading', { name: /forEach no devuelve/i });
    expect(recovery.clearCalls).toBe(1);
  });

  it('avisa de STORAGE_UNAVAILABLE sin bloquear la práctica ni ofrecer retry', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.loadError = 'STORAGE_UNAVAILABLE';
    renderAt(SESSION_ID, repo, undefined, recovery);

    await screen.findByRole('heading', { name: /forEach no devuelve/i });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La sesión continuará en memoria',
    );
    expect(screen.queryByRole('button', { name: 'Reintentar guardado' })).toBeNull();
  });

  it('avisa de STORAGE_FULL y conecta el retry de persistencia', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.saveError = 'STORAGE_FULL';
    renderAt(SESSION_ID, repo, undefined, recovery);

    const retry = await screen.findByRole('button', {
      name: 'Reintentar guardado',
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tu estado sigue en memoria',
    );

    recovery.saveError = null;
    fireEvent.click(retry);
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(recovery.snapshot?.sessionId).toBe(SESSION_ID);
  });
});

describe('RelativeActivityTime', () => {
  it('actualiza el texto cada minuto y limpia su interval al desmontar', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(13 * 60_000);
      const view = render(<RelativeActivityTime timestamp={60_000} />);
      expect(screen.getByText('hace 12 minutos')).toBeInTheDocument();
      expect(vi.getTimerCount()).toBe(1);

      act(() => vi.advanceTimersByTime(60_000));
      expect(screen.getByText('hace 13 minutos')).toBeInTheDocument();

      view.unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
