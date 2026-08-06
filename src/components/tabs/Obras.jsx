import { Fragment, useMemo, useState } from 'react';
import { fmtMoney, fmtDate } from '../../lib/utils.js';
import { ESTADOS_OBRA } from '../../lib/constants.js';

export default function Obras({ data, actions, calc, setModal }) {
  const [estadoFilter, setEstadoFilter] = useState('todas');
  const [ciudadFilter, setCiudadFilter] = useState('todas');
  const [expanded, setExpanded] = useState(null);

  const ciudades = useMemo(
    () => Array.from(new Set(data.obras.map((o) => (o.ciudad || '').trim()).filter(Boolean))).sort(),
    [data.obras]
  );

  const obras = calc.obrasConStats
    .filter((o) => estadoFilter === 'todas' || o.estado === estadoFilter)
    .filter((o) => ciudadFilter === 'todas' || (o.ciudad || '').trim() === ciudadFilter)
    .slice()
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const estadoPill = (estado) => {
    const map = { presupuesto: 'ochre', activa: 'green', finalizada: 'steel', cancelada: 'brick' };
    return <span className={'pill ' + (map[estado] || '')}>{ESTADOS_OBRA.find((e) => e.id === estado)?.label || estado}</span>;
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Obras</h1>
          <div className="desc">Proyectos y servicios entregados a clientes</div>
        </div>
        <button className="btn" onClick={() => setModal({ type: 'obra' })}>+ Nueva obra</button>
      </div>
      <div className="toolbar">
        <div className="filters">
          <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)}>
            <option value="todas">Todos los estados</option>
            {ESTADOS_OBRA.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          <select value={ciudadFilter} onChange={(e) => setCiudadFilter(e.target.value)}>
            <option value="todas">Todas las ciudades</option>
            {ciudades.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="tblwrap">
        <table>
          <thead>
            <tr>
              <th>Obra</th><th>Cliente</th><th>Ciudad</th><th>Estado</th>
              <th>Facturado</th><th>Cobrado</th><th>Gastos</th><th>Margen</th><th></th>
            </tr>
          </thead>
          <tbody>
            {obras.length === 0 && <tr><td colSpan="9" className="empty">Sin obras registradas.</td></tr>}
            {obras.map((o) => {
              const cli = calc.clienteById(o.clienteId);
              const open = expanded === o.id;
              return (
                <Fragment key={o.id}>
                  <tr>
                    <td><b>{o.nombre}</b>{o.direccion && <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{o.direccion}</div>}</td>
                    <td>{cli ? cli.nombre : '—'}</td>
                    <td>{o.ciudad || '—'}</td>
                    <td>{estadoPill(o.estado)}</td>
                    <td className="num">{fmtMoney(o.stats.totalFacturado)}</td>
                    <td className="num">{fmtMoney(o.stats.totalCobrado)}</td>
                    <td className="num">{fmtMoney(o.stats.totalGastos)}</td>
                    <td className={'num ' + (o.stats.margen >= 0 ? 'pos' : 'neg')}>{fmtMoney(o.stats.margen)}</td>
                    <td>
                      <button className="btn ghost small" onClick={() => setExpanded(open ? null : o.id)}>{open ? 'Ocultar' : 'Detalle'}</button>{' '}
                      <button className="btn ghost small" onClick={() => setModal({ type: 'obra', initial: o })}>Editar</button>{' '}
                      <button className="btn danger small" onClick={() => actions.deleteObra(o.id)}>Eliminar</button>
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan="9" style={{ background: 'var(--line-soft)' }}>
                        <div style={{ padding: '8px 4px', fontSize: 12.5 }}>
                          {o.stats.pendienteCobro > 0 && <div style={{ marginBottom: 8 }}><span className="pill brick">Pendiente de cobro: {fmtMoney(o.stats.pendienteCobro)}</span></div>}

                          <b>Facturas de venta ({o.stats.ventas.length})</b>
                          {o.stats.ventas.length === 0 && <div className="empty">Ninguna</div>}
                          {o.stats.ventas.map((v) => (
                            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                              <span>{v.serie || ''}{v.numero || '(s/n)'} — {fmtDate(v.fechaExpedicion)}{v.enB && ' · B'}</span>
                              <span>{fmtMoney(v.total)}{!v.cobrado && ' (pdte.)'}</span>
                            </div>
                          ))}

                          <b style={{ display: 'block', marginTop: 8 }}>Facturas de compra ({o.stats.compras.length})</b>
                          {o.stats.compras.length === 0 && <div className="empty">Ninguna</div>}
                          {o.stats.compras.map((c) => (
                            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                              <span>{c.proveedor || 'Compra'} — {fmtDate(c.fecha)}</span>
                              <span>{fmtMoney(c.total)}</span>
                            </div>
                          ))}

                          {o.stats.abonosObra.length > 0 && (
                            <>
                              <b style={{ display: 'block', marginTop: 8 }}>Abonos ({o.stats.abonosObra.length})</b>
                              {o.stats.abonosObra.map((a) => (
                                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                                  <span>{a.concepto || (a.esAnticipo ? 'Anticipo' : 'Abono')} — {fmtDate(a.fecha)}{a.enB && ' · B'}</span>
                                  <span>{fmtMoney(a.importe)}</span>
                                </div>
                              ))}
                            </>
                          )}

                          {o.stats.incidenciasObra.length > 0 && (
                            <>
                              <b style={{ display: 'block', marginTop: 8 }}>Incidencias ({o.stats.incidenciasObra.length})</b>
                              {o.stats.incidenciasObra.map((i) => (
                                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                                  <span>{i.descripcion.slice(0, 40)}{i.asumidoEmpleado && ' (asume empleado)'}</span>
                                  <span>{fmtMoney(i.coste)}</span>
                                </div>
                              ))}
                            </>
                          )}
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
