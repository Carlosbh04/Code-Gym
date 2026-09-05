import { StrictMode } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfettiLayer } from './ConfettiLayer';

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
  vi.useRealTimers();
});

describe('ConfettiLayer', () => {
  it('celebra un evento una única vez aunque el componente vuelva a renderizarse', () => {
    const { rerender } = render(<ConfettiLayer eventId="session:step-1" intensity="low" />);

    expect(document.querySelectorAll('[data-confetti-event="session:step-1"]')).toHaveLength(1);
    rerender(<ConfettiLayer eventId="session:step-1" intensity="low" />);
    expect(document.querySelectorAll('[data-confetti-event="session:step-1"]')).toHaveLength(1);
  });

  it('no renderiza partículas con reduced motion', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });

    render(<ConfettiLayer eventId="session:step-1" mode="modal" />);
    expect(document.querySelector('[data-confetti-event]')).toBeNull();
  });

  it('se limpia solo al terminar la celebración', () => {
    vi.useFakeTimers();
    render(<ConfettiLayer eventId="session:step-1" mode="inline" />);
    expect(document.querySelector('[data-confetti-event]')).not.toBeNull();

    act(() => vi.advanceTimersByTime(750));
    expect(document.querySelector('[data-confetti-event]')).toBeNull();
  });

  it('mantiene una sola celebración y su limpieza en StrictMode', () => {
    vi.useFakeTimers();
    render(<StrictMode><ConfettiLayer eventId="session:step-1" mode="inline" /></StrictMode>);
    expect(document.querySelectorAll('[data-confetti-event]')).toHaveLength(1);

    act(() => vi.advanceTimersByTime(750));
    expect(document.querySelector('[data-confetti-event]')).toBeNull();
  });

  it('es decorativo y no intercepta interacción', () => {
    render(<ConfettiLayer eventId="session:step-1" mode="complete" />);
    const layer = document.querySelector('[data-confetti-event]');
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer).toHaveClass('pointer-events-none');
  });

  it('mantiene cada densidad y alcance dentro de su contexto', () => {
    const { unmount } = render(<ConfettiLayer eventId="session:step-1" mode="inline" />);
    expect(document.querySelector('[data-confetti-event]')).toHaveAttribute('data-confetti-mode', 'inline');
    expect(document.querySelectorAll('[data-confetti-event] span')).toHaveLength(4);
    expect(document.querySelector('[data-confetti-event]')).toHaveClass('absolute');

    unmount();
    render(<ConfettiLayer eventId="session:complete" mode="complete" />);
    expect(document.querySelector('[data-confetti-event]')).toHaveAttribute('data-confetti-mode', 'complete');
    expect(document.querySelectorAll('[data-confetti-event] span')).toHaveLength(56);
    expect(document.querySelector('[data-confetti-event]')).toHaveClass('fixed');
  });
});
