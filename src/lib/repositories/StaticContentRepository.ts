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
  private allSessions: Promise<ExerciseSession[]> | null = null;

  /**
   * Requiere `data/technologies.json`, que crea T021. Mientras ese fichero no
   * exista no hay ninguna tecnología declarada y la respuesta correcta es una
   * lista vacía: no se derivan `name`, `icon` ni `description` a partir de los
   * nombres de carpeta, porque serían datos inventados.
   */
  async getTechnologies(): Promise<Technology[]> {
    return [];
  }

  /**
   * Requiere el índice de topics de cada tecnología
   * (`data/content/<tecnologia>/index.json`), que crea T021. El Master Plan no
   * define su esquema en ninguna sección, así que este método no lo presupone.
   */
  async getTopicsByTechnology(technologyId: string): Promise<Topic[]> {
    void technologyId;
    return [];
  }

  /**
   * Requiere los metadatos del concepto (`name`, `topicId`), que declara el
   * índice de T021. Los `concept.md` de T017/T018 solo aportan
   * `contentMarkdown`, que por sí solo no compone un `Concept`.
   */
  async getConceptById(conceptId: string): Promise<Concept | null> {
    void conceptId;
    return null;
  }

  /** Sesiones que entrenan un concepto, en orden estable por ruta. */
  async getSessionsByConcept(conceptId: string): Promise<ExerciseSession[]> {
    const sessions = await this.loadAll();
    return sessions.filter((session) => session.conceptId === conceptId);
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

  private loadAll(): Promise<ExerciseSession[]> {
    this.allSessions ??= Promise.all(sessionPaths.map(loadSession));
    return this.allSessions;
  }
}
