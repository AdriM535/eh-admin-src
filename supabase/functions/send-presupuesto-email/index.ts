// Edge Function: envía un presupuesto por correo al cliente, usando tu
// propio Gmail/Outlook por SMTP (sin necesitar un dominio propio).
//
// Despliegue (una vez, con Supabase CLI ya logueado y con el proyecto
// enlazado — ver supabase/functions/README.md):
//   supabase functions deploy send-presupuesto-email
//   supabase secrets set SMTP_USER=tucorreo@gmail.com
//   supabase secrets set SMTP_PASS=contraseña_de_aplicación
//
// El correo se envía "desde" tu propia cuenta de Gmail/Outlook — no hace
// falta comprar ni verificar ningún dominio. Ver supabase/functions/README.md
// para cómo generar la contraseña de aplicación.

// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendMail } from '../_shared/sendMail.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const fmtMoney = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { presupuestoId, destinatario } = await req.json();
    if (!presupuestoId || !destinatario) throw new Error('Falta presupuestoId o destinatario.');

    // Cliente con el JWT de quien llama: así RLS decide si puede ver el
    // presupuesto (solo admin) — no usamos la service role key aquí.
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: req.headers.get('Authorization') } },
    });

    const { data: presupuesto, error: pErr } = await supabase.from('presupuestos').select('*').eq('id', presupuestoId).single();
    if (pErr || !presupuesto) throw new Error('No se encontró el presupuesto (¿tienes permiso para verlo?).');

    const { data: lineas } = await supabase
      .from('presupuesto_lineas')
      .select('*')
      .eq('presupuesto_id', presupuestoId)
      .order('orden', { ascending: true });

    let cliente = null;
    if (presupuesto.cliente_id) {
      const { data: c } = await supabase.from('clientes').select('*').eq('id', presupuesto.cliente_id).single();
      cliente = c;
    }

    const filas = (lineas || [])
      .map(
        (l) =>
          `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(l.concepto)}</td>` +
          `<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(l.cantidad)}</td>` +
          `<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${fmtMoney(l.precio_unitario)}</td>` +
          `<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${fmtMoney(l.importe)}</td></tr>`
      )
      .join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#2b2622;">
        <h2 style="margin-bottom:4px;">Presupuesto ${escapeHtml(presupuesto.numero || '')}</h2>
        <p style="color:#6b6259;margin-top:0;">Estructuras Humanizadoras — ${new Date(presupuesto.fecha).toLocaleDateString('es-ES')}</p>
        ${cliente ? `<p>Para: <b>${escapeHtml(cliente.nombre)}</b></p>` : ''}
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead>
            <tr style="background:#f4efe9;">
              <th style="padding:6px 10px;text-align:left;">Concepto</th>
              <th style="padding:6px 10px;text-align:right;">Cant.</th>
              <th style="padding:6px 10px;text-align:right;">Precio</th>
              <th style="padding:6px 10px;text-align:right;">Importe</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
        <p style="text-align:right;font-size:18px;font-weight:bold;">Total: ${fmtMoney(presupuesto.total)}</p>
        ${presupuesto.validez_dias ? `<p style="color:#6b6259;font-size:13px;">Presupuesto válido ${escapeHtml(presupuesto.validez_dias)} días desde la fecha de emisión. No es un compromiso contractual hasta la firma de ambas partes.</p>` : ''}
        ${presupuesto.notas ? `<p style="color:#6b6259;font-size:13px;white-space:pre-wrap;">${escapeHtml(presupuesto.notas)}</p>` : ''}
      </div>`;

    await sendMail({
      to: destinatario,
      subject: `Presupuesto ${presupuesto.numero || ''} — Estructuras Humanizadoras`,
      html,
    });

    await supabase
      .from('presupuestos')
      .update({ estado: 'enviado', enviado_a: destinatario, fecha_envio: new Date().toISOString() })
      .eq('id', presupuestoId);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
