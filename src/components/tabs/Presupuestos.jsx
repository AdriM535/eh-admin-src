import { useState } from 'react';
import { supabase } from '../../supabaseClient.js';
import { fmtMoney, fmtDate, todayISO } from '../../lib/utils.js';
import { ESTADOS_PRESUPUESTO } from '../../lib/constants.js';

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Dirección del cliente a partir de los campos estructurados (calle, número...)
// o, si no los tiene rellenos, del campo "dirección" antiguo de texto libre.
function direccionCliente(c) {
  if (!c) return '';
  if (c.calle) {
    const linea1 = [c.calle, c.numero, c.interior].filter(Boolean).join(' ');
    const linea2 = [c.cp, c.municipio, c.provincia].filter(Boolean).join(' ');
    return [linea1, linea2].filter(Boolean).join(', ');
  }
  return c.direccion || '';
}

// Convierte /logo.png (mismo origen que la app) en un data: URL, para
// incrustarlo directamente en el HTML de la ventana de impresión — así no
// depende de que esa ventana en blanco pueda cargar la imagen por su cuenta.
async function logoComoDataUrl() {
  try {
    const res = await fetch('/logo.png');
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function abrirImpresion(p, lineas, cliente, obra) {
  // Se abre la ventana ya (antes de cualquier await) para que el navegador
  // no lo bloquee como popup — solo cuenta como "gesto del usuario" si es
  // síncrono con el clic.
  const win = window.open('', '_blank');
  if (!win) return;
  const logoDataUrl = await logoComoDataUrl();
  const filas = lineas
    .map(
      (l) => `<tr><td>${escapeHtml(l.concepto)}</td><td style="text-align:right">${escapeHtml(l.cantidad)}</td><td style="text-align:right">${fmtMoney(l.precioUnitario)}</td><td style="text-align:right">${fmtMoney(l.importe)}</td></tr>`
    )
    .join('');
  const base = lineas.reduce((s, l) => s + (Number(l.importe) || 0), 0);
  const ivaPct = Number(p.iva ?? 21);
  const cuotaIva = Math.round(base * (ivaPct / 100) * 100) / 100;
  const total = base + cuotaIva;
  win.document.write(`
    <html><head><title>Presupuesto ${escapeHtml(p.numero || '')}</title>
    <meta charset="utf-8">
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#32363B;padding:40px;max-width:760px;margin:0 auto;}
      .header{display:flex;align-items:center;gap:16px;margin-bottom:6px;}
      .header img{height:56px;width:auto;}
      h1{font-size:20px;margin:0;}
      .sub{color:#6B7280;font-size:13px;margin-bottom:24px;}
      table{width:100%;border-collapse:collapse;margin-top:20px;}
      th,td{padding:8px 10px;border-bottom:1px solid #DDE1E6;font-size:13px;text-align:left;}
      th{background:#F1F4F6;text-transform:uppercase;font-size:11px;color:#6B7280;}
      .totales{margin-top:14px;text-align:right;}
      .totales .fila{font-size:13px;color:#6B7280;margin-bottom:2px;}
      .total{text-align:right;font-size:18px;font-weight:700;margin-top:6px;}
      .meta{margin:18px 0;font-size:13px;line-height:1.7;}
      .notas{margin-top:24px;font-size:12.5px;color:#6B7280;white-space:pre-wrap;}
      .legal{margin-top:28px;padding:12px 14px;border:1px solid #C08A3E;background:#FBF3E4;font-size:11.5px;line-height:1.6;color:#5A4522;}
      .firmas{display:flex;gap:40px;margin-top:56px;}
      .firma{flex:1;text-align:center;}
      .firma .linea{border-top:1px solid #32363B;margin-bottom:6px;padding-top:46px;}
      .firma .label{font-size:11.5px;color:#6B7280;}
    </style></head>
    <body>
      <div class="header">
        ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Estructuras Humanizadoras">` : ''}
        <h1>Estructuras Humanizadoras</h1>
      </div>
      <div class="sub">Presupuesto ${escapeHtml(p.numero || '')} — ${fmtDate(p.fecha)}</div>
      <div class="meta">
        <b>Cliente:</b> ${cliente ? escapeHtml(cliente.nombre) : '—'}<br>
        ${cliente?.nif ? `<b>NIF/CIF:</b> ${escapeHtml(cliente.nif)}<br>` : ''}
        ${direccionCliente(cliente) ? `<b>Dirección:</b> ${escapeHtml(direccionCliente(cliente))}<br>` : ''}
        ${cliente?.telefono ? `<b>Teléfono:</b> ${escapeHtml(cliente.telefono)}<br>` : ''}
        ${cliente?.email ? `<b>Email:</b> ${escapeHtml(cliente.email)}<br>` : ''}
        ${obra ? `<b>Obra:</b> ${escapeHtml(obra.nombre)}<br>` : ''}
        <b>Validez:</b> ${escapeHtml(p.validezDias || 30)} días
      </div>
      <table>
        <thead><tr><th>Concepto</th><th style="text-align:right">Cantidad</th><th style="text-align:right">Precio ud.</th><th style="text-align:right">Importe</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
      <div class="totales">
        <div class="fila">Base imponible: ${fmtMoney(base)}</div>
        <div class="fila">IVA (${ivaPct}%): ${fmtMoney(cuotaIva)}</div>
        <div class="total">Total: ${fmtMoney(total)}</div>
      </div>
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
  const [aceptandoId, setAceptandoId] = useState(null);
  const presupuestos = data.presupuestos.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  const marcarAceptado = async (p) => {
    setAceptandoId(p.id);
    try {
      const lineas = data.presupuestoLineas.filter((l) => l.presupuestoId === p.id);
      await actions.savePresupuesto({ ...p, lineas, estado: 'aceptado', fechaAceptacion: p.fechaAceptacion || todayISO() });
    } catch (err) {
      alert('No se pudo aceptar el presupuesto: ' + (err.message || err));
    } finally {
      setAceptandoId(null);
    }
  };

  const enviarPorCorreo = async (p, cliente) => {
    const destinatario = window.prompt('¿A qué email se envía el presupuesto?', cliente?.email || p.enviadoA || '');
    if (!destinatario) return;
    setSendingId(p.id);
    const { data: res, error } = await supabase.functions.invoke('send-presupuesto-email', {
      body: { presupuestoId: p.id, destinatario, origin: window.location.origin },
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
                  <td>
                    {estadoPill(p.estado)}
                    {p.estado === 'aceptado' && p.fechaAceptacion && (
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>Aceptado el {fmtDate(p.fechaAceptacion)}</div>
                    )}
                  </td>
                  <td>
                    {p.estado !== 'aceptado' && (
                      <>
                        <button className="btn ok small" disabled={aceptandoId === p.id} onClick={() => marcarAceptado(p)}>
                          {aceptandoId === p.id ? 'Aceptando…' : '✓ Aceptar'}
                        </button>{' '}
                      </>
                    )}
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
