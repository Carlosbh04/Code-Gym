/**
 * §20 sitúa el contrato de sesiones completadas en esta ruta, pero su
 * definición canónica vive en `types/repository.ts` desde T011. Reexportarlo
 * mantiene una sola API para las implementaciones local y remota (D002).
 */
export type { ICompletedSessionRepository } from '@/types/repository';
