import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  accountLockEmailSubject,
  renderAccountLockEmail,
} from '../src/auth/account-lock-email-template.js';


describe(
  'account lock email template',
  () => {
    it(
      'renders a security-only notification without sensitive authentication data',
      () => {
        const content =
          renderAccountLockEmail({
            displayName:
              'Carlos',
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
          content.text,
        ).toContain(
          'recuperación de contraseña',
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
  },
);
