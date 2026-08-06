import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import { todayISO, calcLineaCompra } from '../../lib/utils.js';
import { CATEGORIAS_GENERALES, METODOS_PAGO } from '../../lib/constants.js';

const emptyLinea = () => ({ producto: '', cantidad: 1, precioUnitario: '', tasaIva: 21, precioUnitarioConIva: 0, importe: 0 });

export default function FacturaCompraForm({ initial, obras, personal, facturaCompraLineas, docs, onSave, onClose }) {
  const initialLineas = initial ? facturaCompraLineas.filter((l) => l.facturaCompraId === initial.id).sort((a, b) => a.orden - b.orden) : [];
  const [f, setF] = useState(
    initial || {
      obraId: '', categoriaGeneral: 'material_general', personalId: '', fecha: todayISO(),
      proveedor: '', numeroFactura: '', metodoPago: 'tarjeta', pagadoPor: '', pagado: true, notas: '',
      adjuntoPath: '', adjuntoNombre: '',
    }
  );
  const [lineas, setLineas] = useState(initialLineas.length > 0 ? initialLineas : [emptyLinea()]);
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const setLinea = (idx, k, v) => {
    setLineas((prev) => {
      const next = prev.slice();
      const l = { ...next[idx], [k]: v };
      if (k === 'cantidad' || k === 'precioUnitario' || k === 'tasaIva') {
        const { precioUnitarioConIva, importe } = calcLineaCompra(l.cantidad, l.precioUnitario, l.tasaIva);
        l.precioUnitarioConIva = precioUnitarioConIva;
        l.importe = importe;
      }
      next[idx] = l;
      return next;
    });
  };
  const addLinea = () => setLineas((prev) => [...prev, emptyLinea()]);
  const removeLinea = (idx) => setLineas((prev) => prev.filter((_, i) => i !== idx));
  const total = lineas.reduce((s, l) => s + (Number(l.importe) || 0), 0);

  const autonomos = personal.filter((p) => p.tipo === 'autonomo');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    const res = await docs.uploadDocument(file, 'facturas-compra');
    setUploading(false);
    if (res) setF((prev) => ({ ...prev, adjuntoPath: res.adjuntoPath, adjuntoNombre: res.adjuntoNombre }));
  };

  return (
    <Modal title={initial && initial.id ? 'Editar factura de compra' : 'Nueva factura de compra'} wide onClose={onClose}>
      <div className="grid2">
        <Field label="Obra (vacío si es un insumo general)">
          <select value={f.obraId} onChange={(e) => set('obraId', e.target.value)}>
            <option value="">— Sin asignar / insumo general —</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </Field>
        {!f.obraId ? (
          <Field label="Categoría del insumo general">
            <select value={f.categoriaGeneral} onChange={(e) => set('categoriaGeneral', e.target.value)}>
              {CATEGORIAS_GENERALES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
        ) : (
          <Field label="Fecha"><input type="date" value={f.fecha || ''} onChange={(e) => set('fecha', e.target.value)} /></Field>
        )}
      </div>
      {(f.categoriaGeneral === 'autonomo' || autonomos.some((p) => p.id === f.personalId)) && (
        <Field label="Autónomo / subcontrata">
          <select value={f.personalId} onChange={(e) => set('personalId', e.target.value)}>
            <option value="">— Sin asignar —</option>
            {autonomos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Field>
      )}
      <div className="grid3">
        {f.obraId && <Field label="Fecha"><input type="date" value={f.fecha || ''} onChange={(e) => set('fecha', e.target.value)} /></Field>}
        <Field label="Comercio / proveedor"><input value={f.proveedor || ''} onChange={(e) => set('proveedor', e.target.value)} placeholder="Obramat, Leroy Merlin…" /></Field>
        <Field label="Nº de factura"><input value={f.numeroFactura || ''} onChange={(e) => set('numeroFactura', e.target.value)} /></Field>
      </div>

      <Field label="Productos de la factura">
        <div className="lineitems">
          <div className="lirow head"><div>Producto</div><div>Cant.</div><div>Precio ud.</div><div>Importe</div><div></div></div>
          {lineas.map((l, idx) => (
            <div className="lirow" key={idx}>
              <input value={l.producto} onChange={(e) => setLinea(idx, 'producto', e.target.value)} placeholder="Ej. Saco cemento 25kg" />
              <input type="number" value={l.cantidad} onChange={(e) => setLinea(idx, 'cantidad', e.target.value)} />
              <input type="number" value={l.precioUnitario} onChange={(e) => setLinea(idx, 'precioUnitario', e.target.value)} />
              <input value={(Number(l.importe) || 0).toFixed(2)} readOnly />
              <button className="btn danger small" type="button" onClick={() => removeLinea(idx)}>✕</button>
            </div>
          ))}
        </div>
        <button className="btn ghost small" type="button" onClick={addLinea}>+ Añadir producto</button>
      </Field>

      <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 700, margin: '10px 0' }}>Total: {total.toFixed(2)} €</div>

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
            if (!f.obraId && !f.categoriaGeneral) { alert('Selecciona una obra o una categoría de insumo general'); return; }
            onSave({ ...f, categoriaGeneral: f.obraId ? null : f.categoriaGeneral, lineas });
          }}
        >
          Guardar
        </button>
      </div>
    </Modal>
  );
}
