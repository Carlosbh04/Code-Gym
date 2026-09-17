import {
  randomUUID,
} from 'node:crypto';

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import {
  PrismaAccountSecurityRepository,
} from '../../src/auth/account-security-repository.js';

import {
  loadConfig,
} from '../../src/config/load-config.js';

import {
  createDatabaseService,
} from '../../src/database/database-service.js';

import {
  createPrismaClient,
} from '../../src/database/prisma.js';


const config =
  loadConfig();


if (
  !config.isTest
  || !config.database.name
    .endsWith(
      '_test',
    )
) {
  throw new Error(
    'DB integration requires NODE_ENV=test and a DB_NAME ending in _test',
  );
}


const prisma =
  createPrismaClient(
    config.database,
  );

const database =
  createDatabaseService(
    prisma,
  );

const repository =
  new PrismaAccountSecurityRepository(
    prisma,
  );


const runId =
  randomUUID()
    .replaceAll(
      '-',
      '',
    );

const email =
  `security-inconsistent-${runId}@example.test`;

let userId:
  string;


beforeAll(
  async () => {
    await database.connect();

    const user =
      await prisma.user.create({
        data: {
          email,

          passwordHash:
            `hash-${runId}`,

          displayName:
            'Security State User',
        },

        select: {
          id:
            true,
        },
      });

    userId =
      user.id;
  },

  20_000,
);


afterAll(
  async () => {
    try {
      await prisma.user.deleteMany({
        where: {
          email,
        },
      });
    } finally {
      await database.disconnect();
    }
  },

  20_000,
);


describe(
  'account security inconsistent-state hardening',
  () => {
    it(
      'repairs an expired cooldown below threshold instead of locking the account',
      async () => {
        const occurredAt =
          new Date(
            '2026-09-17T15:00:00.000Z',
          );

        await prisma.user.update({
          where: {
            id:
              userId,
          },

          data: {
            failedLoginAttempts:
              1,

            loginCooldownUntil:
              new Date(
                occurredAt.getTime()
                - 60_000,
              ),

            securityLockedAt:
              null,

            securityLockReason:
              null,
          },
        });

        const result =
          await repository
            .recordFailedPasswordAttempt({
              userId,

              occurredAt,
            });

        expect(
          result,
        ).toBe(
          'FAILED',
        );

        const user =
          await prisma.user
            .findUniqueOrThrow({
              where: {
                id:
                  userId,
              },

              select: {
                failedLoginAttempts:
                  true,

                loginCooldownUntil:
                  true,

                securityLockedAt:
                  true,

                securityLockVersion:
                  true,
              },
            });

        expect(
          user.failedLoginAttempts,
        ).toBe(
          2,
        );

        expect(
          user.loginCooldownUntil,
        ).toBeNull();

        expect(
          user.securityLockedAt,
        ).toBeNull();

        expect(
          user.securityLockVersion,
        ).toBe(
          0,
        );

        const eventCount =
          await prisma
            .securityOutboxEvent
            .count({
              where: {
                userId,
              },
            });

        expect(
          eventCount,
        ).toBe(
          0,
        );
      },
    );


    it(
      'starts a fresh cooldown rather than locking when stale cooldown exists with only two failures',
      async () => {
        const occurredAt =
          new Date(
            '2026-09-17T16:00:00.000Z',
          );

        await prisma.user.update({
          where: {
            id:
              userId,
          },

          data: {
            failedLoginAttempts:
              2,

            loginCooldownUntil:
              new Date(
                occurredAt.getTime()
                - 60_000,
              ),

            securityLockedAt:
              null,

            securityLockReason:
              null,
          },
        });

        const result =
          await repository
            .recordFailedPasswordAttempt({
              userId,

              occurredAt,
            });

        expect(
          result,
        ).toBe(
          'COOLDOWN',
        );

        const user =
          await prisma.user
            .findUniqueOrThrow({
              where: {
                id:
                  userId,
              },

              select: {
                failedLoginAttempts:
                  true,

                loginCooldownUntil:
                  true,

                securityLockedAt:
                  true,

                securityLockVersion:
                  true,
              },
            });

        expect(
          user.failedLoginAttempts,
        ).toBe(
          3,
        );

        expect(
          user.loginCooldownUntil,
        ).not.toBeNull();

        expect(
          user.loginCooldownUntil
            ?.getTime(),
        ).toBeGreaterThan(
          occurredAt.getTime(),
        );

        expect(
          user.securityLockedAt,
        ).toBeNull();

        expect(
          user.securityLockVersion,
        ).toBe(
          0,
        );

        const eventCount =
          await prisma
            .securityOutboxEvent
            .count({
              where: {
                userId,
              },
            });

        expect(
          eventCount,
        ).toBe(
          0,
        );
      },
    );
  },
);
