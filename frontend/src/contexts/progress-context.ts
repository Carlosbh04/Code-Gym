import { createContext } from 'react';
import type { ProgressContextValue } from '@/types/progress';

/**
 * Contexto del progreso de la aplicación (§18, D002, D004).
 *
 * Vive separado del Provider para mantener compatible Fast Refresh: los
 * ficheros de componentes no exportan valores ajenos a componentes (D011).
 * `null` permite que `useProgress` detecte un árbol mal compuesto.
 */
export const ProgressContext = createContext<ProgressContextValue | null>(null);
