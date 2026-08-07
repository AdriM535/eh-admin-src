import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient.js';
import { rowToCamel } from '../../lib/utils.js';
import { fmtDate } from '../../lib/utils.js';

export default function Respaldos() {
  const [respaldos, setRespaldos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase.from('respaldos_semanales').select('*').order('fecha', { ascending: false });
    if (error) setErr(error.message);
    else { setErr(''); setRespaldos((rows || []).map(rowToCamel)); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const descargar = async (r) => {
    const { data, error } = await supabase.storage.from('respaldos').createSignedUrl(r.storagePath, 60);
    if (error || !data) { alert('No se pudo generar el enlace de descarga.'); return; }
    window.open(data.signedUrl, '_blank');
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Respaldos</h1>
          <div className="desc">
            Copia completa de todos los datos en Excel, generada sola cada semana (no hace falta abrir la app).
          </div>
        </div>
      </div>
      {err && (
        <div className="alertrow crit" style={{ marginBottom: 16 }}>
          <span className="tag">ERROR</span>{err} — ¿has ejecutado la migración 005 y desplegado la función weekly-backup?
        </div>
      )}
      <div className="tblwrap">
        <table>
          <thead><tr><th>Fecha</th><th>Archivo</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan="3" className="empty">Cargando…</td></tr>}
            {!loading && respaldos.length === 0 && !err && (
              <tr><td colSpan="3" className="empty">Todavía no se ha generado ningún respaldo. Se crea solo cada semana una vez configurado el Cron Trigger de la función weekly-backup.</td></tr>
            )}
            {respaldos.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.fecha)}</td>
                <td>{r.nombreArchivo}</td>
                <td><button className="btn ghost small" onClick={() => descargar(r)}>Descargar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
