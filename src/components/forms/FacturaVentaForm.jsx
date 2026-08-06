import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import { todayISO, calcIva } from '../../lib/utils.js';
import { METODOS_COBRO } from '../../lib/constants.js';

export default function FacturaVentaForm({ initial, obras, clientes, docs, onSave, onClose }) {
  const [f, setF] = useState(
    initial || {
      obraId: '', clienteId: '', serie: '', numero: '', fechaExpedicion: todayISO(), fechaCobro: '',
      baseImponible: '', tipoIva: 21, totalIva: '', total: '', cobrado: false, metodoCobro: 'cuenta', enB: false, notas: '',
      adjuntoPath: '', adjuntoNombre: '',
    }
  );
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const recalc = (base, tipo) => {
    const { totalIva, total } = calcIva(base, tipo);
    setF((prev) => ({ ...prev, baseImponible: base, tipoIva: tipo, totalIva, total }));
  };

  const clientesDeObra = f.obraId ? obras.find((o) => o.id === f.obraId)?.clienteId : null;

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    const res = await docs.uploadDocument(file, 'facturas-venta');
    setUploading(false);
    if (res) setF((prev) => ({ ...prev, adjuntoPath: res.adjuntoPath, adjuntoNombre: res.adjuntoNombre }));
  };

  return (
    <Modal title={initial && initial.id ? 'Editar factura de venta' : 'Nueva factura de venta'} onClose={onClose}>
      <div className="grid2">
        <Field label="Obra">
          <select
            value={f.obraId}
            onChange={(e) => {
              const oid = e.target.value;
              set('obraId', oid);
              const o = obras.find((x) => x.id === oid);
              if (o && o.clienteId && !f.clienteId) set('clienteId', o.clienteId);
            }}
          >
            <option value="">— Sin asignar —</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </Field>
        <Field label="Cliente">
          <select value={f.clienteId} onChange={(e) => set('clienteId', e.target.value)}>
            <option value="">— Sin asignar —</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid3">
        <Field label="Serie"><input value={f.serie || ''} onChange={(e) => set('serie', e.target.value)} placeholder="A" /></Field>
        <Field label="Número"><input value={f.numero || ''} onChange={(e) => set('numero', e.target.value)} placeholder="0001" /></Field>
        <Field label="Fecha de expedición"><input type="date" value={f.fechaExpedicion || ''} onChange={(e) => set('fechaExpedicion', e.target.value)} /></Field>
      </div>
      <div className="grid3">
        <Field label="Base imponible (€)"><input type="number" value={f.baseImponible} onChange={(e) => recalc(e.target.value, f.tipoIva)} /></Field>
        <Field label="IVA %"><input type="number" value={f.tipoIva} onChange={(e) => recalc(f.baseImponible, e.target.value)} /></Field>
        <Field label="Total (€)"><input type="number" value={f.total} onChange={(e) => set('total', e.target.value)} /></Field>
      </div>
      <div className="grid3">
        <Field label="Cobrada">
          <select value={f.cobrado ? '1' : '0'} onChange={(e) => set('cobrado', e.target.value === '1')}>
            <option value="0">Pendiente</option>
            <option value="1">Cobrada</option>
          </select>
        </Field>
        <Field label="Fecha de cobro"><input type="date" value={f.fechaCobro || ''} onChange={(e) => set('fechaCobro', e.target.value)} /></Field>
        <Field label="Método de cobro">
          <select value={f.metodoCobro || ''} onChange={(e) => set('metodoCobro', e.target.value)}>
            {METODOS_COBRO.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
      </div>
      <div className="field checkfield">
        <input type="checkbox" id="enb-venta" checked={!!f.enB} onChange={(e) => set('enB', e.target.checked)} />
        <label htmlFor="enb-venta">Cobro en B (no declarado — solo control interno)</label>
      </div>
      <Field label="Adjunto (PDF / foto)">
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" capture="environment" onChange={handleFile} disabled={uploading} />
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
