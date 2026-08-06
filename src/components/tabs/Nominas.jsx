import { useState } from 'react';
import { fmtMoney, fmtDate } from '../../lib/utils.js';

export default function Nominas({ data, actions, calc, setModal }) {
  const [personalFilter, setPersonalFilter] = useState('todos');
  const nominas = data.nominas
    .filter((n) => personalFilter === 'todos' || n.personalId === personalFilter)
    .slice()
    .sort((a, b) => (b.periodoFin || '').localeCompare(a.periodoFin || ''));
  const total = nominas.reduce((s, n) => s + Number(n.total || 0), 0);

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Nóminas</h1>
          <div className="desc">Liquidaciones al personal empleado</div>
        </div>
        <button className="btn" onClick={() => setModal({ type: 'nomina' })}>+ Nueva nómina</button>
      </div>
      <div className="ledger" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="cell warn"><div className="lbl">Total (filtro actual)</div><div className="val">{fmtMoney(total)}</div></div>
        <div className="cell"><div className="lbl">Registros</div><div className="val">{nominas.length}</div></div>
      </div>
      <div className="toolbar">
        <div className="filters">
          <select value={personalFilter} onChange={(e) => setPersonalFilter(e.target.value)}>
            <option value="todos">Todo el personal</option>
            {data.personal.filter((p) => p.tipo === 'empleado').map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
      </div>
      <div className="tblwrap">
        <table>
          <thead><tr><th>Trabajador/a</th><th>Periodo</th><th>Total</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {nominas.length === 0 && <tr><td colSpan="5" className="empty">Sin nóminas registradas.</td></tr>}
            {nominas.map((n) => {
              const p = calc.personalById(n.personalId);
              return (
                <tr key={n.id}>
                  <td>{p ? p.nombre : '—'}</td>
                  <td>{fmtDate(n.periodoInicio)} — {fmtDate(n.periodoFin)}</td>
                  <td className="num">{fmtMoney(n.total)}</td>
                  <td>{n.pagado ? <span className="pill green">Pagada</span> : <span className="pill brick">Pendiente</span>}</td>
                  <td>
                    <button className="btn ghost small" onClick={() => setModal({ type: 'nomina', initial: n })}>Editar</button>{' '}
                    <button className="btn danger small" onClick={() => actions.deleteNomina(n.id)}>Eliminar</button>
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
