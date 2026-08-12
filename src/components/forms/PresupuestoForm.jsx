import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import { todayISO, fmtMoney } from '../../lib/utils.js';
import { ESTADOS_PRESUPUESTO } from '../../lib/constants.js';

const emptyLinea = () => ({ concepto: '', cantidad: 1, precioUnitario: '', importe: 0 });

export default function PresupuestoForm({ initial, obras, clientes, servicios, presupuestoLineas, onSave, onClose }) {
  const initialLineas = initial ? presupuestoLineas.filter((l) => l.presupuestoId === initial.id).sort((a, b) => a.orden - b.orden) : [];
  const [f, setF] = useState(
    initial || { clienteId: clientes[0]?.id || '', obraId: '', numero: '', fecha: todayISO(), validezDias: 30, estado: 'borrador', notas: '' }
  );
  const [lineas, setLineas] = useState(initialLineas.length > 0 ? initialLineas : [emptyLinea()]);
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const setLinea = (idx, k, v) => {
    setLineas((prev) => {
      const next = prev.slice();
      const l = { ...next[idx], [k]: v };
      if (k === 'cantidad' || k === 'precioUnitario') {
        l.importe = Math.round((Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0) * 100) / 100;
      }
      next[idx] = l;
      return next;
    });
  };
  const addLinea = () => setLineas((prev) => [...prev, emptyLinea()]);
  const removeLinea = (idx) => setLineas((prev) => prev.filter((_, i) => i !== idx));
  const addLineaDesdeServicio = (servicioId) => {
    const s = (servicios || []).find((x) => x.id === servicioId);
    if (!s) return;
    const precio = Number(s.precioUnitario) || 0;
    setLineas((prev) => [...prev, { concepto: s.nombre, cantidad: 1, precioUnitario: precio, importe: precio }]);
  };
  const total = lineas.reduce((s, l) => s + (Number(l.importe) || 0), 0);
  const serviciosActivos = (servicios || []).filter((s) => s.activo !== false);

  return (
    <Modal title={initial && initial.id ? 'Editar presupuesto' : 'Nuevo presupuesto'} wide onClose={onClose}>
      <div className="grid3">
        <Field label="Cliente">
          <select value={f.clienteId} onChange={(e) => set('clienteId', e.target.value)}>
            <option value="">— Sin asignar —</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
        <Field label="Obra (opcional)">
          <select value={f.obraId} onChange={(e) => set('obraId', e.target.value)}>
            <option value="">— Sin asignar —</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} — ${o.nombre}` : o.nombre}</option>)}
          </select>
        </Field>
        <Field label="Número"><input value={f.numero || ''} onChange={(e) => set('numero', e.target.value)} placeholder="PRE-2026-001" /></Field>
      </div>
      <div className="grid3">
        <Field label="Fecha"><input type="date" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></Field>
        <Field label="Validez (días)"><input type="number" value={f.validezDias} onChange={(e) => set('validezDias', e.target.value)} /></Field>
        <Field label="Estado">
          <select value={f.estado} onChange={(e) => set('estado', e.target.value)}>
            {ESTADOS_PRESUPUESTO.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Líneas del presupuesto">
        <div className="lineitems">
          <div className="lirow head"><div>Concepto</div><div>Cant.</div><div>Precio ud.</div><div>Importe</div><div></div></div>
          {lineas.map((l, idx) => (
            <div className="lirow" key={idx}>
              <input value={l.concepto} onChange={(e) => setLinea(idx, 'concepto', e.target.value)} placeholder="Ej. Andamiaje y protección" />
              <input type="number" value={l.cantidad} onChange={(e) => setLinea(idx, 'cantidad', e.target.value)} />
              <input type="number" value={l.precioUnitario} onChange={(e) => setLinea(idx, 'precioUnitario', e.target.value)} />
              <input value={(Number(l.importe) || 0).toFixed(2)} readOnly />
              <button className="btn danger small" type="button" onClick={() => removeLinea(idx)}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn ghost small" type="button" onClick={addLinea}>+ Añadir línea</button>
          {serviciosActivos.length > 0 && (
            <select
              value=""
              onChange={(e) => { if (e.target.value) addLineaDesdeServicio(e.target.value); }}
              style={{ maxWidth: 280 }}
            >
              <option value="">+ Añadir del catálogo de servicios…</option>
              {serviciosActivos.map((s) => <option key={s.id} value={s.id}>{s.nombre} — {fmtMoney(s.precioUnitario)}</option>)}
            </select>
          )}
        </div>
      </Field>

      <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 700, margin: '10px 0' }}>Total: {total.toFixed(2)} €</div>

      <Field label="Notas / condiciones"><textarea value={f.notas || ''} onChange={(e) => set('notas', e.target.value)} /></Field>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button
          className="btn"
          onClick={() => {
            if (!f.clienteId) { alert('Selecciona un cliente'); return; }
            onSave({ ...f, lineas });
          }}
        >
          Guardar
        </button>
      </div>
    </Modal>
  );
}
