import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';

export default function ServicioForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial || { nombre: '', descripcion: '', unidad: '', precioUnitario: '', categoria: '', activo: true });
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
  return (
    <Modal title={initial && initial.id ? 'Editar servicio' : 'Nuevo servicio'} onClose={onClose}>
      <Field label="Nombre"><input value={f.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej. Andamiaje y protección" /></Field>
      <Field label="Descripción"><textarea value={f.descripcion || ''} onChange={(e) => set('descripcion', e.target.value)} /></Field>
      <div className="grid3">
        <Field label="Unidad (m2, hora, ud…)"><input value={f.unidad || ''} onChange={(e) => set('unidad', e.target.value)} /></Field>
        <Field label="Precio unidad (€)"><input type="number" value={f.precioUnitario} onChange={(e) => set('precioUnitario', e.target.value)} /></Field>
        <Field label="Categoría"><input value={f.categoria || ''} onChange={(e) => set('categoria', e.target.value)} /></Field>
      </div>
      <Field label="Activo (aparece para elegir en presupuestos)">
        <select value={f.activo ? '1' : '0'} onChange={(e) => set('activo', e.target.value === '1')}>
          <option value="1">Sí</option>
          <option value="0">No</option>
        </select>
      </Field>
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
