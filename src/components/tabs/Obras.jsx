import { Fragment, useMemo, useState } from 'react';
import { fmtMoney, fmtDate } from '../../lib/utils.js';
import { ESTADOS_OBRA } from '../../lib/constants.js';

export default function Obras({ data, actions, calc, setModal, docs }) {
  const [estadoFilter, setEstadoFilter] = useState('todas');
  const [ciudadFilter, setCiudadFilter] = useState('todas');
  const [expanded, setExpanded] = useState(null);
  const [borrando, setBorrando] = useState(null); // { done, total } | null

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

  const borrarTodas = async () => {
    setBorrando({ done: 0, total: obras.length });
    try {
      await actions.deleteObrasBulk(obras.map((o) => o.id), (done, total) => setBorrando({ done, total }));
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
          <h1>Obras</h1>
          <div className="desc">Proyectos y servicios entregados a clientes</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {obras.length > 0 && (
            <button className="btn danger" disabled={!!borrando} onClick={borrarTodas}>
              {borrando ? `Borrando ${borrando.done}/${borrando.total}…` : `Eliminar ${obras.length}${estadoFilter !== 'todas' || ciudadFilter !== 'todas' ? ' (filtro)' : ' todas'}`}
            </button>
          )}
          <button className="btn" onClick={() => setModal({ type: 'obra' })}>+ Nueva obra</button>
        </div>
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
              <th>Código</th><th>Obra</th><th>Cliente</th><th>Ciudad</th><th>Responsable</th><th>Estado</th>
              <th>Facturado</th><th>Cobrado</th><th>Gastos</th><th>Indirecto</th><th>Margen real</th><th></th>
            </tr>
          </thead>
          <tbody>
            {obras.length === 0 && <tr><td colSpan="12" className="empty">Sin obras registradas.</td></tr>}
            {obras.map((o) => {
              const cli = calc.clienteById(o.clienteId);
              const resp = calc.personalById(o.responsableId);
              const open = expanded === o.id;
              const evidencias = data.obraEvidencias.filter((ev) => ev.obraId === o.id);
              return (
                <Fragment key={o.id}>
                  <tr>
                    <td>{o.codigo || '—'}</td>
                    <td><b>{o.nombre}</b>{o.direccion && <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{o.direccion}</div>}</td>
                    <td>{cli ? cli.nombre : '—'}</td>
                    <td>{o.ciudad || '—'}</td>
                    <td>{resp ? resp.nombre : '—'}</td>
                    <td>{estadoPill(o.estado)}</td>
                    <td className="num">{fmtMoney(o.stats.totalFacturado)}</td>
                    <td className="num">{fmtMoney(o.stats.totalCobrado)}</td>
                    <td className="num">{fmtMoney(o.stats.totalGastos)}</td>
                    <td className="num" title="Parte de los gastos de operación (papelería, impuestos, personal admin.) que le corresponde a esta obra">{fmtMoney(o.stats.costeIndirecto)}</td>
                    <td className={'num ' + (o.stats.margenReal >= 0 ? 'pos' : 'neg')} title={`Margen directo (sin indirecto): ${fmtMoney(o.stats.margen)}`}>{fmtMoney(o.stats.margenReal)}</td>
                    <td>
                      <button className="btn ghost small" onClick={() => setExpanded(open ? null : o.id)}>{open ? 'Ocultar' : 'Detalle'}</button>{' '}
                      <button className="btn ghost small" onClick={() => setModal({ type: 'obra', initial: o })}>Editar</button>{' '}
                      <button className="btn danger small" onClick={() => actions.deleteObra(o.id)}>Eliminar</button>
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan="12" style={{ background: 'var(--line-soft)' }}>
                        <div style={{ padding: '8px 4px', fontSize: 12.5 }}>
                          {o.stats.pendienteCobro > 0 && <div style={{ marginBottom: 8 }}><span className="pill brick">Pendiente de cobro: {fmtMoney(o.stats.pendienteCobro)}</span></div>}

                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontWeight: 600 }}>
                            <span>Margen directo (facturado − gasto directo)</span>
                            <span>{fmtMoney(o.stats.margen)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                            <span>− Gasto indirecto prorrateado (papelería, impuestos, personal admin.)</span>
                            <span>{fmtMoney(o.stats.costeIndirecto)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0 8px', fontWeight: 700, borderTop: '1px solid var(--line)' }}>
                            <span>= Margen real</span>
                            <span>{fmtMoney(o.stats.margenReal)}</span>
                          </div>

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

                          {evidencias.length > 0 && (
                            <>
                              <b style={{ display: 'block', marginTop: 8 }}>Fotos de evidencia ({evidencias.length})</b>
                              {evidencias.map((ev) => (
                                <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                                  <span>{ev.nombreArchivo || 'Foto'} — {fmtDate((ev.createdAt || '').slice(0, 10))}</span>
                                  {docs && <button className="btn ghost small" onClick={() => docs.viewDocument(ev.storagePath)}>Ver</button>}
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
