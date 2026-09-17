import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  AccountLockDialog,
} from './AccountLockDialog';


describe(
  'AccountLockDialog',
  () => {
    it(
      'exposes an accessible modal and focuses the recovery action',
      async () => {
        render(
          <AccountLockDialog
            open
            onClose={() => undefined}
            onRecover={() => undefined}
          />,
        );

        expect(
          screen.getByRole(
            'dialog',
          ),
        ).toHaveAttribute(
          'aria-modal',
          'true',
        );

        expect(
          screen.getByRole(
            'heading',
            {
              name:
                'Tu cuenta ha sido bloqueada',
            },
          ),
        ).toBeInTheDocument();

        await waitFor(
          () => {
            expect(
              screen.getByRole(
                'button',
                {
                  name:
                    'Recuperar acceso',
                },
              ),
            ).toHaveFocus();
          },
        );
      },
    );


    it(
      'closes with Escape',
      () => {
        const onClose =
          vi.fn();

        render(
          <AccountLockDialog
            open
            onClose={onClose}
            onRecover={() => undefined}
          />,
        );

        fireEvent.keyDown(
          document,
          {
            key:
              'Escape',
          },
        );

        expect(
          onClose,
        ).toHaveBeenCalledOnce();
      },
    );


    it(
      'keeps Tab inside the dialog',
      async () => {
        render(
          <AccountLockDialog
            open
            onClose={() => undefined}
            onRecover={() => undefined}
          />,
        );

        const recover =
          screen.getByRole(
            'button',
            {
              name:
                'Recuperar acceso',
            },
          );

        const back =
          screen.getByRole(
            'button',
            {
              name:
                'Volver al inicio de sesión',
            },
          );

        const close =
          screen.getByRole(
            'button',
            {
              name:
                'Cerrar aviso de seguridad',
            },
          );

        await waitFor(
          () => {
            expect(
              recover,
            ).toHaveFocus();
          },
        );

        back.focus();

        fireEvent.keyDown(
          document,
          {
            key:
              'Tab',
          },
        );

        expect(
          close,
        ).toHaveFocus();

        close.focus();

        fireEvent.keyDown(
          document,
          {
            key:
              'Tab',

            shiftKey:
              true,
          },
        );

        expect(
          back,
        ).toHaveFocus();
      },
    );


    it(
      'runs the recovery action',
      () => {
        const onRecover =
          vi.fn();

        render(
          <AccountLockDialog
            open
            onClose={() => undefined}
            onRecover={onRecover}
          />,
        );

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Recuperar acceso',
            },
          ),
        );

        expect(
          onRecover,
        ).toHaveBeenCalledOnce();
      },
    );
  },
);
