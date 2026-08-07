// Envío de correo por SMTP usando tu propio Gmail/Outlook (con una
// "contraseña de aplicación"), sin necesitar un dominio propio ni cuentas
// de terceros. Usada por send-presupuesto-email y weekly-backup.
//
// Secretos (supabase secrets set ...):
//   SMTP_USER       tu email completo (ej. tucorreo@gmail.com)
//   SMTP_PASS       la contraseña de aplicación (NO tu contraseña normal)
//   SMTP_HOST       opcional, por defecto smtp.gmail.com
//   SMTP_PORT       opcional, por defecto 465
//   SMTP_FROM_NAME  opcional, nombre que verá el destinatario (por defecto "Estructuras Humanizadoras")
//
// Para Outlook/Hotmail: SMTP_HOST=smtp-mail.outlook.com, SMTP_PORT=587.

// @ts-nocheck
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com';
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') || '465');
const SMTP_USER = Deno.env.get('SMTP_USER');
const SMTP_PASS = Deno.env.get('SMTP_PASS');
const SMTP_FROM_NAME = Deno.env.get('SMTP_FROM_NAME') || 'Estructuras Humanizadoras';

export async function sendMail({ to, subject, html, attachments }) {
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error('Falta configurar los secretos SMTP_USER / SMTP_PASS en el proyecto de Supabase.');
  }

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: SMTP_PORT === 465,
      auth: { username: SMTP_USER, password: SMTP_PASS },
    },
  });

  try {
    await client.send({
      from: `${SMTP_FROM_NAME} <${SMTP_USER}>`,
      to,
      subject,
      html,
      attachments: attachments || [],
    });
  } finally {
    await client.close();
  }
}
