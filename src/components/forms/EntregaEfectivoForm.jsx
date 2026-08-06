import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import { todayISO } from '../../lib/utils.js';

export default function EntregaEfectivoForm({ initial, personal, onSave, onClose }) {
  const [f, setF] = useState(initial || { personalId: personal[0]?.id || '', fecha: todayISO(), importe: '', concepto: '', notas: '' });
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
  return (
    <Modal title={initial && initial.id ? 'Editar entrega de efectivo' : 'Nueva entrega de efectivo'} onClose={onClose}>
      <div className="grid2">
        <Field label="Persona">
          <select value={f.personalId} onChange={(e) => set('personalId', e.target.value)}>
            <option value="">— Sin asignar —</option>
            {personal.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
        <Field label="Fecha"><input type="date" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></Field>
      </div>
      <Field label="Importe entregado (€)"><input type="number" value={f.importe} onChange={(e) => set('importe', e.target.value)} /></Field>
      <Field label="Concepto"><input value={f.concepto || ''} onChange={(e) => set('concepto', e.target.value)} placeholder="Fondo para compras de la semana…" /></Field>
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
