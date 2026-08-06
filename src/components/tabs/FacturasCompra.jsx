import { useState } from 'react';
import { fmtMoney, fmtDate } from '../../lib/utils.js';
import { TIPOS_GASTO } from '../../lib/constants.js';

export default function FacturasCompra({ data, actions, calc, setModal, docs }) {
  const [obraFilter, setObraFilter] = useState('todas');
  const [tipoFilter, setTipoFilter] = useState('todos');

  const facturas = data.facturasCompra
    .filter((f) => obraFilter === 'todas' || f.obraId === obraFilter)
    .filter((f) => tipoFilter === 'todos' || f.tipoGasto === tipoFilter)
    .slice()
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  const totalFiltrado = facturas.reduce((s, f) => s + Number(f.total || 0), 0);

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Facturas de compra</h1>
          <div className="desc">Material, autónomos/subcontratas, vehículo y otros gastos</div>
        </div>
        <button className="btn" onClick={() => setModal({ type: 'facturaCompra' })}>+ Nueva factura</button>
      </div>
      <div className="ledger" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="cell warn"><div className="lbl">Gastos (filtro actual)</div><div className="val">{fmtMoney(totalFiltrado)}</div></div>
        <div className="cell"><div className="lbl">Pendiente de pago (total)</div><div className="val">{fmtMoney(calc.pendientePagoTotal)}</div></div>
      </div>
      <div className="toolbar">
        <div className="filters">
          <select value={obraFilter} onChange={(e) => setObraFilter(e.target.value)}>
            <option value="todas">Todas las obras</option>
            {data.obras.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
          <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}>
            <option value="todos">Todos los tipos</option>
            {TIPOS_GASTO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div className="tblwrap">
        <table>
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Obra</th><th>Proveedor / concepto</th><th>Total</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {facturas.length === 0 && <tr><td colSpan="7" className="empty">Sin facturas de compra registradas.</td></tr>}
            {facturas.map((f) => {
              const obra = calc.obraById(f.obraId);
              return (
                <tr key={f.id}>
                  <td>{fmtDate(f.fecha)}</td>
                  <td>{TIPOS_GASTO.find((t) => t.id === f.tipoGasto)?.label || f.tipoGasto}</td>
                  <td>{obra ? obra.nombre : '—'}</td>
                  <td>{f.proveedor || '—'}{f.concepto && <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{f.concepto}</div>}</td>
                  <td className="num">{fmtMoney(f.total)}</td>
                  <td>
                    {f.pagado ? <span className="pill green">Pagada</span> : <span className="pill brick">Pendiente</span>}
                    {f.adjuntoPath && <button className="btn ghost small" style={{ marginLeft: 4 }} onClick={() => docs.viewDocument(f.adjuntoPath)}>📎</button>}
                  </td>
                  <td>
                    <button className="btn ghost small" onClick={() => setModal({ type: 'facturaCompra', initial: f })}>Editar</button>{' '}
                    <button className="btn danger small" onClick={() => actions.deleteFacturaCompra(f.id)}>Eliminar</button>
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
