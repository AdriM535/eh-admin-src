# Edge Functions

Dos funciones, cada una en su carpeta:

- `send-presupuesto-email` — envía un presupuesto por correo al cliente
  (botón "Enviar por correo" en la pestaña Presupuestos). Usa Resend.
- `weekly-backup` — genera un Excel con todas las tablas, lo guarda en
  Storage (aparece también en la pestaña Respaldos de la app) y lo manda
  por correo con el Excel adjunto. Se dispara solo con un Cron Trigger de
  Supabase, sin depender de que alguien abra la app. Usa Resend, igual que
  `send-presupuesto-email`.

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

## Configurar los secretos

`send-presupuesto-email` necesita una cuenta gratuita de Resend
(https://resend.com — hasta 3000 emails/mes gratis):

```
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
```

Sin verificar un dominio propio en Resend, el envío de prueba
(`onboarding@resend.dev`) solo llega a la dirección con la que te
registraste en Resend. Para poder mandar presupuestos a cualquier cliente,
verifica tu propio dominio en Resend y luego configura:

```
supabase secrets set RESEND_FROM_EMAIL="Estructuras Humanizadoras <presupuestos@tudominio.com>"
```

`weekly-backup` reutiliza `RESEND_API_KEY` y `RESEND_FROM_EMAIL` de arriba
para el envío, y necesita además a quién mandarlo:

```
supabase secrets set BACKUP_EMAIL_TO=tucorreo@ejemplo.com
```

Si `RESEND_API_KEY` o `BACKUP_EMAIL_TO` no están configurados, la función
sigue generando y guardando el Excel en Storage con normalidad — solo se
salta el envío por correo (queda igualmente disponible en la pestaña
Respaldos de la app).

**Importante sobre el remitente de prueba** (`onboarding@resend.dev`, el
que se usa si no configuras `RESEND_FROM_EMAIL`): Resend solo permite
enviar con ese remitente a la dirección con la que te registraste en
Resend. Si `BACKUP_EMAIL_TO` es esa misma dirección, funciona sin más. Si
quieres mandarlo a otro correo (o mandar presupuestos a clientes reales),
verifica tu propio dominio en Resend y configura `RESEND_FROM_EMAIL` con
una dirección de ese dominio.

`weekly-backup` no necesita secretos propios para leer/escribir en
Supabase — usa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, que Supabase
inyecta automáticamente en toda Edge Function.

## Programar el respaldo semanal

En el Dashboard de Supabase: **Edge Functions → weekly-backup → Cron** →
añade un schedule, por ejemplo `0 6 * * 1` (todos los lunes a las 6:00
UTC). A partir de ahí se genera y se envía solo, sin que nadie tenga que
abrir la app; los archivos quedan también en la pestaña **Respaldos**.
