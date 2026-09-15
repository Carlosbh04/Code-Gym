import type { SendPasswordResetCodeInput } from './password-reset-mailer.js';

export const passwordResetEmailSubject =
  'Tu código de seguridad para restablecer la contraseña';

export interface PasswordResetEmailContent {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export function renderPasswordResetEmail(
  input: Pick<
    SendPasswordResetCodeInput,
    'code' | 'displayName' | 'expiresInMinutes'
  >,
): PasswordResetEmailContent {
  assertValidCode(input.code);
  assertValidExpiry(input.expiresInMinutes);

  const displayName = normalizeDisplayName(input.displayName);
  const greeting = displayName === null
    ? 'Hola:'
    : `Hola, ${displayName}:`;
  const escapedGreeting = escapeHtml(greeting);
  const expiry = `${String(input.expiresInMinutes)} ${input.expiresInMinutes === 1 ? 'minuto' : 'minutos'}`;
  const year = String(new Date().getUTCFullYear());
  const codeCells = Array.from(input.code)
    .map((digit) => `
      <td width="16.66%" align="center" style="padding:0 3px;">
        <div style="box-sizing:border-box;min-width:36px;padding:14px 4px;border:1px solid #5b5bd6;border-radius:10px;background:#17182b;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;line-height:32px;text-align:center;">${digit}</div>
      </td>`)
    .join('');

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${passwordResetEmailSubject}</title>
</head>
<body style="margin:0;padding:0;background:#070a12;color:#eef0ff;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Tu código de seguridad de CodeGym caduca en ${expiry}.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#070a12;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border:1px solid #242944;border-radius:18px;background:#0f1320;">
          <tr>
            <td style="padding:24px 28px;border-bottom:1px solid #242944;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;line-height:30px;color:#ffffff;">Code<span style="color:#8b7cff;">Gym</span></td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#aeb4ca;">Practica. Aprende. Mejora.</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 28px 28px;">
              <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#c8cce0;">${escapedGreeting}</p>
              <h1 style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:36px;color:#ffffff;">Restablece tu contraseña</h1>
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#c8cce0;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de CodeGym.</p>
              <p style="margin:0 0 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#c8cce0;">Introduce el siguiente código de seguridad en la aplicación:</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" aria-label="Código de seguridad ${input.code}" style="width:100%;table-layout:fixed;">
                <tr>${codeCells}
                </tr>
              </table>
              <p style="margin:18px 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;line-height:22px;text-align:center;color:#b9bfff;">Este código caduca en ${expiry}.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 16px;border:1px solid #303650;border-radius:12px;background:#151a2a;">
                <tr><td style="padding:18px 20px;">
                  <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;line-height:22px;color:#ffffff;">Por tu seguridad:</p>
                  <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;color:#c8cce0;">• No compartas este código con nadie.</p>
                  <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;color:#c8cce0;">• CodeGym nunca te pedirá este código fuera del proceso de recuperación de contraseña.</p>
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;color:#c8cce0;">• El código solo puede utilizarse una vez.</p>
                </td></tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border:1px solid #303650;border-radius:12px;background:#111624;">
                <tr><td style="padding:18px 20px;">
                  <p style="margin:0 0 7px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;line-height:22px;color:#ffffff;">¿No solicitaste este cambio?</p>
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;color:#c8cce0;">Si no solicitaste restablecer tu contraseña, puedes ignorar este correo. Tu contraseña actual seguirá siendo válida.</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 28px;border-top:1px solid #242944;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#8e95ad;">
              Este es un correo automático de CodeGym.<br>
              Por favor, no respondas a este mensaje.<br>
              © ${year} CodeGym. Todos los derechos reservados.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `CodeGym

${greeting}

Restablece tu contraseña

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de CodeGym.

Tu código de seguridad es:

${input.code}

Este código caduca en ${expiry}.

Por tu seguridad:
- No compartas este código con nadie.
- CodeGym nunca te pedirá este código fuera del proceso de recuperación de contraseña.
- El código solo puede utilizarse una vez.

¿No solicitaste este cambio?
Si no solicitaste restablecer tu contraseña, puedes ignorar este correo. Tu contraseña actual seguirá siendo válida.

Este es un correo automático de CodeGym.
Por favor, no respondas a este mensaje.
© ${year} CodeGym. Todos los derechos reservados.`;

  return Object.freeze({
    subject: passwordResetEmailSubject,
    html,
    text,
  });
}

function normalizeDisplayName(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value.replace(/[\r\n]+/g, ' ').trim();
  return normalized === '' ? null : normalized;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return character;
    }
  });
}

function assertValidCode(code: string): void {
  if (!/^\d{6}$/.test(code)) {
    throw new TypeError('Password reset code must contain exactly six digits');
  }
}

function assertValidExpiry(expiresInMinutes: number): void {
  if (!Number.isSafeInteger(expiresInMinutes) || expiresInMinutes < 1) {
    throw new TypeError('Password reset expiry must be a positive integer');
  }
}
