import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from '@/hooks/useTheme';
import { THEME_STORAGE_KEY, THEME_TRANSITION_CLASS } from '@/lib/theme/theme';
import { ThemeProvider } from './ThemeContext';

const originalMatchMedia = window.matchMedia;

function installMatchMedia(initialDark: boolean) {
  let matches = initialDark;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const media = {
    media: '(prefers-color-scheme: dark)',
    get matches() {
      return matches;
    },
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => true,
  } as MediaQueryList;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => media),
  });
  return {
    change(nextDark: boolean) {
      matches = nextDark;
      const event = { matches: nextDark, media: media.media } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
}

function ThemeProbe() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  return (
    <>
      <output aria-label="Preferencia">{preference}</output>
      <output aria-label="Tema resuelto">{resolvedTheme}</output>
      <button type="button" onClick={() => setPreference('system')}>Sistema</button>
      <button type="button" onClick={() => setPreference('light')}>Claro</button>
      <button type="button" onClick={() => setPreference('dark')}>Oscuro</button>
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  const root = document.documentElement;
  root.classList.remove('light', 'dark', THEME_TRANSITION_CLASS);
  delete root.dataset.theme;
  delete root.dataset.resolvedTheme;
  root.style.colorScheme = '';
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: originalMatchMedia,
  });
});

describe('ThemeProvider', () => {
  it('usa el sistema cuando no existe preferencia y aplica dark antes de exponer el valor', () => {
    installMatchMedia(true);
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    expect(screen.getByLabelText('Preferencia')).toHaveTextContent('system');
    expect(screen.getByLabelText('Tema resuelto')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('persiste light y mantiene la elección aunque el sistema cambie', async () => {
    const system = installMatchMedia(true);
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Claro' }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement).toHaveClass('light');

    system.change(false);
    system.change(true);
    await waitFor(() => expect(screen.getByLabelText('Tema resuelto')).toHaveTextContent('light'));
    expect(document.documentElement).toHaveClass('light');
  });

  it('sincroniza system en vivo con prefers-color-scheme', async () => {
    const system = installMatchMedia(false);
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    expect(document.documentElement).toHaveClass('light');

    system.change(true);
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(screen.getByLabelText('Tema resuelto')).toHaveTextContent('dark');
  });

  it('sincroniza una preferencia válida recibida desde otra pestaña', async () => {
    installMatchMedia(false);
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    window.dispatchEvent(new StorageEvent('storage', {
      key: THEME_STORAGE_KEY,
      newValue: 'dark',
    }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(screen.getByLabelText('Preferencia')).toHaveTextContent('dark');
  });

  it('retira la clase visual poco después de completar la transición corta', () => {
    vi.useFakeTimers();
    installMatchMedia(true);
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Claro' }));
    expect(document.documentElement).toHaveClass(THEME_TRANSITION_CLASS);

    act(() => vi.advanceTimersByTime(179));
    expect(document.documentElement).toHaveClass(THEME_TRANSITION_CLASS);

    act(() => vi.advanceTimersByTime(1));
    expect(document.documentElement).not.toHaveClass(THEME_TRANSITION_CLASS);
  });
});
