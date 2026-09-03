import type { ConceptProgress } from '@/types/progress';

/** La versión de schema que entiende actualmente el progreso persistido. */
export const CURRENT_SCHEMA_VERSION = 1;

type ProgressMigration = (progress: ConceptProgress) => ConceptProgress;

/**
 * Registro preparado para evoluciones explícitas (por ejemplo, 1 -> 2).
 * No hay migraciones históricas documentadas todavía.
 */
const migrations: ReadonlyMap<number, ProgressMigration> = new Map();

/** Señala que un progreso no puede convertirse con migraciones conocidas. */
export class UnsupportedSchemaVersionError extends Error {
  constructor(readonly schemaVersion: unknown) {
    super(`La versión de schema de progreso no está soportada: ${String(schemaVersion)}`);
    this.name = 'UnsupportedSchemaVersionError';
  }
}

function isSupportedVersionValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

function cloneProgress(progress: ConceptProgress): ConceptProgress {
  return {
    ...progress,
    difficultyDistribution: {
      beginner: { ...progress.difficultyDistribution.beginner },
      intermediate: { ...progress.difficultyDistribution.intermediate },
      advanced: { ...progress.difficultyDistribution.advanced },
    },
    recentErrors: progress.recentErrors.map((error) => ({ ...error })),
  };
}

/**
 * Convierte un `ConceptProgress` a la versión actual sin acceder a Storage.
 *
 * La v1 vigente es una identidad semántica. Versiones antiguas no se asumen
 * compatibles mientras no exista una migración registrada, y las futuras se
 * rechazan para no interpretar datos potencialmente incompatibles.
 */
export function migrateConceptProgress(input: ConceptProgress): ConceptProgress {
  if (!isSupportedVersionValue(input.schemaVersion)) {
    throw new UnsupportedSchemaVersionError(input.schemaVersion);
  }

  if (input.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new UnsupportedSchemaVersionError(input.schemaVersion);
  }

  let progress = cloneProgress(input);

  while (progress.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const migration = migrations.get(progress.schemaVersion);

    if (migration === undefined) {
      throw new UnsupportedSchemaVersionError(progress.schemaVersion);
    }

    progress = migration(progress);
  }

  return progress;
}
