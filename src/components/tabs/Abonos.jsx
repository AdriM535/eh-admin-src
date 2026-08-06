import { fmtMoney, fmtDate } from '../../lib/utils.js';

export default function Abonos({ data, actions, calc, setModal }) {
  const abonos = data.abonos.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const total = abonos.reduce((s, a) => s + Number(a.importe || 0), 0);

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Abonos y anticipos</h1>
          <div className="desc">Pagos de clientes no vinculados a una factura concreta</div>
        </div>
        <button className="btn" onClick={() => setModal({ type: 'abono' })}>+ Nuevo abono</button>
      </div>
      <div className="ledger" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="cell ok"><div className="lbl">Total recibido</div><div className="val">{fmtMoney(total)}</div></div>
        <div className="cell"><div className="lbl">Registros</div><div className="val">{abonos.length}</div></div>
      </div>
      <div className="tblwrap">
        <table>
          <thead><tr><th>Fecha</th><th>Obra</th><th>Cliente</th><th>Concepto</th><th>Tipo</th><th>Importe</th><th></th></tr></thead>
          <tbody>
            {abonos.length === 0 && <tr><td colSpan="7" className="empty">Sin abonos registrados.</td></tr>}
            {abonos.map((a) => {
              const obra = calc.obraById(a.obraId);
              const cliente = calc.clienteById(a.clienteId);
              return (
                <tr key={a.id}>
                  <td>{fmtDate(a.fecha)}</td>
                  <td>{obra ? obra.nombre : '—'}</td>
                  <td>{cliente ? cliente.nombre : '—'}</td>
                  <td>{a.concepto || '—'}</td>
                  <td>
                    <span className="pill">{a.esAnticipo ? 'Anticipo' : 'Abono'}</span>
                    {a.enB && <span className="pill ochre">B</span>}
                  </td>
                  <td className="num pos">{fmtMoney(a.importe)}</td>
                  <td>
                    <button className="btn ghost small" onClick={() => setModal({ type: 'abono', initial: a })}>Editar</button>{' '}
                    <button className="btn danger small" onClick={() => actions.deleteAbono(a.id)}>Eliminar</button>
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
