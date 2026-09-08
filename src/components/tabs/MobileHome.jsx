import { fmtMoney, fmtDate } from '../../lib/utils.js';

// Inicio para el modo Móvil: prioriza lo que la dueña necesita ver de un
// vistazo desde el teléfono — nada de tablas con scroll horizontal, todo en
// tarjetas. Los datos son los mismos que en el resto de la app (mismo
// `calc`), solo cambia cómo se presentan; no se filtra nada por permisos
// aquí más allá de lo que ya decide App.jsx (este componente no se muestra
// al rol operativo, que tiene su propio panel).
export default function MobileHome({ data, calc, setTab, setModal }) {
  const incidenciasPendientes = data.incidencias
    .filter((i) => i.estado !== 'resuelto')
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  const facturasPendientesCobro = data.facturasVenta
    .filter((f) => !f.cobrado)
    .sort((a, b) => (a.fechaExpedicion || '').localeCompare(b.fechaExpedicion || ''));
  const obrasActivas = calc.obrasActivas.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const hayAtencion = incidenciasPendientes.length > 0 || facturasPendientesCobro.length > 0;

  return (
    <div className="mobilehome">
      <button className="mh-camera-btn" onClick={() => setModal({ type: 'facturaCompra' })}>
        📷 Fotografiar factura
      </button>

      <div className="mh-stats">
        <div className={'mh-stat' + (calc.pendienteCobroTotal > 0 ? ' warn' : '')}>
          <div className="mh-stat-lbl">Pendiente de cobrar</div>
          <div className="mh-stat-val">{fmtMoney(calc.pendienteCobroTotal)}</div>
        </div>
        <div className={'mh-stat' + (calc.pendientePagoTotal > 0 ? ' warn' : '')}>
          <div className="mh-stat-lbl">Pendiente de pagar</div>
          <div className="mh-stat-val">{fmtMoney(calc.pendientePagoTotal)}</div>
        </div>
      </div>

      {hayAtencion && (
        <>
          <div className="mh-section-title">Necesita tu atención</div>
          {incidenciasPendientes.slice(0, 5).map((i) => {
            const obra = calc.obraById(i.obraId);
            return (
              <div className="mh-card" key={'inc-' + i.id} onClick={() => setTab('incidencias')}>
                <div className="mh-card-top"><span className="pill brick">Incidencia pendiente</span><span className="mh-card-date">{fmtDate(i.fecha)}</span></div>
                <div className="mh-card-title">{(i.descripcion || 'Sin descripción').slice(0, 70)}</div>
                <div className="mh-card-sub">{obra ? obra.nombre : 'Sin obra asignada'}</div>
              </div>
            );
          })}
          {facturasPendientesCobro.slice(0, 5).map((f) => {
            const cliente = calc.clienteById(f.clienteId);
            return (
              <div className="mh-card" key={'fv-' + f.id} onClick={() => setTab('ventas')}>
                <div className="mh-card-top"><span className="pill ochre">Pendiente de cobro</span><span className="mh-card-date">{fmtDate(f.fechaExpedicion)}</span></div>
                <div className="mh-card-title">{fmtMoney(f.total)}</div>
                <div className="mh-card-sub">{cliente ? cliente.nombre : 'Sin cliente'}{f.numero ? ` · ${f.numero}` : ''}</div>
              </div>
            );
          })}
        </>
      )}

      <div className="mh-section-title">Obras activas <span className="count">{obrasActivas.length}</span></div>
      {obrasActivas.length === 0 && <div className="empty">Sin obras activas.</div>}
      {obrasActivas.map((o) => {
        const cliente = calc.clienteById(o.clienteId);
        const resp = calc.personalById(o.responsableId);
        return (
          <div className="mh-card" key={o.id} onClick={() => setTab('obras')}>
            <div className="mh-card-top"><span className="mh-card-code">{o.codigo || '—'}</span><span className="pill green">Activa</span></div>
            <div className="mh-card-title">{o.nombre}</div>
            <div className="mh-card-sub">{cliente ? cliente.nombre : 'Sin cliente'}{resp ? ` · ${resp.nombre}` : ''}</div>
            <div className="mh-card-row"><span>Facturado</span><b>{fmtMoney(o.stats.totalFacturado)}</b></div>
            <div className="mh-card-row"><span>Cobrado</span><b>{fmtMoney(o.stats.totalCobrado)}</b></div>
          </div>
        );
      })}

      <div className="desc" style={{ textAlign: 'center', marginTop: 18 }}>
        ¿Necesitas los gráficos y tablas completas? Cambia a modo Computadora desde el menú.
      </div>
    </div>
  );
}
