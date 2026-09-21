import {
  SecurityOutboxEventType,
} from '../src/generated/prisma/client.js';

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  AccountLockMailer,
} from '../src/auth/account-lock-mailer.js';

import type {
  SecurityOutboxClaim,
  SecurityOutboxRepository,
} from '../src/auth/security-outbox-repository.js';

import {
  SecurityOutboxWorker,
  type SecurityOutboxWorkerOptions,
} from '../src/auth/security-outbox-worker.js';


function event(
  overrides:
    Partial<
      SecurityOutboxClaim
    > = {},
): SecurityOutboxClaim {
  return {
    id:
      'outbox-event-1',

    userId:
      'user-1',

    type:
      SecurityOutboxEventType
        .ACCOUNT_LOCKED,

    lockVersion:
      1,

    recipientEmail:
      'person@example.test',

    recipientDisplayName:
      'Person',

    attemptCount:
      1,

    claimToken:
      'claim-1',

    ...overrides,
  };
}


function options(
  clock:
    () => Date,
): SecurityOutboxWorkerOptions {
  return {
    pollIntervalMs:
      60_000,

    leaseDurationMs:
      300_000,

    retryBaseMs:
      5_000,

    retryMaximumMs:
      60_000,

    maximumBatchSize:
      5,

    clock,

    tokenFactory:
      () =>
        'claim-generated',

    setTimer:
      (
        callback,
        milliseconds,
      ) => {
        const timer =
          setTimeout(
            callback,
            milliseconds,
          );

        return {
          clear() {
            clearTimeout(
              timer,
            );
          },

          unref() {
            timer.unref();
          },
        };
      },
  };
}


describe(
  'SecurityOutboxWorker',
  () => {
    it(
      'sends and marks an event using a stable provider idempotency key',
      async () => {
        let first =
          true;

        const repository =
          {
            claimNext:
              vi.fn(
                () => {
                  if (
                    first
                  ) {
                    first =
                      false;

                    return Promise.resolve(
                      event(),
                    );
                  }

                  return Promise.resolve(
                    null,
                  );
                },
              ),

            markSent:
              vi.fn(
                () =>
                  Promise.resolve(
                    true,
                  ),
              ),

            reschedule:
              vi.fn(
                () =>
                  Promise.resolve(
                    true,
                  ),
              ),
          } satisfies SecurityOutboxRepository;

        const mailer =
          {
            sendAccountLocked:
              vi.fn(
                () =>
                  Promise.resolve(),
              ),
          } satisfies AccountLockMailer;

        const logger = {
          info:
            vi.fn(),

          warn:
            vi.fn(),
        };

        const now =
          new Date(
            '2026-09-17T12:00:00.000Z',
          );

        const worker =
          new SecurityOutboxWorker(
            repository,
            mailer,
            logger,
            options(
              () =>
                new Date(
                  now,
                ),
            ),
          );

        worker.start();

        await new Promise(
          (
            resolve,
          ) =>
            setTimeout(
              resolve,
              20,
            ),
        );

        await worker.stop();

        expect(
          mailer
            .sendAccountLocked,
        ).toHaveBeenCalledWith({
          to:
            'person@example.test',

          displayName:
            'Person',

          idempotencyKey:
            'codegym-security-outbox-event-1',
        });

        expect(
          repository
            .markSent,
        ).toHaveBeenCalledWith({
          eventId:
            'outbox-event-1',

          claimToken:
            'claim-1',

          sentAt:
            now,
        });

        expect(
          repository
            .reschedule,
        ).not.toHaveBeenCalled();
      },
    );


    it(
      'releases a failed event with exponential backoff and never logs recipient data',
      async () => {
        let first =
          true;

        const repository =
          {
            claimNext() {
              if (
                first
              ) {
                first =
                  false;

                return Promise.resolve(
                  event({
                    attemptCount:
                      3,
                  }),
                );
              }

              return Promise.resolve(
                null,
              );
            },

            markSent:
              vi.fn(
                () =>
                  Promise.resolve(
                    true,
                  ),
              ),

            reschedule:
              vi.fn(
                () =>
                  Promise.resolve(
                    true,
                  ),
              ),
          } satisfies SecurityOutboxRepository;

        const mailer =
          {
            sendAccountLocked() {
              return Promise.reject(
                new Error(
                  'private failure',
                ),
              );
            },
          } satisfies AccountLockMailer;

        const logger = {
          info:
            vi.fn(),

          warn:
            vi.fn(),
        };

        const now =
          new Date(
            '2026-09-17T12:00:00.000Z',
          );

        const worker =
          new SecurityOutboxWorker(
            repository,
            mailer,
            logger,
            options(
              () =>
                new Date(
                  now,
                ),
            ),
          );

        worker.start();

        await new Promise(
          (
            resolve,
          ) =>
            setTimeout(
              resolve,
              20,
            ),
        );

        await worker.stop();

        expect(
          repository
            .markSent,
        ).not.toHaveBeenCalled();

        expect(
          repository
            .reschedule,
        ).toHaveBeenCalledWith({
          eventId:
            'outbox-event-1',

          claimToken:
            'claim-1',

          nextAttemptAt:
            new Date(
              now.getTime()
              + 20_000,
            ),
        });

        const logPayload =
          JSON.stringify(
            logger.warn
              .mock.calls,
          );

        expect(
          logPayload,
        ).not.toContain(
          'person@example.test',
        );

        expect(
          logPayload,
        ).not.toContain(
          'private failure',
        );
      },
    );


    it(
      'start and stop are idempotent',
      async () => {
        const repository =
          {
            claimNext:
              vi.fn(
                () =>
                  Promise.resolve(
                    null,
                  ),
              ),

            markSent:
              vi.fn(
                () =>
                  Promise.resolve(
                    true,
                  ),
              ),

            reschedule:
              vi.fn(
                () =>
                  Promise.resolve(
                    true,
                  ),
              ),
          } satisfies SecurityOutboxRepository;

        const mailer =
          {
            sendAccountLocked:
              vi.fn(
                () =>
                  Promise.resolve(),
              ),
          } satisfies AccountLockMailer;

        const worker =
          new SecurityOutboxWorker(
            repository,
            mailer,

            {
              info() {},

              warn() {},
            },

            options(
              () =>
                new Date(),
            ),
          );

        worker.start();
        worker.start();

        await new Promise(
          (
            resolve,
          ) =>
            setTimeout(
              resolve,
              10,
            ),
        );

        await worker.stop();
        await worker.stop();

        expect(
          repository
            .claimNext,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );
  },
);
