import { Resend } from 'resend';

import {
  PasswordResetMailerUnavailableError,
  type PasswordResetMailer,
  type SendPasswordResetCodeInput,
} from './password-reset-mailer.js';
import { renderPasswordResetEmail } from './password-reset-email-template.js';

export interface ResendEmailMessage {
  readonly from: string;
  readonly to: readonly string[];
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export interface ResendEmailClient {
  send(message: ResendEmailMessage): Promise<{
    readonly error: object | null;
  }>;
}

export class ResendPasswordResetMailer implements PasswordResetMailer {
  private readonly client: ResendEmailClient;

  public constructor(
    apiKey: string,
    private readonly mailFrom: string,
    client?: ResendEmailClient,
  ) {
    this.client = client ?? createResendEmailClient(apiKey);
  }

  public async sendPasswordResetCode(
    input: SendPasswordResetCodeInput,
  ): Promise<void> {
    const content = renderPasswordResetEmail(input);

    try {
      const response = await this.client.send({
        from: this.mailFrom,
        to: [input.to],
        subject: content.subject,
        html: content.html,
        text: content.text,
      });

      if (response.error !== null) {
        throw new PasswordResetMailerUnavailableError();
      }
    } catch {
      throw new PasswordResetMailerUnavailableError();
    }
  }
}

function createResendEmailClient(apiKey: string): ResendEmailClient {
  const resend = new Resend(apiKey);
  return {
    async send(message) {
      const response = await resend.emails.send({
        ...message,
        to: [...message.to],
      });
      return { error: response.error === null ? null : {} };
    },
  };
}
