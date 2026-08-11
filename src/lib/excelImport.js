import * as XLSX from 'xlsx';

export function readWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        const sheets = {};
        wb.SheetNames.forEach((name) => {
          sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true });
        });
        resolve({ sheetNames: wb.SheetNames, sheets });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

export function guessColumn(headerRow, candidates) {
  const normalized = headerRow.map(norm);
  for (const cand of candidates) {
    const c = norm(cand);
    const exact = normalized.findIndex((h) => h === c);
    if (exact !== -1) return exact;
  }
  for (const cand of candidates) {
    const c = norm(cand);
    const partial = normalized.findIndex((h) => h && (h.includes(c) || c.includes(h)));
    if (partial !== -1) return partial;
  }
  return -1;
}

export function parseNumber(v) {
  if (v === '' || v == null) return null;
  if (typeof v === 'number') return v;
  let s = String(v).trim().replace(/[€\s]/g, '');
  if (!s) return null;
  if (/,\d{1,2}$/.test(s) && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/,\d{1,2}$/.test(s)) s = s.replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

const TRUTHY = new Set(['si', 'sí', 's', 'x', 'true', '1', 'yes', 'cobrado', 'pagado', 'cobrada', 'pagada']);
export function parseBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return TRUTHY.has(norm(v));
}

export function parseDate(v) {
  if (!v) return '';
  if (v instanceof Date && !isNaN(v)) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}

export function isRowEmpty(row) {
  return !row || row.every((c) => c === '' || c == null);
}

export function parseValue(raw, type) {
  if (type === 'number') return parseNumber(raw);
  if (type === 'date') return parseDate(raw);
  if (type === 'bool') return parseBool(raw);
  return raw == null ? '' : String(raw).trim();
}

