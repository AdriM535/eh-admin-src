import * as XLSX from 'xlsx';
import { todayISO, trimestreDe } from './utils.js';
import { CATEGORIAS_GENERALES } from './constants.js';

// Cuentas contables por defecto (Plan General Contable español, orientativas).
// Sirven para que la gestoría/programa de contabilidad sepa qué cuenta se ve
// afectada en cada movimiento — revísalas con tu asesor antes de usarlas
// como definitivas, cada gestoría puede preferir una codificación distinta.
const cuentaCobroPago = (metodo) => (metodo === 'efectivo' ? '570 Caja' : '572 Bancos');

function cuentasVenta(f) {
  const haber = '700 Prestación de servicios';
  const debe = f.cobrado ? cuentaCobroPago(f.metodoCobro) : '430 Clientes';
  return { debe, haber };
}

function cuentasAbono(a) {
  const debe = cuentaCobroPago(a.metodoCobro);
  const haber = a.esAnticipo ? '438 Anticipos de clientes' : '430 Clientes';
  return { debe, haber };
}

function cuentasCompra(f) {
  let debe = '600 Compras de materiales';
  if (!f.obraId) {
    if (f.categoriaGeneral === 'gasolina' || f.categoriaGeneral === 'mantenimiento') debe = '628 Suministros y servicios exteriores';
    else if (f.categoriaGeneral === 'autonomo') debe = '623 Servicios de profesionales independientes';
    else if (f.categoriaGeneral === 'otro') debe = '629 Otros servicios';
  }
  // Si sale de una entrega de caja, el efectivo ya salió al hacer la entrega
  // — aquí solo se liquida el anticipo, no vuelve a salir dinero de caja.
  const haber = f.entregaEfectivoId ? '460 Anticipos de remuneraciones a personal' : f.pagado ? cuentaCobroPago(f.metodoPago) : '400 Proveedores';
  return { debe, haber };
}

function cuentasNomina(n) {
  const debe = n.tipo === 'bono_extra' ? '640 Sueldos y salarios (bono/extra)' : '640 Sueldos y salarios';
  const haber = n.pagado ? '572 Bancos' : '465 Remuneraciones pendientes de pago';
  return { debe, haber };
}

