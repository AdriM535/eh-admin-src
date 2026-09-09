import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import { ESTADOS_OBRA, METODOS_COBRO } from '../../lib/constants.js';
import { direccionCliente } from '../../lib/utils.js';

export default function ObraForm({ initial, clientes, personal, presupuestos, onSave, onClose }) {
  // El presupuesto aceptado que dio origen a esta obra ya tiene su dirección
  // y su importe — se reutilizan como valor inicial en vez de partir de cero.
  const presupuestoInicial = initial?.id ? (presupuestos || []).find((p) => p.obraId === initial.id && p.estado === 'aceptado') : null;
  const [f, setF] = useState(
    initial
      ? { ...initial, importeDirecto: initial.importeDirecto ?? (presupuestoInicial ? Math.round(presupuestoInicial.total * 100) / 100 : '') }
      : {
          nombre: '', clienteId: clientes[0]?.id || '', responsableId: '', direccion: '', ciudad: '',
          estado: 'presupuesto', fechaInicio: '', fechaFin: '', notas: '',
          facturada: false, cobrada: false, metodoCobro: '', importeDirecto: '',
        }
  );
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const presupuestoObra = f.id ? (presupuestos || []).find((p) => p.obraId === f.id && p.estado === 'aceptado') : null;
  const clienteObra = clientes.find((c) => c.id === f.clienteId);
  const rellenarDesdePresupuesto = () => {
    if (!presupuestoObra) return;
    const direccion = presupuestoObra.direccionObra || direccionCliente(clienteObra);
    const ciudad = clienteObra?.municipio || '';
    setF((prev) => ({ ...prev, direccion: direccion || prev.direccion, ciudad: ciudad || prev.ciudad }));
  };

  return (
    <Modal title={initial && initial.id ? 'Editar obra' : 'Nueva obra'} onClose={onClose}>
      {f.id && (
        <Field label="Código">
          <input value={f.codigo || '—'} disabled />
        </Field>
      )}
      <Field label="Nombre de la obra"><input value={f.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej. Reparación fachada Calle Olano" /></Field>
      {!f.id && <div className="desc" style={{ marginTop: -8, marginBottom: 10 }}>Se le asignará automáticamente un código consecutivo (ej. {new Date().getFullYear()}-001) al guardar.</div>}
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
      <div className="grid2">
        <Field label="Responsable">
          <select value={f.responsableId || ''} onChange={(e) => set('responsableId', e.target.value)}>
            <option value="">— Sin asignar —</option>
            {(personal || []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
        <Field label="Ciudad"><input value={f.ciudad || ''} onChange={(e) => set('ciudad', e.target.value)} placeholder="Bilbao, Bermeo…" /></Field>
      </div>
      {presupuestoObra && (!f.direccion || !f.ciudad) && (
        <button type="button" className="btn ghost small" style={{ marginBottom: 10 }} onClick={rellenarDesdePresupuesto}>
          ⤵ Rellenar con la dirección del presupuesto {presupuestoObra.numero || ''}
        </button>
      )}
      <Field label="Dirección"><input value={f.direccion} onChange={(e) => set('direccion', e.target.value)} /></Field>
      <div className="grid2">
        <Field label="Fecha de inicio"><input type="date" value={f.fechaInicio || ''} onChange={(e) => set('fechaInicio', e.target.value)} /></Field>
        <Field label="Fecha de fin"><input type="date" value={f.fechaFin || ''} onChange={(e) => set('fechaFin', e.target.value)} /></Field>
      </div>

      <Field label="Facturación directa (obras sin factura de venta creada todavía)">
        <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 13 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <input type="checkbox" checked={!!f.facturada} onChange={(e) => set('facturada', e.target.checked)} />
            Facturada
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <input type="checkbox" checked={!!f.cobrada} onChange={(e) => set('cobrada', e.target.checked)} />
            Cobrada
          </label>
        </div>
        <div className="grid2">
          <Field label="Método de cobro">
            <select value={f.metodoCobro || ''} onChange={(e) => set('metodoCobro', e.target.value)}>
              <option value="">— Sin especificar —</option>
              {METODOS_COBRO.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Importe (€)">
            <input type="number" value={f.importeDirecto ?? ''} onChange={(e) => set('importeDirecto', e.target.value)} placeholder="0.00" />
          </Field>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: -2 }}>
          {f.facturaDirectaId
            ? 'Ya existe una factura de venta ligada a esta obra (búscala en "Facturas de venta") — al guardar se actualiza con estos datos.'
            : 'Si marcas "Facturada" y pones un importe, al guardar se creará automáticamente una factura de venta ligada a esta obra en "Facturas de venta", sin número ni fecha todavía — para que completes esos datos allí.'}
          {' '}Puedes guardar sin marcar "Cobrada" todavía: quedará pendiente de cobro.
        </div>
      </Field>

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