// Especificaciones de los tres tipos de importación que ofrece la app.
// `candidates` son los nombres de columna habituales que la app intenta
// adivinar automáticamente contra las cabeceras del Excel subido.
export const IMPORT_SPECS = {
  ventas: {
    label: 'Facturas de venta',
    montoKey: 'total', // campo que debe traer el importe real — se avisa si queda vacío o en 0
    fields: [
      { key: 'clienteNombre', label: 'Cliente', candidates: ['nombre destinatario', 'cliente', 'destinatario'] },
      { key: 'clienteNif', label: 'DNI/NIE/NIF del cliente', candidates: ['dni', 'nie', 'nif', 'cif', 'identificacion'] },
      { key: 'obraNombre', label: 'Obra', candidates: ['proyecto / obra', 'obra', 'proyecto'] },
      { key: 'serie', label: 'Serie', candidates: ['serie'] },
      { key: 'numero', label: 'Número', candidates: ['numero', 'número', 'nº'] },
      { key: 'fechaExpedicion', label: 'Fecha expedición', type: 'date', candidates: ['fecha expedicion', 'fecha'] },
      { key: 'fechaCobro', label: 'Fecha de cobro', type: 'date', candidates: ['fecha operacion cobro', 'fecha cobro'] },
      { key: 'baseImponible', label: 'Base imponible', type: 'number', candidates: ['base imponible'] },
      { key: 'tipoIva', label: 'IVA %', type: 'number', candidates: ['tipo de iva', 'tipo iva', 'iva'] },
      { key: 'total', label: 'Total', type: 'number', candidates: ['total factura', 'total'] },
      { key: 'cobrado', label: 'Cobrada', type: 'bool', candidates: ['cobro', 'cobrado', 'cobrada'] },
      { key: 'metodoCobro', label: 'Método de cobro', candidates: ['cobro en cuenta', 'metodo de cobro', 'metalico'] },
      { key: 'enB', label: 'Cobro en B', type: 'bool', candidates: ['en b', 'b'] },
      { key: 'notas', label: 'Notas', candidates: ['notas', 'observaciones'] },
    ],
  },
  compras: {
    montoKey: 'importe',
    label: 'Facturas de compra',
    // Cada fila del Excel es UN PRODUCTO de una factura, no la factura entera
    // (igual que la hoja "Gastos" original). Varias filas con el mismo nº de
    // factura + fecha + proveedor se agrupan en una sola factura de compra
    // con varias líneas — ver groupFacturasCompra() más abajo.
    fields: [
      { key: 'fecha', label: 'Fecha', type: 'date', candidates: ['fecha expedicion', 'fecha'] },
      { key: 'obraNombre', label: 'Obra', candidates: ['proyecto / obra', 'obra', 'proyecto'] },
      { key: 'categoriaGeneral', label: 'Categoría (si no es de una obra)', candidates: ['categoria', 'insumo general', 'tipo'] },
      { key: 'numeroFactura', label: 'Nº de factura', candidates: ['identificacion factura del expedidor', 'numero de factura', 'nº factura'] },
      { key: 'proveedor', label: 'Comercio / proveedor', candidates: ['comercio', 'proveedor'] },
      { key: 'producto', label: 'Producto', candidates: ['producto'] },
      { key: 'cantidad', label: 'Cantidad', type: 'number', candidates: ['cantidad'] },
      { key: 'precioUnitario', label: 'Precio unidad', type: 'number', candidates: ['precio unid.', 'precio unidad', 'precio unid'] },
      { key: 'tasaIva', label: 'Tasa IVA %', type: 'number', candidates: ['tasa iva', 'iva %', 'iva'] },
      { key: 'precioUnitarioConIva', label: 'Precio unidad con IVA', type: 'number', candidates: ['precio unid. con iva', 'precio unidad con iva'] },
      { key: 'importe', label: 'Importe total', type: 'number', candidates: ['importe total', 'importe'] },
      { key: 'metodoPago', label: 'Método de pago', candidates: ['metodo de pago', 'pago'] },
      { key: 'pagadoPor', label: 'Pagado por', candidates: ['pago', 'pagado por'] },
      { key: 'pagado', label: 'Pagada', type: 'bool', candidates: ['pagado', 'pagada'] },
    ],
  },
  nominas: {
    label: 'Nóminas',
    montoKey: 'liquidado',
    fields: [
      { key: 'trabajador', label: 'Trabajador/a', candidates: ['trabajador/a', 'trabajador', 'nombre'] },
      { key: 'periodoInicio', label: 'Periodo inicio', type: 'date', candidates: ['inicio'] },
      { key: 'periodoFin', label: 'Periodo fin', type: 'date', candidates: ['fin'] },
      { key: 'liquidado', label: 'Liquidado a percibir', type: 'number', candidates: ['liquidado a percibir', 'liquidado'] },
      { key: 'cotizacionSs', label: 'Cotización SS', type: 'number', candidates: ['cotizacion seguridad social', 'cotizacion ss'] },
      { key: 'adicionales', label: 'Adicionales', type: 'number', candidates: ['adicional (b)', 'adicionales'] },
      { key: 'deducciones', label: 'Deducciones', type: 'number', candidates: ['deduccion errores', 'deducciones'] },
      { key: 'horasExtra', label: 'Horas extra', type: 'number', candidates: ['horas extras', 'horas extra'] },
      { key: 'total', label: 'Total', type: 'number', candidates: ['nomina total', 'total'] },
      { key: 'pagado', label: 'Pagada', type: 'bool', candidates: ['pagado', 'pagada'] },
      { key: 'fechaPago', label: 'Fecha de pago', type: 'date', candidates: ['fecha de pago'] },
      { key: 'notas', label: 'Notas', candidates: ['notas'] },
    ],
  },
  clientes: {
    label: 'Clientes',
    fields: [
      { key: 'nombre', label: 'Nombre', candidates: ['nombre destinatario', 'nombre', 'cliente', 'razon social'] },
      { key: 'nif', label: 'DNI/NIE/NIF', candidates: ['dni', 'nie', 'nif', 'cif', 'identificacion'] },
      { key: 'telefono', label: 'Teléfono', candidates: ['telefono', 'movil'] },
      { key: 'email', label: 'Email', candidates: ['email', 'correo'] },
      { key: 'calle', label: 'Calle', candidates: ['calle', 'direccion'] },
      { key: 'numero', label: 'Número', candidates: ['numero', 'número'] },
      { key: 'interior', label: 'Piso / interior', candidates: ['interior', 'piso'] },
      { key: 'municipio', label: 'Municipio', candidates: ['municipio', 'ciudad', 'poblacion'] },
      { key: 'provincia', label: 'Provincia', candidates: ['provincia'] },
      { key: 'cp', label: 'Código postal', candidates: ['cp', 'codigo postal'] },
      { key: 'notas', label: 'Notas', candidates: ['notas', 'observaciones'] },
    ],
  },
  obras: {
    label: 'Obras',
    fields: [
      { key: 'nombre', label: 'Nombre de la obra', candidates: ['obra', 'proyecto / obra', 'proyecto', 'nombre'] },
      { key: 'clienteNombre', label: 'Cliente', candidates: ['cliente', 'nombre destinatario'] },
      { key: 'direccion', label: 'Dirección', candidates: ['direccion'] },
      { key: 'ciudad', label: 'Ciudad', candidates: ['ciudad', 'municipio', 'poblacion'] },
      { key: 'estado', label: 'Estado', candidates: ['estado'] },
      { key: 'fechaInicio', label: 'Fecha inicio', type: 'date', candidates: ['fecha inicio', 'inicio'] },
      { key: 'fechaFin', label: 'Fecha fin', type: 'date', candidates: ['fecha fin', 'fin'] },
      { key: 'notas', label: 'Notas', candidates: ['notas', 'observaciones'] },
    ],
  },
  servicios: {
    label: 'Catálogo de servicios',
    montoKey: 'precioUnitario',
    fields: [
      { key: 'nombre', label: 'Nombre del servicio', candidates: ['nombre', 'servicio', 'concepto'] },
      { key: 'descripcion', label: 'Descripción', candidates: ['descripcion', 'detalle'] },
      { key: 'unidad', label: 'Unidad (m2, hora, ud…)', candidates: ['unidad', 'ud'] },
      { key: 'precioUnitario', label: 'Precio unidad', type: 'number', candidates: ['precio unidad', 'precio unitario', 'precio', 'importe'] },
      { key: 'categoria', label: 'Categoría', candidates: ['categoria'] },
    ],
  },
};

// Agrupa filas de producto (una por línea del Excel de compras) en facturas
// con varias líneas, usando nº de factura + fecha + proveedor como clave.
export function groupFacturasCompra(rows) {
  const groups = [];
  const index = new Map();
  rows.forEach((r) => {
    const key = [r.numeroFactura || '', r.fecha || '', norm(r.proveedor || '')].join('|');
    let g = index.get(key);
    if (!g) {
      g = {
        fecha: r.fecha, obraNombre: r.obraNombre, categoriaGeneral: r.categoriaGeneral,
        numeroFactura: r.numeroFactura, proveedor: r.proveedor, metodoPago: r.metodoPago,
        pagadoPor: r.pagadoPor, pagado: r.pagado, lineas: [],
      };
      index.set(key, g);
      groups.push(g);
    }
    if (r.producto) {
      g.lineas.push({
        producto: r.producto, cantidad: r.cantidad, precioUnitario: r.precioUnitario,
        tasaIva: r.tasaIva, precioUnitarioConIva: r.precioUnitarioConIva, importe: r.importe,
      });
    }
  });
  return groups;
}
