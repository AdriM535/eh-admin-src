import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import { todayISO } from '../../lib/utils.js';
import { ESTADOS_INCIDENCIA } from '../../lib/constants.js';

export default function IncidenciaForm({ initial, obras, personal, onSave, onClose }) {
  const [f, setF] = useState(
    initial || { obraId: '', personalId: '', fecha: todayISO(), descripcion: '', coste: '', asumidoEmpleado: false, estado: 'pendiente', notas: '' }
  );
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
  return (
    <Modal title={initial && initial.id ? 'Editar incidencia' : 'Nueva incidencia'} onClose={onClose}>
      <div className="grid2">
        <Field label="Obra">
          <select value={f.obraId} onChange={(e) => set('obraId', e.target.value)}>
            <option value="">— Sin asignar —</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </Field>
        <Field label="Responsable">
          <select value={f.personalId} onChange={(e) => set('personalId', e.target.value)}>
            <option value="">— Sin identificar —</option>
            {personal.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Fecha"><input type="date" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></Field>
      <Field label="Descripción (protocolo no seguido, daño causado…)"><textarea value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} /></Field>
      <div className="grid2">
        <Field label="Coste estimado del daño (€)"><input type="number" value={f.coste} onChange={(e) => set('coste', e.target.value)} /></Field>
        <Field label="Estado">
          <select value={f.estado} onChange={(e) => set('estado', e.target.value)}>
            {ESTADOS_INCIDENCIA.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </Field>
      </div>
      <div className="field checkfield">
        <input type="checkbox" id="asumido" checked={!!f.asumidoEmpleado} onChange={(e) => set('asumidoEmpleado', e.target.checked)} />
        <label htmlFor="asumido">El coste lo asume el/la empleado/a responsable (no computa como gasto de la obra)</label>
      </div>
      <Field label="Notas"><textarea value={f.notas || ''} onChange={(e) => set('notas', e.target.value)} /></Field>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button
          className="btn"
          onClick={() => {
            if (!f.descripcion) { alert('Describe la incidencia'); return; }
            onSave(f);
          }}
        >
          Guardar
        </button>
      </div>
    </Modal>
  );
}
