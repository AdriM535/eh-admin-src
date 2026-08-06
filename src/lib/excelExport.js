import * as XLSX from 'xlsx';
import { todayISO, trimestreDe } from './utils.js';
import { CATEGORIAS_GENERALES } from './constants.js';

export function exportToExcel(data, calc) {
  const { clienteById, obraById, personalById } = calc;
  const wb = XLSX.utils.book_new();

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
