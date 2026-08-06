import { useMemo, useState } from 'react';
import { readWorkbook, guessColumn, parseValue, isRowEmpty, IMPORT_SPECS } from '../../lib/excelImport.js';

const TIPOS = [
  { id: 'ventas', label: 'Facturas de venta', desc: 'Ingresos facturados a clientes.' },
  { id: 'compras', label: 'Facturas de compra', desc: 'Material, autónomos/subcontratas, vehículo…' },
  { id: 'nominas', label: 'Nóminas', desc: 'Liquidaciones del personal empleado.' },
];

const IMPORT_ACTIONS = {
  ventas: 'importFacturasVenta',
  compras: 'importFacturasCompra',
  nominas: 'importNominas',
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

  const runImport = async () => {
    setBusy(true);
    setProgress({ done: 0, total: mappedRows.length });
    try {
      const fn = actions[IMPORT_ACTIONS[tipo]];
      const r = await fn(mappedRows, (done, total) => setProgress({ done, total }));
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

          <div className="section-title">Vista previa <span className="count">{dataRows.length} fila(s) detectadas</span></div>
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
            <button className="btn" disabled={busy || mappedRows.length === 0} onClick={runImport}>
              {busy ? `Importando ${progress ? `${progress.done}/${progress.total}` : '…'}` : `Importar ${dataRows.length} fila(s)`}
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
