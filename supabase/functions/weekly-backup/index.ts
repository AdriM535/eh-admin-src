// Edge Function: genera un Excel con TODAS las tablas (respaldo completo) y
// lo guarda en el bucket de Storage "respaldos". Pensada para dispararse
// sola una vez a la semana mediante un Cron Trigger de Supabase (Dashboard
// → Edge Functions → weekly-backup → Cron), no hace falta abrir la app.
//
// Despliegue (una vez, con Supabase CLI ya logueado y con el proyecto
// enlazado — ver supabase/functions/README.md):
//   supabase functions deploy weekly-backup
// Después, en el Dashboard: Edge Functions → weekly-backup → Cron →
// añadir un schedule, por ejemplo "0 6 * * 1" (todos los lunes 6:00 UTC).

// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const TABLES = [
  'clientes', 'obras', 'personal', 'facturas_venta', 'facturas_compra', 'factura_compra_lineas',
  'entregas_efectivo', 'abonos', 'nominas', 'presupuestos', 'presupuesto_lineas', 'incidencias', 'perfiles',
];

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

    return new Response(JSON.stringify({ ok: true, path }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
