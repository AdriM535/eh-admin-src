import { fmtMoney, fmtDate } from '../../lib/utils.js';

export default function Caja({ data, actions, calc, setModal }) {
  const { cajaSaldo, cajaPendienteJustificar, ingresosEfectivo, gastosEfectivoDirectos, totalEntregasEfectivo, entregasConStats } = calc;

  const entregas = entregasConStats.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Caja</h1>
          <div className="desc">Efectivo en caja y entregas a personal para compras, con lo que ya está justificado</div>
        </div>
        <button className="btn" onClick={() => setModal({ type: 'entregaEfectivo' })}>+ Nueva entrega</button>
      </div>
      <div className="ledger">
        <div className={'cell' + (cajaSaldo < 0 ? ' warn' : ' ok')}><div className="lbl">Saldo de caja</div><div className="val">{fmtMoney(cajaSaldo)}</div></div>
        <div className={'cell' + (cajaPendienteJustificar > 0 ? ' warn' : '')}><div className="lbl">Pendiente de justificar</div><div className="val">{fmtMoney(cajaPendienteJustificar)}</div></div>
        <div className="cell"><div className="lbl">Cobrado en efectivo (total)</div><div className="val">{fmtMoney(ingresosEfectivo)}</div></div>
        <div className="cell"><div className="lbl">Entregado a personal (total)</div><div className="val">{fmtMoney(totalEntregasEfectivo)}</div></div>
      </div>
      <div className="desc" style={{ marginTop: -14, marginBottom: 20 }}>
        Saldo = cobrado en efectivo − gastos pagados directo en efectivo ({fmtMoney(gastosEfectivoDirectos)}) − entregas a personal.
      </div>

      <div className="section-title">Entregas de efectivo <span className="count">{entregas.length}</span></div>
      <div className="tblwrap">
        <table>
          <thead><tr><th>Fecha</th><th>Persona</th><th>Concepto</th><th>Entregado</th><th>Justificado</th><th>Pendiente</th><th></th></tr></thead>
          <tbody>
            {entregas.length === 0 && <tr><td colSpan="7" className="empty">Sin entregas de efectivo registradas.</td></tr>}
            {entregas.map((e) => {
              const p = calc.personalById(e.personalId);
              return (
                <tr key={e.id}>
                  <td>{fmtDate(e.fecha)}</td>
                  <td>{p ? p.nombre : '—'}</td>
                  <td>{e.concepto || '—'}</td>
                  <td className="num">{fmtMoney(e.importe)}</td>
                  <td className="num">{fmtMoney(e.stats.justificado)}</td>
                  <td className="num">
                    {e.stats.pendiente > 0 ? <span className="pill ochre">{fmtMoney(e.stats.pendiente)}</span> : <span className="pill green">Justificado</span>}
                  </td>
                  <td>
                    <button className="btn ghost small" onClick={() => setModal({ type: 'entregaEfectivo', initial: e })}>Editar</button>{' '}
                    <button className="btn danger small" onClick={() => actions.deleteEntregaEfectivo(e.id)}>Eliminar</button>
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
