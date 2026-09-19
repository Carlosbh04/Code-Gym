import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  AccountLockMailerUnavailableError,
} from '../src/auth/account-lock-mailer.js';

import {
  ResendAccountLockMailer,
  type ResendAccountLockEmailClient,
  type ResendAccountLockEmailMessage,
} from '../src/auth/resend-account-lock-mailer.js';


function fixture(
  result: {
    readonly error:
      object | null;
  } = {
    error:
      null,
  },
) {
  const sent:
    Array<{
      readonly message:
        ResendAccountLockEmailMessage;

      readonly options: {
        readonly idempotencyKey:
          string;
      };
    }> = [];

  const client:
    ResendAccountLockEmailClient = {
      send(
        message,
        options,
      ) {
        sent.push({
          message,
          options,
        });

        return Promise.resolve(
          result,
        );
      },
    };

  return {
    sent,

    mailer:
      new ResendAccountLockMailer(
        're_test-only-key',

        'CodeGym <security@example.com>',
        'https://app.codegym.example/forgot-password',

        client,
      ),
  };
}


const input =
  Object.freeze({
    to:
      'person@example.test',

    displayName:
      'Person',

    idempotencyKey:
      'codegym-security-event-1',
  });


describe(
  'ResendAccountLockMailer',
  () => {
    it(
      'sends one provider-idempotent account lock notification',
      async () => {
        const context =
          fixture();

        await expect(
          context.mailer
            .sendAccountLocked(
              input,
            ),
        ).resolves
          .toBeUndefined();

        expect(
          context.sent,
        ).toHaveLength(
          1,
        );

        expect(
          context.sent[0],
        ).toMatchObject({
          message: {
            from:
              'CodeGym <security@example.com>',

            to: [
              'person@example.test',
            ],

            subject:
              'Tu cuenta de CodeGym ha sido bloqueada por seguridad',
          },

          options: {
            idempotencyKey:
              'codegym-security-event-1',
          },
        });
      },
    );


    it(
      'turns provider errors into a neutral mail error',
      async () => {
        const context =
          fixture({
            error: {
              private:
                'must not leak',
            },
          });

        await expect(
          context.mailer
            .sendAccountLocked(
              input,
            ),
        ).rejects
          .toBeInstanceOf(
            AccountLockMailerUnavailableError,
          );
      },
    );


    it(
      'turns provider rejection into the same neutral error',
      async () => {
        const client:
          ResendAccountLockEmailClient = {
            send() {
              return Promise.reject(
                new Error(
                  'private provider failure',
                ),
              );
            },
          };

        const mailer =
          new ResendAccountLockMailer(
            're_private',

            'CodeGym <security@example.com>',
            'https://app.codegym.example/forgot-password',

            client,
          );

        await expect(
          mailer.sendAccountLocked(
            input,
          ),
        ).rejects
          .toBeInstanceOf(
            AccountLockMailerUnavailableError,
          );
      },
    );
  },
);
