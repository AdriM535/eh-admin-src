import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';

export default function ClienteForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial || { nombre: '', nif: '', telefono: '', email: '', direccion: '', notas: '' });
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
  return (
    <Modal title={initial && initial.id ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <Field label="Nombre"><input value={f.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre o razón social" /></Field>
      <div className="grid2">
        <Field label="NIF / CIF"><input value={f.nif} onChange={(e) => set('nif', e.target.value)} /></Field>
        <Field label="Teléfono"><input value={f.telefono} onChange={(e) => set('telefono', e.target.value)} /></Field>
      </div>
      <div className="grid2">
        <Field label="Email"><input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Dirección"><input value={f.direccion} onChange={(e) => set('direccion', e.target.value)} /></Field>
      </div>
      <Field label="Notas"><textarea value={f.notas} onChange={(e) => set('notas', e.target.value)} /></Field>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button
          className="btn"
          onClick={() => {
            if (!f.nombre) { alert('El nombre es obligatorio'); return; }
            onSave(f);
          }}
        >
          Guardar
        </button>
      </div>
    </Modal>
  );
}
