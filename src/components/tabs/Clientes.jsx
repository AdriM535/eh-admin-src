import { useState } from 'react';

const direccionCompleta = (c) => {
  const partes = [
    [c.calle, c.numero].filter(Boolean).join(' '),
    c.interior,
    [c.cp, c.municipio].filter(Boolean).join(' '),
    c.provincia,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(', ') : c.direccion || '';
};

export default function Clientes({ data, actions, calc, setModal }) {
  const [search, setSearch] = useState('');
  const clientes = data.clientes.filter((c) => c.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Clientes</h1>
          <div className="desc">Cartera de clientes de Estructuras Humanizadoras</div>
        </div>
        <button className="btn" onClick={() => setModal({ type: 'cliente' })}>+ Nuevo cliente</button>
      </div>
      <div className="toolbar">
        <div className="filters">
          <input placeholder="Buscar por nombre…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 220 }} />
        </div>
      </div>
      <div className="tblwrap">
        <table>
          <thead><tr><th>Nombre</th><th>NIF</th><th>Teléfono</th><th>Email</th><th>Obras</th><th></th></tr></thead>
          <tbody>
            {clientes.length === 0 && <tr><td colSpan="6" className="empty">Sin clientes registrados.</td></tr>}
            {clientes.map((c) => {
              const numObras = data.obras.filter((o) => o.clienteId === c.id).length;
              return (
                <tr key={c.id}>
                  <td><b>{c.nombre}</b>{direccionCompleta(c) && <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{direccionCompleta(c)}</div>}</td>
                  <td>{c.nif || '—'}</td>
                  <td>{c.telefono || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{numObras}</td>
                  <td>
                    <button className="btn ghost small" onClick={() => setModal({ type: 'cliente', initial: c })}>Editar</button>{' '}
                    <button className="btn danger small" onClick={() => actions.deleteCliente(c.id)}>Eliminar</button>
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
