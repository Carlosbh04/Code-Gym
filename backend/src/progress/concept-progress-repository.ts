import {
  conceptIdSchema,
  technologyIdSchema,
  type ConceptId,
  type TechnologyId,
} from '../content/content-id.js';

import type {
  PrismaClient,
} from '../generated/prisma/client.js';

export interface ConceptProgressRecord {
  readonly id: string;
  readonly userId: string;
  readonly conceptId: ConceptId;
  readonly technologyId: TechnologyId;
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly completedSessions: number;
  readonly lastPracticedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ConceptProgressRepository {
  findByUserAndConceptId(
    userId: string,
    conceptId: ConceptId,
  ): Promise<ConceptProgressRecord | null>;

  findByUserId(
    userId: string,
  ): Promise<readonly ConceptProgressRecord[]>;
}

export class PrismaConceptProgressRepository
implements ConceptProgressRepository {
  public constructor(
    private readonly prisma: PrismaClient,
  ) {}

  public async findByUserAndConceptId(
    userId: string,
    conceptId: ConceptId,
  ): Promise<ConceptProgressRecord | null> {
    const record =
      await this.prisma.conceptProgress.findUnique({
        where: {
          userId_conceptId: {
            userId,
            conceptId,
          },
        },
      });

    return record === null
      ? null
      : mapConceptProgress(
          record,
        );
  }

  public async findByUserId(
    userId: string,
  ): Promise<readonly ConceptProgressRecord[]> {
    const records =
      await this.prisma.conceptProgress.findMany({
        where: {
          userId,
        },
        orderBy: [
          {
            lastPracticedAt:
              'desc',
          },
          {
            conceptId:
              'asc',
          },
        ],
      });

    return records.map(
      mapConceptProgress,
    );
  }
}

interface PersistedConceptProgress {
  readonly id: string;
  readonly userId: string;
  readonly conceptId: string;
  readonly technologyId: string;
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly completedSessions: number;
  readonly lastPracticedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function mapConceptProgress(
  record: PersistedConceptProgress,
): ConceptProgressRecord {
  return Object.freeze({
    id:
      record.id,

    userId:
      record.userId,

    conceptId:
      conceptIdSchema.parse(
        record.conceptId,
      ),

    technologyId:
      technologyIdSchema.parse(
        record.technologyId,
      ),

    totalAttempts:
      record.totalAttempts,

    correctAttempts:
      record.correctAttempts,

    completedSessions:
      record.completedSessions,

    lastPracticedAt:
      record.lastPracticedAt,

    createdAt:
      record.createdAt,

    updatedAt:
      record.updatedAt,
  });
}
