import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  SessionIdleModal,
} from './SessionIdleModal';


function renderModal({
  open = true,
  secondsRemaining = 42,
  continuePending = false,
  onContinue = vi.fn(
    () => Promise.resolve(),
  ),
  onCloseSession = vi.fn(
    () => Promise.resolve(),
  ),
}: {
  open?: boolean;
  secondsRemaining?: number;
  continuePending?: boolean;
  onContinue?: () => Promise<void>;
  onCloseSession?: () => Promise<void>;
} = {}) {
  return {
    ...render(
      <SessionIdleModal
        open={open}
        secondsRemaining={
          secondsRemaining
        }
        continuePending={
          continuePending
        }
        onContinue={
          onContinue
        }
        onCloseSession={
          onCloseSession
        }
      />,
    ),
    onContinue,
    onCloseSession,
  };
}


describe(
  'SessionIdleModal',
  () => {
    it(
      'does not render when closed',
      () => {
        renderModal({
          open: false,
        });

        expect(
          screen.queryByRole(
            'alertdialog',
          ),
        ).not.toBeInTheDocument();
      },
    );


    it(
      'renders an accessible alert dialog with the expected content',
      () => {
        renderModal();

        const dialog =
          screen.getByRole(
            'alertdialog',
            {
              name:
                '¿Sigues ahí?',
            },
          );

        expect(
          dialog,
        ).toHaveAttribute(
          'aria-modal',
          'true',
        );

        expect(
          screen.getByText(
            '00:42',
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /No hemos detectado actividad/i,
          ),
        ).toBeInTheDocument();
      },
    );


    it(
      'exposes the remaining time through the progressbar',
      () => {
        renderModal({
          secondsRemaining: 42,
        });

        const progress =
          screen.getByRole(
            'progressbar',
            {
              name:
                'Tiempo restante antes de cerrar la sesión',
            },
          );

        expect(
          progress,
        ).toHaveAttribute(
          'aria-valuemin',
          '0',
        );

        expect(
          progress,
        ).toHaveAttribute(
          'aria-valuemax',
          '60',
        );

        expect(
          progress,
        ).toHaveAttribute(
          'aria-valuenow',
          '42',
        );

        expect(
          progress,
        ).toHaveAttribute(
          'aria-valuetext',
          '00:42 restantes',
        );
      },
    );


    it(
      'places initial focus on Continue session',
      () => {
        renderModal();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Continuar sesión',
            },
          ),
        ).toHaveFocus();
      },
    );


    it(
      'keeps tab navigation inside the modal',
      () => {
        renderModal();

        const continueButton =
          screen.getByRole(
            'button',
            {
              name:
                'Continuar sesión',
            },
          );

        const closeButton =
          screen.getByRole(
            'button',
            {
              name:
                'Cerrar sesión',
            },
          );

        expect(
          continueButton,
        ).toHaveFocus();

        closeButton.focus();

        fireEvent.keyDown(
          closeButton,
          {
            key: 'Tab',
          },
        );

        expect(
          continueButton,
        ).toHaveFocus();

        fireEvent.keyDown(
          continueButton,
          {
            key: 'Tab',
            shiftKey: true,
          },
        );

        expect(
          closeButton,
        ).toHaveFocus();
      },
    );


    it(
      'restores focus to the previous element when it closes',
      () => {
        const outsideButton =
          document.createElement(
            'button',
          );

        outsideButton.textContent =
          'Outside';

        document.body.appendChild(
          outsideButton,
        );

        outsideButton.focus();

        const {
          rerender,
        } = render(
          <SessionIdleModal
            open
            secondsRemaining={42}
            continuePending={false}
            onContinue={
              () => Promise.resolve()
            }
            onCloseSession={
              () => Promise.resolve()
            }
          />,
        );

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Continuar sesión',
            },
          ),
        ).toHaveFocus();

        rerender(
          <SessionIdleModal
            open={false}
            secondsRemaining={42}
            continuePending={false}
            onContinue={
              () => Promise.resolve()
            }
            onCloseSession={
              () => Promise.resolve()
            }
          />,
        );

        expect(
          outsideButton,
        ).toHaveFocus();

        outsideButton.remove();
      },
    );


    it(
      'calls only the continue action from the primary button',
      () => {
        const onContinue =
          vi.fn(
            () => Promise.resolve(),
          );

        const onCloseSession =
          vi.fn(
            () => Promise.resolve(),
          );

        renderModal({
          onContinue,
          onCloseSession,
        });

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Continuar sesión',
            },
          ),
        );

        expect(
          onContinue,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          onCloseSession,
        ).not.toHaveBeenCalled();
      },
    );


    it(
      'calls only the close-session action from the secondary button',
      () => {
        const onContinue =
          vi.fn(
            () => Promise.resolve(),
          );

        const onCloseSession =
          vi.fn(
            () => Promise.resolve(),
          );

        renderModal({
          onContinue,
          onCloseSession,
        });

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Cerrar sesión',
            },
          ),
        );

        expect(
          onCloseSession,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          onContinue,
        ).not.toHaveBeenCalled();
      },
    );


    it(
      'disables both actions while continuing',
      () => {
        renderModal({
          continuePending: true,
        });

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Continuando…',
            },
          ),
        ).toBeDisabled();

        expect(
          screen.getByRole(
            'button',
            {
              name:
                'Cerrar sesión',
            },
          ),
        ).toBeDisabled();
      },
    );
  },
);
