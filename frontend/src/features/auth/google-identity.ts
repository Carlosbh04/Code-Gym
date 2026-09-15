const GOOGLE_IDENTITY_SCRIPT_URL =
  'https://accounts.google.com/gsi/client';

const GOOGLE_IDENTITY_SCRIPT_ID =
  'google-identity-services-script';

export interface GoogleCredentialResponse {
  readonly credential?: string;
  readonly select_by?: string;
}

export interface GoogleIdentityConfiguration {
  readonly client_id: string;
  readonly callback: (
    response: GoogleCredentialResponse,
  ) => void;
  readonly cancel_on_tap_outside?: boolean;
}

export interface GoogleButtonConfiguration {
  readonly type?: 'standard' | 'icon';
  readonly theme?:
    | 'outline'
    | 'filled_blue'
    | 'filled_black';
  readonly size?:
    | 'large'
    | 'medium'
    | 'small';
  readonly text?:
    | 'signin_with'
    | 'signup_with'
    | 'continue_with'
    | 'signin';
  readonly shape?:
    | 'rectangular'
    | 'pill'
    | 'circle'
    | 'square';
  readonly logo_alignment?:
    | 'left'
    | 'center';
  readonly width?: number;
}

export interface GoogleIdentityApi {
  initialize(
    configuration:
      GoogleIdentityConfiguration,
  ): void;

  renderButton(
    parent: HTMLElement,
    configuration:
      GoogleButtonConfiguration,
  ): void;
}

interface GoogleWindow extends Window {
  google?: {
    accounts?: {
      id?: GoogleIdentityApi;
    };
  };
}

let loadPromise:
  Promise<GoogleIdentityApi> | null =
    null;

function getGoogleIdentityApi():
GoogleIdentityApi | null {
  const googleWindow =
    window as GoogleWindow;

  return (
    googleWindow.google
      ?.accounts
      ?.id
    ?? null
  );
}

export function getGoogleClientId():
string {
  const clientId =
    import.meta.env
      .VITE_GOOGLE_CLIENT_ID
      ?.trim();

  if (!clientId) {
    throw new Error(
      'VITE_GOOGLE_CLIENT_ID no está configurado.',
    );
  }

  return clientId;
}

export function loadGoogleIdentityServices():
Promise<GoogleIdentityApi> {
  const existingApi =
    getGoogleIdentityApi();

  if (existingApi !== null) {
    return Promise.resolve(
      existingApi,
    );
  }

  if (loadPromise !== null) {
    return loadPromise;
  }

  loadPromise =
    new Promise<GoogleIdentityApi>(
      (
        resolve,
        reject,
      ) => {
        const existingScript =
          document.getElementById(
            GOOGLE_IDENTITY_SCRIPT_ID,
          );

        const resolveApi = () => {
          const api =
            getGoogleIdentityApi();

          if (api === null) {
            loadPromise = null;

            reject(
              new Error(
                'Google Identity Services se cargó sin exponer su API.',
              ),
            );

            return;
          }

          resolve(api);
        };

        const rejectLoad = () => {
          loadPromise = null;

          reject(
            new Error(
              'No se pudo cargar Google Identity Services.',
            ),
          );
        };

        if (
          existingScript
          instanceof HTMLScriptElement
        ) {
          existingScript.addEventListener(
            'load',
            resolveApi,
            {
              once: true,
            },
          );

          existingScript.addEventListener(
            'error',
            rejectLoad,
            {
              once: true,
            },
          );

          return;
        }

        const script =
          document.createElement(
            'script',
          );

        script.id =
          GOOGLE_IDENTITY_SCRIPT_ID;

        script.src =
          GOOGLE_IDENTITY_SCRIPT_URL;

        script.async = true;
        script.defer = true;

        script.addEventListener(
          'load',
          resolveApi,
          {
            once: true,
          },
        );

        script.addEventListener(
          'error',
          rejectLoad,
          {
            once: true,
          },
        );

        document.head.appendChild(
          script,
        );
      },
    );

  return loadPromise;
}
