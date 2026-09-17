import type {
  SendAccountLockedInput,
} from './account-lock-mailer.js';


export const accountLockEmailSubject =
  'Tu cuenta de CodeGym ha sido bloqueada por seguridad';


export interface AccountLockEmailContent {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}


export function renderAccountLockEmail(
  input: Pick<
    SendAccountLockedInput,
    'displayName'
  >,
): AccountLockEmailContent {
  const displayName =
    normalizeDisplayName(
      input.displayName,
    );

  const greeting =
    displayName === null
      ? 'Hola:'
      : `Hola, ${displayName}:`;

  const escapedGreeting =
    escapeHtml(
      greeting,
    );

  /*
   * This is intentionally a functional security email,
   * not the final visual design.
   *
   * No IP, location, password, token or other sensitive
   * authentication data is included.
   */
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${accountLockEmailSubject}</title>
</head>
<body style="margin:0;padding:24px;background:#0b0d13;color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:28px;border:1px solid #2a2e3d;border-radius:14px;background:#12151f;">
    <div style="margin-bottom:28px;font-size:22px;font-weight:700;">CodeGym</div>

    <p style="margin:0 0 16px;line-height:1.6;color:#c9cedb;">${escapedGreeting}</p>

    <h1 style="margin:0 0 16px;font-size:26px;line-height:1.3;">
      Hemos bloqueado temporalmente el acceso a tu cuenta
    </h1>

    <p style="margin:0 0 16px;line-height:1.6;color:#c9cedb;">
      Detectamos demasiados intentos fallidos de inicio de sesión y bloqueamos la cuenta como medida de seguridad.
    </p>

    <p style="margin:0 0 16px;line-height:1.6;color:#c9cedb;">
      Aunque alguien conozca tu contraseña, no podrá crear una nueva sesión mientras la cuenta permanezca bloqueada.
    </p>

    <p style="margin:0 0 24px;line-height:1.6;color:#c9cedb;">
      Para recuperar el acceso, abre CodeGym y utiliza la opción de recuperación de contraseña.
    </p>

    <div style="padding:16px;border:1px solid #34394b;border-radius:10px;background:#171b27;color:#d9ddea;line-height:1.55;">
      Si tú no realizaste estos intentos, te recomendamos cambiar la contraseña durante el proceso de recuperación.
    </div>

    <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#8e95a8;">
      Este es un correo automático de seguridad de CodeGym.
    </p>
  </div>
</body>
</html>`;

  const text = `CodeGym

${greeting}

Hemos bloqueado temporalmente el acceso a tu cuenta.

Detectamos demasiados intentos fallidos de inicio de sesión y bloqueamos la cuenta como medida de seguridad.

Aunque alguien conozca tu contraseña, no podrá crear una nueva sesión mientras la cuenta permanezca bloqueada.

Para recuperar el acceso, abre CodeGym y utiliza la opción de recuperación de contraseña.

Si tú no realizaste estos intentos, te recomendamos cambiar la contraseña durante el proceso de recuperación.

Este es un correo automático de seguridad de CodeGym.`;

  return Object.freeze({
    subject:
      accountLockEmailSubject,

    html,

    text,
  });
}


function normalizeDisplayName(
  value: string | null,
): string | null {
  if (
    value === null
  ) {
    return null;
  }

  const normalized =
    value
      .replace(
        /[\r\n]+/g,
        ' ',
      )
      .trim();

  return normalized === ''
    ? null
    : normalized;
}


function escapeHtml(
  value: string,
): string {
  return value.replace(
    /[&<>"']/g,
    (
      character,
    ) => {
      switch (
        character
      ) {
        case '&':
          return '&amp;';

        case '<':
          return '&lt;';

        case '>':
          return '&gt;';

        case '"':
          return '&quot;';

        case "'":
          return '&#39;';

        default:
          return character;
      }
    },
  );
}
