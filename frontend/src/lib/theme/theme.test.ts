import { afterEach, describe, expect, it } from 'vitest';
import {
  applyThemeToRoot,
  isThemePreference,
  persistThemePreference,
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  THEME_TRANSITION_CLASS,
} from './theme';

class MemoryStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

afterEach(() => {
  const root = document.documentElement;
  root.classList.remove('light', 'dark', THEME_TRANSITION_CLASS);
  delete root.dataset.theme;
  delete root.dataset.resolvedTheme;
  root.style.colorScheme = '';
});

describe('theme helpers', () => {
  it('acepta exclusivamente las tres preferencias canónicas', () => {
    expect(['system', 'light', 'dark'].every(isThemePreference)).toBe(true);
    expect(isThemePreference('auto')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });

  it('persiste la preferencia y sanea valores desconocidos', () => {
    const storage = new MemoryStorage();
    persistThemePreference('dark', storage);
    expect(readThemePreference(storage)).toBe('dark');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    storage.setItem(THEME_STORAGE_KEY, 'sepia');
    expect(readThemePreference(storage)).toBe('system');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('resuelve system sin modificar preferencias manuales', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('aplica clase, datasets, color-scheme y transición solo entre temas pintados', () => {
    const root = document.documentElement;
    expect(applyThemeToRoot(root, 'system', 'light', true)).toBe(false);
    expect(root).toHaveClass('light');
    expect(root).not.toHaveClass('dark', THEME_TRANSITION_CLASS);
    expect(root.dataset).toMatchObject({ theme: 'system', resolvedTheme: 'light' });
    expect(root.style.colorScheme).toBe('light');

    expect(applyThemeToRoot(root, 'dark', 'dark', true)).toBe(true);
    expect(root).toHaveClass('dark', THEME_TRANSITION_CLASS);
    expect(root).not.toHaveClass('light');
  });
});
