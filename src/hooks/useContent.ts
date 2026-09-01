import { useContext } from 'react';
import { ContentContext } from '@/contexts/content-context';
import type { ContentContextValue } from '@/types/content';

/**
 * Acceso al estado de contenido (§18). Es la única vía por la que la UI llega
 * al contenido: no añade lógica sobre el contexto ni duplica la del
 * repositorio.
 *
 * Lanza si se usa fuera del Provider, en lugar de devolver un valor por
 * defecto: un contexto de contenido ausente es un error de montaje, y
 * silenciarlo produciría pantallas vacías sin causa aparente.
 */
export function useContent(): ContentContextValue {
  const value = useContext(ContentContext);

  if (value === null) {
    throw new Error('useContent debe usarse dentro de <ContentProvider>');
  }

  return value;
}
