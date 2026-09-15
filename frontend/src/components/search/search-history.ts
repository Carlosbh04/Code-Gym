import { normalizeSearchText } from './search-model';

export const SEARCH_HISTORY_KEY = 'codegym:search-history';
export const SEARCH_HISTORY_LIMIT = 6;

export function readSearchHistory(storage: Storage = localStorage): string[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(SEARCH_HISTORY_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .slice(0, SEARCH_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function addSearchHistory(
  term: string,
  storage: Storage = localStorage,
): string[] {
  const cleanTerm = term.trim().replace(/\s+/g, ' ');
  if (cleanTerm === '') return readSearchHistory(storage);

  const normalizedTerm = normalizeSearchText(cleanTerm);
  const next = [
    cleanTerm,
    ...readSearchHistory(storage).filter(
      (item) => normalizeSearchText(item) !== normalizedTerm,
    ),
  ].slice(0, SEARCH_HISTORY_LIMIT);

  try {
    storage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // La búsqueda sigue funcionando aunque el navegador bloquee el storage.
  }

  return next;
}

export function clearSearchHistory(storage: Storage = localStorage): void {
  try {
    storage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // La UI conserva su estado vacío aunque el storage no esté disponible.
  }
}
