import type { ReactNode } from 'react';
import { ContentProvider } from '@/contexts/ContentContext';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';

/**
 * Raíz de composición de la aplicación (§16, §35).
 *
 * Es el único punto donde se crean implementaciones concretas de repositorio:
 * §15 se lo prohíbe a hooks y componentes, y §35 establece que migrar a Fase 2
 * solo cambia las líneas de creación de este fichero.
 *
 * Hoy solo monta el contenido. Los proveedores de progreso llegan con T049.
 */

const contentRepository = new StaticContentRepository();

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ContentProvider repository={contentRepository}>{children}</ContentProvider>
  );
}
