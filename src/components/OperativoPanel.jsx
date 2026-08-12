import { Fragment, useState } from 'react';
import { fmtMoney, fmtDate } from '../lib/utils.js';
import { computeAll } from '../lib/computations.js';
import { ESTADOS_OBRA } from '../lib/constants.js';
import FacturaCompraForm from './forms/FacturaCompraForm.jsx';
import IncidenciaForm from './forms/IncidenciaForm.jsx';

const SUBTABS = [
  { id: 'facturas', label: 'Facturas' },
  { id: 'obras', label: 'Obras' },
  { id: 'incidencias', label: 'Incidencias' },
  { id: 'caja', label: 'Caja' },
];

export default function OperativoPanel({ data, actions, docs, perfil, userEmail, onSignOut }) {
  const [subtab, setSubtab] = useState('facturas');
  const [modal, setModal] = useState(null);
  const calc = computeAll(data);
  const yo = perfil.personalId ? calc.personalById(perfil.personalId) : null;

  const wrap = (fn) => async (...args) => {
    await fn(...args);
    setModal(null);
  };

  return (
    <div className="app" style={{ display: 'block' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 60px' }}>
        <div className="pagehead">
          <div>
            <h1>Estructuras Humanizadoras</h1>
            <div className="desc">{yo ? yo.nombre : userEmail}</div>
          </div>
          <button className="btn ghost small" onClick={onSignOut}>Cerrar sesión</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {SUBTABS.map((t) => (
            <button key={t.id} className={'btn small' + (subtab === t.id ? '' : ' ghost')} onClick={() => setSubtab(t.id)}>{t.label}</button>
          ))}
        </div>

        {subtab === 'facturas' && <FacturasSub data={data} calc={calc} setModal={setModal} />}
        {subtab === 'obras' && <ObrasSub data={data} calc={calc} actions={actions} docs={docs} />}
        {subtab === 'incidencias' && <IncidenciasSub data={data} calc={calc} actions={actions} perfil={perfil} setModal={setModal} />}
        {subtab === 'caja' && <CajaSub calc={calc} />}
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
      {modal?.type === 'incidencia' && (
        <IncidenciaForm obras={data.obras} personal={data.personal} onSave={wrap(actions.saveIncidencia)} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function FacturasSub({ data, calc, setModal }) {
  const entregasPendientes = calc.entregasConStats
    .filter((e) => e.stats.pendiente > 0)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const misFacturas = data.facturasCompra.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 15);

  return (
    <>
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
    </>
  );
}

// Fotos de evidencia y cambio de estado de una obra. Para marcar una obra
// como "finalizada" hacen falta al menos 3 fotos — lo exige también la RLS
// en la base de datos, esto solo evita el viaje de ida y vuelta con error.
function ObrasSub({ data, calc, actions, docs }) {
  const [expanded, setExpanded] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);

  const obras = data.obras.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const handleFotos = async (obraId, files) => {
    setUploadingId(obraId);
    for (const file of Array.from(files)) {
      const res = await docs.uploadDocument(file, `obra-evidencia/${obraId}`);
      if (res) await actions.addObraEvidencia(obraId, res);
    }
    setUploadingId(null);
  };

  const cambiarEstado = async (obra, estado) => {
    const count = data.obraEvidencias.filter((e) => e.obraId === obra.id).length;
    if (estado === 'finalizada' && count < 3) {
      alert(`Necesitas al menos 3 fotos de evidencia para marcar esta obra como terminada (tienes ${count}).`);
      return;
    }
    setSavingId(obra.id);
    try {
      await actions.saveObra({ id: obra.id, estado });
    } catch (err) {
      alert('No se pudo cambiar el estado: ' + (err.message || err));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <div className="section-title">Obras <span className="count">{obras.length}</span></div>
      {obras.length === 0 ? (
        <div className="empty">Sin obras registradas.</div>
      ) : (
        <div className="tblwrap">
          <table>
            <thead><tr><th>Código</th><th>Obra</th><th>Estado</th><th>Fotos</th><th></th></tr></thead>
            <tbody>
              {obras.map((o) => {
                const cli = calc.clienteById(o.clienteId);
                const evidencias = data.obraEvidencias.filter((e) => e.obraId === o.id);
                const open = expanded === o.id;
                return (
                  <Fragment key={o.id}>
                    <tr>
                      <td>{o.codigo || '—'}</td>
                      <td><b>{o.nombre}</b>{cli && <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{cli.nombre}</div>}</td>
                      <td>{ESTADOS_OBRA.find((e) => e.id === o.estado)?.label || o.estado}</td>
                      <td>{evidencias.length}</td>
                      <td><button className="btn ghost small" onClick={() => setExpanded(open ? null : o.id)}>{open ? 'Ocultar' : 'Gestionar'}</button></td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan="5" style={{ background: 'var(--line-soft)' }}>
                          <div style={{ padding: '10px 4px', fontSize: 12.5 }}>
                            <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                              Fotos de evidencia ({evidencias.length}/3 mínimo para marcar como terminada)
                            </label>
                            {evidencias.map((ev) => (
                              <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                <span>{ev.nombreArchivo || 'Foto'}</span>
                                <button className="btn ghost small" onClick={() => docs.viewDocument(ev.storagePath)}>Ver</button>
                              </div>
                            ))}
                            <div style={{ margin: '8px 0 14px' }}>
                              <input
                                type="file" accept="image/*" capture="environment" multiple
                                disabled={uploadingId === o.id}
                                onChange={(e) => { if (e.target.files.length) handleFotos(o.id, e.target.files); e.target.value = ''; }}
                              />
                              {uploadingId === o.id && <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Subiendo…</div>}
                            </div>
                            <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Cambiar estado</label>
                            <select value={o.estado} disabled={savingId === o.id} onChange={(e) => cambiarEstado(o, e.target.value)}>
                              {ESTADOS_OBRA.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                            </select>
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
      )}
    </>
  );
}

function IncidenciasSub({ data, calc, actions, perfil, setModal }) {
  const incidencias = data.incidencias.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  return (
    <>
      <div className="pagehead" style={{ marginBottom: 12 }}>
        <div className="section-title" style={{ margin: 0 }}>Incidencias</div>
        <button className="btn small" onClick={() => setModal({ type: 'incidencia' })}>+ Nueva incidencia</button>
      </div>
      {incidencias.length === 0 ? (
        <div className="empty">Sin incidencias registradas.</div>
      ) : (
        <div className="tblwrap">
          <table>
            <thead><tr><th>Fecha</th><th>Obra</th><th>Descripción</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {incidencias.map((i) => {
                const obra = calc.obraById(i.obraId);
                const mia = i.createdBy === perfil.id;
                return (
                  <tr key={i.id}>
                    <td>{fmtDate(i.fecha)}</td>
                    <td>{obra ? obra.nombre : '—'}</td>
                    <td>{i.descripcion}</td>
                    <td>{i.estado === 'resuelto' ? <span className="pill green">Resuelto</span> : <span className="pill brick">Pendiente</span>}</td>
                    <td>
                      {mia && <button className="btn ghost small" onClick={() => setModal({ type: 'incidencia', initial: i })}>Editar</button>}{' '}
                      {mia && <button className="btn danger small" onClick={() => actions.deleteIncidencia(i.id)}>Eliminar</button>}
                    </td>
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

function CajaSub({ calc }) {
  const entregas = calc.entregasConStats.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  return (
    <>
      <div className="section-title">Caja — entregas de efectivo</div>
      <div className="ledger" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className={'cell' + (calc.cajaSaldo < 0 ? ' warn' : ' ok')}><div className="lbl">Saldo de caja</div><div className="val">{fmtMoney(calc.cajaSaldo)}</div></div>
        <div className={'cell' + (calc.cajaPendienteJustificar > 0 ? ' warn' : '')}><div className="lbl">Pendiente de justificar</div><div className="val">{fmtMoney(calc.cajaPendienteJustificar)}</div></div>
      </div>
      {entregas.length === 0 ? (
        <div className="empty">Sin entregas registradas.</div>
      ) : (
        <div className="tblwrap">
          <table>
            <thead><tr><th>Fecha</th><th>Persona</th><th>Concepto</th><th>Entregado</th><th>Estatus</th></tr></thead>
            <tbody>
              {entregas.map((e) => {
                const p = calc.personalById(e.personalId);
                return (
                  <tr key={e.id}>
                    <td>{fmtDate(e.fecha)}</td>
                    <td>{p ? p.nombre : '—'}</td>
                    <td>{e.concepto || '—'}</td>
                    <td className="num">{fmtMoney(e.importe)}</td>
                    <td>{e.stats.pendiente > 0 ? <span className="pill ochre">Pendiente {fmtMoney(e.stats.pendiente)}</span> : <span className="pill green">Justificado</span>}</td>
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
