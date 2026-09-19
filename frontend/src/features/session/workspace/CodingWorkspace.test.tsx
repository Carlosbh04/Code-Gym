import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { CodingWorkspace } from './CodingWorkspace';

import type {
  ExerciseStep,
} from '@/types/exercise';

const STEP: ExerciseStep = {
  id: 'fix-code-test',
  type: 'fix-code',
  prompt: 'Corrige la función.',
  hintCount: 0,
  requirements: [
    'Devuelve el resultado esperado.',
  ],
  code:
    'function solution() {\n  return false;\n}',
  language: 'javascript',
  options: null,
  stepOrder: 1,
};

function renderWorkspace(
  overrides: Partial<
    React.ComponentProps<
      typeof CodingWorkspace
    >
  > = {},
) {
  const onExecute =
    vi.fn();

  const onCheck =
    vi.fn();

  render(
    <CodingWorkspace
      sessionTitle="Práctica"
      step={STEP}
      value="function solution() { return true; }"
      disabled={false}
      isChecking={false}
      canCheck={true}
      checkStatus="idle"
      checkError={null}
      canExecute={true}
      previewStatus="idle"
      previewError={null}
      revealedHints={[]}
      isRevealingHint={false}
      onChange={() => {}}
      onExecute={onExecute}
      onCheck={onCheck}
      onRevealHint={() => {}}
      {...overrides}
    />,
  );

  return {
    onExecute,
    onCheck,
  };
}

describe(
  'CodingWorkspace · Ejecutar / Comprobar',
  () => {
    it(
      'expone dos acciones distintas',
      () => {
        renderWorkspace();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Ejecutar',
            },
          ),
        ).toBeEnabled();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Comprobar',
            },
          ),
        ).toBeEnabled();
      },
    );

    it(
      'Ejecutar llama solo al preview',
      () => {
        const {
          onExecute,
          onCheck,
        } = renderWorkspace();

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Ejecutar',
            },
          ),
        );

        expect(
          onExecute,
        ).toHaveBeenCalledTimes(1);

        expect(
          onCheck,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'Comprobar llama solo al camino autoritativo',
      () => {
        const {
          onExecute,
          onCheck,
        } = renderWorkspace();

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Comprobar',
            },
          ),
        );

        expect(
          onCheck,
        ).toHaveBeenCalledTimes(1);

        expect(
          onExecute,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'pasar los tests públicos no afirma que la solución ya sea correcta',
      () => {
        renderWorkspace({
          previewStatus:
            'passed',
        });

        expect(
          screen.getByText(
            /pasó los tests públicos/i,
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /usa «Comprobar» para validar la solución completa/i,
          ),
        ).toBeInTheDocument();

        expect(
          screen.queryByText(
            /^Solución correcta/i,
          ),
        ).not.toBeInTheDocument();
      },
    );

    it(
      'un preview fallido se muestra sin convertirlo en veredicto autoritativo',
      () => {
        renderWorkspace({
          previewStatus:
            'failed',
          checkStatus:
            'idle',
        });

        expect(
          screen.getByText(
            /no supera los tests públicos/i,
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /validación autoritativa/i,
          ),
        ).toBeInTheDocument();
      },
    );

    it(
      'durante Ejecutar bloquea ambas acciones para evitar carreras',
      () => {
        renderWorkspace({
          previewStatus:
            'running',
        });

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Ejecutando…',
            },
          ),
        ).toBeDisabled();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Comprobar',
            },
          ),
        ).toBeDisabled();
      },
    );

    it(
      'durante Comprobar bloquea también Ejecutar',
      () => {
        renderWorkspace({
          isChecking: true,
          checkStatus:
            'running',
        });

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Ejecutar',
            },
          ),
        ).toBeDisabled();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Comprobando…',
            },
          ),
        ).toBeDisabled();
      },
    );
  },
);
