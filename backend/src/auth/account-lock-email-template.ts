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


export interface RenderAccountLockEmailInput
  extends Pick<
    SendAccountLockedInput,
    'displayName'
  > {
  readonly recoveryUrl: string;
}


export function renderAccountLockEmail(
  input: RenderAccountLockEmailInput,
): AccountLockEmailContent {
  const displayName =
    normalizeDisplayName(
      input.displayName,
    );

  const recoveryUrl =
    normalizeRecoveryUrl(
      input.recoveryUrl,
    );

  const escapedRecoveryUrl =
    escapeHtml(
      recoveryUrl,
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
   * Email-client compatibility rules:
   *
   * - structural layout uses presentation tables
   * - important styles are inline
   * - no JavaScript
   * - no remote fonts
   * - no external tracking images
   * - no IP/location/device/authentication secrets
   * - recovery buttons use one trusted absolute HTTP(S) URL
   *
   * Modern clients receive gradients and rounded corners.
   * Older clients retain solid-color fallbacks and the same
   * information hierarchy.
   */

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${accountLockEmailSubject}</title>

  <style>
    @media only screen and (max-width: 640px) {
      .email-shell {
        width: 100% !important;
      }

      .email-header-cell {
        display: block !important;
        width: 100% !important;
        text-align: left !important;
      }

      .email-security-heading {
        padding-top: 22px !important;
        text-align: left !important;
      }

      .email-content {
        padding-left: 22px !important;
        padding-right: 22px !important;
      }

      .email-title {
        font-size: 30px !important;
        line-height: 38px !important;
      }

      .email-card-icon {
        width: 48px !important;
      }

      .email-footer-cell {
        display: block !important;
        width: 100% !important;
        text-align: left !important;
      }

      .email-footer-tagline {
        padding-top: 20px !important;
        border-left: 0 !important;
      }
    }

    @media only screen and (max-width: 420px) {
      .email-title {
        font-size: 27px !important;
        line-height: 34px !important;
      }

      .email-button {
        font-size: 16px !important;
      }
    }
  </style>
</head>

<body style="margin:0;padding:0;background-color:#10131b;color:#f5f6fb;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">

  <div
    style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;"
  >
    Hemos bloqueado tu cuenta de CodeGym por seguridad después de varios intentos fallidos de inicio de sesión.
  </div>

  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="width:100%;background-color:#10131b;"
  >
    <tr>
      <td
        align="center"
        style="padding:32px 14px;"
      >

        <table
          role="presentation"
          class="email-shell"
          width="620"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="width:620px;max-width:620px;border-collapse:separate;border-spacing:0;border:1px solid #292e3b;border-radius:8px;overflow:hidden;background-color:#0c1017;"
        >

          <!-- ==================================================
               Header
               ================================================== -->
          <tr>
            <td
              style="padding:0;background-color:#171d5a;background-image:linear-gradient(120deg,#171d5a 0%,#171a4c 48%,#17143f 100%);"
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
              >
                <tr>
                  <td
                    class="email-header-cell"
                    width="55%"
                    valign="middle"
                    style="width:55%;padding:30px 18px 30px 34px;"
                  >
                    <table
                      role="presentation"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                    >
                      <tr>
                        <td
                          valign="middle"
                          style="padding-right:13px;"
                        >
                          <span
                            style="font-size:38px;line-height:38px;font-weight:800;letter-spacing:-10px;color:#6872ff;"
                          >‹›</span>
                        </td>

                        <td valign="middle">
                          <div
                            style="font-size:30px;line-height:34px;font-weight:800;letter-spacing:-1.2px;color:#f7f7fb;"
                          >
                            Code<span style="color:#6970ff;">Gym</span>
                          </div>

                          <div
                            style="padding-top:4px;font-size:12px;line-height:18px;color:#b6b9d3;"
                          >
                            Practica. Construye. Avanza.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <td
                    class="email-header-cell email-security-heading"
                    width="45%"
                    valign="middle"
                    align="right"
                    style="width:45%;padding:30px 34px 30px 18px;text-align:right;"
                  >
                    <table
                      role="presentation"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      align="right"
                      style="margin-left:auto;"
                    >
                      <tr>
                        <td
                          valign="top"
                          style="padding-right:10px;color:#6872ff;font-size:29px;line-height:30px;"
                        >
                          ◇
                        </td>

                        <td
                          valign="top"
                          align="left"
                        >
                          <div
                            style="font-size:13px;line-height:18px;font-weight:800;letter-spacing:.8px;color:#949bff;text-transform:uppercase;"
                          >
                            Alerta de seguridad
                          </div>

                          <div
                            style="padding-top:2px;font-size:11px;line-height:16px;color:#aaaec9;"
                          >
                            Tu seguridad es nuestra prioridad
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>


          <!-- ==================================================
               Main content
               ================================================== -->
          <tr>
            <td
              class="email-content"
              style="padding:38px 34px 0;background-color:#0c1017;"
            >

              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
              >
                <tr>
                  <td
                    align="center"
                    style="padding-bottom:22px;"
                  >
                    <table
                      role="presentation"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                    >
                      <tr>
                        <td
                          align="center"
                          valign="middle"
                          style="width:126px;height:126px;border:1px solid #22295b;border-radius:999px;background-color:#101532;"
                        >
                          <table
                            role="presentation"
                            cellspacing="0"
                            cellpadding="0"
                            border="0"
                            align="center"
                          >
                            <tr>
                              <td
                                align="center"
                                style="width:92px;height:92px;border:5px solid #5c63ff;border-radius:46% 46% 56% 56%;background-color:#171944;box-shadow:0 0 24px rgba(91,99,255,.24);"
                              >
                                <div
                                  style="font-size:35px;line-height:86px;font-weight:700;color:#6a70ff;"
                                >
                                  ●
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td
                    align="center"
                    style="padding:0 12px;"
                  >
                    <p
                      style="margin:0 0 12px;font-size:13px;line-height:20px;color:#767d99;"
                    >
                      ${escapedGreeting}
                    </p>

                    <h1
                      class="email-title"
                      style="margin:0;font-size:34px;line-height:42px;font-weight:800;letter-spacing:-1.2px;color:#f3f4f8;"
                    >
                      Tu cuenta ha sido bloqueada<br>
                      por seguridad
                    </h1>

                    <p
                      style="margin:20px auto 0;max-width:500px;font-size:16px;line-height:25px;color:#9da3bc;"
                    >
                      Hemos bloqueado tu cuenta después de varios intentos
                      de inicio de sesión fallidos. Esta medida nos ayuda
                      a mantener tu cuenta y tus datos seguros.
                    </p>
                  </td>
                </tr>


                <!-- Card: user recognizes activity -->
                <tr>
                  <td style="padding-top:28px;">
                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="width:100%;border:1px solid #252b37;border-radius:10px;background-color:#151a23;"
                    >
                      <tr>
                        <td
                          class="email-card-icon"
                          width="62"
                          valign="middle"
                          align="center"
                          style="width:62px;padding:20px 0 20px 17px;font-size:28px;line-height:30px;color:#2990ff;"
                        >
                          ♙
                        </td>

                        <td
                          valign="middle"
                          style="padding:20px 22px 20px 13px;"
                        >
                          <div
                            style="font-size:16px;line-height:21px;font-weight:700;color:#f3f4f8;"
                          >
                            Si fuiste tú
                          </div>

                          <div
                            style="padding-top:5px;font-size:14px;line-height:21px;color:#9ba2bb;"
                          >
                            Puedes recuperar el acceso de forma segura y
                            continuar con tus estudios en CodeGym.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>


                <!-- Card: suspicious activity -->
                <tr>
                  <td style="padding-top:12px;">
                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="width:100%;border:1px solid #252b37;border-radius:10px;background-color:#151a23;"
                    >
                      <tr>
                        <td
                          class="email-card-icon"
                          width="62"
                          valign="middle"
                          align="center"
                          style="width:62px;padding:20px 0 20px 17px;font-size:29px;line-height:30px;color:#7844ff;"
                        >
                          ◇
                        </td>

                        <td
                          valign="middle"
                          style="padding:20px 22px 20px 13px;"
                        >
                          <div
                            style="font-size:16px;line-height:21px;font-weight:700;color:#f3f4f8;"
                          >
                            Si no reconoces esta actividad
                          </div>

                          <div
                            style="padding-top:5px;font-size:14px;line-height:21px;color:#9ba2bb;"
                          >
                            Recupera tu cuenta y cambia tu contraseña para
                            proteger tu información.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>


                <!-- Primary CTA -->
                <tr>
                  <td
                    align="center"
                    style="padding-top:28px;"
                  >
                    <table
                      role="presentation"
                      width="78%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="width:78%;"
                    >
                      <tr>
                        <td
                          align="center"
                          style="border-radius:8px;background-color:#5458ff;background-image:linear-gradient(90deg,#4a50ff 0%,#6568ff 50%,#5055ff 100%);"
                        >
                          <a
                            class="email-button"
                            href="${escapedRecoveryUrl}"
                            target="_blank"
                            rel="noopener noreferrer"
                            style="display:block;padding:15px 20px;font-size:17px;line-height:22px;font-weight:700;text-align:center;text-decoration:none;color:#ffffff;"
                          >
                            Recuperar acceso&nbsp;&nbsp; →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>


                <!-- Secondary CTA -->
                <tr>
                  <td
                    align="center"
                    style="padding-top:12px;"
                  >
                    <table
                      role="presentation"
                      width="78%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="width:78%;"
                    >
                      <tr>
                        <td
                          align="center"
                          style="border:1px solid #686cff;border-radius:8px;background-color:#0c1017;"
                        >
                          <a
                            class="email-button"
                            href="${escapedRecoveryUrl}"
                            target="_blank"
                            rel="noopener noreferrer"
                            style="display:block;padding:14px 20px;font-size:16px;line-height:22px;font-weight:700;text-align:center;text-decoration:none;color:#787cff;"
                          >
                            Cambiar contraseña
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>


                <!-- Security note -->
                <tr>
                  <td
                    align="center"
                    style="padding:26px 0 22px;"
                  >
                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                    >
                      <tr>
                        <td
                          style="height:1px;background-color:#252a35;font-size:0;line-height:0;"
                        >
                          &nbsp;
                        </td>
                      </tr>

                      <tr>
                        <td
                          align="center"
                          style="padding-top:18px;font-size:12px;line-height:18px;color:#858ca4;"
                        >
                          <span
                            style="padding-right:7px;color:#969db5;"
                          >▣</span>
                          Este mensaje fue enviado por razones de seguridad.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>


          <!-- ==================================================
               Footer
               ================================================== -->
          <tr>
            <td
              style="border-top:1px solid #222731;padding:22px 34px 24px;background-color:#0c1017;"
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
              >
                <tr>
                  <td
                    class="email-footer-cell"
                    width="68%"
                    valign="middle"
                    style="width:68%;"
                  >
                    <table
                      role="presentation"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                    >
                      <tr>
                        <td
                          valign="middle"
                          style="padding-right:10px;"
                        >
                          <span
                            style="font-size:27px;line-height:27px;font-weight:800;letter-spacing:-8px;color:#6872ff;"
                          >‹›</span>
                        </td>

                        <td valign="middle">
                          <div
                            style="font-size:21px;line-height:24px;font-weight:800;color:#f4f5f8;"
                          >
                            Code<span style="color:#6872ff;">Gym</span>
                          </div>

                          <div
                            style="padding-top:3px;font-size:10px;line-height:15px;color:#7f869e;"
                          >
                            Practica. Construye. Avanza.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <td
                    class="email-footer-cell email-footer-tagline"
                    width="32%"
                    valign="middle"
                    style="width:32%;border-left:1px solid #343946;padding-left:24px;font-size:11px;line-height:15px;color:#858ca4;"
                  >
                    Mejores desarrolladores<br>
                    para un futuro real.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <table
          role="presentation"
          width="620"
          class="email-shell"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="width:620px;max-width:620px;"
        >
          <tr>
            <td
              align="center"
              style="padding:16px 20px 0;font-size:10px;line-height:16px;color:#62697d;"
            >
              Este es un correo automático de seguridad de CodeGym.
              No respondas a este mensaje.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

  const text = `CodeGym — Alerta de seguridad

${greeting}

TU CUENTA HA SIDO BLOQUEADA POR SEGURIDAD

Hemos bloqueado tu cuenta después de varios intentos de inicio de sesión fallidos. Esta medida nos ayuda a mantener tu cuenta y tus datos seguros.

SI FUISTE TÚ
Puedes recuperar el acceso de forma segura y continuar con tus estudios en CodeGym.

SI NO RECONOCES ESTA ACTIVIDAD
Recupera tu cuenta y cambia tu contraseña para proteger tu información.

Recuperar acceso:
${recoveryUrl}

Cambiar contraseña:
${recoveryUrl}

Este mensaje fue enviado por razones de seguridad.

CodeGym
Practica. Construye. Avanza.

Este es un correo automático de seguridad de CodeGym.
No respondas a este mensaje.`;

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


function normalizeRecoveryUrl(
  value: string,
): string {
  let parsed:
    URL;

  try {
    parsed =
      new URL(
        value,
      );
  } catch {
    throw new TypeError(
      'Account recovery URL must be an absolute HTTP(S) URL',
    );
  }

  if (
    (
      parsed.protocol !== 'https:'
      && parsed.protocol !== 'http:'
    )
    || parsed.username !== ''
    || parsed.password !== ''
  ) {
    throw new TypeError(
      'Account recovery URL must be an absolute HTTP(S) URL',
    );
  }

  return parsed.toString();
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
