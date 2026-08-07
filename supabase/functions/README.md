# Edge Functions

Dos funciones, cada una en su carpeta, más un helper compartido:

- `send-presupuesto-email` — envía un presupuesto por correo al cliente
  (botón "Enviar por correo" en la pestaña Presupuestos).
- `weekly-backup` — genera un Excel con todas las tablas, lo guarda en
  Storage (aparece también en la pestaña Respaldos de la app) y lo manda
  por correo con el Excel adjunto. Se dispara solo con un Cron Trigger de
  Supabase, sin depender de que alguien abra la app.
- `_shared/sendMail.ts` — el envío real, usado por las dos funciones
  anteriores. Manda el correo por SMTP desde tu propio Gmail/Outlook, sin
  necesitar un dominio propio.

## Requisitos previos (una sola vez)

1. Instala la CLI de Supabase si no la tienes: `npm install -g supabase`
2. Inicia sesión: `supabase login`
3. Enlaza este repo con tu proyecto de Supabase (te pedirá el project ref,
   lo ves en Supabase → Project Settings → General):
   `supabase link --project-ref TU_PROJECT_REF`

## Desplegar las funciones

```
supabase functions deploy send-presupuesto-email
supabase functions deploy weekly-backup
```

(`_shared/sendMail.ts` no se despliega aparte, se incluye automáticamente
al desplegar cada función que lo importa.)

## Configurar el envío de correo (Gmail u Outlook)

Los correos se envían desde tu propia cuenta de correo — no hace falta
comprar ni verificar ningún dominio, y no hay límite de a quién le puedes
escribir.

**Con Gmail:**

1. Activa la verificación en 2 pasos en tu cuenta de Google (obligatorio
   para poder crear una contraseña de aplicación):
   https://myaccount.google.com/security
2. Ve a https://myaccount.google.com/apppasswords, crea una contraseña de
   aplicación (por ejemplo con el nombre "Estructuras Humanizadoras") y
   cópiala (16 caracteres, sin espacios).
3. Configura los secretos:
   ```
   supabase secrets set SMTP_USER=tucorreo@gmail.com
   supabase secrets set SMTP_PASS=la_contraseña_de_aplicación
   ```
   (`SMTP_HOST`/`SMTP_PORT` no hace falta tocarlos, por defecto usan Gmail.)

**Con Outlook/Hotmail:**

1. Crea una contraseña de aplicación en
   https://account.live.com/proofs/AppPassword (si tu cuenta tiene
   verificación en 2 pasos activada, es obligatorio para esto).
2. Configura los secretos:
   ```
   supabase secrets set SMTP_USER=tucorreo@outlook.com
   supabase secrets set SMTP_PASS=la_contraseña_de_aplicación
   supabase secrets set SMTP_HOST=smtp-mail.outlook.com
   supabase secrets set SMTP_PORT=587
   ```

**Nunca uses tu contraseña normal de la cuenta** — solo la contraseña de
aplicación, que se puede revocar en cualquier momento sin afectar al resto
de tu cuenta.

`weekly-backup` necesita además decir a quién se manda el respaldo:

```
supabase secrets set BACKUP_EMAIL_TO=tucorreo@ejemplo.com
```

Si `SMTP_USER`/`SMTP_PASS` o `BACKUP_EMAIL_TO` no están configurados,
`weekly-backup` sigue generando y guardando el Excel en Storage con
normalidad — solo se salta el envío por correo (queda igual disponible en
la pestaña Respaldos de la app).

`weekly-backup` no necesita secretos propios para leer/escribir en
Supabase — usa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, que Supabase
inyecta automáticamente en toda Edge Function.

## Programar el respaldo semanal

En el Dashboard de Supabase: **Edge Functions → weekly-backup → Cron** →
añade un schedule, por ejemplo `0 6 * * 1` (todos los lunes a las 6:00
UTC). A partir de ahí se genera y se envía solo, sin que nadie tenga que
abrir la app; los archivos quedan también en la pestaña **Respaldos**.
