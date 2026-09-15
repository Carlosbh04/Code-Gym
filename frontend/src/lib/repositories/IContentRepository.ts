/**
 * §16 sitúa el contrato del repositorio de contenido en este fichero, pero la
 * definición ya vive en `types/repository.ts` desde T011. Se reexporta en lugar
 * de duplicarla: un único contrato, y la ruta que espera la arquitectura.
 */
export type { IContentRepository } from '@/types/repository';
