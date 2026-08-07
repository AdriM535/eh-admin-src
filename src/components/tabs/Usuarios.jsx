import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient.js';
import { rowToCamel, objToSnake } from '../../lib/utils.js';

export default function Usuarios({ data }) {
  const [perfiles, setPerfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase.from('perfiles').select('*').order('created_at', { ascending: true });
    if (error) setErr(error.message);
    else { setErr(''); setPerfiles((rows || []).map(rowToCamel)); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (id, patch) => {
    setSavingId(id);
    const { error } = await supabase.from('perfiles').update(objToSnake(patch)).eq('id', id);
    setSavingId(null);
    if (error) { alert(error.message); return; }
    load();
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Usuarios</h1>
          <div className="desc">
            Quién puede entrar y qué puede ver. Las cuentas nuevas entran como "Operario" (solo foto de factura de
            compra y justificar caja) hasta que las asciendas aquí a Admin.
          </div>
        </div>
      </div>
      {err && (
        <div className="alertrow crit" style={{ marginBottom: 16 }}>
          <span className="tag">ERROR</span>{err} — ¿has ejecutado la migración 005 (migration_005_roles_direcciones_envios.sql) en Supabase?
        </div>
      )}
      <div className="tblwrap">
        <table>
          <thead><tr><th>Email</th><th>Rol</th><th>Vinculado a (Personal)</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan="3" className="empty">Cargando…</td></tr>}
            {!loading && perfiles.length === 0 && !err && <tr><td colSpan="3" className="empty">Sin usuarios registrados todavía.</td></tr>}
            {perfiles.map((p) => (
              <tr key={p.id}>
                <td>{p.email || p.id}</td>
                <td>
                  <select value={p.role} disabled={savingId === p.id} onChange={(e) => update(p.id, { role: e.target.value })}>
                    <option value="admin">Admin (ve todo)</option>
                    <option value="operario">Operario (foto factura + caja)</option>
                  </select>
                </td>
                <td>
                  <select value={p.personalId || ''} disabled={savingId === p.id} onChange={(e) => update(p.id, { personalId: e.target.value || null })}>
                    <option value="">— Sin vincular —</option>
                    {data.personal.map((per) => <option key={per.id} value={per.id}>{per.nombre}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
