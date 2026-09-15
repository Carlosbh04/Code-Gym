import type {
  ConceptId,
} from '../content/content-id.js';

import type {
  ConceptProgressRecord,
  ConceptProgressRepository,
} from './concept-progress-repository.js';

import {
  calculateAccuracy,
} from './user-progress-model.js';

export interface ConceptProgressView {
  readonly conceptId: ConceptId;
  readonly technologyId: string;
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly completedSessions: number;
  readonly accuracy: number | null;
  readonly lastPracticedAt: string;
}

export class ConceptProgressService {
  public constructor(
    private readonly repository:
      Pick<
        ConceptProgressRepository,
        | 'findByUserAndConceptId'
        | 'findByUserId'
      >,
  ) {}

  public async getConceptProgress(
    userId: string,
    conceptId: ConceptId,
  ): Promise<ConceptProgressView | null> {
    const record =
      await this.repository
        .findByUserAndConceptId(
          userId,
          conceptId,
        );

    return record === null
      ? null
      : toConceptProgressView(
          record,
        );
  }

  public async listConceptProgress(
    userId: string,
  ): Promise<readonly ConceptProgressView[]> {
    const records =
      await this.repository
        .findByUserId(
          userId,
        );

    return records.map(
      toConceptProgressView,
    );
  }
}

function toConceptProgressView(
  record: ConceptProgressRecord,
): ConceptProgressView {
  return Object.freeze({
    conceptId:
      record.conceptId,

    technologyId:
      record.technologyId,

    totalAttempts:
      record.totalAttempts,

    correctAttempts:
      record.correctAttempts,

    completedSessions:
      record.completedSessions,

    accuracy:
      calculateAccuracy(
        record.correctAttempts,
        record.totalAttempts,
      ),

    lastPracticedAt:
      record.lastPracticedAt
        .toISOString(),
  });
}
