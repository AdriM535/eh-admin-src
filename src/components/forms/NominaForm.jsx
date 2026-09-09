import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import { todayISO, fmtMoney, calcNomina } from '../../lib/utils.js';
import { TIPOS_NOMINA } from '../../lib/constants.js';

export default function NominaForm({ initial, personal, onSave, onClose }) {
  const empleados = personal.filter((p) => p.tipo === 'empleado');
  const [f, setF] = useState(
    initial || {
      personalId: empleados[0]?.id || '', tipo: 'periodica', periodoInicio: '', periodoFin: todayISO(),
      salarioBruto: '', irpfPorcentaje: '', ssEmpleado: '', ssEmpresa: '',
      adicionales: '', deducciones: '', horasExtra: '',
      irpfImporte: 0, liquido: 0, total: '',
      pagado: false, fechaPago: '', notas: '',
    }
  );
  const set = (k, v) => {
    setF((prev) => {
      const next = { ...prev, [k]: v };
      if (next.tipo === 'bono_extra') {
        return { ...next, total: next.adicionales };
      }
      // Solo recalcula el coste empresa si se está usando el modelo en
      // bruto (el campo bruto tiene algo escrito). Si no, se respeta el
      // total ya guardado — nóminas antiguas, introducidas directamente en
      // líquido antes de este cambio, no se pisan con 0 al tocar otro campo.
      if (next.salarioBruto !== '' && next.salarioBruto != null) {
        const { irpfImporte, liquido, costeEmpresa } = calcNomina(next);
        return { ...next, irpfImporte, liquido, total: costeEmpresa };
      }
      return next;
    });
  };
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
            <Field label="Salario bruto (€)"><input type="number" value={f.salarioBruto} onChange={(e) => set('salarioBruto', e.target.value)} /></Field>
            <Field label="% IRPF"><input type="number" value={f.irpfPorcentaje} onChange={(e) => set('irpfPorcentaje', e.target.value)} placeholder="Ej. 15" /></Field>
            <Field label="IRPF (€)"><input value={fmtMoney(f.irpfImporte)} readOnly /></Field>
          </div>
          <div className="grid2">
            <Field label="SS empleado (€)"><input type="number" value={f.ssEmpleado} onChange={(e) => set('ssEmpleado', e.target.value)} /></Field>
            <Field label="SS empresa (€)"><input type="number" value={f.ssEmpresa} onChange={(e) => set('ssEmpresa', e.target.value)} /></Field>
          </div>
          <div className="grid3">
            <Field label="Horas extra (€)"><input type="number" value={f.horasExtra} onChange={(e) => set('horasExtra', e.target.value)} /></Field>
            <Field label="Adicionales (€)"><input type="number" value={f.adicionales} onChange={(e) => set('adicionales', e.target.value)} /></Field>
            <Field label="Deducciones (€)"><input type="number" value={f.deducciones} onChange={(e) => set('deducciones', e.target.value)} /></Field>
          </div>
          <div className="grid2">
            <Field label="Líquido a percibir (€)"><input value={fmtMoney(f.liquido)} readOnly /></Field>
            <Field label="Coste empresa (€)"><input value={fmtMoney(f.total)} readOnly /></Field>
          </div>
          <div className="desc" style={{ marginTop: -8, marginBottom: 14 }}>
            Líquido = bruto − IRPF − SS empleado (+ horas extra + adicionales − deducciones). Coste empresa = bruto + SS empresa — es lo que se usa como gasto de esta nómina.
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
