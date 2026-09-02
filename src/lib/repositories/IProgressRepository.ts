/**
 * §20 sitúa el contrato del repositorio de progreso en esta ruta, pero su
 * definición canónica vive en `types/repository.ts` desde T011. Reexportarlo
 * evita dos contratos que podrían divergir al llegar la implementación remota.
 */
export type { IProgressRepository } from '@/types/repository';
