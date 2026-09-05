import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ExerciseStep } from '@/types/exercise';
import type { Attempt } from '@/types/progress';
import { ReviewStep } from './ReviewStep';

const baseStep = (overrides: Partial<ExerciseStep> = {}): ExerciseStep => ({ id: 'step-1', type: 'code-reading', prompt: '¿Qué devuelve este código?', code: 'const value = 1;', language: 'javascript', options: [{ id: 'a', text: 'undefined', correct: true }, { id: 'b', text: '1', correct: false }], errorLines: null, errorType: null, testCases: null, expectedPatterns: null, explanation: 'La explicación canónica.', hints: [], stepOrder: 1, ...overrides });
const attempt = (overrides: Partial<Attempt> = {}): Attempt => ({ id: 'attempt-1', sessionId: 'session-1', stepId: 'step-1', stepType: 'code-reading', answer: 'a', isCorrect: true, timeSpentMs: 1_000, hintsUsed: 1, createdAt: '2026-09-03T10:00:00.000Z', ...overrides });

describe('ReviewStep', () => {
  it('muestra pregunta, estado, respuesta persistida y explicación canónica', () => {
    render(<ReviewStep step={baseStep()} attempt={attempt()} position={1} />);
    expect(screen.getByRole('heading', { level: 2, name: '¿Qué devuelve este código?' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Respuesta correcta' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Tu respuesta' })).toHaveTextContent('undefined');
    expect(screen.getByRole('region', { name: 'Respuesta correcta' })).toHaveTextContent('undefined');
    expect(screen.getByText('Pistas utilizadas: 1')).toBeInTheDocument();
    expect(screen.getByText('La explicación canónica.')).toBeInTheDocument();
  });

  it('diferencia en las opciones la respuesta incorrecta de la correcta', () => {
    render(<ReviewStep step={baseStep()} attempt={attempt({ answer: 'b', isCorrect: false })} position={1} />);
    expect(screen.getByText('Respuesta incorrecta')).toBeInTheDocument();
    const options = screen.getByRole('region', { name: 'Opciones' });
    expect(within(options).getByText('undefined')).toBeInTheDocument();
    expect(within(options).getByText('1')).toBeInTheDocument();
    expect(within(options).getAllByText(/Tu respuesta|Respuesta correcta/)).not.toHaveLength(0);
  });

  it('representa find-error con la selección persistida y la corrección canónica', () => {
    const step = baseStep({ id: 'find-error', type: 'find-error', options: null, errorLines: [2], errorType: 'conceptual', code: 'const a = 1;\na.forEach();' });
    render(<ReviewStep step={step} attempt={attempt({ stepId: step.id, stepType: step.type, answer: { line: 3, errorType: 'sintaxis' }, isCorrect: false })} position={2} />);
    expect(screen.getByText('Línea 3')).toBeInTheDocument();
    expect(screen.getByText('sintaxis')).toBeInTheDocument();
    expect(screen.getByText('Línea 2')).toBeInTheDocument();
    expect(screen.getByText('conceptual')).toBeInTheDocument();
    expect(screen.getByText('Línea relevante del ejercicio.')).toBeInTheDocument();
  });

  it('muestra el código enviado de fix-code sin revelar una solución inexistente', () => {
    const step = baseStep({ id: 'fix-code', type: 'fix-code', code: 'const broken = ;', options: null });
    render(<ReviewStep step={step} attempt={attempt({ stepId: step.id, stepType: step.type, answer: 'const fixed = 1;' })} position={3} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Código inicial' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Código enviado' })).toHaveTextContent('const fixed = 1;');
    expect(screen.queryByRole('heading', { name: 'Respuesta correcta' })).not.toBeInTheDocument();
  });

  it('degrada un step sin attempt sin atribuir una respuesta al usuario', () => {
    render(<ReviewStep step={baseStep()} attempt={undefined} position={4} />);
    expect(screen.getByText('Sin respuesta registrada.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Tu respuesta' })).not.toBeInTheDocument();
  });

  it('mantiene artículo, jerarquía de headings y código canónico', () => {
    render(<ReviewStep step={baseStep()} attempt={attempt()} position={1} />);
    const article = screen.getByRole('article', { name: 'Ejercicio respondido' });
    expect(within(article).getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(within(article).getAllByRole('heading', { level: 3 })).toHaveLength(4);
    expect(article.querySelector('code')).toHaveTextContent('const value = 1;');
  });
});
