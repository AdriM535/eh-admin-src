import { fmtMoney, fmtDate } from '../../lib/utils.js';

export default function Incidencias({ data, actions, calc, setModal }) {
  const incidencias = data.incidencias.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const totalPendiente = incidencias.filter((i) => i.estado === 'pendiente').reduce((s, i) => s + Number(i.coste || 0), 0);
  const totalAsumidoEmpleados = incidencias.reduce((s, i) => s + (i.asumidoEmpleado ? Number(i.coste || 0) : 0), 0);

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Incidencias</h1>
          <div className="desc">Daños por no seguir protocolo (medidas, fotos, tiempos) y su coste</div>
        </div>
        <button className="btn" onClick={() => setModal({ type: 'incidencia' })}>+ Nueva incidencia</button>
      </div>
      <div className="ledger" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="cell warn"><div className="lbl">Coste pendiente de resolver</div><div className="val">{fmtMoney(totalPendiente)}</div></div>
        <div className="cell"><div className="lbl">Asumido por empleados</div><div className="val">{fmtMoney(totalAsumidoEmpleados)}</div></div>
      </div>
      <div className="tblwrap">
        <table>
          <thead><tr><th>Fecha</th><th>Obra</th><th>Responsable</th><th>Descripción</th><th>Coste</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {incidencias.length === 0 && <tr><td colSpan="7" className="empty">Sin incidencias registradas.</td></tr>}
            {incidencias.map((i) => {
              const obra = calc.obraById(i.obraId);
              const p = calc.personalById(i.personalId);
              return (
                <tr key={i.id}>
                  <td>{fmtDate(i.fecha)}</td>
                  <td>{obra ? obra.nombre : '—'}</td>
                  <td>{p ? p.nombre : '—'}</td>
                  <td>{i.descripcion}</td>
                  <td className="num">{fmtMoney(i.coste)}{i.asumidoEmpleado && <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 400 }}>asume empleado</div>}</td>
                  <td>{i.estado === 'resuelto' ? <span className="pill green">Resuelto</span> : <span className="pill brick">Pendiente</span>}</td>
                  <td>
                    <button className="btn ghost small" onClick={() => setModal({ type: 'incidencia', initial: i })}>Editar</button>{' '}
                    <button className="btn danger small" onClick={() => actions.deleteIncidencia(i.id)}>Eliminar</button>
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
