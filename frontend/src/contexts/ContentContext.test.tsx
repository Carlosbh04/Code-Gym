import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ContentProvider } from './ContentContext';
import { useContent } from '@/hooks/useContent';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import type { Concept, Technology, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { IContentRepository } from '@/types/repository';

const JAVASCRIPT: Technology = {
  id: 'javascript',
  name: 'JavaScript',
  icon: 'js',
  description: 'El lenguaje de la web',
};
const ARRAYS_TOPIC: Topic = {
  id: 'js-arrays',
  name: 'Arrays',
  technologyId: 'javascript',
  description: 'Métodos de iteración',
};
const ITERATION: Concept = {
  id: 'js-array-iteration',
  name: 'Métodos de iteración de arrays',
  topicId: 'js-arrays',
  technologyId: 'javascript',
  contentMarkdown: '# Iteración',
};

/**
 * Repositorio en memoria que implementa el contrato completo. Sirve para aislar
 * el comportamiento del Context sin ocultar errores: cuenta las llamadas y
 * permite provocar fallos reales del repositorio.
 */
class FakeContentRepository implements IContentRepository {
  calls = {
    technologies: 0,
    topics: 0,
    conceptsByTopic: 0,
    concept: 0,
    sessions: 0,
    session: 0,
  };

  constructor(private readonly failOn: Set<string> = new Set()) {}

  async getTechnologies(): Promise<Technology[]> {
    this.calls.technologies += 1;
    if (this.failOn.has('technologies')) {
      throw new Error('fallo de contenido');
    }
    return [JAVASCRIPT];
  }

  async getTopicsByTechnology(technologyId: string): Promise<Topic[]> {
    this.calls.topics += 1;
    return technologyId === 'javascript' ? [ARRAYS_TOPIC] : [];
  }

  async getConceptById(conceptId: string): Promise<Concept | null> {
    this.calls.concept += 1;
    return conceptId === ITERATION.id ? ITERATION : null;
  }

  async getConceptsByTopic(topicId: string): Promise<Concept[]> {
    this.calls.conceptsByTopic += 1;
    if (this.failOn.has('conceptsByTopic')) {
      throw new Error('fallo al leer los conceptos');
    }
    return topicId === ARRAYS_TOPIC.id ? [ITERATION] : [];
  }

  async getSessionsByConcept(conceptId: string): Promise<ExerciseSession[]> {
    this.calls.sessions += 1;
    if (this.failOn.has('sessions')) {
      throw new Error('fallo al leer las sesiones');
    }
    return conceptId === ITERATION.id
      ? ([{ id: 'arrays-session', steps: [] }] as unknown as ExerciseSession[])
      : [];
  }

  async getSessionById(sessionId: string): Promise<ExerciseSession | null> {
    this.calls.session += 1;
    if (this.failOn.has('session')) {
      throw new Error('fallo al leer la sesión');
    }
    return sessionId === 'existe'
      ? ({ id: 'existe', steps: [] } as unknown as ExerciseSession)
      : null;
  }
}

const wrapperFor = (repository: IContentRepository) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <ContentProvider repository={repository}>{children}</ContentProvider>;
  };

const mountHook = async (repository: IContentRepository) => {
  const view = renderHook(() => useContent(), { wrapper: wrapperFor(repository) });
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  return view;
};

