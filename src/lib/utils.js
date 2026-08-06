export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const daysUntil = (d) => {
  if (!d) return null;
  const diff = new Date(d + 'T00:00:00') - new Date(todayISO() + 'T00:00:00');
  return Math.round(diff / 86400000);
};

export const toCamel = (str) => str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
export const toSnake = (str) => str.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());

export function rowToCamel(row) {
  if (row == null) return row;
  const out = {};
  for (const k in row) out[toCamel(k)] = row[k];
  return out;
}

export function objToSnake(obj) {
  const out = {};
  for (const k in obj) {
    if (obj[k] === undefined) continue;
    out[toSnake(k)] = obj[k];
  }
  return out;
}

// Postgres rejects '' for date/numeric columns — normalize empty strings to null
// before anything reaches the database.
export function sanitizeForDb(obj) {
  const out = {};
  for (const k in obj) {
    const v = obj[k];
    out[k] = v === '' ? null : v;
  }
  return out;
}

export function calcIva(baseImponible, tipoIva) {
  const base = Number(baseImponible) || 0;
  const tipo = Number(tipoIva) || 0;
  const totalIva = Math.round(base * (tipo / 100) * 100) / 100;
  return { totalIva, total: Math.round((base + totalIva) * 100) / 100 };
}
