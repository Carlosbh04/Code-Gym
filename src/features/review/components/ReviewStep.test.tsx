import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ExerciseStep } from '@/types/exercise';
import type { Attempt } from '@/types/progress';
import { ReviewStep } from './ReviewStep';

const baseStep = (overrides: Partial<ExerciseStep>): ExerciseStep => ({
  id: 'step-1',
  type: 'code-reading',
  prompt: '¿Qué devuelve este código?',
  code: 'const value = 1;',
  language: 'javascript',
  options: [
    { id: 'a', text: 'undefined', correct: true },
    { id: 'b', text: '1', correct: false },
  ],
  errorLines: null,
  errorType: null,
  testCases: null,
  expectedPatterns: null,
  explanation: 'La explicación canónica.',
  hints: [],
  stepOrder: 1,
  ...overrides,
});

const attempt = (overrides: Partial<Attempt>): Attempt => ({
  id: 'attempt-1',
  sessionId: 'session-1',
  stepId: 'step-1',
  stepType: 'code-reading',
  answer: 'a',
  isCorrect: true,
  timeSpentMs: 1_000,
  hintsUsed: 1,
  createdAt: '2026-09-03T10:00:00.000Z',
  ...overrides,
});

describe('ReviewStep (T060)', () => {
  it('muestra una respuesta de opción, estado persistido y explicación neutral', () => {
    render(<ReviewStep step={baseStep({})} attempt={attempt({})} position={1} />);

    expect(screen.getByRole('heading', { level: 3, name: '¿Qué devuelve este código?' })).toBeInTheDocument();
    expect(screen.getByText('Correcto')).toBeInTheDocument();
    expect(screen.getByText('undefined')).toBeInTheDocument();
    expect(screen.getByText('Pistas utilizadas: 1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Explicación' })).toBeInTheDocument();
    expect(screen.getByText('La explicación canónica.')).toBeInTheDocument();
  });

  it('muestra la respuesta real de predict-output mediante sus opciones canónicas', () => {
    const step = baseStep({
      id: 'predict-output',
      type: 'predict-output',
      options: [{ id: 'output', text: "['ana', 'luis']", correct: true }],
    });
    render(
      <ReviewStep
        step={step}
        attempt={attempt({ stepId: step.id, stepType: step.type, answer: 'output' })}
        position={2}
      />,
    );

    expect(screen.getByText("['ana', 'luis']")).toBeInTheDocument();
  });

  it('representa find-error compuesto y marca líneas relevantes sin atribuirlas al usuario', () => {
    const step = baseStep({
      id: 'find-error',
      type: 'find-error',
      errorLines: [2],
      errorType: 'conceptual',
      code: 'const a = 1;\na.forEach();',
    });
    const rendered = render(
      <ReviewStep
        step={step}
        attempt={attempt({
          stepId: step.id,
          stepType: step.type,
          answer: { line: 3, errorType: 'sintaxis' },
          isCorrect: false,
        })}
        position={2}
      />,
    );

    expect(screen.getByText('Incorrecto')).toBeInTheDocument();
    expect(screen.getByText('Línea 3')).toBeInTheDocument();
    expect(screen.getByText('sintaxis')).toBeInTheDocument();
    expect(rendered.container.querySelector('.sr-only')).toHaveTextContent(
      'Línea relevante del ejercicio.',
    );
    expect(screen.queryByText(/líneas que fallaste/i)).not.toBeInTheDocument();
  });

  it('muestra el código enviado en fix-code sin ejecutarlo', () => {
    const step = baseStep({
      id: 'fix-code',
      type: 'fix-code',
      code: 'const broken = ;',
      options: null,
    });
    render(
      <ReviewStep
        step={step}
        attempt={attempt({ stepId: step.id, stepType: step.type, answer: 'const fixed = 1;' })}
        position={3}
      />,
    );

    expect(screen.getByRole('heading', { level: 4, name: 'Código inicial' })).toBeInTheDocument();
    const sentCode = screen.getByRole('heading', { level: 4, name: 'Código enviado' })
      .parentElement;
    expect(sentCode).toHaveTextContent('const fixed = 1;');
  });

  it('degrada un step sin attempt sin inventar corrección o respuesta', () => {
    render(<ReviewStep step={baseStep({})} attempt={undefined} position={4} />);

    expect(screen.getByText('Sin respuesta registrada')).toBeInTheDocument();
    expect(screen.queryByText('Correcto')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: 'Tu respuesta' })).not.toBeInTheDocument();
  });

  it('mantiene estructura de artículo y headings consecutivos', () => {
    render(<ReviewStep step={baseStep({})} attempt={attempt({})} position={1} />);

    const article = screen.getByRole('article', { name: 'Ejercicio respondido' });
    expect(within(article).getByRole('heading', { level: 3 })).toBeInTheDocument();
    expect(within(article).getAllByRole('heading', { level: 4 })).toHaveLength(3);
  });
});