export function exportToExcel(data, calc) {
  const { clienteById, obraById, personalById } = calc;
  const wb = XLSX.utils.book_new();

  // ------------- Ingresos y Egresos (libro diario simplificado) -------------
  const movimientos = [];
  data.facturasVenta.forEach((f) => {
    const o = obraById(f.obraId);
    const c = clienteById(f.clienteId);
    const { debe, haber } = cuentasVenta(f);
    movimientos.push({
      Fecha: f.fechaExpedicion || '', Tipo: 'Ingreso', Concepto: `Factura venta ${f.serie || ''}${f.numero || ''}`.trim(),
      Obra: o ? o.nombre : '', Tercero: c ? c.nombre : '', 'Importe (€)': f.total,
      Estado: f.cobrado ? 'Cobrado' : 'Pendiente', Método: f.metodoCobro || '',
      'Cuenta (Debe)': debe, 'Cuenta (Haber)': haber, 'En B': f.enB ? 'Sí' : 'No',
    });
  });
  data.abonos.forEach((a) => {
    const o = obraById(a.obraId);
    const c = clienteById(a.clienteId);
    const { debe, haber } = cuentasAbono(a);
    movimientos.push({
      Fecha: a.fecha || '', Tipo: 'Ingreso', Concepto: a.concepto || (a.esAnticipo ? 'Anticipo' : 'Abono'),
      Obra: o ? o.nombre : '', Tercero: c ? c.nombre : '', 'Importe (€)': a.importe,
      Estado: 'Cobrado', Método: a.metodoCobro || '',
      'Cuenta (Debe)': debe, 'Cuenta (Haber)': haber, 'En B': a.enB ? 'Sí' : 'No',
    });
  });
  data.facturasCompra.forEach((f) => {
    const o = obraById(f.obraId);
    const { debe, haber } = cuentasCompra(f);
    movimientos.push({
      Fecha: f.fecha || '', Tipo: 'Egreso', Concepto: `Factura compra ${f.numeroFactura || ''} — ${f.proveedor || ''}`.trim(),
      Obra: o ? o.nombre : (CATEGORIAS_GENERALES.find((c) => c.id === f.categoriaGeneral)?.label || ''),
      Tercero: f.proveedor || '', 'Importe (€)': f.total,
      Estado: f.pagado ? 'Pagado' : 'Pendiente', Método: f.metodoPago || '',
      'Cuenta (Debe)': debe, 'Cuenta (Haber)': haber, 'En B': '',
    });
  });
  data.nominas.forEach((n) => {
    const p = personalById(n.personalId);
    const { debe, haber } = cuentasNomina(n);
    movimientos.push({
      Fecha: n.fechaPago || n.periodoFin || '', Tipo: 'Egreso', Concepto: n.tipo === 'bono_extra' ? `Bono/extra — ${n.notas || ''}`.trim() : 'Nómina',
      Obra: '', Tercero: p ? p.nombre : '', 'Importe (€)': n.total,
      Estado: n.pagado ? 'Pagado' : 'Pendiente', Método: '',
      'Cuenta (Debe)': debe, 'Cuenta (Haber)': haber, 'En B': '',
    });
  });
  data.entregasEfectivo.forEach((e) => {
    const p = personalById(e.personalId);
    movimientos.push({
      Fecha: e.fecha || '', Tipo: 'Egreso', Concepto: `Entrega de efectivo — ${e.concepto || ''}`.trim(),
      Obra: '', Tercero: p ? p.nombre : '', 'Importe (€)': e.importe,
      Estado: 'Pagado', Método: 'efectivo',
      'Cuenta (Debe)': '460 Anticipos de remuneraciones a personal', 'Cuenta (Haber)': '570 Caja', 'En B': '',
    });
  });
  movimientos.sort((a, b) => (a.Fecha || '').localeCompare(b.Fecha || ''));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(movimientos), 'Ingresos y Egresos');

  const obraRows = data.obras.map((o) => {
    const s = calc.obraStats(o.id);
    const c = clienteById(o.clienteId);
    return {
      Obra: o.nombre,
      Cliente: c ? c.nombre : '',
      Dirección: o.direccion || '',
      Ciudad: o.ciudad || '',
      Estado: o.estado,
      'Fecha inicio': o.fechaInicio || '',
      'Fecha fin': o.fechaFin || '',
      'Facturado (€)': s.totalFacturado,
      'Cobrado (€)': s.totalCobrado,
      'Pendiente de cobro (€)': s.pendienteCobro,
      'Gastos (€)': s.totalGastos,
      'Margen (€)': s.margen,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(obraRows), 'Obras');

  const clienteRows = data.clientes.map((c) => ({ Nombre: c.nombre, NIF: c.nif || '', Teléfono: c.telefono || '', Email: c.email || '', Dirección: c.direccion || '' }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clienteRows), 'Clientes');

  const ventaRows = data.facturasVenta.map((f) => {
    const o = obraById(f.obraId);
    const c = clienteById(f.clienteId);
    return {
      Fecha: f.fechaExpedicion || '',
      Serie: f.serie || '',
      Número: f.numero || '',
      Obra: o ? o.nombre : '',
      Cliente: c ? c.nombre : '',
      'Base imponible (€)': f.baseImponible || '',
      'IVA %': f.tipoIva ?? '',
      'Total (€)': f.total,
      Cobrado: f.cobrado ? 'Sí' : 'No',
      'Método de cobro': f.metodoCobro || '',
      'En B': f.enB ? 'Sí' : 'No',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ventaRows), 'Facturas de venta');

  const compraRows = data.facturasCompra.map((f) => {
    const o = obraById(f.obraId);
    const p = personalById(f.personalId);
    return {
      Año: (f.fecha || '').slice(0, 4) || '',
      Trimestre: trimestreDe(f.fecha) ? `T${trimestreDe(f.fecha)}` : '',
      Fecha: f.fecha || '',
      Obra: o ? o.nombre : '',
      'Categoría (si no es de obra)': o ? '' : CATEGORIAS_GENERALES.find((c) => c.id === f.categoriaGeneral)?.label || f.categoriaGeneral || '',
      Comercio: f.proveedor || '',
      'Autónomo/subcontrata': p ? p.nombre : '',
      'Nº Factura': f.numeroFactura || '',
      'Total (€)': f.total,
      'Método de pago': f.metodoPago || '',
      Pagado: f.pagado ? 'Sí' : 'No',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(compraRows), 'Facturas de compra');

  const lineaCompraRows = data.facturaCompraLineas
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((l) => {
      const f = data.facturasCompra.find((x) => x.id === l.facturaCompraId);
      return {
        Fecha: f ? f.fecha || '' : '',
        'Nº Factura': f ? f.numeroFactura || '' : '',
        Comercio: f ? f.proveedor || '' : '',
        Producto: l.producto,
        Cantidad: l.cantidad,
        'Precio unidad (€)': l.precioUnitario,
        'Tasa IVA %': l.tasaIva,
        'Precio unidad con IVA (€)': l.precioUnitarioConIva,
        'Importe (€)': l.importe,
      };
    });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lineaCompraRows), 'Productos de compra');

  const entregaRows = calc.entregasConStats.map((e) => {
    const p = personalById(e.personalId);
    return {
      Fecha: e.fecha || '', Persona: p ? p.nombre : '', Concepto: e.concepto || '',
      'Entregado (€)': e.importe, 'Justificado (€)': e.stats.justificado, 'Pendiente (€)': e.stats.pendiente,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(entregaRows), 'Caja');

  const abonoRows = data.abonos.map((a) => {
    const o = obraById(a.obraId);
    const c = clienteById(a.clienteId);
    return {
      Fecha: a.fecha || '',
      Obra: o ? o.nombre : '',
      Cliente: c ? c.nombre : '',
      'Importe (€)': a.importe,
      Concepto: a.concepto || '',
      Anticipo: a.esAnticipo ? 'Sí' : 'No',
      'Método de cobro': a.metodoCobro || '',
      'En B': a.enB ? 'Sí' : 'No',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(abonoRows), 'Abonos');

  const nominaRows = data.nominas.map((n) => {
    const p = personalById(n.personalId);
    return {
      Trabajador: p ? p.nombre : '',
      'Periodo inicio': n.periodoInicio || '',
      'Periodo fin': n.periodoFin || '',
      'Liquidado (€)': n.liquidado,
      'Cotización SS (€)': n.cotizacionSs,
      'Adicionales (€)': n.adicionales,
      'Horas extra (€)': n.horasExtra,
      'Total (€)': n.total,
      Pagado: n.pagado ? 'Sí' : 'No',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(nominaRows), 'Nóminas');

  const presupuestoRows = data.presupuestos.map((p) => {
    const c = clienteById(p.clienteId);
    const o = obraById(p.obraId);
    return { Número: p.numero || '', Fecha: p.fecha || '', Cliente: c ? c.nombre : '', Obra: o ? o.nombre : '', Estado: p.estado, 'Total (€)': p.total };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(presupuestoRows), 'Presupuestos');

  const incidenciaRows = data.incidencias.map((i) => {
    const o = obraById(i.obraId);
    const p = personalById(i.personalId);
    return { Fecha: i.fecha || '', Obra: o ? o.nombre : '', Responsable: p ? p.nombre : '', Descripción: i.descripcion, 'Coste (€)': i.coste || '', 'Asumido por empleado': i.asumidoEmpleado ? 'Sí' : 'No', Estado: i.estado };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incidenciaRows), 'Incidencias');

  XLSX.writeFile(wb, `Estructuras-Humanizadoras-${todayISO()}.xlsx`);
}
