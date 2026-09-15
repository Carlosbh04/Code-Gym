import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TypewriterCode } from './TypewriterCode';

const originalMatchMedia = window.matchMedia;

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('TypewriterCode', () => {
  it('muestra un snippet estático y no programa escritura con reduced motion', () => {
    mockReducedMotion(true);
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    render(<TypewriterCode />);

    expect(screen.getByLabelText('Código de práctica').querySelector('pre')).toHaveTextContent('// Mejora tus habilidades');
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('empieza a escribir tras el stagger y limpia su timer al desmontarse', () => {
    mockReducedMotion(false);
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const view = render(<TypewriterCode />);

    expect(screen.getByLabelText('Código de práctica').querySelector('pre')).toHaveTextContent('');
    act(() => vi.advanceTimersByTime(650));
    act(() => vi.advanceTimersByTime(40));
    expect(screen.getByLabelText('Código de práctica').querySelector('pre')?.textContent?.length).toBeGreaterThan(0);

    view.unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
