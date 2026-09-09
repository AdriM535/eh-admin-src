import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import { TIPOS_PERSONAL, ESPECIALIDADES } from '../../lib/constants.js';

export default function PersonalForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(
    initial || {
      nombre: '', tipo: 'empleado', especialidad: '', nif: '', telefono: '', email: '', activo: true, notas: '',
      numeroAfiliacionSs: '', categoria: '', grupoCotizacion: '', fechaIngreso: '',
    }
  );
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
  return (
    <Modal title={initial && initial.id ? 'Editar persona' : 'Nueva persona'} onClose={onClose}>
      <div className="grid2">
        <Field label="Nombre"><input value={f.nombre} onChange={(e) => set('nombre', e.target.value)} /></Field>
        <Field label="Tipo">
          <select value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>
            {TIPOS_PERSONAL.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>
      </div>
      {f.tipo === 'autonomo' && (
        <Field label="Especialidad">
          <select value={f.especialidad || ''} onChange={(e) => set('especialidad', e.target.value)}>
            <option value="">— Sin especificar —</option>
            {ESPECIALIDADES.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </Field>
      )}
      <div className="grid2">
        <Field label="DNI / NIE"><input value={f.nif || ''} onChange={(e) => set('nif', e.target.value)} /></Field>
        <Field label="Teléfono"><input value={f.telefono || ''} onChange={(e) => set('telefono', e.target.value)} /></Field>
      </div>
      <Field label="Email (opcional)"><input type="email" value={f.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>

      {f.tipo === 'empleado' && (
        <>
          <div className="grid2">
            <Field label="Nº afiliación S.S."><input value={f.numeroAfiliacionSs || ''} onChange={(e) => set('numeroAfiliacionSs', e.target.value)} placeholder="48 1077971011" /></Field>
            <Field label="Categoría"><input value={f.categoria || ''} onChange={(e) => set('categoria', e.target.value)} placeholder="Técnico de mantenimiento…" /></Field>
          </div>
          <div className="grid2">
            <Field label="Grupo de cotización"><input value={f.grupoCotizacion || ''} onChange={(e) => set('grupoCotizacion', e.target.value)} placeholder="1 al 11" /></Field>
            <Field label="Fecha de ingreso (antigüedad)"><input type="date" value={f.fechaIngreso || ''} onChange={(e) => set('fechaIngreso', e.target.value)} /></Field>
          </div>
        </>
      )}

      <Field label="Activo">
        <select value={f.activo ? '1' : '0'} onChange={(e) => set('activo', e.target.value === '1')}>
          <option value="1">Sí</option>
          <option value="0">No</option>
        </select>
      </Field>
      <Field label="Notas"><textarea value={f.notas || ''} onChange={(e) => set('notas', e.target.value)} /></Field>
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
