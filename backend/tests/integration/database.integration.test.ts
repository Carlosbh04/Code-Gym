import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadConfig } from '../../src/config/load-config.js';
import { createDatabaseService } from '../../src/database/database-service.js';
import { createPrismaClient } from '../../src/database/prisma.js';

const config = loadConfig();

if (!config.isTest || !config.database.name.endsWith('_test')) {
  throw new Error('DB integration requires NODE_ENV=test and a DB_NAME ending in _test');
}

const prisma = createPrismaClient(config.database);
const database = createDatabaseService(prisma);
const runId = randomUUID();
const fixtureEmails: string[] = [];
let fixtureSequence = 0;

async function createFixtureUser(label: string) {
  fixtureSequence += 1;
  const email = `t204-${label}-${String(fixtureSequence)}-${runId}@example.test`;
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: '$test$not-a-real-password-hash',
      displayName: `T204 ${label}`,
    },
  });
  fixtureEmails.push(email);
  return user;
}

describe('T204/T206 MySQL schema integration (explicit opt-in)', () => {
  beforeAll(async () => database.connect(), 20_000);

  afterAll(async () => {
    try {
      if (fixtureEmails.length > 0) {
        await prisma.user.deleteMany({ where: { email: { in: fixtureEmails } } });
      }
    } finally {
      await database.disconnect();
    }
  }, 20_000);

  it('has migration metadata and only the approved business/auth tables', async () => {
    const tables = await prisma.$queryRaw<Array<{ tableName: string }>>`
      SELECT TABLE_NAME AS tableName
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `;

    expect(tables.map(({ tableName }) => tableName)).toEqual([
      '_prisma_migrations',
      'attempts',
      'auth_identities',
      'auth_sessions',
      'completed_sessions',
      'concept_learning_level_progress',
      'concept_learning_levels',
      'concept_learning_progress',
      'concept_progress',
      'concepts',
      'exercise_sessions',
      'exercise_steps',
      'learning_sections',
      'password_reset_challenges',
      'security_outbox_events',
      'technologies',
      'topics',
      'training_hint_reveals',
      'training_runs',
      'users',
    ]);

    const migrations = await prisma.$queryRaw<
      Array<{ migrationName: string; finishedAt: Date | null; rolledBackAt: Date | null }>
    >`
      SELECT
        migration_name AS migrationName,
        finished_at AS finishedAt,
        rolled_back_at AS rolledBackAt
      FROM _prisma_migrations
      WHERE rolled_back_at IS NULL
      ORDER BY migration_name
    `;
    expect(migrations).toHaveLength(16);
    expect(migrations.map(({ migrationName }) => migrationName)).toEqual([
      '20260909203656_init_core_schema',
      '20260910201112_add_auth_sessions',
      '20260911142306_add_user_role',
      '20260912072114_add_completed_session_concept_id',
      '20260912090419_add_training_runs',
      '20260913183000_add_password_reset_challenges',
      '20260915071555_content_catalog',
      '20260915080213_google_auth_identity',
      '20260915194048_add_training_hint_reveals',
      '20260915200454_add_auth_session_remembered',
      '20260916070714_add_auth_session_last_activity',
      '20260917111000_add_account_security_state',
      '20260917161449_add_learning_progression',
      '20260917184359_add_learning_levels',
      '20260917185556_add_concept_learning_levels',
      '20260917192041_add_learning_section_levels',
    ]);
    for (const migration of migrations) {
      expect(migration.finishedAt).toBeInstanceOf(Date);
      expect(migration.rolledBackAt).toBeNull();
    }
  });

  it('stores refresh credentials as a fixed-size binary digest without a plaintext column', async () => {
    const columns = await prisma.$queryRaw<
      Array<{ columnName: string; dataType: string; columnType: string }>
    >`
      SELECT
        COLUMN_NAME AS columnName,
        DATA_TYPE AS dataType,
        COLUMN_TYPE AS columnType
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'auth_sessions'
      ORDER BY ORDINAL_POSITION
    `;
    const names = columns.map(({ columnName }) => columnName);
    const digest = columns.find(({ columnName }) => columnName === 'refresh_token_digest');

    expect(digest).toEqual({
      columnName: 'refresh_token_digest',
      dataType: 'binary',
      columnType: 'binary(32)',
    });
    expect(names).not.toContain('refresh_token');
    expect(names).not.toContain('token');
    expect(names).not.toContain('session_token');
  });

  it('connects, creates and queries a user with generated timestamps', async () => {
    await expect(database.healthCheck()).resolves.toBe(true);
    const user = await createFixtureUser('timestamps');

    expect(user.id).toMatch(/^[a-z0-9]{24}$/);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
    expect(user.updatedAt.getTime()).toBe(user.createdAt.getTime());

    await delay(20);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { displayName: 'T204 updated fixture' },
    });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());

    await expect(prisma.user.findUnique({ where: { email: user.email } })).resolves.toMatchObject({
      id: user.id,
      passwordHash: '$test$not-a-real-password-hash',
    });
  });

  it('enforces the unique email constraint', async () => {
    const user = await createFixtureUser('unique-email');
    await expect(
      prisma.user.create({
        data: { email: user.email, passwordHash: '$test$another-fake-hash' },
      }),
    ).rejects.toThrow();
  });

  it('persists and queries user relations', async () => {
    const user = await createFixtureUser('relations');
    const content = {
      technologyId: 'javascript',
      sessionId: 'js-functions-return-flow-01',
    };

    const attempt = await prisma.attempt.create({
      data: {
        userId: user.id,
        ...content,
        exerciseId: 'step-1',
        conceptId: 'js-function-basics',
        isCorrect: true,
        durationMs: 1_250,
        hintsUsed: 0,
      },
    });
    const completedSession = await prisma.completedSession.create({
      data: {
        userId: user.id,
        ...content,
        topicId: 'js-functions',
        totalExercises: 4,
        correctExercises: 3,
        durationMs: 32_000,
        hintsUsed: 1,
      },
    });
    const lastPracticedAt = new Date();
    const progress = await prisma.conceptProgress.create({
      data: {
        userId: user.id,
        technologyId: content.technologyId,
        conceptId: 'js-function-basics',
        totalAttempts: 1,
        correctAttempts: 1,
        completedSessions: 1,
        lastPracticedAt,
      },
    });

    expect(attempt.attemptedAt).toBeInstanceOf(Date);
    expect(completedSession.completedAt).toBeInstanceOf(Date);
    expect(progress.createdAt).toBeInstanceOf(Date);
    expect(progress.updatedAt).toBeInstanceOf(Date);
    expect(progress.lastPracticedAt.getTime()).toBe(lastPracticedAt.getTime());

    const related = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { attempts: true, completedSessions: true, conceptProgress: true },
    });
    expect(related.attempts).toHaveLength(1);
    expect(related.completedSessions).toHaveLength(1);
    expect(related.conceptProgress).toHaveLength(1);
  });

  it('enforces one concept progress row per user and canonical concept', async () => {
    const user = await createFixtureUser('progress-unique');
    const data = {
      userId: user.id,
      technologyId: 'javascript',
      conceptId: 'js-function-basics',
      lastPracticedAt: new Date(),
    };

    await prisma.conceptProgress.create({ data });
    await expect(prisma.conceptProgress.create({ data })).rejects.toThrow();
  });

  it('supports multiple auth sessions per user and enforces a globally unique digest', async () => {
    const user = await createFixtureUser('auth-multiple');
    const createdAt = new Date('2026-09-10T12:00:00.000Z');
    const expiresAt = new Date('2026-10-10T12:00:00.000Z');
    const firstDigest = randomBytes(32);
    const secondDigest = randomBytes(32);

    const first = await prisma.authSession.create({
      data: { userId: user.id, refreshTokenDigest: firstDigest, createdAt, expiresAt },
    });
    const second = await prisma.authSession.create({
      data: { userId: user.id, refreshTokenDigest: secondDigest, createdAt, expiresAt },
    });

    expect(Buffer.from(first.refreshTokenDigest)).toEqual(firstDigest);
    expect(Buffer.from(second.refreshTokenDigest)).toEqual(secondDigest);
    expect(await prisma.authSession.count({ where: { userId: user.id } })).toBe(2);
    await expect(prisma.authSession.create({
      data: { userId: user.id, refreshTokenDigest: firstDigest, createdAt, expiresAt },
    })).rejects.toThrow();
  });

  it('enforces the auth-session user foreign key', async () => {
    await expect(prisma.authSession.create({
      data: {
        userId: 'missing-user-id',
        refreshTokenDigest: randomBytes(32),
        createdAt: new Date('2026-09-10T12:00:00.000Z'),
        expiresAt: new Date('2026-10-10T12:00:00.000Z'),
      },
    })).rejects.toThrow();
  });

  it('enforces auth-session expiry, rotation, and revocation chronology checks', async () => {
    const user = await createFixtureUser('auth-chronology');
    const createdAt = new Date('2026-09-10T12:00:00.000Z');
    const afterCreation = new Date('2026-09-10T12:00:01.000Z');
    const beforeCreation = new Date('2026-09-10T11:59:59.999Z');

    await expect(prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenDigest: randomBytes(32),
        createdAt,
        expiresAt: createdAt,
      },
    })).rejects.toThrow();
    await expect(prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenDigest: randomBytes(32),
        createdAt,
        expiresAt: afterCreation,
        rotatedAt: beforeCreation,
      },
    })).rejects.toThrow();
    await expect(prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenDigest: randomBytes(32),
        createdAt,
        expiresAt: afterCreation,
        revokedAt: beforeCreation,
      },
    })).rejects.toThrow();
  });

  it('selects only active sessions while excluding expired and revoked states', async () => {
    const user = await createFixtureUser('auth-state');
    const now = new Date('2026-09-10T12:00:00.000Z');
    const createdAt = new Date('2026-09-09T12:00:00.000Z');
    const active = await prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenDigest: randomBytes(32),
        createdAt,
        expiresAt: new Date('2026-09-11T12:00:00.000Z'),
      },
    });
    await prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenDigest: randomBytes(32),
        createdAt,
        expiresAt: new Date('2026-09-10T11:59:59.999Z'),
      },
    });
    await prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenDigest: randomBytes(32),
        createdAt,
        expiresAt: new Date('2026-09-11T12:00:00.000Z'),
        revokedAt: new Date('2026-09-10T11:00:00.000Z'),
      },
    });

    const activeSessions = await prisma.authSession.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: now } },
    });
    expect(activeSessions.map(({ id }) => id)).toEqual([active.id]);
  });

  it('rotates a refresh digest with compare-and-set semantics', async () => {
    const user = await createFixtureUser('auth-rotation');
    const createdAt = new Date('2026-09-10T12:00:00.000Z');
    const expiresAt = new Date('2026-10-10T12:00:00.000Z');
    const oldDigest = randomBytes(32);
    const newDigest = randomBytes(32);
    const rotatedAt = new Date('2026-09-10T12:01:00.000Z');
    const session = await prisma.authSession.create({
      data: { userId: user.id, refreshTokenDigest: oldDigest, createdAt, expiresAt },
    });

    const firstRotation = await prisma.authSession.updateMany({
      where: {
        id: session.id,
        refreshTokenDigest: oldDigest,
        revokedAt: null,
        expiresAt: { gt: rotatedAt },
      },
      data: { refreshTokenDigest: newDigest, rotatedAt },
    });
    const replayedRotation = await prisma.authSession.updateMany({
      where: {
        id: session.id,
        refreshTokenDigest: oldDigest,
        revokedAt: null,
        expiresAt: { gt: rotatedAt },
      },
      data: { refreshTokenDigest: randomBytes(32), rotatedAt },
    });

    expect(firstRotation.count).toBe(1);
    expect(replayedRotation.count).toBe(0);
    const rotated = await prisma.authSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(Buffer.from(rotated.refreshTokenDigest)).toEqual(newDigest);
    expect(rotated.rotatedAt).toEqual(rotatedAt);
    expect(rotated.revokedAt).toBeNull();
  });

  it('enforces completed-session and progress counter invariants', async () => {
    const user = await createFixtureUser('checks');

    await expect(
      prisma.completedSession.create({
        data: {
          userId: user.id,
          sessionId: 'js-functions-return-flow-01',
          technologyId: 'javascript',
          totalExercises: 0,
          correctExercises: 0,
          durationMs: 1,
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.completedSession.create({
        data: {
          userId: user.id,
          sessionId: 'js-functions-return-flow-01',
          technologyId: 'javascript',
          totalExercises: 2,
          correctExercises: 3,
          durationMs: 1,
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.conceptProgress.create({
        data: {
          userId: user.id,
          conceptId: 'js-function-basics',
          technologyId: 'javascript',
          totalAttempts: 1,
          correctAttempts: 2,
          lastPracticedAt: new Date(),
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects negative unsigned counters and durations', async () => {
    const user = await createFixtureUser('unsigned');
    const attemptData = {
      userId: user.id,
      sessionId: 'css-cascade-specificity-01',
      exerciseId: 'step-1',
      technologyId: 'css',
      isCorrect: false,
    };

    await expect(prisma.attempt.create({ data: { ...attemptData, durationMs: -1 } })).rejects.toThrow();
    await expect(prisma.attempt.create({ data: { ...attemptData, hintsUsed: -1 } })).rejects.toThrow();

    const sessionData = {
      userId: user.id,
      sessionId: 'css-cascade-specificity-01',
      technologyId: 'css',
      totalExercises: 1,
      correctExercises: 0,
      durationMs: 1,
    };
    await expect(
      prisma.completedSession.create({ data: { ...sessionData, durationMs: -1 } }),
    ).rejects.toThrow();
    await expect(
      prisma.completedSession.create({ data: { ...sessionData, hintsUsed: -1 } }),
    ).rejects.toThrow();

    const progressData = {
      userId: user.id,
      conceptId: 'css-cascade-specificity',
      technologyId: 'css',
      lastPracticedAt: new Date(),
    };
    await expect(
      prisma.conceptProgress.create({ data: { ...progressData, totalAttempts: -1 } }),
    ).rejects.toThrow();
    await expect(
      prisma.conceptProgress.create({ data: { ...progressData, correctAttempts: -1 } }),
    ).rejects.toThrow();
    await expect(
      prisma.conceptProgress.create({ data: { ...progressData, completedSessions: -1 } }),
    ).rejects.toThrow();
  });

  it('cascades user deletion to every owned entity', async () => {
    const user = await createFixtureUser('cascade');
    const sessionId = 'html-document-basics-01';

    await prisma.attempt.create({
      data: {
        userId: user.id,
        sessionId,
        exerciseId: 'step-1',
        conceptId: 'html-document-basics',
        technologyId: 'html',
        isCorrect: true,
      },
    });
    await prisma.completedSession.create({
      data: {
        userId: user.id,
        sessionId,
        technologyId: 'html',
        totalExercises: 1,
        correctExercises: 1,
        durationMs: 500,
      },
    });
    await prisma.conceptProgress.create({
      data: {
        userId: user.id,
        conceptId: 'html-document-basics',
        technologyId: 'html',
        totalAttempts: 1,
        correctAttempts: 1,
        completedSessions: 1,
        lastPracticedAt: new Date(),
      },
    });
    await prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenDigest: randomBytes(32),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    await prisma.user.delete({ where: { id: user.id } });
    expect(await prisma.attempt.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.completedSession.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.conceptProgress.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.authSession.count({ where: { userId: user.id } })).toBe(0);
  });
});
