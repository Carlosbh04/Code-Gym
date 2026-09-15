import {
  afterEach,
  describe,
  expect,
  it,
} from 'vitest';

import {
  loadGoogleIdentityServices,
} from './google-identity';

interface GoogleTestWindow
  extends Window {
  google?: {
    accounts?: {
      id?: {
        initialize: () => void;
        renderButton: () => void;
      };
    };
  };
}

afterEach(() => {
  document
    .getElementById(
      'google-identity-services-script',
    )
    ?.remove();

  delete (
    window as GoogleTestWindow
  ).google;
});

describe(
  'Google Identity Services loader',
  () => {
    it(
      'reutiliza la API si Google ya está cargado',
      async () => {
        const api = {
          initialize: () => undefined,
          renderButton: () => undefined,
        };

        (
          window as GoogleTestWindow
        ).google = {
          accounts: {
            id: api,
          },
        };

        await expect(
          loadGoogleIdentityServices(),
        ).resolves.toBe(api);

        expect(
          document.getElementById(
            'google-identity-services-script',
          ),
        ).toBeNull();
      },
    );

    it(
      'crea una sola carga del script oficial',
      () => {
        void loadGoogleIdentityServices();
        void loadGoogleIdentityServices();

        const scripts =
          document.querySelectorAll(
            '#google-identity-services-script',
          );

        expect(
          scripts,
        ).toHaveLength(1);

        expect(
          scripts[0]?.getAttribute('src'),
        ).toBe(
          'https://' + 'accounts.google.com/gsi/client',
        );
      },
    );
  },
);
