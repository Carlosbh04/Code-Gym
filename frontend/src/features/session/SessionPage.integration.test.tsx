import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom';

import { ContentProvider } from '@/contexts/ContentContext';
import { SessionRecoveryProvider } from '@/contexts/SessionRecoveryContext';
import { TrainingContext } from '@/contexts/training-context';

import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import { SessionStorageRecoveryStore } from '@/lib/recovery/SessionStorageRecoveryStore';

import { FakeTraining } from '@/test/fake-training';

import SessionPage from './SessionPage';


const SESSION_ID =
  'js-arrays-map-vs-foreach-01';

const RECOVERY_KEY =
  'codegym:session';

const LEGACY_KEYS = [
  'codegym:progress',
  'codegym:attempts',
  'codegym:completed-sessions',
] as const;

const SOLUTION =
  'function dobles(numeros) {\n'
  + '  return numeros.map((n) => n * 2);\n'
  + '}';

const repository =
  new StaticContentRepository();

function renderIntegratedSession(
  training: FakeTraining,
) {
  return render(
    <TrainingContext.Provider
      value={training.value}
    >
      <SessionRecoveryProvider
        store={
          new SessionStorageRecoveryStore()
        }
      >
        <ContentProvider
          repository={repository}
        >

            <MemoryRouter
              initialEntries={[
                `/practice/${SESSION_ID}`,
              ]}
            >
              <Routes>
                <Route
                  path="/practice/:sessionId"
                  element={<SessionPage />}
                />
              </Routes>
            </MemoryRouter>
        </ContentProvider>
      </SessionRecoveryProvider>
    </TrainingContext.Provider>,
  );
}


async function answerAndAdvance(
  option: string,
): Promise<void> {
  fireEvent.click(
    screen.getByRole(
      'radio',
      {
        name: option,
      },
    ),
  );

  const check =
    screen.getByRole(
      'button',
      {
        name: 'Comprobar',
      },
    );

  await waitFor(() =>
    expect(
      check,
    ).toBeEnabled(),
  );

  fireEvent.click(
    check,
  );

  const next =
    screen.getByRole(
      'button',
      {
        name: 'Siguiente paso',
      },
    );

  await waitFor(() =>
    expect(
      next,
    ).toBeEnabled(),
  );

  fireEvent.click(
    next,
  );
}


beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe(
  'SessionPage · integración backend-authoritative (T229.6E)',
  () => {
    it(
      'completa un TrainingRun de cuatro ejercicios sin persistir progreso local',
      async () => {
        const training =
          new FakeTraining();

        const session =
          await repository
            .getSessionById(
              SESSION_ID,
            );

        if (
          session === null
        ) {
          throw new Error(
            'No existe la sesión de integración',
          );
        }

        renderIntegratedSession(
          training,
        );

        await screen.findByRole(
          'heading',
          {
            name:
              /forEach no devuelve/i,
          },
        );

        await waitFor(() =>
          expect(
            training.startCalls,
          ).toEqual([
            SESSION_ID,
          ]),
        );


        // 1 — code-reading
        await answerAndAdvance(
          session
            .steps[0]
            .options![0]
            .text,
        );


        // 2 — predict-output
        await answerAndAdvance(
          session
            .steps[1]
            .options![0]
            .text,
        );


        // 3 — find-error
        const findError =
          session.steps[2];

        fireEvent.click(
          screen.getByRole(
            'radio',
            {
              name:
                new RegExp(
                  `^Línea ${1}\\b`,
                ),
            },
          ),
        );

        const selectedType =
          findError.options![0];

        if (selectedType === undefined) {
          throw new Error(
            'find-error no tiene opciones públicas',
          );
        }

        fireEvent.click(
          screen.getByRole(
            'radio',
            {
              name:
                selectedType.text,
            },
          ),
        );

        const errorCheck =
          screen.getByRole(
            'button',
            {
              name: 'Comprobar',
            },
          );

        await waitFor(() =>
          expect(
            errorCheck,
          ).toBeEnabled(),
        );

        fireEvent.click(
          errorCheck,
        );

        const next =
          screen.getByRole(
            'button',
            {
              name:
                'Siguiente paso',
            },
          );

        await waitFor(() =>
          expect(
            next,
          ).toBeEnabled(),
        );

        fireEvent.click(
          next,
        );


        // 4 — fix-code
        fireEvent.click(
          await screen.findByRole(
            'button',
            {
              name:
                'Usar editor de texto simple',
            },
          ),
        );

        fireEvent.change(
          screen.getByRole(
            'textbox',
          ),
          {
            target: {
              value:
                SOLUTION,
            },
          },
        );

        const finalCheck =
          screen.getByRole(
            'button',
            {
              name:
                'Comprobar',
            },
          );

        await waitFor(() =>
          expect(
            finalCheck,
          ).toBeEnabled(),
        );

        fireEvent.click(
          finalCheck,
        );

        await waitFor(() =>
          expect(
            screen.getByText(
              'Respuesta correcta',
            ),
          ).toBeInTheDocument(),
        );


        // El backend fake recibió
        // exactamente cuatro answers.
        await waitFor(() =>
          expect(
            training.submitCalls,
          ).toHaveLength(4),
        );

        expect(
          training.startCalls,
        ).toEqual([
          SESSION_ID,
        ]);

        expect(
          training
            .submitCalls
            .map(
              (call) =>
                call.input.exerciseId,
            ),
        ).toEqual(
          session.steps.map(
            (step) =>
              step.id,
          ),
        );

        expect(
          new Set(
            training
              .submitCalls
              .map(
                (call) =>
                  call.runId,
              ),
          ),
        ).toEqual(
          new Set([
            training.runId,
          ]),
        );


        // El navegador solo envía
        // el contrato permitido.
        for (
          const call
          of training.submitCalls
        ) {
          expect(
            Object.keys(
              call.input,
            ).sort(),
          ).toEqual([
            'answer',
            'durationMs',
            'exerciseId',
          ]);

          expect(
            call.input,
          ).not.toHaveProperty(
            'isCorrect',
          );

          expect(
            call.input,
          ).not.toHaveProperty(
            'userId',
          );

          expect(
            call.input,
          ).not.toHaveProperty(
            'accuracy',
          );
        }


        // FakeTraining devuelve completion
        // en la cuarta answer.
        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Terminar sesión',
            },
          ),
        );

        await screen.findByRole(
          'heading',
          {
            name:
              '¡Sesión completada!',
          },
        );


        await waitFor(() =>
          expect(
            sessionStorage
              .getItem(
                RECOVERY_KEY,
              ),
          ).toBeNull(),
        );


        // No se reintroduce T053 local.
        for (
          const key
          of LEGACY_KEYS
        ) {
          expect(
            localStorage
              .getItem(
                key,
              ),
          ).toBeNull();
        }
      },
    );
  },
);
