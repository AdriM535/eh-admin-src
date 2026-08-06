import { useState } from 'react';
import { fmtMoney, fmtDate } from '../../lib/utils.js';

export default function FacturasVenta({ data, actions, calc, setModal, docs }) {
  const [obraFilter, setObraFilter] = useState('todas');
  const [cobradoFilter, setCobradoFilter] = useState('todas');

  const facturas = data.facturasVenta
    .filter((f) => obraFilter === 'todas' || f.obraId === obraFilter)
    .filter((f) => cobradoFilter === 'todas' || (cobradoFilter === 'cobradas' ? f.cobrado : !f.cobrado))
    .slice()
    .sort((a, b) => (b.fechaExpedicion || '').localeCompare(a.fechaExpedicion || ''));

  const totalFiltrado = facturas.reduce((s, f) => s + Number(f.total || 0), 0);

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Facturas de venta</h1>
          <div className="desc">Ingresos facturados a clientes por obra</div>
        </div>
        <button className="btn" onClick={() => setModal({ type: 'facturaVenta' })}>+ Nueva factura</button>
      </div>
      <div className="ledger" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="cell"><div className="lbl">Facturado (filtro actual)</div><div className="val">{fmtMoney(totalFiltrado)}</div></div>
        <div className="cell warn"><div className="lbl">Pendiente de cobro (total)</div><div className="val">{fmtMoney(calc.pendienteCobroTotal)}</div></div>
        <div className="cell"><div className="lbl">Cobrado en B (total)</div><div className="val">{fmtMoney(calc.totalEnB)}</div></div>
      </div>
      <div className="toolbar">
        <div className="filters">
          <select value={obraFilter} onChange={(e) => setObraFilter(e.target.value)}>
            <option value="todas">Todas las obras</option>
            {data.obras.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
          <select value={cobradoFilter} onChange={(e) => setCobradoFilter(e.target.value)}>
            <option value="todas">Cobradas y pendientes</option>
            <option value="cobradas">Solo cobradas</option>
            <option value="pendientes">Solo pendientes</option>
          </select>
        </div>
      </div>
      <div className="tblwrap">
        <table>
          <thead><tr><th>Fecha</th><th>Nº</th><th>Obra</th><th>Cliente</th><th>Total</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {facturas.length === 0 && <tr><td colSpan="7" className="empty">Sin facturas de venta registradas.</td></tr>}
            {facturas.map((f) => {
              const obra = calc.obraById(f.obraId);
              const cliente = calc.clienteById(f.clienteId);
              return (
                <tr key={f.id}>
                  <td>{fmtDate(f.fechaExpedicion)}</td>
                  <td>{f.serie || ''}{f.numero || '—'}</td>
                  <td>{obra ? obra.nombre : '—'}</td>
                  <td>{cliente ? cliente.nombre : '—'}</td>
                  <td className="num">{fmtMoney(f.total)}</td>
                  <td>
                    {f.cobrado ? <span className="pill green">Cobrada</span> : <span className="pill brick">Pendiente</span>}
                    {f.enB && <span className="pill ochre">B</span>}
                    {f.adjuntoPath && <button className="btn ghost small" style={{ marginLeft: 4 }} onClick={() => docs.viewDocument(f.adjuntoPath)}>📎</button>}
                  </td>
                  <td>
                    <button className="btn ghost small" onClick={() => setModal({ type: 'facturaVenta', initial: f })}>Editar</button>{' '}
                    <button className="btn danger small" onClick={() => actions.deleteFacturaVenta(f.id)}>Eliminar</button>
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
