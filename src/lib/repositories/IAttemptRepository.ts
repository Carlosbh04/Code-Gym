/**
 * §20 sitúa el contrato del repositorio de intentos en esta ruta, pero su
 * definición canónica vive en `types/repository.ts` desde T011. Reexportarlo
 * mantiene una sola API para las implementaciones local y remota (D002).
 */
export type { IAttemptRepository } from '@/types/repository';
