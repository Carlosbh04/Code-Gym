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
  PrismaSecurityOutboxRepository,
} from '../../src/auth/security-outbox-repository.js';

import {
  SecurityOutboxEventType,
} from '../../src/generated/prisma/client.js';

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
  new PrismaSecurityOutboxRepository(
    prisma,
  );

const runId =
  randomUUID()
    .replaceAll(
      '-',
      '',
    );

const email =
  `security-outbox-${runId}@example.test`;

let userId:
  string;


beforeAll(
  async () => {
    await database
      .connect();

    const user =
      await prisma.user
        .create({
          data: {
            email,

            passwordHash:
              `hash-${runId}`,

            displayName:
              'Outbox User',
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
      if (
        email.startsWith(
          'security-outbox-',
        )
      ) {
        await prisma.user
          .deleteMany({
            where: {
              email,
            },
          });
      }
    } finally {
      await database
        .disconnect();
    }
  },

  20_000,
);


async function createEvent(
  lockVersion:
    number,
) {
  return prisma
    .securityOutboxEvent
    .create({
      data: {
        userId,

        type:
          SecurityOutboxEventType
            .ACCOUNT_LOCKED,

        lockVersion,

        recipientEmail:
          email,

        recipientDisplayName:
          'Outbox User',
      },
    });
}


describe(
  'security outbox MySQL integration',
  () => {
    it(
      'allows only one concurrent worker to claim a due event',
      async () => {
        const created =
          await createEvent(
            1,
          );

        const now =
          new Date();

        const leaseCutoff =
          new Date(
            now.getTime()
            - 300_000,
          );

        const claims =
          await Promise.all([
            repository.claimNext({
              now,

              leaseExpiredBefore:
                leaseCutoff,

              claimToken:
                `a-${runId}`,
            }),

            repository.claimNext({
              now,

              leaseExpiredBefore:
                leaseCutoff,

              claimToken:
                `b-${runId}`,
            }),
          ]);

        const claimed =
          claims.filter(
            (
              value,
            ) =>
              value !== null,
          );

        expect(
          claimed,
        ).toHaveLength(
          1,
        );

        expect(
          claimed[0]?.id,
        ).toBe(
          created.id,
        );

        const stored =
          await prisma
            .securityOutboxEvent
            .findUniqueOrThrow({
              where: {
                id:
                  created.id,
              },

              select: {
                attemptCount:
                  true,

                claimToken:
                  true,

                claimedAt:
                  true,
              },
            });

        expect(
          stored.attemptCount,
        ).toBe(
          1,
        );

        expect(
          stored.claimToken,
        ).toBe(
          claimed[0]
            ?.claimToken,
        );

        expect(
          stored.claimedAt,
        ).not.toBeNull();

        await repository
          .markSent({
            eventId:
              created.id,

            claimToken:
              claimed[0]
                ?.claimToken
                ?? '',

            sentAt:
              new Date(),
          });
      },

      20_000,
    );


    it(
      'reschedules failures and does not expose them before nextAttemptAt',
      async () => {
        const created =
          await createEvent(
            2,
          );

        const now =
          new Date(
            '2026-09-17T13:00:00.000Z',
          );

        const claim =
          await repository
            .claimNext({
              now,

              leaseExpiredBefore:
                new Date(
                  now.getTime()
                  - 300_000,
                ),

              claimToken:
                `retry-1-${runId}`,
            });

        expect(
          claim?.id,
        ).toBe(
          created.id,
        );

        const retryAt =
          new Date(
            now.getTime()
            + 60_000,
          );

        await expect(
          repository.reschedule({
            eventId:
              created.id,

            claimToken:
              claim?.claimToken
              ?? '',

            nextAttemptAt:
              retryAt,
          }),
        ).resolves.toBe(
          true,
        );

        await expect(
          repository.claimNext({
            now:
              new Date(
                retryAt.getTime()
                - 1,
              ),

            leaseExpiredBefore:
              new Date(
                retryAt.getTime()
                - 300_001,
              ),

            claimToken:
              `too-early-${runId}`,
          }),
        ).resolves.toBeNull();

        const retryClaim =
          await repository
            .claimNext({
              now:
                retryAt,

              leaseExpiredBefore:
                new Date(
                  retryAt.getTime()
                  - 300_000,
                ),

              claimToken:
                `retry-2-${runId}`,
            });

        expect(
          retryClaim,
        ).toMatchObject({
          id:
            created.id,

          attemptCount:
            2,
        });

        await repository
          .markSent({
            eventId:
              created.id,

            claimToken:
              retryClaim
                ?.claimToken
                ?? '',

            sentAt:
              retryAt,
          });

        await expect(
          repository.claimNext({
            now:
              new Date(
                retryAt.getTime()
                + 10_000,
              ),

            leaseExpiredBefore:
              new Date(
                retryAt.getTime()
                - 300_000,
              ),

            claimToken:
              `after-sent-${runId}`,
          }),
        ).resolves.toBeNull();
      },

      20_000,
    );


    it(
      'reclaims an expired lease and rejects completion from the stale owner',
      async () => {
        const created =
          await createEvent(
            3,
          );

        const firstNow =
          new Date(
            '2026-09-17T14:00:00.000Z',
          );

        const first =
          await repository
            .claimNext({
              now:
                firstNow,

              leaseExpiredBefore:
                new Date(
                  firstNow.getTime()
                  - 300_000,
                ),

              claimToken:
                `lease-old-${runId}`,
            });

        expect(
          first?.id,
        ).toBe(
          created.id,
        );

        const secondNow =
          new Date(
            firstNow.getTime()
            + 300_001,
          );

        const second =
          await repository
            .claimNext({
              now:
                secondNow,

              leaseExpiredBefore:
                new Date(
                  secondNow.getTime()
                  - 300_000,
                ),

              claimToken:
                `lease-new-${runId}`,
            });

        expect(
          second,
        ).toMatchObject({
          id:
            created.id,

          attemptCount:
            2,
        });

        await expect(
          repository.markSent({
            eventId:
              created.id,

            claimToken:
              first?.claimToken
              ?? '',

            sentAt:
              secondNow,
          }),
        ).resolves.toBe(
          false,
        );

        await expect(
          repository.markSent({
            eventId:
              created.id,

            claimToken:
              second?.claimToken
              ?? '',

            sentAt:
              secondNow,
          }),
        ).resolves.toBe(
          true,
        );

        const stored =
          await prisma
            .securityOutboxEvent
            .findUniqueOrThrow({
              where: {
                id:
                  created.id,
              },

              select: {
                sentAt:
                  true,

                claimToken:
                  true,

                claimedAt:
                  true,
              },
            });

        expect(
          stored.sentAt,
        ).not.toBeNull();

        expect(
          stored.claimToken,
        ).toBeNull();

        expect(
          stored.claimedAt,
        ).toBeNull();
      },

      20_000,
    );
  },
);
