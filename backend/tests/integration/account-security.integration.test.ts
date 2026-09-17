import {
  randomBytes,
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
  AccountCooldownError,
  AccountLockedError,
  StalePasswordCredentialError,
} from '../../src/auth/account-security-errors.js';

import {
  PrismaAuthSessionRepository,
} from '../../src/auth/auth-session-repository.js';

import {
  PrismaPasswordResetRepository,
} from '../../src/auth/password-reset-repository.js';

import {
  SecurityLockReason,
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
  || !config.database.name.endsWith(
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

const securityRepository =
  new PrismaAccountSecurityRepository(
    prisma,
  );

const authSessionRepository =
  new PrismaAuthSessionRepository(
    prisma,
  );

const passwordResetRepository =
  new PrismaPasswordResetRepository(
    prisma,
  );


const runId =
  randomUUID()
    .replaceAll(
      '-',
      '',
    );

const cleanupEmails =
  new Set<string>();


function fixtureEmail(
  label: string,
): string {
  const email =
    `account-security-${label}-${runId}@example.test`;

  cleanupEmails.add(
    email,
  );

  return email;
}


async function createUser(
  label: string,
): Promise<{
  id: string;
  email: string;
  passwordHash: string;
}> {
  const email =
    fixtureEmail(
      label,
    );

  const passwordHash =
    `test-password-hash-${label}-${runId}`;

  const user =
    await prisma.user.create({
      data: {
        email,

        passwordHash,

        displayName:
          `Security ${label}`,
      },

      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });

  if (
    user.passwordHash === null
  ) {
    throw new Error(
      'Expected password user',
    );
  }

  return {
    id:
      user.id,

    email:
      user.email,

    passwordHash:
      user.passwordHash,
  };
}


function futureDate(): Date {
  return new Date(
    Date.now()
      + 60 * 60 * 1000,
  );
}


function digest(): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(
    randomBytes(
      32,
    ),
  );
}


describe(
  'account security MySQL integration',
  () => {
    beforeAll(
      async () => {
        await database.connect();
      },
      20_000,
    );


    afterAll(
      async () => {
        try {
          const emails = [
            ...cleanupEmails,
          ];

          if (
            emails.some(
              (email) =>
                !email.startsWith(
                  'account-security-',
                )
                || !email.includes(
                  runId,
                ),
            )
          ) {
            throw new Error(
              'Refusing unsafe account-security cleanup',
            );
          }

          if (
            emails.length > 0
          ) {
            await prisma.user.deleteMany({
              where: {
                email: {
                  in:
                    emails,
                },
              },
            });
          }
        } finally {
          await database.disconnect();
        }
      },
      20_000,
    );


    it(
      'moves 1 -> 2 -> cooldown -> lock and creates exactly one lock event under concurrency',
      async () => {
        const user =
          await createUser(
            'state-machine',
          );

        /*
         * Existing session.
         *
         * When the account becomes locked this session
         * must be revoked by the same DB transaction.
         */
        const existingSession =
          await authSessionRepository
            .createSession({
              userId:
                user.id,

              refreshTokenDigest:
                digest(),

              expiresAt:
                futureDate(),

              remembered:
                true,

              expectedPasswordHash:
                user.passwordHash,
            });

        expect(
          existingSession.revokedAt,
        ).toBeNull();


        const base =
          new Date(
            '2026-09-17T12:00:00.000Z',
          );


        const first =
          await securityRepository
            .recordFailedPasswordAttempt({
              userId:
                user.id,

              occurredAt:
                base,

              expectedPasswordHash:
                user.passwordHash,
            });

        expect(
          first,
        ).toBe(
          'FAILED',
        );


        const second =
          await securityRepository
            .recordFailedPasswordAttempt({
              userId:
                user.id,

              occurredAt:
                new Date(
                  base.getTime()
                    + 1_000,
                ),

              expectedPasswordHash:
                user.passwordHash,
            });

        expect(
          second,
        ).toBe(
          'FAILED',
        );


        const third =
          await securityRepository
            .recordFailedPasswordAttempt({
              userId:
                user.id,

              occurredAt:
                new Date(
                  base.getTime()
                    + 2_000,
                ),

              expectedPasswordHash:
                user.passwordHash,
            });

        expect(
          third,
        ).toBe(
          'COOLDOWN',
        );


        const cooldownState =
          await prisma.user
            .findUniqueOrThrow({
              where: {
                id:
                  user.id,
              },

              select: {
                failedLoginAttempts:
                  true,

                loginCooldownUntil:
                  true,

                securityLockedAt:
                  true,

                securityLockReason:
                  true,

                securityLockVersion:
                  true,
              },
            });


        expect(
          cooldownState
            .failedLoginAttempts,
        ).toBe(
          3,
        );

        expect(
          cooldownState
            .loginCooldownUntil,
        ).not.toBeNull();

        expect(
          cooldownState
            .securityLockedAt,
        ).toBeNull();

        expect(
          cooldownState
            .securityLockReason,
        ).toBeNull();

        expect(
          cooldownState
            .securityLockVersion,
        ).toBe(
          0,
        );


        if (
          cooldownState
            .loginCooldownUntil
            === null
        ) {
          throw new Error(
            'Expected cooldown',
          );
        }


        /*
         * More attempts during cooldown must not increase
         * the persistent counter or lock the account early.
         */
        const duringCooldown =
          await securityRepository
            .recordFailedPasswordAttempt({
              userId:
                user.id,

              occurredAt:
                new Date(
                  base.getTime()
                    + 3_000,
                ),

              expectedPasswordHash:
                user.passwordHash,
            });

        expect(
          duringCooldown,
        ).toBe(
          'COOLDOWN',
        );


        const stillCooling =
          await prisma.user
            .findUniqueOrThrow({
              where: {
                id:
                  user.id,
              },

              select: {
                failedLoginAttempts:
                  true,

                securityLockedAt:
                  true,
              },
            });

        expect(
          stillCooling
            .failedLoginAttempts,
        ).toBe(
          3,
        );

        expect(
          stillCooling
            .securityLockedAt,
        ).toBeNull();


        /*
         * First failed attempt after expiry.
         *
         * Two requests are fired concurrently to verify
         * SELECT ... FOR UPDATE serialization.
         */
        const afterCooldown =
          new Date(
            cooldownState
              .loginCooldownUntil
              .getTime()
              + 1,
          );


        const concurrentResults =
          await Promise.all([
            securityRepository
              .recordFailedPasswordAttempt({
                userId:
                  user.id,

                occurredAt:
                  afterCooldown,

                expectedPasswordHash:
                  user.passwordHash,
              }),

            securityRepository
              .recordFailedPasswordAttempt({
                userId:
                  user.id,

                occurredAt:
                  afterCooldown,

                expectedPasswordHash:
                  user.passwordHash,
              }),
          ]);


        expect(
          concurrentResults,
        ).toEqual([
          'LOCKED',
          'LOCKED',
        ]);


        const lockedUser =
          await prisma.user
            .findUniqueOrThrow({
              where: {
                id:
                  user.id,
              },

              select: {
                failedLoginAttempts:
                  true,

                loginCooldownUntil:
                  true,

                securityLockedAt:
                  true,

                securityLockReason:
                  true,

                securityLockVersion:
                  true,
              },
            });


        expect(
          lockedUser
            .failedLoginAttempts,
        ).toBe(
          0,
        );

        expect(
          lockedUser
            .loginCooldownUntil,
        ).toBeNull();

        expect(
          lockedUser
            .securityLockedAt,
        ).not.toBeNull();

        expect(
          lockedUser
            .securityLockReason,
        ).toBe(
          SecurityLockReason
            .LOGIN_FAILURE_ESCALATION,
        );

        expect(
          lockedUser
            .securityLockVersion,
        ).toBe(
          1,
        );


        const events =
          await prisma
            .securityOutboxEvent
            .findMany({
              where: {
                userId:
                  user.id,
              },

              orderBy: {
                createdAt:
                  'asc',
              },
            });


        expect(
          events,
        ).toHaveLength(
          1,
        );

        expect(
          events[0],
        ).toMatchObject({
          userId:
            user.id,

          type:
            SecurityOutboxEventType
              .ACCOUNT_LOCKED,

          lockVersion:
            1,

          recipientEmail:
            user.email,

          sentAt:
            null,
        });


        const sessionAfterLock =
          await prisma.authSession
            .findUniqueOrThrow({
              where: {
                id:
                  existingSession.id,
              },

              select: {
                revokedAt:
                  true,
              },
            });


        expect(
          sessionAfterLock
            .revokedAt,
        ).not.toBeNull();


        /*
         * A further failure cannot create a second event
         * or increment lockVersion again.
         */
        const alreadyLocked =
          await securityRepository
            .recordFailedPasswordAttempt({
              userId:
                user.id,

              occurredAt:
                new Date(
                  afterCooldown
                    .getTime()
                    + 1_000,
                ),

              expectedPasswordHash:
                user.passwordHash,
            });

        expect(
          alreadyLocked,
        ).toBe(
          'LOCKED',
        );


        expect(
          await prisma
            .securityOutboxEvent
            .count({
              where: {
                userId:
                  user.id,
              },
            }),
        ).toBe(
          1,
        );


        const finalState =
          await prisma.user
            .findUniqueOrThrow({
              where: {
                id:
                  user.id,
              },

              select: {
                securityLockVersion:
                  true,
              },
            });

        expect(
          finalState
            .securityLockVersion,
        ).toBe(
          1,
        );
      },
      30_000,
    );


    it(
      'clears previous failures after valid authentication and rejects stale password state',
      async () => {
        const user =
          await createUser(
            'successful-login',
          );

        const now =
          new Date();


        await securityRepository
          .recordFailedPasswordAttempt({
            userId:
              user.id,

            occurredAt:
              now,

            expectedPasswordHash:
              user.passwordHash,
          });

        await securityRepository
          .recordFailedPasswordAttempt({
            userId:
              user.id,

            occurredAt:
              new Date(
                now.getTime()
                  + 1,
              ),

            expectedPasswordHash:
              user.passwordHash,
          });


        const beforeSuccess =
          await prisma.user
            .findUniqueOrThrow({
              where: {
                id:
                  user.id,
              },

              select: {
                failedLoginAttempts:
                  true,
              },
            });

        expect(
          beforeSuccess
            .failedLoginAttempts,
        ).toBe(
          2,
        );


        await authSessionRepository
          .createSession({
            userId:
              user.id,

            refreshTokenDigest:
              digest(),

            expiresAt:
              futureDate(),

            remembered:
              false,

            expectedPasswordHash:
              user.passwordHash,
          });


        const afterSuccess =
          await prisma.user
            .findUniqueOrThrow({
              where: {
                id:
                  user.id,
              },

              select: {
                failedLoginAttempts:
                  true,

                loginCooldownUntil:
                  true,
              },
            });


        expect(
          afterSuccess
            .failedLoginAttempts,
        ).toBe(
          0,
        );

        expect(
          afterSuccess
            .loginCooldownUntil,
        ).toBeNull();


        /*
         * Simulate a password reset occurring after the
         * credential snapshot was obtained.
         */
        const changedHash =
          `${user.passwordHash}-changed`;

        await prisma.user.update({
          where: {
            id:
              user.id,
          },

          data: {
            passwordHash:
              changedHash,
          },
        });


        const sessionCountBefore =
          await prisma.authSession
            .count({
              where: {
                userId:
                  user.id,
              },
            });


        await expect(
          authSessionRepository
            .createSession({
              userId:
                user.id,

              refreshTokenDigest:
                digest(),

              expiresAt:
                futureDate(),

              remembered:
                true,

              expectedPasswordHash:
                user.passwordHash,
            }),
        ).rejects.toBeInstanceOf(
          StalePasswordCredentialError,
        );


        expect(
          await prisma.authSession
            .count({
              where: {
                userId:
                  user.id,
              },
            }),
        ).toBe(
          sessionCountBefore,
        );


        const staleFailure =
          await securityRepository
            .recordFailedPasswordAttempt({
              userId:
                user.id,

              occurredAt:
                new Date(),

              expectedPasswordHash:
                user.passwordHash,
            });


        expect(
          staleFailure,
        ).toBe(
          'STALE',
        );


        const finalState =
          await prisma.user
            .findUniqueOrThrow({
              where: {
                id:
                  user.id,
              },

              select: {
                failedLoginAttempts:
                  true,

                passwordHash:
                  true,
              },
            });


        expect(
          finalState
            .failedLoginAttempts,
        ).toBe(
          0,
        );

        expect(
          finalState
            .passwordHash,
        ).toBe(
          changedHash,
        );
      },
      20_000,
    );


    it(
      'blocks valid session creation during cooldown and permits it only after cooldown expires',
      async () => {
        const user =
          await createUser(
            'cooldown-gate',
          );

        const now =
          new Date();


        for (
          let attempt = 0;
          attempt < 3;
          attempt += 1
        ) {
          await securityRepository
            .recordFailedPasswordAttempt({
              userId:
                user.id,

              occurredAt:
                new Date(
                  now.getTime()
                    + attempt,
                ),

              expectedPasswordHash:
                user.passwordHash,
            });
        }


        await expect(
          authSessionRepository
            .createSession({
              userId:
                user.id,

              refreshTokenDigest:
                digest(),

              expiresAt:
                futureDate(),

              remembered:
                true,

              expectedPasswordHash:
                user.passwordHash,
            }),
        ).rejects.toBeInstanceOf(
          AccountCooldownError,
        );


        expect(
          await prisma.authSession
            .count({
              where: {
                userId:
                  user.id,
              },
            }),
        ).toBe(
          0,
        );


        /*
         * We move only the persisted expiration time.
         * No real 15-minute wait is necessary.
         */
        await prisma.user.update({
          where: {
            id:
              user.id,
          },

          data: {
            loginCooldownUntil:
              new Date(
                Date.now()
                  - 1_000,
              ),
          },
        });


        await expect(
          authSessionRepository
            .createSession({
              userId:
                user.id,

              refreshTokenDigest:
                digest(),

              expiresAt:
                futureDate(),

              remembered:
                true,

              expectedPasswordHash:
                user.passwordHash,
            }),
        ).resolves.toMatchObject({
          userId:
            user.id,

          revokedAt:
            null,
        });


        const recovered =
          await prisma.user
            .findUniqueOrThrow({
              where: {
                id:
                  user.id,
              },

              select: {
                failedLoginAttempts:
                  true,

                loginCooldownUntil:
                  true,
              },
            });


        expect(
          recovered
            .failedLoginAttempts,
        ).toBe(
          0,
        );

        expect(
          recovered
            .loginCooldownUntil,
        ).toBeNull();
      },
      20_000,
    );


    it(
      'blocks session creation for a locked account independently of authentication provider',
      async () => {
        const user =
          await createUser(
            'provider-gate',
          );


        await prisma.user.update({
          where: {
            id:
              user.id,
          },

          data: {
            securityLockedAt:
              new Date(),

            securityLockReason:
              SecurityLockReason
                .LOGIN_FAILURE_ESCALATION,

            securityLockVersion:
              1,
          },
        });


        /*
         * No expectedPasswordHash is supplied here.
         * This is the same repository path used by a
         * provider such as Google.
         */
        await expect(
          authSessionRepository
            .createSession({
              userId:
                user.id,

              refreshTokenDigest:
                digest(),

              expiresAt:
                futureDate(),

              remembered:
                true,
            }),
        ).rejects.toBeInstanceOf(
          AccountLockedError,
        );


        expect(
          await prisma.authSession
            .count({
              where: {
                userId:
                  user.id,
              },
            }),
        ).toBe(
          0,
        );
      },
      20_000,
    );


    it(
      'password reset unlocks the account, changes the password and revokes existing sessions atomically',
      async () => {
        const user =
          await createUser(
            'reset-recovery',
          );


        const existingSession =
          await authSessionRepository
            .createSession({
              userId:
                user.id,

              refreshTokenDigest:
                digest(),

              expiresAt:
                futureDate(),

              remembered:
                true,

              expectedPasswordHash:
                user.passwordHash,
            });


        const resetTokenDigest =
          digest();

        const now =
          new Date();

        const challengeNonce =
          Uint8Array.from(
            randomBytes(
              16,
            ),
          );

        const codeDigest =
          digest();


        await prisma
          .passwordResetChallenge
          .create({
            data: {
              userId:
                user.id,

              challengeNonce,

              codeDigest,

              codeExpiresAt:
                new Date(
                  now.getTime()
                    + 10 * 60 * 1000,
                ),

              verifiedAt:
                now,

              resetTokenDigest,

              resetTokenExpiresAt:
                new Date(
                  now.getTime()
                    + 10 * 60 * 1000,
                ),
            },
          });


        await prisma.user.update({
          where: {
            id:
              user.id,
          },

          data: {
            failedLoginAttempts:
              3,

            loginCooldownUntil:
              new Date(
                now.getTime()
                  + 15 * 60 * 1000,
              ),

            securityLockedAt:
              now,

            securityLockReason:
              SecurityLockReason
                .LOGIN_FAILURE_ESCALATION,

            securityLockVersion:
              1,
          },
        });


        const newPasswordHash =
          `${user.passwordHash}-reset`;


        await expect(
          passwordResetRepository
            .consumeResetAuthorization({
              userId:
                user.id,

              resetTokenDigest,

              newPasswordHash,

              now:
                new Date(
                  now.getTime()
                    + 1_000,
                ),
            }),
        ).resolves.toBe(
          true,
        );


        const recoveredUser =
          await prisma.user
            .findUniqueOrThrow({
              where: {
                id:
                  user.id,
              },

              select: {
                passwordHash:
                  true,

                failedLoginAttempts:
                  true,

                loginCooldownUntil:
                  true,

                securityLockedAt:
                  true,

                securityLockReason:
                  true,

                securityLockVersion:
                  true,
              },
            });


        expect(
          recoveredUser
            .passwordHash,
        ).toBe(
          newPasswordHash,
        );

        expect(
          recoveredUser
            .failedLoginAttempts,
        ).toBe(
          0,
        );

        expect(
          recoveredUser
            .loginCooldownUntil,
        ).toBeNull();

        expect(
          recoveredUser
            .securityLockedAt,
        ).toBeNull();

        expect(
          recoveredUser
            .securityLockReason,
        ).toBeNull();

        /*
         * lockVersion remains monotonic. Unlocking does not
         * reuse an old lock generation.
         */
        expect(
          recoveredUser
            .securityLockVersion,
        ).toBe(
          1,
        );


        const revokedSession =
          await prisma.authSession
            .findUniqueOrThrow({
              where: {
                id:
                  existingSession.id,
              },

              select: {
                revokedAt:
                  true,
              },
            });


        expect(
          revokedSession
            .revokedAt,
        ).not.toBeNull();


        const challenge =
          await prisma
            .passwordResetChallenge
            .findUniqueOrThrow({
              where: {
                userId:
                  user.id,
              },

              select: {
                usedAt:
                  true,
              },
            });


        expect(
          challenge.usedAt,
        ).not.toBeNull();
      },
      20_000,
    );
  },
);
