import axios from "axios";
import { env } from "../config/env";

/**
 * Envío de emails transaccionales vía la API REST de Resend (sin agregar
 * el SDK `resend` como dependencia nueva — un POST con axios, que ya es
 * dependencia del proyecto, alcanza y evita instalar algo nuevo en el
 * build de Render).
 *
 * Nunca debe tirar y romper el flujo que lo llama (registro, "olvidé mi
 * contraseña"): si falla el envío, se loguea el error y listo — el
 * usuario ya quedó registrado / el token ya quedó generado igual.
 */
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!env.resendApiKey) {
    console.warn(`[email] RESEND_API_KEY no configurada — se salteó el envío a ${to} ("${subject}")`);
    return;
  }
  try {
    await axios.post(
      "https://api.resend.com/emails",
      { from: env.resendFromEmail, to, subject, html },
      { headers: { Authorization: `Bearer ${env.resendApiKey}` }, timeout: 10000 }
    );
  } catch (e: any) {
    console.error(`[email] Falló el envío a ${to} ("${subject}"):`, e?.response?.data || e?.message || e);
  }
}

/** Wrapper visual común: mismos colores/tipografía del sitio (theme/index.ts). */
function emailLayout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>NowSee</title>
  </head>
  <body style="margin:0;padding:0;background-color:#020617;font-family:'Inter',Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">&nbsp;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#020617;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background-color:#0c1324;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
            <tr>
              <td style="padding:32px 32px 0 32px;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                  <span style="color:#dce1fb;">Now</span><span style="color:#b7f700;">See</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
          <p style="max-width:480px;color:#5b6485;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;margin:20px 0 0 0;text-align:center;">
            Recibiste este email porque esta dirección se usó en NowSee (${env.frontendUrl.replace(/^https?:\/\//, "")}).
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td style="background-color:#b7f700;border-radius:10px;">
        <a href="${url}" style="display:inline-block;padding:14px 28px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#141f00;text-decoration:none;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

export async function sendWelcomeEmail(to: string, name?: string | null): Promise<void> {
  const greeting = name ? `Hola ${name.split(" ")[0]}` : "Hola";
  const body = `
    <h1 style="margin:0 0 12px 0;color:#dce1fb;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:30px;">
      ${greeting}, ¡bienvenido a NowSee! 🎬
    </h1>
    <p style="margin:0 0 8px 0;color:#9aa2c3;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;">
      Tu cuenta ya está lista. En NowSee podés armar tu <strong style="color:#dce1fb;">Mi Lista</strong>,
      marcar lo que ya viste, calificar películas y series, y encontrar en qué plataforma
      ver cada título con el link oficial directo — nada de búsquedas genéricas.
    </p>
    <p style="margin:0;color:#9aa2c3;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;">
      Arrancá explorando el catálogo cuando quieras.
    </p>
    ${button("Entrar a NowSee", env.frontendUrl)}
    <p style="margin:0;color:#5b6485;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;">
      Si no creaste esta cuenta, podés ignorar este email.
    </p>
  `;
  await sendEmail(to, "Bienvenido a NowSee", emailLayout(body));
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, ttlMinutes: number): Promise<void> {
  const hours = Math.round((ttlMinutes / 60) * 10) / 10;
  const body = `
    <h1 style="margin:0 0 12px 0;color:#dce1fb;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:30px;">
      Recuperar tu contraseña
    </h1>
    <p style="margin:0 0 8px 0;color:#9aa2c3;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;">
      Pediste restablecer la contraseña de tu cuenta en NowSee. Tocá el botón de abajo para
      elegir una nueva. El link vence en ${hours} ${hours === 1 ? "hora" : "horas"} y solo
      funciona una vez.
    </p>
    ${button("Elegir nueva contraseña", resetUrl)}
    <p style="margin:0 0 8px 0;color:#5b6485;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;">
      Si no pediste esto, ignorá este email — tu contraseña actual sigue funcionando igual.
    </p>
    <p style="margin:0;color:#5b6485;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;word-break:break-all;">
      Si el botón no funciona, copiá y pegá este link: ${resetUrl}
    </p>
  `;
  await sendEmail(to, "Recuperar tu contraseña en NowSee", emailLayout(body));
}
