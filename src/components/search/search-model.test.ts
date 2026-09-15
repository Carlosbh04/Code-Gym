import { describe, expect, it } from 'vitest';
import type { ContentContextValue } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import {
  buildSearchIndex,
  getCatalogSuggestions,
  normalizeSearchText,
  searchCatalog,
} from './search-model';

const session: ExerciseSession = {
  id: 'js-arrays-session',
  title: 'Taller: transformar precios',
  conceptId: 'js-array-iteration',
  technologyId: 'javascript',
  difficulty: 'beginner',
  version: '1.0.0',
  status: 'published',
  createdAt: '2026-09-01',
  updatedAt: null,
  steps: [{
    id: 'step-1',
    type: 'code-reading',
    prompt: '¿Qué devuelve map?',
    code: '[1].map((value) => value * 2)',
    language: 'javascript',
    options: [],
    requirements: [],
    hintCount: 0,
    stepOrder: 1,
  }],
};

const content: ContentContextValue = {
  technologies: [{ id: 'javascript', name: 'JavaScript', icon: 'js', description: 'Web' }],
  getTechnology: () => undefined,
  getTopics: async () => [{ id: 'js-arrays', name: 'Árrays', technologyId: 'javascript', description: 'Colecciones' }],
  getConceptsByTopic: async () => [{ id: 'js-array-iteration', name: 'Métodos de iteración', topicId: 'js-arrays', technologyId: 'javascript', contentMarkdown: '' }],
  getConcept: async () => null,
  getSessionsByConcept: async () => [session],
  getSession: async () => null,
  isLoading: false,
};

describe('search model', () => {
  it('normaliza mayúsculas, acentos, puntuación y espacios', () => {
    expect(normalizeSearchText('  ÁSYNC /   Await  ')).toBe('async await');
  });

  it('crea resultados reales para cada nivel del catálogo', async () => {
    const index = await buildSearchIndex(content);

    expect(index.map(({ type }) => type)).toEqual([
      'technology',
      'topic',
      'concept',
      'session',
      'exercise',
    ]);
    expect(index.find(({ type }) => type === 'concept')?.route).toBe('/tech/javascript/js-arrays');
    expect(index.find(({ type }) => type === 'exercise')?.route).toBe('/practice/js-arrays-session');
  });

  it('ordena exacto antes de prefijo e inclusión e ignora acentos', async () => {
    const index = await buildSearchIndex(content);
    expect(searchCatalog(index, 'arrays')[0]).toMatchObject({ type: 'topic', title: 'Árrays' });
    expect(searchCatalog(index, 'map').map(({ type }) => type)).toEqual(['exercise']);
  });

  it('deriva sugerencias deterministas exclusivamente del índice', async () => {
    const index = await buildSearchIndex(content);
    const suggestions = getCatalogSuggestions(index);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((item) => index.includes(item))).toBe(true);
  });
});
