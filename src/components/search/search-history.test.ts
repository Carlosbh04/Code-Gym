import { beforeEach, describe, expect, it } from 'vitest';
import {
  addSearchHistory,
  clearSearchHistory,
  readSearchHistory,
  SEARCH_HISTORY_KEY,
  SEARCH_HISTORY_LIMIT,
} from './search-history';

describe('search history', () => {
  beforeEach(() => localStorage.clear());

  it('guarda lo más reciente primero y evita duplicados normalizados', () => {
    addSearchHistory('Árrays');
    addSearchHistory('react');
    addSearchHistory(' arrays ');

    expect(readSearchHistory()).toEqual(['arrays', 'react']);
  });

  it('limita el historial y permite limpiarlo', () => {
    for (let index = 0; index < SEARCH_HISTORY_LIMIT + 2; index += 1) {
      addSearchHistory(`búsqueda ${index}`);
    }
    expect(readSearchHistory()).toHaveLength(SEARCH_HISTORY_LIMIT);

    clearSearchHistory();
    expect(localStorage.getItem(SEARCH_HISTORY_KEY)).toBeNull();
    expect(readSearchHistory()).toEqual([]);
  });
});
