import { TIPOS_PERSONAL, ESPECIALIDADES } from '../../lib/constants.js';

export default function Personal({ data, actions, setModal, setTab }) {
  const personal = data.personal.slice().sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Personal</h1>
          <div className="desc">Empleados directos y autónomos/especialistas externos que trabajan para Estructuras Humanizadoras</div>
        </div>
        <button className="btn" onClick={() => setModal({ type: 'personal' })}>+ Nueva persona</button>
      </div>
      <div className="tblwrap">
        <table>
          <thead><tr><th>Nombre</th><th>Tipo</th><th>Especialidad</th><th>Teléfono</th><th>Email</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {personal.length === 0 && <tr><td colSpan="7" className="empty">Sin personal registrado.</td></tr>}
            {personal.map((p) => (
              <tr key={p.id}>
                <td><b>{p.nombre}</b></td>
                <td>{TIPOS_PERSONAL.find((t) => t.id === p.tipo)?.label || p.tipo}</td>
                <td>{p.tipo === 'autonomo' ? (ESPECIALIDADES.find((e) => e.id === p.especialidad)?.label || '—') : '—'}</td>
                <td>{p.telefono || '—'}</td>
                <td>{p.email || '—'}</td>
                <td>{p.activo ? <span className="pill green">Activo</span> : <span className="pill">Inactivo</span>}</td>
                <td>
                  {p.tipo === 'empleado' && <button className="btn ghost small" onClick={() => setTab && setTab('nominas')}>Nóminas</button>}{' '}
                  <button className="btn ghost small" onClick={() => setModal({ type: 'personal', initial: p })}>Editar</button>{' '}
                  <button className="btn danger small" onClick={() => actions.deletePersonal(p.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
