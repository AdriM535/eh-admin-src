import { useMemo, useState } from 'react';
import { readWorkbook, guessColumn, parseValue, isRowEmpty, IMPORT_SPECS, groupFacturasCompra } from '../../lib/excelImport.js';

const TIPOS = [
  { id: 'ventas', label: 'Facturas de venta', desc: 'Ingresos facturados a clientes.' },
  { id: 'compras', label: 'Facturas de compra', desc: 'Material, autónomos/subcontratas, vehículo…' },
  { id: 'nominas', label: 'Nóminas', desc: 'Liquidaciones del personal empleado.' },
  { id: 'clientes', label: 'Clientes', desc: 'Cartera de clientes: nombre, DNI/NIE, contacto y dirección.' },
  { id: 'obras', label: 'Obras', desc: 'Proyectos/servicios, vinculados a un cliente.' },
  { id: 'servicios', label: 'Catálogo de servicios', desc: 'Servicios para elegir al armar un presupuesto. Si un nombre ya existe, actualiza su precio en vez de duplicarlo.' },
];

const IMPORT_ACTIONS = {
  ventas: 'importFacturasVenta',
  compras: 'importFacturasCompra',
  nominas: 'importNominas',
  clientes: 'importClientes',
  obras: 'importObras',
  servicios: 'importServicios',
};

