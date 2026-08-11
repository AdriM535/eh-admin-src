import { Fragment, useState } from 'react';
import { fmtMoney, fmtDate, trimestreDe } from '../../lib/utils.js';
import { CATEGORIAS_GENERALES } from '../../lib/constants.js';

export default function FacturasCompra({ data, actions, calc, setModal, docs }) {
  const [obraFilter, setObraFilter] = useState('todas');
  const [expanded, setExpanded] = useState(null);
  const [borrando, setBorrando] = useState(null); // { done, total } | null

  const facturas = data.facturasCompra
    .filter((f) => obraFilter === 'todas' || (obraFilter === 'general' ? !f.obraId : f.obraId === obraFilter))
    .slice()
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  const totalFiltrado = facturas.reduce((s, f) => s + Number(f.total || 0), 0);
  const facturasCero = facturas.filter((f) => !Number(f.total));

  const categoriaLabel = (id) => CATEGORIAS_GENERALES.find((c) => c.id === id)?.label || id;

  const borrarCero = async () => {
    setBorrando({ done: 0, total: facturasCero.length });
    try {
      await actions.deleteFacturasCompraBulk(facturasCero.map((f) => f.id), (done, total) => setBorrando({ done, total }));
    } catch (err) {
      alert('No se pudieron borrar todas: ' + (err.message || err));
    } finally {
      setBorrando(null);
    }
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Facturas de compra</h1>
          <div className="desc">Material, autónomos/subcontratas y otros insumos, por obra o generales</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {facturasCero.length > 0 && (
            <button className="btn danger" disabled={!!borrando} onClick={borrarCero}>
              {borrando ? `Borrando ${borrando.done}/${borrando.total}…` : `Eliminar ${facturasCero.length} con importe 0€`}
            </button>
          )}
          <button className="btn" onClick={() => setModal({ type: 'facturaCompra' })}>+ Nueva factura</button>
        </div>
      </div>
      <div className="ledger" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="cell warn"><div className="lbl">Gastos (filtro actual)</div><div className="val">{fmtMoney(totalFiltrado)}</div></div>
        <div className="cell"><div className="lbl">Pendiente de pago (total)</div><div className="val">{fmtMoney(calc.pendientePagoTotal)}</div></div>
      </div>
      <div className="toolbar">
        <div className="filters">
          <select value={obraFilter} onChange={(e) => setObraFilter(e.target.value)}>
            <option value="todas">Todas las obras</option>
            <option value="general">Solo insumos generales</option>
            {data.obras.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
      </div>
      <div className="tblwrap">
        <table>
          <thead><tr><th>Año</th><th>Trim.</th><th>Fecha</th><th>Obra / Categoría</th><th>Nº factura</th><th>Comercio</th><th>Total</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {facturas.length === 0 && <tr><td colSpan="9" className="empty">Sin facturas de compra registradas.</td></tr>}
            {facturas.map((f) => {
              const obra = calc.obraById(f.obraId);
              const lineas = data.facturaCompraLineas.filter((l) => l.facturaCompraId === f.id).sort((a, b) => a.orden - b.orden);
              const open = expanded === f.id;
              return (
                <Fragment key={f.id}>
                  <tr style={{ cursor: lineas.length > 0 ? 'pointer' : 'default' }} onClick={() => lineas.length > 0 && setExpanded(open ? null : f.id)}>
                    <td>{(f.fecha || '').slice(0, 4) || '—'}</td>
                    <td>{trimestreDe(f.fecha) ? `T${trimestreDe(f.fecha)}` : '—'}</td>
                    <td>{fmtDate(f.fecha)}</td>
                    <td>{obra ? obra.nombre : <span className="pill ochre">{categoriaLabel(f.categoriaGeneral)}</span>}</td>
                    <td>{f.numeroFactura || '—'}</td>
                    <td>{f.proveedor || '—'}</td>
                    <td className="num">{fmtMoney(f.total)}</td>
                    <td>
                      {f.pagado ? <span className="pill green">Pagada</span> : <span className="pill brick">Pendiente</span>}
                      {f.adjuntoPath && <button className="btn ghost small" style={{ marginLeft: 4 }} onClick={(e) => { e.stopPropagation(); docs.viewDocument(f.adjuntoPath); }}>📎</button>}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="btn ghost small" onClick={() => setModal({ type: 'facturaCompra', initial: f })}>Editar</button>{' '}
                      <button className="btn danger small" onClick={() => actions.deleteFacturaCompra(f.id)}>Eliminar</button>
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan="9" style={{ background: 'var(--line-soft)' }}>
                        <div style={{ padding: '6px 4px', fontSize: 12.5 }}>
                          {lineas.map((l) => (
                            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                              <span>{l.producto} — {l.cantidad} x {fmtMoney(l.precioUnitarioConIva)}</span>
                              <span>{fmtMoney(l.importe)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
