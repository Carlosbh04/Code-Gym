import {
  Resend,
} from 'resend';

import {
  AccountLockMailerUnavailableError,
  type AccountLockMailer,
  type SendAccountLockedInput,
} from './account-lock-mailer.js';

import {
  renderAccountLockEmail,
} from './account-lock-email-template.js';


export interface ResendAccountLockEmailMessage {
  readonly from: string;
  readonly to: readonly string[];
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}


export interface ResendAccountLockEmailClient {
  send(
    message:
      ResendAccountLockEmailMessage,

    options: {
      readonly idempotencyKey:
        string;
    },
  ): Promise<{
    readonly error:
      object | null;
  }>;
}


export class ResendAccountLockMailer
implements AccountLockMailer {
  private readonly client:
    ResendAccountLockEmailClient;

  public constructor(
    apiKey: string,

    private readonly mailFrom:
      string,

    client?:
      ResendAccountLockEmailClient,
  ) {
    this.client =
      client
      ?? createResendAccountLockEmailClient(
        apiKey,
      );
  }


  public async sendAccountLocked(
    input:
      SendAccountLockedInput,
  ): Promise<void> {
    const content =
      renderAccountLockEmail(
        input,
      );

    try {
      const response =
        await this.client.send(
          {
            from:
              this.mailFrom,

            to: [
              input.to,
            ],

            subject:
              content.subject,

            html:
              content.html,

            text:
              content.text,
          },

          {
            idempotencyKey:
              input.idempotencyKey,
          },
        );

      if (
        response.error
        !== null
      ) {
        throw new
          AccountLockMailerUnavailableError();
      }
    } catch {
      /*
       * Never propagate provider payloads or API details.
       */
      throw new
        AccountLockMailerUnavailableError();
    }
  }
}


function createResendAccountLockEmailClient(
  apiKey: string,
): ResendAccountLockEmailClient {
  const resend =
    new Resend(
      apiKey,
    );

  return {
    async send(
      message,
      options,
    ) {
      const response =
        await resend.emails.send(
          {
            ...message,

            to: [
              ...message.to,
            ],
          },

          {
            idempotencyKey:
              options
                .idempotencyKey,
          },
        );

      return {
        error:
          response.error === null
            ? null
            : {},
      };
    },
  };
}
