import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import { todayISO } from '../../lib/utils.js';
import { TIPOS_NOMINA } from '../../lib/constants.js';

const calcTotal = (f) =>
  (Number(f.liquidado) || 0) + (Number(f.cotizacionSs) || 0) + (Number(f.adicionales) || 0) + (Number(f.horasExtra) || 0) - (Number(f.deducciones) || 0);

export default function NominaForm({ initial, personal, onSave, onClose }) {
  const empleados = personal.filter((p) => p.tipo === 'empleado');
  const [f, setF] = useState(
    initial || {
      personalId: empleados[0]?.id || '', tipo: 'periodica', periodoInicio: '', periodoFin: todayISO(), liquidado: '', cotizacionSs: '',
      adicionales: '', deducciones: '', horasExtra: '', total: '', pagado: false, fechaPago: '', notas: '',
    }
  );
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v, total: k === 'total' ? v : calcTotal({ ...prev, [k]: v }) }));
  const esBono = f.tipo === 'bono_extra';

  return (
    <Modal title={initial && initial.id ? 'Editar nómina' : 'Nueva nómina'} onClose={onClose}>
      <div className="grid2">
        <Field label="Trabajador/a">
          <select value={f.personalId} onChange={(e) => set('personalId', e.target.value)}>
            {empleados.length === 0 && <option value="">— Sin empleados registrados —</option>}
            {empleados.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
        <Field label="Tipo">
          <select value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>
            {TIPOS_NOMINA.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>
      </div>

      {esBono ? (
        <>
          <Field label="Fecha del pago"><input type="date" value={f.fechaPago || todayISO()} onChange={(e) => { set('fechaPago', e.target.value); set('periodoInicio', e.target.value); set('periodoFin', e.target.value); }} /></Field>
          <Field label="Importe (€)"><input type="number" value={f.adicionales} onChange={(e) => set('adicionales', e.target.value)} placeholder="Adelanto, bono, pago puntual…" /></Field>
        </>
      ) : (
        <>
          <div className="grid2">
            <Field label="Periodo inicio"><input type="date" value={f.periodoInicio || ''} onChange={(e) => set('periodoInicio', e.target.value)} /></Field>
            <Field label="Periodo fin"><input type="date" value={f.periodoFin || ''} onChange={(e) => set('periodoFin', e.target.value)} /></Field>
          </div>
          <div className="grid3">
            <Field label="Liquidado a percibir (€)"><input type="number" value={f.liquidado} onChange={(e) => set('liquidado', e.target.value)} /></Field>
            <Field label="Cotización SS (€)"><input type="number" value={f.cotizacionSs} onChange={(e) => set('cotizacionSs', e.target.value)} /></Field>
            <Field label="Horas extra (€)"><input type="number" value={f.horasExtra} onChange={(e) => set('horasExtra', e.target.value)} /></Field>
          </div>
          <div className="grid3">
            <Field label="Adicionales (€)"><input type="number" value={f.adicionales} onChange={(e) => set('adicionales', e.target.value)} /></Field>
            <Field label="Deducciones (€)"><input type="number" value={f.deducciones} onChange={(e) => set('deducciones', e.target.value)} /></Field>
            <Field label="Total nómina (€)"><input type="number" value={f.total} onChange={(e) => set('total', e.target.value)} /></Field>
          </div>
        </>
      )}

      <div className="grid2">
        <Field label="Pagada">
          <select value={f.pagado ? '1' : '0'} onChange={(e) => set('pagado', e.target.value === '1')}>
            <option value="0">Pendiente</option>
            <option value="1">Pagada</option>
          </select>
        </Field>
        {!esBono && <Field label="Fecha de pago"><input type="date" value={f.fechaPago || ''} onChange={(e) => set('fechaPago', e.target.value)} /></Field>}
      </div>
      <Field label="Notas"><textarea value={f.notas || ''} onChange={(e) => set('notas', e.target.value)} placeholder={esBono ? 'Motivo del pago…' : ''} /></Field>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button
          className="btn"
          onClick={() => {
            if (!f.personalId) { alert('Selecciona un/a trabajador/a'); return; }
            onSave(f);
          }}
        >
          Guardar
        </button>
      </div>
    </Modal>
  );
}
