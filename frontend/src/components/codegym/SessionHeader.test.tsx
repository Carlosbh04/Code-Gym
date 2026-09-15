import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { SessionHeaderProps } from './SessionHeader';
import { SessionHeader } from './SessionHeader';

const DEFAULT_PROPS: SessionHeaderProps = {
  title: 'forEach no devuelve lo que crees',
  concept: 'js-array-iteration',
  difficulty: 'intermediate',
  totalSteps: 4,
  currentStep: 1,
  completedSteps: 1,
};

const renderHeader = (props: Partial<SessionHeaderProps> = {}) =>
  render(<SessionHeader {...DEFAULT_PROPS} {...props} />);

describe('SessionHeader (T051)', () => {
  it('muestra título, concepto y dificultad', () => {
    renderHeader();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'forEach no devuelve lo que crees',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Concepto: js-array-iteration')).toBeInTheDocument();
    expect(screen.getByText('Intermedio')).toBeInTheDocument();
  });

  it.each([
    ['beginner', 'Principiante'],
    ['intermediate', 'Intermedio'],
    ['advanced', 'Avanzado'],
  ] as const)('reutiliza DifficultyBadge para %s', (difficulty, label) => {
    renderHeader({ difficulty });

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('delega el progreso completo a StepIndicator', () => {
    renderHeader({ totalSteps: 5, currentStep: 2, completedSteps: 2 });
    const list = screen.getByRole('list', { name: 'Progreso de la sesión' });
    const items = within(list).getAllByRole('listitem');

    expect(items).toHaveLength(5);
    expect(within(items[0]).getByText('Paso 1: completado')).toBeInTheDocument();
    expect(within(items[2]).getByText('Paso 3: en curso')).toBeInTheDocument();
    expect(screen.getByText('Paso 3 de 5')).toBeInTheDocument();
  });

  it('con cero pasos conserva la metadata y omite solo el progreso', () => {
    renderHeader({ totalSteps: 0 });

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Concepto: js-array-iteration')).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('usa una cabecera semántica sin controles propios', () => {
    const { container } = renderHeader();

    expect(container.querySelectorAll('header')).toHaveLength(1);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.queryAllByRole('button')).toEqual([]);
    expect(screen.queryAllByRole('link')).toEqual([]);
  });

  it('aplica la clase externa en la raíz', () => {
    const { container } = renderHeader({ className: 'cabecera-sesion' });

    expect(container.firstElementChild).toHaveClass('cabecera-sesion');
  });

  it('es mobile-first y cambia la distribución desde sm', () => {
    const { container } = renderHeader();
    const layout = container.querySelector('header > div');
    const heading = screen.getByRole('heading', { level: 1 });

    expect(layout).toHaveClass('flex-col', 'sm:flex-row');
    expect(heading).toHaveClass('text-xl', 'sm:text-2xl', 'break-words');
  });

  it('protege título y concepto largos frente al desbordamiento', () => {
    const { container } = renderHeader({
      title: 'Una sesión con un título extremadamente largo y sin atajos visuales',
      concept: 'concepto-con-un-identificador-muy-largo-que-debe-poder-partirse',
    });

    expect(container.querySelector('header')).toHaveClass('min-w-0');
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('break-words');
    expect(screen.getByText(/Concepto:/)).toHaveClass('break-words');
  });
});
