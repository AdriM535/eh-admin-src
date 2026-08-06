import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import { todayISO, calcIva } from '../../lib/utils.js';
import { TIPOS_GASTO, METODOS_PAGO } from '../../lib/constants.js';

export default function FacturaCompraForm({ initial, obras, personal, docs, onSave, onClose }) {
  const [f, setF] = useState(
    initial || {
      obraId: '', tipoGasto: 'material', personalId: '', fecha: todayISO(), proveedor: '', numeroFactura: '',
      concepto: '', baseImponible: '', tipoIva: 21, totalIva: '', total: '', metodoPago: 'tarjeta', pagadoPor: '', pagado: true, notas: '',
      adjuntoPath: '', adjuntoNombre: '',
    }
  );
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const recalc = (base, tipo) => {
    const { totalIva, total } = calcIva(base, tipo);
    setF((prev) => ({ ...prev, baseImponible: base, tipoIva: tipo, totalIva, total }));
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    const res = await docs.uploadDocument(file, 'facturas-compra');
    setUploading(false);
    if (res) setF((prev) => ({ ...prev, adjuntoPath: res.adjuntoPath, adjuntoNombre: res.adjuntoNombre }));
  };

  const autonomos = personal.filter((p) => p.tipo === 'autonomo');

  return (
    <Modal title={initial && initial.id ? 'Editar factura de compra' : 'Nueva factura de compra'} onClose={onClose}>
      <div className="grid2">
        <Field label="Tipo de gasto">
          <select value={f.tipoGasto} onChange={(e) => set('tipoGasto', e.target.value)}>
            {TIPOS_GASTO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Obra (vacío si es vehículo/general)">
          <select value={f.obraId} onChange={(e) => set('obraId', e.target.value)}>
            <option value="">— Sin asignar —</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </Field>
      </div>
      {f.tipoGasto === 'autonomo' && (
        <Field label="Autónomo / subcontrata">
          <select value={f.personalId} onChange={(e) => set('personalId', e.target.value)}>
            <option value="">— Sin asignar —</option>
            {autonomos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
      )}
      <div className="grid2">
        <Field label="Proveedor / comercio"><input value={f.proveedor || ''} onChange={(e) => set('proveedor', e.target.value)} placeholder="Obramat, Leroy Merlin…" /></Field>
        <Field label="Fecha"><input type="date" value={f.fecha || ''} onChange={(e) => set('fecha', e.target.value)} /></Field>
      </div>
      <div className="grid2">
        <Field label="Nº de factura"><input value={f.numeroFactura || ''} onChange={(e) => set('numeroFactura', e.target.value)} /></Field>
        <Field label="Concepto"><input value={f.concepto || ''} onChange={(e) => set('concepto', e.target.value)} placeholder="Material de andamiaje…" /></Field>
      </div>
      <div className="grid3">
        <Field label="Base imponible (€)"><input type="number" value={f.baseImponible} onChange={(e) => recalc(e.target.value, f.tipoIva)} /></Field>
        <Field label="IVA %"><input type="number" value={f.tipoIva} onChange={(e) => recalc(f.baseImponible, e.target.value)} /></Field>
        <Field label="Total (€)"><input type="number" value={f.total} onChange={(e) => set('total', e.target.value)} /></Field>
      </div>
      <div className="grid3">
        <Field label="Método de pago">
          <select value={f.metodoPago || ''} onChange={(e) => set('metodoPago', e.target.value)}>
            {METODOS_PAGO.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Pagado por"><input value={f.pagadoPor || ''} onChange={(e) => set('pagadoPor', e.target.value)} placeholder="Sindy, Tarjeta EH…" /></Field>
        <Field label="Pagada">
          <select value={f.pagado ? '1' : '0'} onChange={(e) => set('pagado', e.target.value === '1')}>
            <option value="1">Sí</option>
            <option value="0">Pendiente</option>
          </select>
        </Field>
      </div>
      <Field label="Adjunto (PDF / foto del ticket)">
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} disabled={uploading} />
        {f.adjuntoNombre && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>Archivo: {f.adjuntoNombre}</div>}
        {uploading && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Subiendo…</div>}
      </Field>
      <Field label="Notas"><textarea value={f.notas || ''} onChange={(e) => set('notas', e.target.value)} /></Field>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button
          className="btn"
          onClick={() => {
            if (!f.total) { alert('El importe total es obligatorio'); return; }
            onSave(f);
          }}
        >
          Guardar
        </button>
      </div>
    </Modal>
  );
}
