import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ThemeContext } from '@/contexts/theme-context';
import {
  applyThemeToRoot,
  isThemePreference,
  persistThemePreference,
  readThemePreference,
  resolveTheme,
  SYSTEM_THEME_QUERY,
  THEME_STORAGE_KEY,
  THEME_TRANSITION_CLASS,
} from '@/lib/theme/theme';
import type { ResolvedTheme, ThemeContextValue, ThemePreference } from '@/types/theme';

// 140 ms de transición CSS + margen para que el último frame se pinte.
const TRANSITION_CLEANUP_MS = 180;

function getInitialPreference(): ThemePreference {
  const bootstrapped = document.documentElement.dataset.theme;
  return isThemePreference(bootstrapped)
    ? bootstrapped
    : readThemePreference(localStorage);
}

function getInitialSystemTheme(): ResolvedTheme {
  return window.matchMedia?.(SYSTEM_THEME_QUERY).matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(getInitialPreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getInitialSystemTheme);
  const resolvedTheme = resolveTheme(preference, systemTheme === 'dark');

  useLayoutEffect(() => {
    const root = document.documentElement;
    const animated = applyThemeToRoot(root, preference, resolvedTheme, true);
    if (!animated) return;
    const timeout = window.setTimeout(
      () => root.classList.remove(THEME_TRANSITION_CLASS),
      TRANSITION_CLEANUP_MS,
    );
    return () => {
      window.clearTimeout(timeout);
      root.classList.remove(THEME_TRANSITION_CLASS);
    };
  }, [preference, resolvedTheme]);

  useEffect(() => {
    const media = window.matchMedia?.(SYSTEM_THEME_QUERY);
    if (media === undefined) return;
    const onChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      setPreferenceState(isThemePreference(event.newValue) ? event.newValue : 'system');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    persistThemePreference(nextPreference, localStorage);
    setPreferenceState(nextPreference);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
