import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  accountLockEmailSubject,
  renderAccountLockEmail,
} from '../src/auth/account-lock-email-template.js';


const recoveryUrl =
  'https://app.codegym.example/forgot-password';


describe(
  'account lock email template',
  () => {
    it(
      'renders the final branded account-lock security design',
      () => {
        const content =
          renderAccountLockEmail({
            displayName:
              'Carlos',

            recoveryUrl,
          });

        expect(
          content.subject,
        ).toBe(
          accountLockEmailSubject,
        );

        expect(
          content.html,
        ).toContain(
          'Hola, Carlos:',
        );

        expect(
          content.html,
        ).toContain(
          'Tu cuenta ha sido bloqueada',
        );

        expect(
          content.html,
        ).toContain(
          'por seguridad',
        );

        expect(
          content.html,
        ).toContain(
          'Alerta de seguridad',
        );

        expect(
          content.html,
        ).toContain(
          'Si fuiste tú',
        );

        expect(
          content.html,
        ).toContain(
          'Si no reconoces esta actividad',
        );

        expect(
          content.html,
        ).toContain(
          'Recuperar acceso',
        );

        expect(
          content.html,
        ).toContain(
          'Cambiar contraseña',
        );

        expect(
          content.html,
        ).toContain(
          recoveryUrl,
        );

        expect(
          content.html,
        ).toContain(
          'Practica. Construye. Avanza.',
        );

        expect(
          content.text,
        ).toContain(
          recoveryUrl,
        );

        expect(
          content.text,
        ).not.toMatch(
          /password hash|refresh token|jwt|ip address/i,
        );
      },
    );


    it(
      'escapes an untrusted display name in HTML',
      () => {
        const content =
          renderAccountLockEmail({
            displayName:
              '<script>alert("x")</script>',

            recoveryUrl,
          });

        expect(
          content.html,
        ).not.toContain(
          '<script>',
        );

        expect(
          content.html,
        ).toContain(
          '&lt;script&gt;',
        );
      },
    );


    it(
      'rejects non-http recovery URLs',
      () => {
        expect(
          () =>
            renderAccountLockEmail({
              displayName:
                'Carlos',

              recoveryUrl:
                'javascript:alert(1)',
            }),
        ).toThrow(
          'Account recovery URL must be an absolute HTTP(S) URL',
        );
      },
    );


    it(
      'renders a generic greeting when no display name exists',
      () => {
        const content =
          renderAccountLockEmail({
            displayName:
              null,

            recoveryUrl,
          });

        expect(
          content.html,
        ).toContain(
          'Hola:',
        );
      },
    );
  },
);
