import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import { todayISO } from '../../lib/utils.js';
import { METODOS_COBRO } from '../../lib/constants.js';

export default function AbonoForm({ initial, obras, clientes, onSave, onClose }) {
  const [f, setF] = useState(
    initial || { obraId: '', clienteId: '', fecha: todayISO(), importe: '', concepto: '', esAnticipo: true, metodoCobro: 'cuenta', enB: false, notas: '' }
  );
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
  return (
    <Modal title={initial && initial.id ? 'Editar abono' : 'Nuevo abono / anticipo'} onClose={onClose}>
      <div className="grid2">
        <Field label="Obra">
          <select
            value={f.obraId}
            onChange={(e) => {
              const oid = e.target.value;
              set('obraId', oid);
              const o = obras.find((x) => x.id === oid);
              if (o && o.clienteId && !f.clienteId) set('clienteId', o.clienteId);
            }}
          >
            <option value="">— Sin asignar —</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} — ${o.nombre}` : o.nombre}</option>)}
          </select>
        </Field>
        <Field label="Cliente">
          <select value={f.clienteId} onChange={(e) => set('clienteId', e.target.value)}>
            <option value="">— Sin asignar —</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid2">
        <Field label="Fecha"><input type="date" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></Field>
        <Field label="Importe (€)"><input type="number" value={f.importe} onChange={(e) => set('importe', e.target.value)} /></Field>
      </div>
      <Field label="Concepto"><input value={f.concepto || ''} onChange={(e) => set('concepto', e.target.value)} placeholder="Anticipo inicio de obra…" /></Field>
      <div className="grid2">
        <Field label="Tipo">
          <select value={f.esAnticipo ? '1' : '0'} onChange={(e) => set('esAnticipo', e.target.value === '1')}>
            <option value="1">Anticipo</option>
            <option value="0">Abono / pago parcial</option>
          </select>
        </Field>
        <Field label="Método de cobro">
          <select value={f.metodoCobro || ''} onChange={(e) => set('metodoCobro', e.target.value)}>
            {METODOS_COBRO.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
      </div>
      <div className="field checkfield">
        <input type="checkbox" id="enb-abono" checked={!!f.enB} onChange={(e) => set('enB', e.target.checked)} />
        <label htmlFor="enb-abono">Cobro en B (no declarado — solo control interno)</label>
      </div>
      <Field label="Notas"><textarea value={f.notas || ''} onChange={(e) => set('notas', e.target.value)} /></Field>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button
          className="btn"
          onClick={() => {
            if (!f.importe) { alert('El importe es obligatorio'); return; }
            onSave(f);
          }}
        >
          Guardar
        </button>
      </div>
    </Modal>
  );
}
