import { createContext } from 'react';
import type { ContentContextValue } from '@/types/content';

/**
 * Objeto de contexto del estado de contenido (§18).
 *
 * Vive en su propio módulo, separado de `ContentContext.tsx`, porque Fast
 * Refresh solo funciona si un fichero con componentes exporta únicamente
 * componentes. Es el mismo motivo que da la regla
 * `react-refresh/only-export-components` fijada en D011.
 *
 * El valor por defecto es `null` para que `useContent` pueda distinguir "no hay
 * Provider montado" de "el Provider expone un valor".
 */
export const ContentContext = createContext<ContentContextValue | null>(null);
