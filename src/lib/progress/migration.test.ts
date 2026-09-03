import { describe, expect, it } from 'vitest';
import type { ConceptProgress } from '@/types/progress';
import {
  CURRENT_SCHEMA_VERSION,
  UnsupportedSchemaVersionError,
  migrateConceptProgress,
} from './migration';

const progress: ConceptProgress = {
  conceptId: 'js-array-iteration',
  domain: 42,
  totalAttempts: 12,
  correctAttempts: 9,
  difficultyDistribution: {
    beginner: { total: 6, correct: 5 },
    intermediate: { total: 4, correct: 3 },
    advanced: { total: 2, correct: 1 },
  },
  recentErrors: [
    {
      stepType: 'find-error',
      errorType: 'logical',
      timestamp: '2026-09-03T10:00:00.000Z',
      sessionId: 'js-arrays-map-vs-foreach-01',
    },
  ],
  lastPracticed: '2026-09-03T11:00:00.000Z',
  schemaVersion: CURRENT_SCHEMA_VERSION,
};

describe('migrateConceptProgress (T069)', () => {
  it('reconoce la versión actual como fuente de verdad', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
  });

  it('conserva semánticamente intacto el progreso de schema v1', () => {
    expect(migrateConceptProgress(progress)).toEqual(progress);
  });

  it('no muta el input de schema v1 y devuelve una copia defensiva', () => {
    const input = structuredClone(progress);
    const migrated = migrateConceptProgress(input);

    expect(migrated).not.toBe(input);
    expect(migrated.difficultyDistribution).not.toBe(input.difficultyDistribution);
    expect(migrated.recentErrors).not.toBe(input.recentErrors);
    expect(input).toEqual(progress);
  });

  it.each([2, 0, -1])('rechaza la versión no soportada %s', (schemaVersion) => {
    expect(() => migrateConceptProgress({ ...progress, schemaVersion })).toThrow(
      UnsupportedSchemaVersionError,
    );
  });

  it('rechaza un schemaVersion ausente sin asumir una migración v0', () => {
    const input = { ...progress } as Partial<ConceptProgress>;
    delete input.schemaVersion;

    expect(() => migrateConceptProgress(input as ConceptProgress)).toThrow(
      UnsupportedSchemaVersionError,
    );
  });
});
