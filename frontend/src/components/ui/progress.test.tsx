import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Progress } from './progress';

describe('Progress (T074)', () => {
  it('anima el indicador desde el origen hasta el valor expuesto', () => {
    render(<Progress value={64} aria-label="Progreso del concepto" />);

    const progressbar = screen.getByRole('progressbar', { name: 'Progreso del concepto' });
    const indicator = progressbar.firstElementChild as HTMLElement;

    expect(indicator).toHaveClass('animate-progress-fill');
    expect(indicator.style.getPropertyValue('--from')).toBe('0%');
    expect(indicator.style.getPropertyValue('--to')).toBe('64%');
    expect(indicator.style.width).toBe('64%');
  });

  it('mantiene un valor vacío como progreso cero', () => {
    render(<Progress aria-label="Progreso inicial" />);

    const indicator = screen.getByRole('progressbar', { name: 'Progreso inicial' })
      .firstElementChild as HTMLElement;

    expect(indicator.style.getPropertyValue('--to')).toBe('0%');
    expect(indicator.style.width).toBe('0%');
  });
});
