import type {
  PrismaClient,
  SecurityOutboxEventType,
} from '../generated/prisma/client.js';


export interface SecurityOutboxClaim {
  readonly id: string;

  readonly userId: string;

  readonly type:
    SecurityOutboxEventType;

  readonly lockVersion:
    number;

  readonly recipientEmail:
    string;

  readonly recipientDisplayName:
    string | null;

  readonly attemptCount:
    number;

  readonly claimToken:
    string;
}


export interface ClaimSecurityOutboxEventInput {
  readonly now: Date;

  readonly leaseExpiredBefore:
    Date;

  readonly claimToken:
    string;
}


export interface MarkSecurityOutboxSentInput {
  readonly eventId: string;

  readonly claimToken:
    string;

  readonly sentAt: Date;
}


export interface RescheduleSecurityOutboxInput {
  readonly eventId: string;

  readonly claimToken:
    string;

  readonly nextAttemptAt:
    Date;
}


export interface SecurityOutboxRepository {
  claimNext(
    input:
      ClaimSecurityOutboxEventInput,
  ): Promise<
    SecurityOutboxClaim | null
  >;

  markSent(
    input:
      MarkSecurityOutboxSentInput,
  ): Promise<boolean>;

  reschedule(
    input:
      RescheduleSecurityOutboxInput,
  ): Promise<boolean>;
}


interface ClaimableOutboxRow {
  readonly id: string;

  readonly userId: string;

  readonly type:
    SecurityOutboxEventType;

  readonly lockVersion:
    number;

  readonly recipientEmail:
    string;

  readonly recipientDisplayName:
    string | null;

  readonly attemptCount:
    number;
}


export class PrismaSecurityOutboxRepository
implements SecurityOutboxRepository {
  public constructor(
    private readonly prisma:
      PrismaClient,
  ) {}


  public claimNext(
    input:
      ClaimSecurityOutboxEventInput,
  ): Promise<
    SecurityOutboxClaim | null
  > {
    return this.prisma.$transaction(
      async (
        transaction,
      ) => {
        /*
         * SKIP LOCKED permits several backend instances
         * to drain the same durable queue without waiting
         * on one another or claiming the same event.
         */
        const rows =
          await transaction.$queryRaw<
            ClaimableOutboxRow[]
          >`
            SELECT
              id,
              user_id AS userId,
              type,
              lock_version AS lockVersion,
              recipient_email AS recipientEmail,
              recipient_display_name AS recipientDisplayName,
              attempt_count AS attemptCount
            FROM security_outbox_events
            WHERE
              sent_at IS NULL
              AND (
                next_attempt_at IS NULL
                OR next_attempt_at <= ${input.now}
              )
              AND (
                claimed_at IS NULL
                OR claimed_at <= ${input.leaseExpiredBefore}
              )
            ORDER BY
              created_at ASC,
              id ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          `;

        const event =
          rows[0];

        if (
          event === undefined
        ) {
          return null;
        }

        await transaction
          .securityOutboxEvent
          .update({
            where: {
              id:
                event.id,
            },

            data: {
              claimedAt:
                input.now,

              claimToken:
                input.claimToken,

              attemptCount: {
                increment:
                  1,
              },
            },
          });

        return Object.freeze({
          id:
            event.id,

          userId:
            event.userId,

          type:
            event.type,

          lockVersion:
            event.lockVersion,

          recipientEmail:
            event.recipientEmail,

          recipientDisplayName:
            event.recipientDisplayName,

          attemptCount:
            event.attemptCount
            + 1,

          claimToken:
            input.claimToken,
        });
      },
    );
  }


  public async markSent(
    input:
      MarkSecurityOutboxSentInput,
  ): Promise<boolean> {
    const result =
      await this.prisma
        .securityOutboxEvent
        .updateMany({
          where: {
            id:
              input.eventId,

            claimToken:
              input.claimToken,

            sentAt:
              null,
          },

          data: {
            sentAt:
              input.sentAt,

            claimedAt:
              null,

            claimToken:
              null,

            nextAttemptAt:
              null,
          },
        });

    return result.count === 1;
  }


  public async reschedule(
    input:
      RescheduleSecurityOutboxInput,
  ): Promise<boolean> {
    const result =
      await this.prisma
        .securityOutboxEvent
        .updateMany({
          where: {
            id:
              input.eventId,

            claimToken:
              input.claimToken,

            sentAt:
              null,
          },

          data: {
            nextAttemptAt:
              input.nextAttemptAt,

            claimedAt:
              null,

            claimToken:
              null,
          },
        });

    return result.count === 1;
  }
}
