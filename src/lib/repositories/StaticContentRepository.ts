import type { Concept, Technology, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { IContentRepository } from '@/types/repository';

/**
 * Repositorio de contenido sobre los ficheros estáticos de `data/content/`
 * (§20). No conoce React, no toca almacenamiento del navegador y no habla con
 * ningún backend: solo lee datos versionados en el repositorio.
 *
 * Carga: `import.meta.glob` sin `eager`, de modo que cada JSON queda en su
 * propio chunk y solo se descarga cuando alguien lo pide (D005). El caché lo
 * aporta el propio sistema de módulos: pedir dos veces la misma sesión no
 * vuelve a leerla. El caché de nivel de aplicación es del ContentContext (§18).
 *
 * Inmutabilidad: el contenido se congela en profundidad antes de devolverlo. No
 * se clona, para no duplicar los datos en cada llamada; congelar garantiza que
 * un consumidor no pueda corromper el contenido compartido por descuido.
 */

const sessionLoaders = import.meta.glob<{ default: ExerciseSession }>(
  '/src/data/content/*/*/sessions/*.json',
);

/** Índice de tecnologías (§8: lo primero que carga la aplicación). */
const technologyLoaders = import.meta.glob<{ default: Technology[] }>(
  '/src/data/technologies.json',
);

/** Índice de topics de cada tecnología. */
const topicLoaders = import.meta.glob<{ default: Topic[] }>(
  '/src/data/content/*/index.json',
);

/** Metadatos del concepto de cada topic: un Concept sin su contentMarkdown. */
const conceptLoaders = import.meta.glob<{
  default: Omit<Concept, 'contentMarkdown'>;
}>('/src/data/content/*/*/index.json');

/** Prosa del concepto, que completa el contentMarkdown. */
const conceptMarkdownLoaders = import.meta.glob<string>(
  '/src/data/content/*/*/concept.md',
  { query: '?raw', import: 'default' },
);

/** Conceptos ya compuestos, para no rehacer la mezcla en cada lectura. */
const composedConcepts = new Map<string, Concept>();

/** Rutas de concepto ya resueltas sin cargar payloads de sesiones ajenas. */
const conceptPaths = new Map<string, string>();

/** Rutas ordenadas, para que las consultas devuelvan un orden estable. */
const sessionPaths = Object.keys(sessionLoaders).sort();

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return value;
}

async function loadSession(path: string): Promise<ExerciseSession> {
  const module = await sessionLoaders[path]();
  return deepFreeze(module.default);
}

export class StaticContentRepository implements IContentRepository {
  private readonly sessionsByConcept = new Map<
    string,
    Promise<readonly ExerciseSession[]>
  >();

  /** Tecnologías declaradas en `data/technologies.json`. */
  async getTechnologies(): Promise<Technology[]> {
    const load = technologyLoaders['/src/data/technologies.json'];
    if (!load) {
      return [];
    }
    return deepFreeze((await load()).default);
  }

  /**
   * Topics de una tecnología. §8 estructura el contenido como
   * `content/<tecnologia>/`, así que el índice se localiza directamente por
   * ruta en lugar de recorrer los de todas las tecnologías.
   */
  async getTopicsByTechnology(technologyId: string): Promise<Topic[]> {
    const load = topicLoaders[`/src/data/content/${technologyId}/index.json`];
    if (!load) {
      return [];
    }
    return deepFreeze((await load()).default);
  }

  /**
   * Concepto completo: los metadatos vienen del `index.json` del topic y el
   * `contentMarkdown` del `concept.md` que está a su lado. Un concepto sin
   * prosa se considera contenido incompleto y no se devuelve a medias.
   */
  async getConceptById(conceptId: string): Promise<Concept | null> {
    const cached = composedConcepts.get(conceptId);
    if (cached) {
      return cached;
    }

    for (const path of Object.keys(conceptLoaders).sort()) {
      const metadata = (await conceptLoaders[path]()).default;
      if (metadata.id !== conceptId) {
        continue;
      }

      const markdownPath = path.replace(/index\.json$/, 'concept.md');
      const loadMarkdown = conceptMarkdownLoaders[markdownPath];
      if (!loadMarkdown) {
        return null;
      }

      const concept = deepFreeze({
        ...metadata,
        contentMarkdown: await loadMarkdown(),
      });
      composedConcepts.set(conceptId, concept);
      return concept;
    }

    return null;
  }

  /** Sesiones que entrenan un concepto, en orden estable por ruta. */
  async getSessionsByConcept(conceptId: string): Promise<ExerciseSession[]> {
    let pending = this.sessionsByConcept.get(conceptId);
    if (pending === undefined) {
      pending = this.loadSessionsByConcept(conceptId);
      this.sessionsByConcept.set(conceptId, pending);
    }

    try {
      // El array pertenece al llamante; las sesiones internas siguen congeladas.
      return [...(await pending)];
    } catch (error: unknown) {
      this.sessionsByConcept.delete(conceptId);
      throw error;
    }
  }

  /**
   * Búsqueda por id. Recorre los ficheros y se detiene en cuanto encuentra el
   * pedido, de modo que abrir una sesión no arrastra el contenido de los demás
   * topics. Cuando T021 aporte el índice, esto podrá resolverse sin recorrido.
   */
  async getSessionById(sessionId: string): Promise<ExerciseSession | null> {
    for (const path of sessionPaths) {
      const session = await loadSession(path);
      if (session.id === sessionId) {
        return session;
      }
    }
    return null;
  }

  private async loadSessionsByConcept(
    conceptId: string,
  ): Promise<readonly ExerciseSession[]> {
    const conceptPath = await this.findConceptPath(conceptId);
    if (conceptPath === null) return [];

    const topicDirectory = conceptPath.replace(/index\.json$/, 'sessions/');
    const paths = sessionPaths.filter((path) => path.startsWith(topicDirectory));
    const sessions = await Promise.all(paths.map(loadSession));
    return sessions.filter((session) => session.conceptId === conceptId);
  }

  private async findConceptPath(conceptId: string): Promise<string | null> {
    const cached = conceptPaths.get(conceptId);
    if (cached !== undefined) return cached;

    for (const path of Object.keys(conceptLoaders).sort()) {
      const metadata = (await conceptLoaders[path]()).default;
      conceptPaths.set(metadata.id, path);
      if (metadata.id === conceptId) return path;
    }

    return null;
  }
}
