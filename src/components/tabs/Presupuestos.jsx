import { useState } from 'react';
import { supabase } from '../../supabaseClient.js';
import { fmtMoney, fmtDate } from '../../lib/utils.js';
import { ESTADOS_PRESUPUESTO } from '../../lib/constants.js';

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function abrirImpresion(p, lineas, cliente, obra) {
  const win = window.open('', '_blank');
  if (!win) return;
  const filas = lineas
    .map(
      (l) => `<tr><td>${escapeHtml(l.concepto)}</td><td style="text-align:right">${escapeHtml(l.cantidad)}</td><td style="text-align:right">${fmtMoney(l.precioUnitario)}</td><td style="text-align:right">${fmtMoney(l.importe)}</td></tr>`
    )
    .join('');
  win.document.write(`
    <html><head><title>Presupuesto ${escapeHtml(p.numero || '')}</title>
    <meta charset="utf-8">
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#32363B;padding:40px;max-width:760px;margin:0 auto;}
      h1{font-size:22px;margin-bottom:2px;}
      .sub{color:#6B7280;font-size:13px;margin-bottom:24px;}
      table{width:100%;border-collapse:collapse;margin-top:20px;}
      th,td{padding:8px 10px;border-bottom:1px solid #DDE1E6;font-size:13px;text-align:left;}
      th{background:#F1F4F6;text-transform:uppercase;font-size:11px;color:#6B7280;}
      .total{text-align:right;font-size:18px;font-weight:700;margin-top:14px;}
      .meta{margin:18px 0;font-size:13px;line-height:1.7;}
      .notas{margin-top:24px;font-size:12.5px;color:#6B7280;white-space:pre-wrap;}
      .legal{margin-top:28px;padding:12px 14px;border:1px solid #C08A3E;background:#FBF3E4;font-size:11.5px;line-height:1.6;color:#5A4522;}
      .firmas{display:flex;gap:40px;margin-top:56px;}
      .firma{flex:1;text-align:center;}
      .firma .linea{border-top:1px solid #32363B;margin-bottom:6px;padding-top:46px;}
      .firma .label{font-size:11.5px;color:#6B7280;}
    </style></head>
    <body>
      <h1>Estructuras Humanizadoras</h1>
      <div class="sub">Presupuesto ${escapeHtml(p.numero || '')} — ${fmtDate(p.fecha)}</div>
      <div class="meta">
        <b>Cliente:</b> ${cliente ? escapeHtml(cliente.nombre) : '—'}<br>
        ${obra ? `<b>Obra:</b> ${escapeHtml(obra.nombre)}<br>` : ''}
        <b>Validez:</b> ${escapeHtml(p.validezDias || 30)} días
      </div>
      <table>
        <thead><tr><th>Concepto</th><th style="text-align:right">Cantidad</th><th style="text-align:right">Precio ud.</th><th style="text-align:right">Importe</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
      <div class="total">Total: ${fmtMoney(p.total)}</div>
      ${p.notas ? `<div class="notas">${escapeHtml(p.notas)}</div>` : ''}
      <div class="legal">
        <b>Aviso legal:</b> Este documento es un <b>PRESUPUESTO</b> y tiene carácter meramente
        informativo. No constituye un compromiso ni una obligación contractual para ninguna
        de las partes. Únicamente adquirirá validez como encargo de obra cuando sea
        <b>firmado por el cliente y por Estructuras Humanizadoras</b>, momento en el que pasará
        a considerarse aceptado. Los precios y plazos indicados son válidos durante ${escapeHtml(p.validezDias || 30)}
        días naturales desde la fecha de emisión y podrán variar si se modifican las
        condiciones de la obra.
      </div>
      <div class="firmas">
        <div class="firma"><div class="linea"></div><div class="label">Firma del cliente — fecha</div></div>
        <div class="firma"><div class="linea"></div><div class="label">Firma de Estructuras Humanizadoras — fecha</div></div>
      </div>
    </body></html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

export default function Presupuestos({ data, actions, calc, setModal }) {
  const [sendingId, setSendingId] = useState(null);
  const presupuestos = data.presupuestos.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  const enviarPorCorreo = async (p, cliente) => {
    const destinatario = window.prompt('¿A qué email se envía el presupuesto?', cliente?.email || p.enviadoA || '');
    if (!destinatario) return;
    setSendingId(p.id);
    const { data: res, error } = await supabase.functions.invoke('send-presupuesto-email', {
      body: { presupuestoId: p.id, destinatario },
    });
    setSendingId(null);
    if (error || !res?.ok) {
      alert('No se pudo enviar el correo: ' + (res?.error || error?.message || 'error desconocido'));
      return;
    }
    alert('Presupuesto enviado a ' + destinatario);
  };

  const estadoPill = (estado) => {
    const map = { borrador: '', enviado: 'steel', aceptado: 'green', rechazado: 'brick' };
    return <span className={'pill ' + (map[estado] || '')}>{ESTADOS_PRESUPUESTO.find((e) => e.id === estado)?.label || estado}</span>;
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Presupuestos</h1>
          <div className="desc">Ofertas a clientes, con líneas de concepto y precio</div>
        </div>
        <button className="btn" onClick={() => setModal({ type: 'presupuesto' })}>+ Nuevo presupuesto</button>
      </div>
      <div className="tblwrap">
        <table>
          <thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th>Obra</th><th>Total</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {presupuestos.length === 0 && <tr><td colSpan="7" className="empty">Sin presupuestos registrados.</td></tr>}
            {presupuestos.map((p) => {
              const cliente = calc.clienteById(p.clienteId);
              const obra = calc.obraById(p.obraId);
              const lineas = data.presupuestoLineas.filter((l) => l.presupuestoId === p.id).sort((a, b) => a.orden - b.orden);
              return (
                <tr key={p.id}>
                  <td>{p.numero || '—'}</td>
                  <td>{fmtDate(p.fecha)}</td>
                  <td>{cliente ? cliente.nombre : '—'}</td>
                  <td>{obra ? obra.nombre : '—'}</td>
                  <td className="num">{fmtMoney(p.total)}</td>
                  <td>{estadoPill(p.estado)}</td>
                  <td>
                    <button className="btn ghost small" onClick={() => abrirImpresion(p, lineas, cliente, obra)}>Imprimir</button>{' '}
                    <button className="btn ghost small" disabled={sendingId === p.id} onClick={() => enviarPorCorreo(p, cliente)}>
                      {sendingId === p.id ? 'Enviando…' : 'Enviar por correo'}
                    </button>{' '}
                    <button className="btn ghost small" onClick={() => setModal({ type: 'presupuesto', initial: p })}>Editar</button>{' '}
                    <button className="btn danger small" onClick={() => actions.deletePresupuesto(p.id)}>Eliminar</button>
                    {p.fechaEnvio && <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Enviado a {p.enviadoA} el {fmtDate(p.fechaEnvio)}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
