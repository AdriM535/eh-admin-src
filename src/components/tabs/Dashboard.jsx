import { useState } from 'react';
import { fmtMoney } from '../../lib/utils.js';
import { exportGestoriaMensual } from '../../lib/excelExport.js';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const pad2 = (n) => String(n).padStart(2, '0');

// % de variación de `curr` respecto a `prev`. `bueno` decide si subir es una
// buena noticia (ingresos/margen/obras) o una mala (gastos), para pintar el
// badge en verde o en rojo según corresponda.
function DeltaBadge({ curr, prev, bueno = true }) {
  if (!prev) return null;
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  if (!isFinite(pct) || Math.abs(pct) < 0.05) return <span className="pill" style={{ marginLeft: 6 }}>= vs año ant.</span>;
  const sube = pct > 0;
  const positivo = bueno ? sube : !sube;
  return (
    <span className={'pill ' + (positivo ? 'green' : 'brick')} style={{ marginLeft: 6 }}>
      {sube ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}% vs año ant.
    </span>
  );
}

export default function Dashboard({ data, calc, setTab }) {
  const {
    pendienteCobroTotal, pendientePagoTotal, totalEnB, obrasActivas,
    cajaSaldo, cajaPendienteJustificar, currentYear,
    gastosIndirectosSinAsignar,
  } = calc;

  const hoy = new Date();
  const [mMonth, setMMonth] = useState(hoy.getMonth() + 1);
  const [mYear, setMYear] = useState(hoy.getFullYear());
  const [aYear, setAYear] = useState(hoy.getFullYear());

  const ms = calc.statsForMonth(`${mYear}-${pad2(mMonth)}`);
  const ys = calc.statsForYear(aYear);
  const ysPrev = calc.statsForYear(aYear - 1);

  const anosDisponibles = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Panorama</h1>
          <div className="desc">Estado consolidado de la operación</div>
        </div>
      </div>

      {/* ---------------- GLOBAL / A HOY ---------------- */}
      <div className="ledger">
        <div className={'cell' + (pendienteCobroTotal > 0 ? ' warn' : '')}><div className="lbl">Pendiente de cobro</div><div className="val">{fmtMoney(pendienteCobroTotal)}</div></div>
        <div className={'cell' + (pendientePagoTotal > 0 ? ' warn' : '')}><div className="lbl">Pendiente de pago</div><div className="val">{fmtMoney(pendientePagoTotal)}</div></div>
        <div className="cell"><div className="lbl">Obras activas</div><div className="val">{obrasActivas.length}</div></div>
        <div className="cell"><div className="lbl">Cobrado en B (total)</div><div className="val">{fmtMoney(totalEnB)}</div></div>
      </div>
      <div className="ledger" style={{ marginTop: -18 }}>
        <div className={'cell' + (cajaSaldo < 0 ? ' warn' : ' ok')} style={{ cursor: 'pointer' }} onClick={() => setTab && setTab('caja')}><div className="lbl">Saldo de caja</div><div className="val">{fmtMoney(cajaSaldo)}</div></div>
        <div className={'cell' + (cajaPendienteJustificar > 0 ? ' warn' : '')} style={{ cursor: 'pointer' }} onClick={() => setTab && setTab('caja')}><div className="lbl">Pendiente de justificar</div><div className="val">{fmtMoney(cajaPendienteJustificar)}</div></div>
      </div>

      {/* ---------------- VISTA MENSUAL (interactiva) ---------------- */}
      <div className="pagehead" style={{ marginTop: 8 }}>
        <div className="section-title" style={{ margin: 0 }}>Vista mensual</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={mMonth} onChange={(e) => setMMonth(Number(e.target.value))}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={mYear} onChange={(e) => setMYear(Number(e.target.value))}>
            {anosDisponibles.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn ghost small" onClick={() => exportGestoriaMensual(data, calc, mYear, mMonth)}>⬇ Exportar mes para gestoría</button>
        </div>
      </div>
      <div className="ledger">
        <div className="cell ok"><div className="lbl">Facturado en {MESES[mMonth - 1]}</div><div className="val">{fmtMoney(ms.ingresos)}</div></div>
        <div className="cell warn"><div className="lbl">Gastos en {MESES[mMonth - 1]}</div><div className="val">{fmtMoney(ms.gastos)}</div></div>
        <div className="cell"><div className="lbl">Margen del mes</div><div className="val">{fmtMoney(ms.margen)}</div></div>
        <div className="cell" style={{ cursor: 'pointer' }} onClick={() => setTab && setTab('obras')}><div className="lbl">Obras nuevas este mes</div><div className="val">{ms.numObrasNuevas}</div></div>
      </div>

      <div className="section-title">Cobros y gastos de {MESES[mMonth - 1]} {mYear} por método</div>
      <div className="grid2">
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Cobros (ventas) — {ms.ventasMes.length} factura(s)</div>
          {Object.keys(ms.cobrosPorMetodo).length === 0 && <div className="empty">Sin cobros este mes.</div>}
          {Object.entries(ms.cobrosPorMetodo).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}><span>{k}</span><b>{fmtMoney(v)}</b></div>
          ))}
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Gastos (compras) — {ms.comprasMes.length} factura(s)</div>
          {Object.keys(ms.gastosPorMetodo).length === 0 && <div className="empty">Sin gastos este mes.</div>}
          {Object.entries(ms.gastosPorMetodo).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}><span>{k}</span><b>{fmtMoney(v)}</b></div>
          ))}
        </div>
      </div>

      {/* ---------------- VISTA ANUAL (acumulado + comparador) ---------------- */}
      <div className="pagehead" style={{ marginTop: 8 }}>
        <div className="section-title" style={{ margin: 0 }}>Vista anual (acumulado)</div>
        <select value={aYear} onChange={(e) => setAYear(Number(e.target.value))}>
          {anosDisponibles.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="ledger">
        <div className="cell ok">
          <div className="lbl">Facturado en {aYear}</div>
          <div className="val">{fmtMoney(ys.ingresos)}</div>
          <DeltaBadge curr={ys.ingresos} prev={ysPrev.ingresos} bueno={true} />
        </div>
        <div className="cell warn">
          <div className="lbl">Gastos en {aYear}</div>
          <div className="val">{fmtMoney(ys.gastos)}</div>
          <DeltaBadge curr={ys.gastos} prev={ysPrev.gastos} bueno={false} />
        </div>
        <div className="cell">
          <div className="lbl">Margen acumulado</div>
          <div className="val">{fmtMoney(ys.margen)}</div>
          <DeltaBadge curr={ys.margen} prev={ysPrev.margen} bueno={true} />
        </div>
        <div className="cell" style={{ cursor: 'pointer' }} onClick={() => setTab && setTab('obras')}>
          <div className="lbl">Obras nuevas en {aYear}</div>
          <div className="val">{ys.obrasNuevas}</div>
          <DeltaBadge curr={ys.obrasNuevas} prev={ysPrev.obrasNuevas} bueno={true} />
        </div>
      </div>
      <div className="ledger" style={{ marginTop: -18 }}>
        <div className="cell" title="Papelería, impuestos y personal administrativo: ya repartido entre las obras que tuvieron movimiento cada mes">
          <div className="lbl">Gasto indirecto prorrateado en {aYear}</div>
          <div className="val">{fmtMoney(ys.gastosIndirectos)}</div>
        </div>
        {gastosIndirectosSinAsignar > 0 && (
          <div className="cell warn" style={{ gridColumn: 'span 3' }} title="Meses con gasto indirecto (papelería, impuestos, personal admin. y nóminas) en los que ninguna obra tuvo movimiento, así que no se pudo repartir">
            <div className="lbl">Gasto indirecto sin asignar (histórico)</div>
            <div className="val">{fmtMoney(gastosIndirectosSinAsignar)}</div>
          </div>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '18px 18px 8px' }}>
        <div style={{ display: 'flex', gap: 14, fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 16, flexWrap: 'wrap' }}>
          <span><b style={{ color: 'var(--accent)' }}>■</b> Facturado {aYear}: {fmtMoney(ys.ingresos)}</span>
          <span><b style={{ color: 'var(--steel)' }}>■</b> Gastos {aYear}: {fmtMoney(ys.gastos)}</span>
          <span>Margen: <b>{fmtMoney(ys.margen)}</b></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, overflowX: 'auto' }}>
          {ys.meses.map((m) => (
            <div
              key={m.ym}
              style={{ flex: 1, minWidth: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', cursor: 'pointer' }}
              onClick={() => { setMMonth(ys.meses.indexOf(m) + 1); setMYear(aYear); }}
              title="Ver este mes en la vista mensual"
            >
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 110 }}>
                <div title={`Facturado ${m.label}: ${fmtMoney(m.ingresos)}`} style={{ width: 9, borderRadius: '2px 2px 0 0', background: 'var(--accent)', height: `${Math.max(2, (m.ingresos / ys.max) * 100)}%` }}></div>
                <div title={`Gastos ${m.label}: ${fmtMoney(m.gastos)}`} style={{ width: 9, borderRadius: '2px 2px 0 0', background: 'var(--steel)', height: `${Math.max(2, (m.gastos / ys.max) * 100)}%` }}></div>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-soft)', marginTop: 6, fontWeight: 600 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">Obras activas <span className="count">{obrasActivas.length}</span></div>
      {obrasActivas.length === 0 ? (
        <div className="empty">Todavía no hay obras activas. Ve a la pestaña "Obras" para dar de alta la primera.</div>
      ) : (
        <div className="tblwrap">
          <table>
            <thead><tr><th>Código</th><th>Obra</th><th>Cliente</th><th>Facturado</th><th>Cobrado</th><th>Gastos</th><th>Margen real</th></tr></thead>
            <tbody>
              {obrasActivas.map((o) => {
                const cli = calc.clienteById(o.clienteId);
                return (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setTab && setTab('obras')}>
                    <td>{o.codigo || '—'}</td>
                    <td>{o.nombre}</td>
                    <td>{cli ? cli.nombre : '—'}</td>
                    <td className="num">{fmtMoney(o.stats.totalFacturado)}</td>
                    <td className="num">{fmtMoney(o.stats.totalCobrado)}</td>
                    <td className="num">{fmtMoney(o.stats.totalGastos + o.stats.costeIndirecto)}</td>
                    <td className={'num ' + (o.stats.margenReal >= 0 ? 'pos' : 'neg')} title={`Margen directo (sin indirecto): ${fmtMoney(o.stats.margen)}`}>{fmtMoney(o.stats.margenReal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
