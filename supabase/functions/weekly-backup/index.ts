// Edge Function: genera un Excel con TODAS las tablas (respaldo completo),
// lo guarda en el bucket de Storage "respaldos" (para poder descargarlo
// también desde la pestaña Respaldos de la app) y lo envía por correo con
// Resend. Pensada para dispararse sola una vez a la semana mediante un
// Cron Trigger de Supabase (Dashboard → Edge Functions → weekly-backup →
// Cron), no hace falta abrir la app.
//
// Despliegue (una vez, con Supabase CLI ya logueado y con el proyecto
// enlazado — ver supabase/functions/README.md):
//   supabase functions deploy weekly-backup
//   supabase secrets set BACKUP_EMAIL_TO=tucorreo@ejemplo.com
// (RESEND_API_KEY y RESEND_FROM_EMAIL son los mismos que usa
// send-presupuesto-email; si ya los configuraste no hace falta repetirlos.)
// Después, en el Dashboard: Edge Functions → weekly-backup → Cron →
// añadir un schedule, por ejemplo "0 6 * * 1" (todos los lunes 6:00 UTC).

// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';

const TABLES = [
  'clientes', 'obras', 'personal', 'facturas_venta', 'facturas_compra', 'factura_compra_lineas',
  'entregas_efectivo', 'abonos', 'nominas', 'presupuestos', 'presupuesto_lineas', 'incidencias', 'perfiles',
];

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Estructuras Humanizadoras <onboarding@resend.dev>';
const BACKUP_EMAIL_TO = Deno.env.get('BACKUP_EMAIL_TO');

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

    const wb = XLSX.utils.book_new();
    for (const table of TABLES) {
      const { data: rows, error } = await supabase.from(table).select('*').order('created_at', { ascending: true });
      if (error) throw new Error(`Error leyendo ${table}: ${error.message}`);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows || []), table.slice(0, 31));
    }

    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const fecha = new Date().toISOString().slice(0, 10);
    const nombreArchivo = `respaldo-${fecha}.xlsx`;
    const path = `semanal/${nombreArchivo}`;

    const { error: upErr } = await supabase.storage.from('respaldos').upload(path, new Blob([buffer]), {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true,
    });
    if (upErr) throw upErr;

    const { error: insErr } = await supabase.from('respaldos_semanales').insert({ fecha, storage_path: path, nombre_archivo: nombreArchivo });
    if (insErr) throw insErr;

    let emailEnviado = false;
    let emailError = null;
    if (RESEND_API_KEY && BACKUP_EMAIL_TO) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [BACKUP_EMAIL_TO],
          subject: `Respaldo semanal — Estructuras Humanizadoras (${fecha})`,
          html: `<p>Respaldo semanal generado automáticamente el ${fecha}. Adjunto el Excel con todos los datos.</p>`,
          attachments: [{ filename: nombreArchivo, content: encodeBase64(buffer) }],
        }),
      });
      if (!resendRes.ok) {
        emailError = await resendRes.text();
        console.error('Error enviando el respaldo por correo:', emailError);
      } else {
        emailEnviado = true;
      }
    }

    return new Response(JSON.stringify({ ok: true, path, emailEnviado, emailError }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
