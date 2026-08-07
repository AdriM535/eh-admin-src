import { useState } from 'react';
import { fmtMoney, fmtDate } from '../lib/utils.js';
import { computeAll } from '../lib/computations.js';
import FacturaCompraForm from './forms/FacturaCompraForm.jsx';

export default function OperarioPanel({ data, actions, docs, perfil, userEmail, onSignOut }) {
  const [modal, setModal] = useState(null);
  const calc = computeAll(data);
  const yo = perfil.personalId ? calc.personalById(perfil.personalId) : null;

  const entregasPendientes = calc.entregasConStats
    .filter((e) => e.stats.pendiente > 0)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  const misFacturas = data.facturasCompra.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 15);

  const wrap = (fn) => async (...args) => {
    await fn(...args);
    setModal(null);
  };

  return (
    <div className="app" style={{ display: 'block' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 60px' }}>
        <div className="pagehead">
          <div>
            <h1>Facturas y caja</h1>
            <div className="desc">{yo ? yo.nombre : userEmail}</div>
          </div>
          <button className="btn ghost small" onClick={onSignOut}>Cerrar sesión</button>
        </div>

        <button className="btn" style={{ width: '100%', padding: '16px', fontSize: 16, marginBottom: 24 }} onClick={() => setModal({ type: 'facturaCompra' })}>
          + Subir factura de compra
        </button>

        <div className="section-title">Entregas de caja pendientes de justificar</div>
        {entregasPendientes.length === 0 ? (
          <div className="empty">No hay entregas de efectivo pendientes de justificar.</div>
        ) : (
          <div className="tblwrap">
            <table>
              <thead><tr><th>Fecha</th><th>Persona</th><th>Concepto</th><th>Pendiente</th></tr></thead>
              <tbody>
                {entregasPendientes.map((e) => {
                  const p = calc.personalById(e.personalId);
                  return (
                    <tr key={e.id}>
                      <td>{fmtDate(e.fecha)}</td>
                      <td>{p ? p.nombre : '—'}</td>
                      <td>{e.concepto || '—'}</td>
                      <td className="num"><span className="pill ochre">{fmtMoney(e.stats.pendiente)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="desc" style={{ marginTop: -10, marginBottom: 20 }}>
          Para justificar una entrega, sube la factura de compra en efectivo y elige a qué entrega corresponde.
        </div>

        <div className="section-title">Tus últimas facturas subidas</div>
        {misFacturas.length === 0 ? (
          <div className="empty">Todavía no has subido ninguna factura.</div>
        ) : (
          <div className="tblwrap">
            <table>
              <thead><tr><th>Fecha</th><th>Comercio</th><th>Total</th><th>Método</th></tr></thead>
              <tbody>
                {misFacturas.map((f) => (
                  <tr key={f.id}>
                    <td>{fmtDate(f.fecha)}</td>
                    <td>{f.proveedor || '—'}</td>
                    <td className="num">{fmtMoney(f.total)}</td>
                    <td>{f.metodoPago || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal?.type === 'facturaCompra' && (
        <FacturaCompraForm
          obras={data.obras}
          personal={data.personal}
          facturaCompraLineas={data.facturaCompraLineas}
          entregasEfectivo={data.entregasEfectivo}
          docs={docs}
          onSave={wrap(actions.saveFacturaCompra)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