export default function Importar({ actions }) {
  const [tipo, setTipo] = useState(null);
  const [workbook, setWorkbook] = useState(null); // { sheetNames, sheets }
  const [sheetName, setSheetName] = useState('');
  const [headerRowIndex, setHeaderRowIndex] = useState(null);
  const [mapping, setMapping] = useState({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const spec = tipo ? IMPORT_SPECS[tipo] : null;
  const sheetRows = workbook && sheetName ? workbook.sheets[sheetName] : null;

  const reset = () => {
    setTipo(null);
    setWorkbook(null);
    setSheetName('');
    setHeaderRowIndex(null);
    setMapping({});
    setBusy(false);
    setProgress(null);
    setResult(null);
    setError('');
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      const wb = await readWorkbook(file);
      setWorkbook(wb);
      setSheetName(wb.sheetNames[0]);
      setHeaderRowIndex(null);
    } catch (err) {
      setError('No se pudo leer el archivo: ' + (err.message || err));
    }
  };

  const confirmHeaderRow = (idx) => {
    setHeaderRowIndex(idx);
    const headerRow = sheetRows[idx].map((c) => (c == null ? '' : String(c)));
    const guessed = {};
    spec.fields.forEach((f) => {
      guessed[f.key] = guessColumn(headerRow, f.candidates);
    });
    setMapping(guessed);
  };

  const headerRow = headerRowIndex != null ? sheetRows[headerRowIndex].map((c) => (c == null ? '' : String(c))) : null;
  const dataRows = useMemo(() => {
    if (headerRowIndex == null || !sheetRows) return [];
    return sheetRows.slice(headerRowIndex + 1).filter((r) => !isRowEmpty(r));
  }, [sheetRows, headerRowIndex]);

  const mappedRows = useMemo(() => {
    if (!spec || headerRowIndex == null) return [];
    return dataRows.map((row) => {
      const out = {};
      spec.fields.forEach((f) => {
        const idx = mapping[f.key];
        out[f.key] = idx == null || idx < 0 ? parseValue('', f.type) : parseValue(row[idx], f.type);
      });
      return out;
    });
  }, [dataRows, mapping, spec, headerRowIndex]);

  // Para compras, cada fila del Excel es un producto: se agrupan por factura
  // (nº + fecha + proveedor) antes de importar, así una factura con varias
  // líneas queda como un solo registro con sus productos, no uno por línea.
  const comprasGrupos = useMemo(() => (tipo === 'compras' ? groupFacturasCompra(mappedRows) : null), [tipo, mappedRows]);
  const importPayload = tipo === 'compras' ? comprasGrupos : mappedRows;

  // Aviso si la columna de importe no está mapeada o todas las filas dan 0 —
  // suele pasar cuando la fila de cabeceras elegida no era la correcta (hojas
  // con cabeceras repartidas en varias filas, como la de "Ingresos").
  const montoSinMapear = spec?.montoKey != null && (mapping[spec.montoKey] == null || mapping[spec.montoKey] < 0);
  const montoTodoCero = spec?.montoKey != null && mappedRows.length > 0 && mappedRows.every((r) => !r[spec.montoKey]);

  const runImport = async () => {
    setBusy(true);
    setProgress({ done: 0, total: importPayload.length });
    try {
      const fn = actions[IMPORT_ACTIONS[tipo]];
      const r = await fn(importPayload, (done, total) => setProgress({ done, total }));
      setResult(r);
    } catch (err) {
      setError('Error durante la importación: ' + (err.message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Importar desde Excel</h1>
          <div className="desc">Sube un Excel de facturas de venta, de compra o de nóminas y mapea sus columnas</div>
        </div>
      </div>

      {error && <div className="alertrow crit" style={{ marginBottom: 16 }}><span className="tag">ERROR</span>{error}</div>}

      {/* Paso 1: elegir tipo */}
      {!tipo && (
        <div className="cards">
          {TIPOS.map((t) => (
            <div className="ficha" key={t.id} style={{ cursor: 'pointer' }} onClick={() => setTipo(t.id)}>
              <h3>{t.label}</h3>
              <div className="meta">{t.desc}</div>
              <div className="rowbtns"><button className="btn small">Importar {t.label.toLowerCase()}</button></div>
            </div>
          ))}
        </div>
      )}

      {/* Paso 2: subir archivo */}
      {tipo && !workbook && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: 20 }}>
          <div className="desc" style={{ marginBottom: 12 }}>Importando: <b>{spec.label}</b> — <button className="btn ghost small" onClick={reset}>cambiar</button></div>
          <input type="file" accept=".xlsx,.xls" onChange={handleFile} />
        </div>
      )}

      {/* Paso 3: elegir hoja + fila de cabeceras */}
      {tipo && workbook && headerRowIndex == null && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: 20 }}>
          {workbook.sheetNames.length > 1 && (
            <div className="field" style={{ maxWidth: 320 }}>
              <label>Hoja del Excel</label>
              <select value={sheetName} onChange={(e) => { setSheetName(e.target.value); setHeaderRowIndex(null); }}>
                {workbook.sheetNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}
          <div className="desc" style={{ margin: '10px 0' }}>
            Haz clic en la fila que contiene los nombres de columna (Fecha, Cliente, Importe…). Las filas anteriores se ignoran.
          </div>
          <div className="tblwrap" style={{ maxHeight: 340, overflowY: 'auto' }}>
            <table>
              <tbody>
                {sheetRows.slice(0, 20).map((row, idx) => (
                  <tr key={idx} style={{ cursor: 'pointer' }} onClick={() => confirmHeaderRow(idx)}>
                    <td style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>{idx + 1}</td>
                    {row.slice(0, 10).map((c, ci) => <td key={ci}>{c instanceof Date ? c.toLocaleDateString('es-ES') : String(c)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paso 4: mapeo de columnas + vista previa */}
      {tipo && headerRowIndex != null && !result && (
        <>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: 20, marginBottom: 20 }}>
            <div className="section-title" style={{ marginTop: 0 }}>Qué columna corresponde a cada dato</div>
            <div className="grid2">
              {spec.fields.map((f) => (
                <div className="field" key={f.key}>
                  <label>{f.label}</label>
                  <select
                    value={mapping[f.key] ?? -1}
                    onChange={(e) => setMapping((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))}
                  >
                    <option value={-1}>— No usar —</option>
                    {headerRow.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {(montoSinMapear || montoTodoCero) && (
            <div className="alertrow crit" style={{ marginBottom: 16 }}>
              <span className="tag">Revisa esto</span>
              {montoSinMapear
                ? 'No has indicado qué columna trae el importe — sin eso, todas las filas se importarán con importe 0.'
                : 'La columna de importe que elegiste está vacía o da 0 en todas las filas. Es muy probable que la fila de cabeceras no sea la correcta (algunas hojas, como "Ingresos", tienen las cabeceras repartidas en dos filas) — vuelve al paso anterior y prueba con otra fila.'}
            </div>
          )}

          <div className="section-title">
            Vista previa <span className="count">{dataRows.length} fila(s) detectadas</span>
            {tipo === 'compras' && <span className="count">{comprasGrupos.length} factura(s) agrupadas</span>}
          </div>
          <div className="tblwrap" style={{ marginBottom: 20 }}>
            <table>
              <thead><tr>{spec.fields.map((f) => <th key={f.key}>{f.label}</th>)}</tr></thead>
              <tbody>
                {mappedRows.slice(0, 8).map((r, i) => (
                  <tr key={i}>{spec.fields.map((f) => <td key={f.key}>{r[f.key] === true ? 'Sí' : r[f.key] === false ? 'No' : (r[f.key] ?? '—') || '—'}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="btn ghost" onClick={reset}>Cancelar</button>
            <button className="btn ghost" onClick={() => setHeaderRowIndex(null)}>← Elegir otra fila de cabecera</button>
            <button className="btn" disabled={busy || importPayload.length === 0} onClick={runImport}>
              {busy
                ? `Importando ${progress ? `${progress.done}/${progress.total}` : '…'}`
                : tipo === 'compras'
                ? `Importar ${comprasGrupos.length} factura(s)`
                : `Importar ${dataRows.length} fila(s)`}
            </button>
          </div>
        </>
      )}

      {/* Paso 5: resultado */}
      {result && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: 20 }}>
          <div className="section-title" style={{ marginTop: 0 }}>Importación terminada</div>
          <div className="ledger" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
            <div className="cell ok"><div className="lbl">Importadas correctamente</div><div className="val">{result.ok}</div></div>
            <div className={'cell' + (result.fail > 0 ? ' warn' : '')}><div className="lbl">Con error</div><div className="val">{result.fail}</div></div>
          </div>
          {(result.creados != null || result.actualizados != null) && (
            <div className="ledger" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginTop: -18 }}>
              <div className="cell"><div className="lbl">Nuevos</div><div className="val">{result.creados}</div></div>
              <div className="cell"><div className="lbl">Actualizados (ya existían)</div><div className="val">{result.actualizados}</div></div>
            </div>
          )}
          {result.errors.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--ink-soft)', maxHeight: 200, overflowY: 'auto' }}>
              {result.errors.slice(0, 30).map((e, i) => <div key={i}>{e}</div>)}
              {result.errors.length > 30 && <div>…y {result.errors.length - 30} más</div>}
            </div>
          )}
          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="btn" onClick={reset}>Importar otro archivo</button>
          </div>
        </div>
      )}
    </>
  );
}
