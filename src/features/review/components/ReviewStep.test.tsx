import {
  render,
  screen,
  within,
} from '@testing-library/react';

import {
  describe,
  expect,
  it,
} from 'vitest';

import type {
  ExerciseStep,
} from '@/types/exercise';

import type {
  HistoryAttempt,
} from '@/types/history';

import {
  ReviewStep,
} from './ReviewStep';

function baseStep(
  overrides:
    Partial<ExerciseStep> = {},
): ExerciseStep {
  return {
    id: 'step-1',
    type: 'code-reading',
    prompt:
      '¿Qué devuelve este código?',
    code:
      'const value = 1;',
    language: 'javascript',
    options: [
      {
        id: 'a',
        text: 'undefined',
      },
      {
        id: 'b',
        text: '1',
      },
    ],
    requirements: [],
    hintCount: 0,
    stepOrder: 1,
    ...overrides,
  };
}

function attempt(
  overrides:
    Partial<HistoryAttempt> = {},
): HistoryAttempt {
  return {
    id: 'attempt-1',
    sessionId: 'session-1',
    stepId: 'step-1',
    isCorrect: true,
    timeSpentMs: 1000,
    hintsUsed: 1,
    createdAt:
      '2026-09-12T12:00:00.000Z',
    ...overrides,
  };
}

describe('ReviewStep', () => {
  it('muestra el resultado correcto sin inventar respuesta histórica', () => {
    render(
      <ReviewStep
        step={baseStep()}
        attempt={attempt()}
        position={1}
      />,
    );

    expect(
      screen.getByText(
        'Respuesta correcta',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole(
        'region',
        {
          name:
            'Resultado registrado',
        },
      ),
    ).toHaveTextContent(
      'El historial conserva el resultado del intento, pero no la respuesta enviada.',
    );

    expect(
      screen.queryByText(
        'Tu respuesta',
      ),
    ).not.toBeInTheDocument();
  });

  it('muestra resultado incorrecto', () => {
    render(
      <ReviewStep
        step={baseStep()}
        attempt={attempt({
          isCorrect: false,
        })}
        position={1}
      />,
    );

    expect(
      screen.getByText(
        'Respuesta incorrecta',
      ),
    ).toBeInTheDocument();
  });

  it('muestra pistas registradas', () => {
    render(
      <ReviewStep
        step={baseStep()}
        attempt={attempt({
          hintsUsed: 2,
        })}
        position={1}
      />,
    );

    expect(
      screen.getByRole(
        'region',
        {
          name:
            'Resultado registrado',
        },
      ),
    ).toHaveTextContent(
      'Pistas utilizadas: 2',
    );
  });

  it('tolera hintsUsed null', () => {
    render(
      <ReviewStep
        step={baseStep()}
        attempt={attempt({
          hintsUsed: null,
        })}
        position={1}
      />,
    );

    expect(
      screen.queryByText(
        /Pistas utilizadas:/,
      ),
    ).not.toBeInTheDocument();
  });

  it('no atribuye una respuesta cuando no existe attempt', () => {
    render(
      <ReviewStep
        step={baseStep()}
        attempt={undefined}
        position={1}
      />,
    );

    expect(
      screen.getByText(
        'Sin respuesta registrada.',
      ),
    ).toBeInTheDocument();
  });

  it('mantiene el código canónico sin exponer explicación privada', () => {
    render(
      <ReviewStep
        step={baseStep()}
        attempt={attempt()}
        position={1}
      />,
    );

    const article =
      screen.getByRole(
        'article',
        {
          name:
            'Ejercicio respondido',
        },
      );

    expect(
      within(article).getByRole(
        'heading',
        { level: 2 },
      ),
    ).toHaveTextContent(
      '¿Qué devuelve este código?',
    );

    expect(
      within(article)
        .getAllByRole(
          'heading',
          { level: 3 },
        ),
    ).toHaveLength(2);

    expect(
      article.querySelector(
        'code',
      ),
    ).toHaveTextContent(
      'const value = 1;',
    );

    expect(
      screen.queryByText(
        'La explicación canónica.',
      ),
    ).toBeNull();
  });

  it('fix-code muestra código inicial pero no código enviado inventado', () => {
    render(
      <ReviewStep
        step={baseStep({
          id: 'fix-code',
          type: 'fix-code',
          code:
            'const broken = ;',
          options: null,
        })}
        attempt={attempt({
          stepId: 'fix-code',
        })}
        position={3}
      />,
    );

    expect(
      screen.getByRole(
        'region',
        {
          name:
            'Código inicial',
        },
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByText(
        'Código enviado',
      ),
    ).not.toBeInTheDocument();
  });
});
