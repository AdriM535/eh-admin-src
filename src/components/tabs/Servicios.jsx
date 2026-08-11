import { fmtMoney } from '../../lib/utils.js';

export default function Servicios({ data, actions, setModal }) {
  const servicios = data.servicios.slice().sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Catálogo de servicios</h1>
          <div className="desc">Servicios que puedes elegir directamente al armar un presupuesto — actualízalo a mano o subiendo un Excel desde Importar Excel.</div>
        </div>
        <button className="btn" onClick={() => setModal({ type: 'servicio' })}>+ Nuevo servicio</button>
      </div>
      <div className="tblwrap">
        <table>
          <thead><tr><th>Nombre</th><th>Descripción</th><th>Unidad</th><th>Precio</th><th>Categoría</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {servicios.length === 0 && <tr><td colSpan="7" className="empty">Sin servicios en el catálogo todavía.</td></tr>}
            {servicios.map((s) => (
              <tr key={s.id}>
                <td><b>{s.nombre}</b></td>
                <td style={{ maxWidth: 320 }}>{s.descripcion || '—'}</td>
                <td>{s.unidad || '—'}</td>
                <td className="num">{fmtMoney(s.precioUnitario)}</td>
                <td>{s.categoria || '—'}</td>
                <td>{s.activo ? <span className="pill green">Activo</span> : <span className="pill">Inactivo</span>}</td>
                <td>
                  <button className="btn ghost small" onClick={() => setModal({ type: 'servicio', initial: s })}>Editar</button>{' '}
                  <button className="btn danger small" onClick={() => actions.deleteServicio(s.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
