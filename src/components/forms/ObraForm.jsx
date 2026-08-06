import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import { ESTADOS_OBRA } from '../../lib/constants.js';

export default function ObraForm({ initial, clientes, onSave, onClose }) {
  const [f, setF] = useState(initial || { nombre: '', clienteId: clientes[0]?.id || '', direccion: '', estado: 'presupuesto', fechaInicio: '', fechaFin: '', notas: '' });
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
  return (
    <Modal title={initial && initial.id ? 'Editar obra' : 'Nueva obra'} onClose={onClose}>
      <Field label="Nombre de la obra"><input value={f.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej. Reparación fachada Calle Olano" /></Field>
      <div className="grid2">
        <Field label="Cliente">
          <select value={f.clienteId} onChange={(e) => set('clienteId', e.target.value)}>
            <option value="">— Sin asignar —</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
        <Field label="Estado">
          <select value={f.estado} onChange={(e) => set('estado', e.target.value)}>
            {ESTADOS_OBRA.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Dirección"><input value={f.direccion} onChange={(e) => set('direccion', e.target.value)} /></Field>
      <div className="grid2">
        <Field label="Fecha de inicio"><input type="date" value={f.fechaInicio || ''} onChange={(e) => set('fechaInicio', e.target.value)} /></Field>
        <Field label="Fecha de fin"><input type="date" value={f.fechaFin || ''} onChange={(e) => set('fechaFin', e.target.value)} /></Field>
      </div>
      <Field label="Notas"><textarea value={f.notas} onChange={(e) => set('notas', e.target.value)} /></Field>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button
          className="btn"
          onClick={() => {
            if (!f.nombre) { alert('El nombre de la obra es obligatorio'); return; }
            onSave(f);
          }}
        >
          Guardar
        </button>
      </div>
    </Modal>
  );
}
