import { describe, expect, it, vi } from 'vitest';

import { PasswordResetMailerUnavailableError } from '../src/auth/password-reset-mailer.js';
import {
  ResendPasswordResetMailer,
  type ResendEmailClient,
  type ResendEmailMessage,
} from '../src/auth/resend-password-reset-mailer.js';

function fixture(result: { readonly error: object | null } = { error: null }) {
  const sent: ResendEmailMessage[] = [];
  const client: ResendEmailClient = {
    send(message) {
      sent.push(message);
      return Promise.resolve(result);
    },
  };
  return {
    sent,
    mailer: new ResendPasswordResetMailer(
      're_test-only-key',
      'CodeGym <security@example.com>',
      client,
    ),
  };
}

const input = Object.freeze({
  to: 'person@example.test',
  displayName: 'Person',
  code: '004821',
  expiresInMinutes: 5,
});

describe('ResendPasswordResetMailer', () => {
  it('sends the exact recipient, configured sender, subject, HTML, and text', async () => {
    const context = fixture();

    await expect(context.mailer.sendPasswordResetCode(input)).resolves.toBeUndefined();

    expect(context.sent).toHaveLength(1);
    expect(context.sent[0]).toMatchObject({
      from: 'CodeGym <security@example.com>',
      to: ['person@example.test'],
      subject: 'Tu código de seguridad para restablecer la contraseña',
    });
    expect(context.sent[0]?.html).toContain('Código de seguridad 004821');
    expect(context.sent[0]?.text).toContain('\n004821\n');
  });

  it('turns a provider error into a provider-neutral delivery failure', async () => {
    const context = fixture({ error: { message: 'invalid private provider key' } });

    await expect(context.mailer.sendPasswordResetCode(input))
      .rejects.toEqual(new PasswordResetMailerUnavailableError());
  });

  it('turns a rejected provider call into the same neutral delivery failure', async () => {
    const client: ResendEmailClient = {
      send: () => Promise.reject(new Error('private Resend failure')),
    };
    const mailer = new ResendPasswordResetMailer(
      're_private-key',
      'CodeGym <security@example.com>',
      client,
    );

    await expect(mailer.sendPasswordResetCode(input))
      .rejects.toEqual(new PasswordResetMailerUnavailableError());
  });

  it('does not log the code or API key', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const context = fixture();

    await context.mailer.sendPasswordResetCode(input);

    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    log.mockRestore();
    error.mockRestore();
  });
});
