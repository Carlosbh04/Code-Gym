import {
  randomUUID,
} from 'node:crypto';

import type {
  AccountLockMailer,
} from './account-lock-mailer.js';

import type {
  SecurityOutboxClaim,
  SecurityOutboxRepository,
} from './security-outbox-repository.js';


export interface SecurityOutboxWorkerLogger {
  info(
    bindings:
      Readonly<
        Record<
          string,
          unknown
        >
      >,

    message:
      string,
  ): void;

  warn(
    bindings:
      Readonly<
        Record<
          string,
          unknown
        >
      >,

    message:
      string,
  ): void;
}


export interface SecurityOutboxTimer {
  clear(): void;
  unref(): void;
}


export interface SecurityOutboxWorkerOptions {
  readonly pollIntervalMs:
    number;

  readonly leaseDurationMs:
    number;

  readonly retryBaseMs:
    number;

  readonly retryMaximumMs:
    number;

  readonly maximumBatchSize:
    number;

  readonly clock:
    () => Date;

  readonly tokenFactory:
    () => string;

  readonly setTimer: (
    callback: () => void,
    milliseconds: number,
  ) => SecurityOutboxTimer;
}


const defaultOptions:
SecurityOutboxWorkerOptions = {
  pollIntervalMs:
    5_000,

  /*
   * Long enough for an ordinary provider request.
   *
   * Resend idempotency below is the final protection if
   * a process dies after provider acceptance but before
   * sentAt is persisted.
   */
  leaseDurationMs:
    5 * 60 * 1_000,

  retryBaseMs:
    5_000,

  retryMaximumMs:
    60 * 60 * 1_000,

  maximumBatchSize:
    20,

  clock:
    () => new Date(),

  tokenFactory:
    () =>
      randomUUID()
        .replaceAll(
          '-',
          '',
        ),

  setTimer(
    callback,
    milliseconds,
  ) {
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


export class SecurityOutboxWorker {
  private started =
    false;

  private stopping =
    false;

  private timer:
    SecurityOutboxTimer
    | undefined;

  private inFlight:
    Promise<void>
    | undefined;


  public constructor(
    private readonly repository:
      SecurityOutboxRepository,

    private readonly mailer:
      AccountLockMailer,

    private readonly logger:
      SecurityOutboxWorkerLogger,

    private readonly options:
      SecurityOutboxWorkerOptions =
        defaultOptions,
  ) {}


  public start(): void {
    if (
      this.started
    ) {
      return;
    }

    this.started =
      true;

    this.stopping =
      false;

    this.schedule(
      0,
    );
  }


  public async stop():
  Promise<void> {
    if (
      !this.started
    ) {
      return;
    }

    this.stopping =
      true;

    this.timer?.clear();

    this.timer =
      undefined;

    await this.inFlight;

    this.started =
      false;
  }


  private schedule(
    milliseconds:
      number,
  ): void {
    if (
      this.stopping
    ) {
      return;
    }

    this.timer =
      this.options.setTimer(
        () => {
          this.timer =
            undefined;

          void this.runCycle();
        },

        milliseconds,
      );

    this.timer.unref();
  }


  private async runCycle():
  Promise<void> {
    if (
      this.stopping
      || this.inFlight !==
        undefined
    ) {
      return;
    }

    const operation =
      this.drain();

    this.inFlight =
      operation;

    try {
      await operation;
    } finally {
      if (
        this.inFlight ===
        operation
      ) {
        this.inFlight =
          undefined;
      }

      this.schedule(
        this.options
          .pollIntervalMs,
      );
    }
  }


  private async drain():
  Promise<void> {
    for (
      let index = 0;
      index
        < this.options
          .maximumBatchSize;
      index += 1
    ) {
      if (
        this.stopping
      ) {
        return;
      }

      const now =
        this.options.clock();

      const event =
        await this.repository
          .claimNext({
            now,

            leaseExpiredBefore:
              new Date(
                now.getTime()
                - this.options
                  .leaseDurationMs,
              ),

            claimToken:
              this.options
                .tokenFactory(),
          });

      if (
        event === null
      ) {
        return;
      }

      await this.process(
        event,
      );
    }
  }


  private async process(
    event:
      SecurityOutboxClaim,
  ): Promise<void> {
    await this.processAccountLocked(
      event,
    );
  }


  private async processAccountLocked(
    event:
      SecurityOutboxClaim,
  ): Promise<void> {
    try {
      await this.mailer
        .sendAccountLocked({
          to:
            event
              .recipientEmail,

          displayName:
            event
              .recipientDisplayName,

          /*
           * Stable across retries and backend instances.
           */
          idempotencyKey:
            `codegym-security-${event.id}`,
        });

      const marked =
        await this.repository
          .markSent({
            eventId:
              event.id,

            claimToken:
              event.claimToken,

            sentAt:
              this.options.clock(),
          });

      if (
        marked
      ) {
        this.logger.info(
          {
            event:
              'securityOutboxDelivered',

            eventId:
              event.id,

            type:
              event.type,

            attempt:
              event.attemptCount,
          },

          'Security notification delivered',
        );
      } else {
        /*
         * Do not reveal recipient information.
         */
        this.logger.warn(
          {
            event:
              'securityOutboxClaimLost',

            eventId:
              event.id,

            type:
              event.type,
          },

          'Security outbox claim was no longer current',
        );
      }
    } catch {
      const nextAttemptAt =
        new Date(
          this.options
            .clock()
            .getTime()
          + retryDelayMs(
              event
                .attemptCount,

              this.options,
            ),
        );

      await this.repository
        .reschedule({
          eventId:
            event.id,

          claimToken:
            event.claimToken,

          nextAttemptAt,
        });

      /*
       * Provider errors and recipient data are intentionally
       * omitted from logs.
       */
      this.logger.warn(
        {
          event:
            'securityOutboxDeliveryFailure',

          eventId:
            event.id,

          type:
            event.type,

          attempt:
            event.attemptCount,

          nextAttemptAt:
            nextAttemptAt
              .toISOString(),
        },

        'Security notification delivery failed',
      );
    }
  }
}


function retryDelayMs(
  attemptCount:
    number,

  options:
    Pick<
      SecurityOutboxWorkerOptions,
      | 'retryBaseMs'
      | 'retryMaximumMs'
    >,
): number {
  /*
   * Prevent very large exponent values after a long outage.
   */
  const exponent =
    Math.min(
      Math.max(
        attemptCount
        - 1,
        0,
      ),

      16,
    );

  return Math.min(
    options.retryBaseMs
      * 2 ** exponent,

    options.retryMaximumMs,
  );
}