describe('ContentContext + useContent (T020)', () => {
  describe('Provider y hook juntos', () => {
    it('expone el contrato completo de ContentContextValue', async () => {
      const { result } = await mountHook(new FakeContentRepository());

      expect(Object.keys(result.current).sort()).toEqual([
        'getConcept',
        'getConceptsByTopic',
        'getSession',
        'getSessionsByConcept',
        'getTechnology',
        'getTopics',
        'isLoading',
        'technologies',
      ]);
      expect(typeof result.current.getTechnology).toBe('function');
      expect(typeof result.current.getTopics).toBe('function');
      expect(typeof result.current.getConcept).toBe('function');
      expect(typeof result.current.getConceptsByTopic).toBe('function');
      expect(typeof result.current.getSessionsByConcept).toBe('function');
      expect(typeof result.current.getSession).toBe('function');
    });

    it('el Provider renderiza a sus hijos', async () => {
      function Estado() {
        const { isLoading } = useContent();
        return <span data-testid="estado">{String(isLoading)}</span>;
      }

      render(
        <ContentProvider repository={new FakeContentRepository()}>
          <span data-testid="hijo">contenido</span>
          <Estado />
        </ContentProvider>,
      );

      expect(screen.getByTestId('hijo')).toHaveTextContent('contenido');
      await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('false'));
    });
  });

  describe('estado inicial', () => {
    it('empieza cargando y con la lista vacía', async () => {
      const { result } = renderHook(() => useContent(), {
        wrapper: wrapperFor(new FakeContentRepository()),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.technologies).toEqual([]);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('carga las tecnologías del repositorio y deja de cargar', async () => {
      const repo = new FakeContentRepository();
      const { result } = await mountHook(repo);

      expect(result.current.technologies).toEqual([JAVASCRIPT]);
      expect(repo.calls.technologies).toBe(1);
    });
  });

  describe('delegación en el repositorio', () => {
    it('getTechnology busca en la lista ya cargada, sin volver al repositorio', async () => {
      const repo = new FakeContentRepository();
      const { result } = await mountHook(repo);

      expect(result.current.getTechnology('javascript')).toEqual(JAVASCRIPT);
      expect(result.current.getTechnology('rust')).toBeUndefined();
      expect(repo.calls.technologies).toBe(1);
    });

    it('getTopics delega en getTopicsByTechnology', async () => {
      const repo = new FakeContentRepository();
      const { result } = await mountHook(repo);

      await expect(result.current.getTopics('javascript')).resolves.toEqual([ARRAYS_TOPIC]);
      await expect(result.current.getTopics('rust')).resolves.toEqual([]);
      expect(repo.calls.topics).toBe(2);
    });

    it('getConcept delega en getConceptById', async () => {
      const repo = new FakeContentRepository();
      const { result } = await mountHook(repo);

      await expect(result.current.getConcept('js-array-iteration')).resolves.toEqual(ITERATION);
      await expect(result.current.getConcept('no-existe')).resolves.toBeNull();
    });

    it('getConceptsByTopic delega en el contrato de conceptos por topic', async () => {
      const repo = new FakeContentRepository();
      const { result } = await mountHook(repo);

      await expect(result.current.getConceptsByTopic(ARRAYS_TOPIC.id)).resolves.toEqual([
        ITERATION,
      ]);
      expect(repo.calls.conceptsByTopic).toBe(1);
    });

    it('getSession delega en getSessionById', async () => {
      const repo = new FakeContentRepository();
      const { result } = await mountHook(repo);

      await expect(result.current.getSession('no-existe')).resolves.toBeNull();
      expect(repo.calls.session).toBe(1);
    });

    it('getSessionsByConcept delega sin exponer el repositorio concreto', async () => {
      const repo = new FakeContentRepository();
      const { result } = await mountHook(repo);

      await expect(
        result.current.getSessionsByConcept(ITERATION.id),
      ).resolves.toEqual([expect.objectContaining({ id: 'arrays-session' })]);
      expect(repo.calls.sessions).toBe(1);
    });
  });

  describe('caché en memoria (§18)', () => {
    it('no repite la consulta de topics ya cacheada', async () => {
      const repo = new FakeContentRepository();
      const { result } = await mountHook(repo);

      await result.current.getTopics('javascript');
      await result.current.getTopics('javascript');
      await result.current.getTopics('javascript');

      expect(repo.calls.topics).toBe(1);
    });

    it('no repite la consulta de un concepto encontrado', async () => {
      const repo = new FakeContentRepository();
      const { result } = await mountHook(repo);

      await result.current.getConcept('js-array-iteration');
      await result.current.getConcept('js-array-iteration');

      expect(repo.calls.concept).toBe(1);
    });

    it('no repite la consulta de conceptos ya cacheada por topic', async () => {
      const repo = new FakeContentRepository();
      const { result } = await mountHook(repo);

      await result.current.getConceptsByTopic(ARRAYS_TOPIC.id);
      await result.current.getConceptsByTopic(ARRAYS_TOPIC.id);

      expect(repo.calls.conceptsByTopic).toBe(1);
    });

    it('no repite la consulta de sesiones ya cacheadas por concepto', async () => {
      const repo = new FakeContentRepository();
      const { result } = await mountHook(repo);

      await result.current.getSessionsByConcept(ITERATION.id);
      await result.current.getSessionsByConcept(ITERATION.id);

      expect(repo.calls.sessions).toBe(1);
    });

    it('no cachea los resultados nulos: un id inexistente se vuelve a consultar', async () => {
      const repo = new FakeContentRepository();
      const { result } = await mountHook(repo);

      await result.current.getConcept('no-existe');
      await result.current.getConcept('no-existe');

      expect(repo.calls.concept).toBe(2);
    });
  });

  describe('errores', () => {
    it('propaga el error del repositorio al consumidor', async () => {
      const repo = new FakeContentRepository(new Set(['session']));
      const { result } = await mountHook(repo);

      await expect(result.current.getSession('existe')).rejects.toThrow(
        'fallo al leer la sesión',
      );
    });

    it('propaga un error al cargar las sesiones de un concepto', async () => {
      const repo = new FakeContentRepository(new Set(['sessions']));
      const { result } = await mountHook(repo);

      await expect(
        result.current.getSessionsByConcept(ITERATION.id),
      ).rejects.toThrow('fallo al leer las sesiones');
    });

    it('propaga un error al cargar conceptos de un topic', async () => {
      const repo = new FakeContentRepository(new Set(['conceptsByTopic']));
      const { result } = await mountHook(repo);

      await expect(
        result.current.getConceptsByTopic(ARRAYS_TOPIC.id),
      ).rejects.toThrow('fallo al leer los conceptos');
    });

    it('un fallo en la carga inicial deja lista vacía, registra el error y no bloquea', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const repo = new FakeContentRepository(new Set(['technologies']));
      const { result } = await mountHook(repo);

      expect(result.current.technologies).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('fuera del Provider', () => {
    it('useContent lanza un error explícito', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => renderHook(() => useContent())).toThrow(
        'useContent debe usarse dentro de <ContentProvider>',
      );

      consoleError.mockRestore();
    });
  });

  describe('integración con el repositorio real', () => {
    it('sirve una sesión real de T017 a través del contexto', async () => {
      const { result } = await mountHook(new StaticContentRepository());

      const session = await result.current.getSession('js-arrays-map-vs-foreach-01');

      expect(session?.conceptId).toBe('js-array-iteration');
      expect(session?.steps).toHaveLength(4);
    });

    it('devuelve null para una sesión inexistente y expone las tecnologías del índice', async () => {
      const { result } = await mountHook(new StaticContentRepository());

      await expect(result.current.getSession('no-existe')).resolves.toBeNull();
      expect(result.current.technologies.map((t) => t.id)).toEqual([
        'javascript', 'html', 'css', 'react', 'nodejs', 'sql',
      ]);
      expect(result.current.getTechnology('javascript')?.name).toBe('JavaScript');
      expect(result.current.getTechnology('sql')?.name).toBe('SQL');
    });
  });
});
