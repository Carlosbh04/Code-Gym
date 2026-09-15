import type { ResolvedTheme, ThemePreference } from '@/types/theme';

export const THEME_STORAGE_KEY = 'codegym:theme';
export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';
export const THEME_TRANSITION_CLASS = 'theme-transition';

type ThemeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type ThemeRoot = Pick<HTMLElement, 'classList' | 'dataset' | 'style'>;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function readThemePreference(storage: ThemeStorage): ThemePreference {
  try {
    const stored = storage.getItem(THEME_STORAGE_KEY);
    if (stored === null) return 'system';
    if (isThemePreference(stored)) return stored;
    storage.removeItem(THEME_STORAGE_KEY);
  } catch {
    return 'system';
  }
  return 'system';
}

export function persistThemePreference(
  preference: ThemePreference,
  storage: ThemeStorage,
): void {
  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // La preferencia sigue activa en memoria aunque el navegador bloquee storage.
  }
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

export function applyThemeToRoot(
  root: ThemeRoot,
  preference: ThemePreference,
  resolvedTheme: ResolvedTheme,
  animate = false,
): boolean {
  const previousTheme = root.dataset.resolvedTheme;
  const changed = previousTheme !== undefined && previousTheme !== resolvedTheme;

  if (animate && changed) root.classList.add(THEME_TRANSITION_CLASS);
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.classList.toggle('light', resolvedTheme === 'light');
  root.dataset.theme = preference;
  root.dataset.resolvedTheme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
  return animate && changed;
}
