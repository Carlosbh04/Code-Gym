import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ContentContext } from '@/contexts/content-context';
import type {
  Concept,
  ContentContextValue,
  Technology,
  Topic,
} from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { IContentRepository } from '@/types/repository';

/**
 * Estado de contenido de la aplicación (§18).
 *
 * Se sitúa entre la UI y la capa de datos: expone el contrato
 * `ContentContextValue` y delega todas las lecturas en un `IContentRepository`.
 * No conoce ninguna implementación concreta de repositorio, no lee JSON, no usa
 * almacenamiento del navegador ni red, y no contiene lógica de presentación.
 *
 * El repositorio se recibe por prop: §35 establece que se crea en
 * `providers.tsx` y que migrar a Fase 2 solo cambia esa línea.
 *
 * El objeto de contexto vive en content-context.ts: ver el motivo allí.
 *
 * Caché: §18 asigna a esta capa tres mapas en memoria (topics, conceptos y
 * sesiones). Viven en refs porque son memoria auxiliar, no estado que deba
 * provocar un render.
 */


export interface ContentProviderProps {
  repository: IContentRepository;
  children: ReactNode;
}

export function ContentProvider({
  repository,
  children,
}: ContentProviderProps) {
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const topicsCache = useRef(new Map<string, Topic[]>());
  const conceptCache = useRef(new Map<string, Concept>());
  const sessionCache = useRef(new Map<string, ExerciseSession>());

  useEffect(() => {
    let active = true;

    repository
      .getTechnologies()
      .then((list) => {
        if (active) {
          setTechnologies(list);
        }
      })
      .catch((error: unknown) => {
        // `ContentContextValue` no define canal de error. §27 clasifica los
        // fallos de contenido como no recuperables y los resuelve con un estado
        // vacío, así que se deja la lista vacía y se registra para no silenciar
        // el fallo.
        console.error('No se pudieron cargar las tecnologías:', error);
        if (active) {
          setTechnologies([]);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [repository]);

  const getTechnology = useCallback(
    (id: string): Technology | undefined =>
      technologies.find((technology) => technology.id === id),
    [technologies],
  );

  const getTopics = useCallback(
    async (technologyId: string): Promise<Topic[]> => {
      const cached = topicsCache.current.get(technologyId);
      if (cached) {
        return cached;
      }

      const topics = await repository.getTopicsByTechnology(technologyId);
      topicsCache.current.set(technologyId, topics);
      return topics;
    },
    [repository],
  );

  const getConcept = useCallback(
    async (conceptId: string): Promise<Concept | null> => {
      const cached = conceptCache.current.get(conceptId);
      if (cached) {
        return cached;
      }

      const concept = await repository.getConceptById(conceptId);
      if (concept) {
        conceptCache.current.set(conceptId, concept);
      }
      return concept;
    },
    [repository],
  );

  const getSession = useCallback(
    async (sessionId: string): Promise<ExerciseSession | null> => {
      const cached = sessionCache.current.get(sessionId);
      if (cached) {
        return cached;
      }

      const session = await repository.getSessionById(sessionId);
      if (session) {
        sessionCache.current.set(sessionId, session);
      }
      return session;
    },
    [repository],
  );

  const value = useMemo<ContentContextValue>(
    () => ({
      technologies,
      getTechnology,
      getTopics,
      getConcept,
      getSession,
      isLoading,
    }),
    [technologies, getTechnology, getTopics, getConcept, getSession, isLoading],
  );

  return (
    <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
  );
}
