export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }) + ' €';

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

export const trimestreDe = (fechaISO) => {
  if (!fechaISO) return null;
  const mes = Number(String(fechaISO).slice(5, 7));
  return isNaN(mes) ? null : Math.ceil(mes / 3);
};

export function calcLineaCompra(cantidad, precioUnitario, tasaIva) {
  const cant = Number(cantidad) || 0;
  const precio = Number(precioUnitario) || 0;
  const tasa = Number(tasaIva) || 0;
  const precioUnitarioConIva = Math.round(precio * (1 + tasa / 100) * 100) / 100;
  const importe = Math.round(cant * precioUnitarioConIva * 100) / 100;
  return { precioUnitarioConIva, importe };
}

// Líneas sin producto no se pueden guardar (la columna es NOT NULL en la
// base de datos), así que se descartan al guardar una factura de compra.
// Esta función es la única fuente de verdad para el total mostrado en el
// formulario, de modo que nunca cuente una línea que luego no se persiste.
export function lineasCompraValidas(lineas) {
  return (lineas || []).filter((l) => (l.producto || '').toString().trim());
}

export function totalLineasCompra(lineas) {
  return lineasCompraValidas(lineas).reduce((s, l) => s + (Number(l.importe) || 0), 0);
}

// Dirección de un cliente a partir de los campos estructurados (calle,
// número...) o, si no los tiene rellenos, del campo "dirección" antiguo de
// texto libre.
export function direccionCliente(c) {
  if (!c) return '';
  if (c.calle) {
    const linea1 = [c.calle, c.numero, c.interior].filter(Boolean).join(' ');
    const linea2 = [c.cp, c.municipio, c.provincia].filter(Boolean).join(', ');
    return [linea1, linea2].filter(Boolean).join(', ');
  }
  return c.direccion || '';
}

// Nómina periódica en bruto: salario bruto, % IRPF y cotizaciones a la
// Seguridad Social (empleado y empresa) -> líquido a percibir (lo que se
// lleva el trabajador) y coste empresa (bruto + SS empresa, lo que le
// cuesta a la empresa esta nómina).
export function calcNomina(f) {
  const bruto = Number(f.salarioBruto) || 0;
  const irpfPct = Number(f.irpfPorcentaje) || 0;
  const irpfImporte = Math.round(bruto * (irpfPct / 100) * 100) / 100;
  const ssEmpleado = Number(f.ssEmpleado) || 0;
  const ssEmpresa = Number(f.ssEmpresa) || 0;
  const horasExtra = Number(f.horasExtra) || 0;
  const adicionales = Number(f.adicionales) || 0;
  const deducciones = Number(f.deducciones) || 0;
  const liquido = Math.round((bruto - irpfImporte - ssEmpleado + horasExtra + adicionales - deducciones) * 100) / 100;
  const costeEmpresa = Math.round((bruto + ssEmpresa) * 100) / 100;
  return { irpfImporte, liquido, costeEmpresa };
}
