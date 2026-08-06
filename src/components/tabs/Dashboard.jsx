import { useState } from 'react';
import { fmtMoney } from '../../lib/utils.js';

export default function Dashboard({ calc, setTab }) {
  const [alertsOpen, setAlertsOpen] = useState(true);
  const {
    ingresosMes, gastosMes, margenMes, pendienteCobroTotal, pendientePagoTotal,
    cobrosMesPorMetodo, gastosMesPorMetodo, totalEnB, alerts, obrasActivas,
    panoramaAnual, anualIngresos, anualGastos, anualMax, currentYear,
  } = calc;

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Panorama</h1>
          <div className="desc">Estado consolidado — {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      <div className="ledger">
        <div className="cell ok"><div className="lbl">Facturado este mes</div><div className="val">{fmtMoney(ingresosMes)}</div></div>
        <div className="cell warn"><div className="lbl">Gastos este mes</div><div className="val">{fmtMoney(gastosMes)}</div></div>
        <div className="cell"><div className="lbl">Margen del mes</div><div className="val">{fmtMoney(margenMes)}</div></div>
        <div className={'cell' + (pendienteCobroTotal > 0 ? ' warn' : '')}><div className="lbl">Pendiente de cobro</div><div className="val">{fmtMoney(pendienteCobroTotal)}</div></div>
      </div>
      <div className="ledger" style={{ marginTop: -18 }}>
        <div className={'cell' + (pendientePagoTotal > 0 ? ' warn' : '')}><div className="lbl">Pendiente de pago</div><div className="val">{fmtMoney(pendientePagoTotal)}</div></div>
        <div className="cell"><div className="lbl">Obras activas</div><div className="val">{obrasActivas.length}</div></div>
        <div className="cell"><div className="lbl">Cobrado en B (total)</div><div className="val">{fmtMoney(totalEnB)}</div></div>
        <div className="cell"><div className="lbl">Año</div><div className="val">{currentYear}</div></div>
      </div>

      <div className="section-title" style={{ cursor: 'pointer' }} onClick={() => setAlertsOpen((o) => !o)}>
        {alertsOpen ? '▾' : '▸'} Alertas activas <span className="count">{alerts.length}</span>
        {!alertsOpen && alerts.some((a) => a.crit) && <span className="pill brick">urgentes</span>}
      </div>
      {alertsOpen && (
        <div className="alertlist">
          {alerts.length === 0 && <div className="empty">Sin alertas pendientes por ahora.</div>}
          {alerts.map((a, i) => (
            <div key={i} className={'alertrow' + (a.crit ? ' crit' : '')}>
              <span className="tag">{a.tag}</span>{a.txt}
            </div>
          ))}
        </div>
      )}

      <div className="section-title">Panorama anual {currentYear}</div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '18px 18px 8px' }}>
        <div style={{ display: 'flex', gap: 14, fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 16, flexWrap: 'wrap' }}>
          <span><b style={{ color: 'var(--accent-dark)' }}>■</b> Facturado: {fmtMoney(anualIngresos)}</span>
          <span><b style={{ color: 'var(--brick)' }}>■</b> Gastos: {fmtMoney(anualGastos)}</span>
          <span>Margen anual: <b>{fmtMoney(anualIngresos - anualGastos)}</b></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, overflowX: 'auto' }}>
          {panoramaAnual.map((m) => (
            <div key={m.mk} style={{ flex: 1, minWidth: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 110 }}>
                <div title={`Facturado ${m.label}: ${fmtMoney(m.ingresos)}`} style={{ width: 9, borderRadius: '2px 2px 0 0', background: 'var(--accent)', height: `${Math.max(2, (m.ingresos / anualMax) * 100)}%` }}></div>
                <div title={`Gastos ${m.label}: ${fmtMoney(m.gastos)}`} style={{ width: 9, borderRadius: '2px 2px 0 0', background: 'var(--brick)', height: `${Math.max(2, (m.gastos / anualMax) * 100)}%` }}></div>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-soft)', marginTop: 6, fontWeight: 600 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">Cobros y gastos del mes por método</div>
      <div className="grid2">
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Cobros (ventas)</div>
          {Object.keys(cobrosMesPorMetodo).length === 0 && <div className="empty">Sin cobros este mes.</div>}
          {Object.entries(cobrosMesPorMetodo).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}><span>{k}</span><b>{fmtMoney(v)}</b></div>
          ))}
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Gastos (compras)</div>
          {Object.keys(gastosMesPorMetodo).length === 0 && <div className="empty">Sin gastos este mes.</div>}
          {Object.entries(gastosMesPorMetodo).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}><span>{k}</span><b>{fmtMoney(v)}</b></div>
          ))}
        </div>
      </div>

      <div className="section-title">Obras activas <span className="count">{obrasActivas.length}</span></div>
      {obrasActivas.length === 0 ? (
        <div className="empty">Todavía no hay obras activas. Ve a la pestaña "Obras" para dar de alta la primera.</div>
      ) : (
        <div className="tblwrap">
          <table>
            <thead><tr><th>Obra</th><th>Cliente</th><th>Facturado</th><th>Cobrado</th><th>Gastos</th><th>Margen</th></tr></thead>
            <tbody>
              {obrasActivas.map((o) => {
                const cli = calc.clienteById(o.clienteId);
                return (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setTab && setTab('obras')}>
                    <td>{o.nombre}</td>
                    <td>{cli ? cli.nombre : '—'}</td>
                    <td className="num">{fmtMoney(o.stats.totalFacturado)}</td>
                    <td className="num">{fmtMoney(o.stats.totalCobrado)}</td>
                    <td className="num">{fmtMoney(o.stats.totalGastos)}</td>
                    <td className={'num ' + (o.stats.margen >= 0 ? 'pos' : 'neg')}>{fmtMoney(o.stats.margen)}</td>
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
