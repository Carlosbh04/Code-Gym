import {
  render,
  waitFor,
} from '@testing-library/react';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  GoogleAuthButton,
} from './GoogleAuthButton';

const google = vi.hoisted(
  () => ({
    initialize:
      vi.fn(),
    renderButton:
      vi.fn(),
    load:
      vi.fn(),
    getClientId:
      vi.fn(),
  }),
);

vi.mock(
  './google-identity',
  () => ({
    loadGoogleIdentityServices:
      google.load,
    getGoogleClientId:
      google.getClientId,
  }),
);

describe(
  'GoogleAuthButton',
  () => {
    beforeEach(() => {
      google.initialize
        .mockReset();

      google.renderButton
        .mockReset();

      google.load
        .mockReset();

      google.getClientId
        .mockReset();

      google.getClientId
        .mockReturnValue(
          'google-client-id-test',
        );

      google.load
        .mockResolvedValue({
          initialize:
            google.initialize,
          renderButton:
            google.renderButton,
        });
    });

    it(
      'inicializa GIS y renderiza el botón oficial de acceso',
      async () => {
        render(
          <GoogleAuthButton
            label="Continuar con Google"
            onCredential={
              vi.fn()
            }
          />,
        );

        await waitFor(
          () => {
            expect(
              google.initialize,
            ).toHaveBeenCalledOnce();

            expect(
              google.renderButton,
            ).toHaveBeenCalledOnce();
          },
        );

        expect(
          google.initialize,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            client_id:
              'google-client-id-test',
            callback:
              expect.any(
                Function,
              ),
          }),
        );

        expect(
          google.renderButton
            .mock.calls[0]?.[1],
        ).toEqual({
          type:
            'standard',
          theme:
            'outline',
          size:
            'large',
          text:
            'continue_with',
          shape:
            'pill',
          logo_alignment:
            'left',
          width:
            400,
        });
      },
    );

    it(
      'entrega el ID token recibido por Google',
      async () => {
        const onCredential =
          vi.fn();

        render(
          <GoogleAuthButton
            label="Continuar con Google"
            onCredential={
              onCredential
            }
          />,
        );

        await waitFor(
          () => {
            expect(
              google.initialize,
            ).toHaveBeenCalledOnce();
          },
        );

        const configuration =
          google.initialize
            .mock.calls[0]?.[0] as {
              callback: (
                response: {
                  credential?:
                    string;
                },
              ) => void;
            };

        configuration
          .callback({
            credential:
              'google-id-token-test',
          });

        expect(
          onCredential,
        ).toHaveBeenCalledWith(
          'google-id-token-test',
        );
      },
    );

    it(
      'usa signup_with para registro',
      async () => {
        render(
          <GoogleAuthButton
            label="Registrarme con Google"
            onCredential={
              vi.fn()
            }
          />,
        );

        await waitFor(
          () => {
            expect(
              google.renderButton,
            ).toHaveBeenCalledOnce();
          },
        );

        expect(
          google.renderButton
            .mock.calls[0]?.[1],
        ).toEqual(
          expect.objectContaining({
            text:
              'signup_with',
          }),
        );
      },
    );
  },
);
