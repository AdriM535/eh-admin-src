import { MES_CORTO, CATEGORIAS_INDIRECTAS, IVA_RECUPERABLE } from './constants.js';

// Todos los valores derivados de `data` que se reutilizan entre pestañas.
// Se recalcula en cada render (el volumen de datos de esta app es pequeño).
export function computeAll(data) {
  const currentYear = new Date().getFullYear();

  const clienteById = (id) => data.clientes.find((c) => c.id === id);
  const obraById = (id) => data.obras.find((o) => o.id === id);
  const personalById = (id) => data.personal.find((p) => p.id === id);

  const sum = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);

  // ---------------- bases imponibles (sin IVA), solo para el margen ----------------
  // "Facturado"/"Cobrado"/"Gastos" siguen mostrando el total CON IVA tal
  // cual aparece en la factura — eso no cambia. Pero el IVA no es beneficio
  // ni coste real (es dinero de paso hacia Hacienda), así que el MARGEN se
  // calcula aparte, sobre bases imponibles. Ver IVA_RECUPERABLE en
  // constants.js para el criterio y cómo cambiarlo.
  const baseVenta = (f) => (f.baseImponible != null && f.baseImponible !== '' ? Number(f.baseImponible) : Number(f.total) || 0);
  const ventaBaseEsAproximada = (f) => f.baseImponible == null || f.baseImponible === '';

  const lineasPorCompra = {};
  data.facturaCompraLineas.forEach((l) => {
    (lineasPorCompra[l.facturaCompraId] = lineasPorCompra[l.facturaCompraId] || []).push(l);
  });
  const baseCompra = (f) => {
    const lns = lineasPorCompra[f.id];
    if (!lns || lns.length === 0) return Number(f.total) || 0; // sin líneas: no hay forma de separar el IVA, se usa el total como aproximación
    return sum(lns, (l) => Number(l.cantidad || 0) * Number(l.precioUnitario || 0));
  };
  const compraBaseEsAproximada = (f) => !lineasPorCompra[f.id] || lineasPorCompra[f.id].length === 0;

  // Si el IVA no fuera recuperable (régimen distinto al general), el IVA de
  // las compras es coste real -> se usa el total con IVA también para el margen.
  const baseOTotalVenta = (f) => (IVA_RECUPERABLE ? baseVenta(f) : Number(f.total) || 0);
  const baseOTotalCompra = (f) => (IVA_RECUPERABLE ? baseCompra(f) : Number(f.total) || 0);

  // ---------------- prorrateo de gastos indirectos entre obras ----------------
  // Las facturas de compra sin obra asignada y con una categoría "indirecta"
  // (papelería, impuestos, personal administrativo…), más el total de
  // nóminas del mes, son gasto de operación de toda la empresa. Cada mes se
  // reparten entre las obras que tuvieron movimiento directo ese mes
  // (facturaron o gastaron algo), en proporción a lo que facturó cada una —
  // así el margen de una obra no es solo su coste directo, sino lo que
  // realmente le corresponde del gasto general.
  //
  // Se calcula dos veces con la misma lógica: una con cifras CON IVA (para
  // la columna "Indirecto" que ya se mostraba, sin cambios de comportamiento)
  // y otra sobre bases imponibles (solo para el margen corregido, ver más abajo).
  function prorratearIndirectos(totalCompraIndirecta, totalVenta) {
    const gastosIndirectosPorMes = {}; // ym -> total del mes
    const indirectoPorObraMes = {}; // `${obraId}|${ym}` -> importe asignado
    const indirectoPorObraTotal = {}; // obraId -> importe acumulado (todos los meses)
    let gastosIndirectosSinAsignar = 0; // meses con gasto indirecto pero ninguna obra con movimiento

    data.facturasCompra
      .filter((f) => !f.obraId && CATEGORIAS_INDIRECTAS.includes(f.categoriaGeneral))
      .forEach((f) => {
        const ym = (f.fecha || '').slice(0, 7);
        if (!ym) return;
        gastosIndirectosPorMes[ym] = (gastosIndirectosPorMes[ym] || 0) + totalCompraIndirecta(f);
      });

    data.nominas.forEach((n) => {
      const ym = (n.fechaPago || n.periodoFin || '').slice(0, 7);
      if (!ym) return;
      gastosIndirectosPorMes[ym] = (gastosIndirectosPorMes[ym] || 0) + Number(n.total || 0);
    });

    Object.entries(gastosIndirectosPorMes).forEach(([ym, totalIndirecto]) => {
      const facturadoPorObra = {};
      data.facturasVenta
        .filter((f) => f.obraId && (f.fechaExpedicion || '').slice(0, 7) === ym)
        .forEach((f) => { facturadoPorObra[f.obraId] = (facturadoPorObra[f.obraId] || 0) + totalVenta(f); });

      const obrasConMovimiento = new Set(Object.keys(facturadoPorObra));
      data.facturasCompra
        .filter((f) => f.obraId && (f.fecha || '').slice(0, 7) === ym)
        .forEach((f) => obrasConMovimiento.add(f.obraId));

      const totalFacturadoMes = Object.values(facturadoPorObra).reduce((s, v) => s + v, 0);

      if (totalFacturadoMes > 0) {
        obrasConMovimiento.forEach((obraId) => {
          const importe = totalIndirecto * ((facturadoPorObra[obraId] || 0) / totalFacturadoMes);
          indirectoPorObraMes[`${obraId}|${ym}`] = importe;
          indirectoPorObraTotal[obraId] = (indirectoPorObraTotal[obraId] || 0) + importe;
        });
      } else if (obrasConMovimiento.size > 0) {
        // Nadie facturó ese mes pero hubo gasto directo en alguna obra: se
        // reparte a partes iguales entre esas obras como respaldo.
        const importe = totalIndirecto / obrasConMovimiento.size;
        obrasConMovimiento.forEach((obraId) => {
          indirectoPorObraMes[`${obraId}|${ym}`] = importe;
          indirectoPorObraTotal[obraId] = (indirectoPorObraTotal[obraId] || 0) + importe;
        });
      } else {
        // Ninguna obra tuvo movimiento ese mes: no hay a quién asignárselo.
        gastosIndirectosSinAsignar += totalIndirecto;
      }
    });

    const gastosIndirectosTotal = sum(Object.values(gastosIndirectosPorMes), (v) => v);
    return { gastosIndirectosPorMes, indirectoPorObraMes, indirectoPorObraTotal, gastosIndirectosSinAsignar, gastosIndirectosTotal };
  }

  const indirectosConIva = prorratearIndirectos((f) => Number(f.total || 0), (f) => Number(f.total || 0));
  const indirectosBase = prorratearIndirectos(baseOTotalCompra, baseOTotalVenta);
  const {
    gastosIndirectosPorMes, indirectoPorObraMes, indirectoPorObraTotal,
    gastosIndirectosSinAsignar, gastosIndirectosTotal,
  } = indirectosConIva;

  // ---------------- estadísticas por obra ----------------
  const obraStats = (obraId) => {
    const ventas = data.facturasVenta.filter((f) => f.obraId === obraId);
    const compras = data.facturasCompra.filter((f) => f.obraId === obraId);
    const abonosObra = data.abonos.filter((a) => a.obraId === obraId);
    const incidenciasObra = data.incidencias.filter((i) => i.obraId === obraId);
    const presupuestosObra = data.presupuestos.filter((p) => p.obraId === obraId && p.estado === 'aceptado');
    const totalPresupuestado = sum(presupuestosObra, (p) => p.total);

    // ---- cifras CON IVA: lo que aparece en la factura, columnas sin cambios ----
    const totalFacturado = sum(ventas, (f) => f.total);
    const totalCobradoFacturas = sum(ventas.filter((f) => f.cobrado), (f) => f.total);
    const totalAbonos = sum(abonosObra, (a) => a.importe);
    const totalCobrado = totalCobradoFacturas + totalAbonos;
    const pendienteCobro = Math.max(0, totalFacturado - totalCobradoFacturas);

    const totalCompras = sum(compras, (f) => f.total);
    const costeIncidenciasEmpresa = sum(incidenciasObra.filter((i) => !i.asumidoEmpleado), (i) => i.coste);
    const costeIncidenciasEmpleado = sum(incidenciasObra.filter((i) => i.asumidoEmpleado), (i) => i.coste);
    const totalGastos = totalCompras + costeIncidenciasEmpresa;

    const costeIndirecto = indirectoPorObraTotal[obraId] || 0;
    const totalGastosConIndirecto = totalGastos + costeIndirecto;

    // ---- margen: sobre bases imponibles (sin IVA) — ver IVA_RECUPERABLE ----
    const facturadoBase = sum(ventas, baseOTotalVenta);
    const comprasBase = sum(compras, baseOTotalCompra);
    const costeIndirectoBase = indirectosBase.indirectoPorObraTotal[obraId] || 0;
    const gastosBase = comprasBase + costeIncidenciasEmpresa; // las incidencias no llevan IVA
    const margen = facturadoBase - gastosBase;
    const margenReal = margen - costeIndirectoBase;

    // El margen es una ESTIMACIÓN (no un resultado definitivo) cuando:
    // falta el desglose de base imponible en alguna venta/compra (se usó el
    // total como aproximación), o la obra sigue en curso (pueden faltar
    // costes todavía por registrar/facturar).
    const obra = obraById(obraId);
    const margenEstimado =
      ventas.some(ventaBaseEsAproximada) ||
      compras.some(compraBaseEsAproximada) ||
      (obra ? obra.estado !== 'finalizada' : true);

    return {
      ventas, compras, abonosObra, incidenciasObra, presupuestosObra, totalPresupuestado,
      totalFacturado, totalCobrado, totalCobradoFacturas, totalAbonos, pendienteCobro,
      totalCompras, costeIncidenciasEmpresa, costeIncidenciasEmpleado, totalGastos,
      costeIndirecto, totalGastosConIndirecto,
      facturadoBase, comprasBase, costeIndirectoBase, margen, margenReal, margenEstimado,
    };
  };

  const obrasConStats = data.obras.map((o) => ({ ...o, stats: obraStats(o.id) }));

  const pendienteCobroTotal = sum(data.facturasVenta.filter((f) => !f.cobrado), (f) => f.total);
  const pendientePagoTotal = sum(data.facturasCompra.filter((f) => !f.pagado), (f) => f.total);
  const totalEnB = sum(data.facturasVenta.filter((f) => f.enB), (f) => f.total) + sum(data.abonos.filter((a) => a.enB), (a) => a.importe);

  // desglose por método de pago/cobro (efectivo / tarjeta / transferencia / cuenta)
  const desgloseMetodo = (arr, campo) => {
    const acc = {};
    arr.forEach((x) => {
      const k = x[campo] || 'sin especificar';
      acc[k] = (acc[k] || 0) + Number(x.total || x.importe || 0);
    });
    return acc;
  };

  // Fecha "de alta" de una obra: se usa la de inicio si la rellenaron, si no
  // la de creación del registro — para poder contar cuántas obras nuevas
  // arrancaron en un mes/año concreto.
  const fechaAltaObra = (o) => (o.fechaInicio || o.createdAt || '').slice(0, 7);

  // ---------------- panorama de un mes concreto (YYYY-MM) ----------------
  // Parametrizado para que el Panorama deje elegir cualquier mes/año, no
  // solo el actual.
  const statsForMonth = (ym) => {
    const ventasMes = data.facturasVenta.filter((f) => (f.fechaExpedicion || '').slice(0, 7) === ym);
    const comprasMes = data.facturasCompra.filter((f) => (f.fecha || '').slice(0, 7) === ym);
    const nominasMes = data.nominas.filter((n) => (n.fechaPago || n.periodoFin || '').slice(0, 7) === ym);
    const obrasNuevasMes = data.obras.filter((o) => fechaAltaObra(o) === ym);

    // Facturado declarado vs. cobrado en B: se muestran por separado porque
    // el "en B" es dinero real cobrado pero no declarado, así que no debe
    // confundirse con la facturación oficial — el total de ingresos es la
    // suma de ambos.
    const abonosMesEnB = data.abonos.filter((a) => a.enB && (a.fecha || '').slice(0, 7) === ym);
    // "Facturado"/"Ingresos"/"Gastos" con IVA: lo que aparece en las
    // facturas tal cual, sin cambios respecto a como se mostraba antes.
    const facturado = sum(ventasMes.filter((f) => !f.enB), (f) => f.total);
    const cobradoEnB = sum(ventasMes.filter((f) => f.enB), (f) => f.total) + sum(abonosMesEnB, (a) => a.importe);
    const ingresos = facturado + cobradoEnB;
    const gastosCompras = sum(comprasMes, (f) => f.total);
    const gastosNominas = sum(nominasMes, (n) => n.total);
    const gastos = gastosCompras + gastosNominas;

    // Margen: sobre base imponible (sin IVA) — ver IVA_RECUPERABLE en
    // constants.js. El dinero "en B" no pasa por IVA declarado, así que se
    // cuenta tal cual (ya es neto), sin intentar quitarle una base imponible.
    const facturadoBase = sum(ventasMes.filter((f) => !f.enB), baseOTotalVenta);
    const ingresosBase = facturadoBase + cobradoEnB;
    const gastosComprasBase = sum(comprasMes, baseOTotalCompra);
    const gastosBase = gastosComprasBase + gastosNominas;
    const margen = ingresosBase - gastosBase;

    // "Cobros" (por método) es dinero que ya ha entrado de verdad — a
    // diferencia de "facturado"/"ingresos" arriba (que son lo emitido ese
    // mes, cobrado o no), aquí solo cuentan las ventas marcadas como cobradas.
    const ventasCobradasMes = ventasMes.filter((f) => f.cobrado);

    return {
      ym, ventasMes, comprasMes, nominasMes, obrasNuevasMes, ventasCobradasMes,
      facturado, cobradoEnB, ingresos, gastosCompras, gastosNominas, gastos, margen,
      numObrasNuevas: obrasNuevasMes.length,
      cobrosPorMetodo: desgloseMetodo(ventasCobradasMes, 'metodoCobro'),
      gastosPorMetodo: desgloseMetodo(comprasMes, 'metodoPago'),
      gastosIndirectos: gastosIndirectosPorMes[ym] || 0,
    };
  };

  // Cuánto de los gastos indirectos de un mes concreto absorbió una obra en
  // concreto (para desglosarlo en el detalle de la obra).
  const indirectoObraMes = (obraId, ym) => indirectoPorObraMes[`${obraId}|${ym}`] || 0;

  // ---------------- panorama de un año completo (acumulado + por mes) ----------------
  const statsForYear = (year) => {
    const meses = MES_CORTO.map((label, idx) => {
      const ym = `${year}-${String(idx + 1).padStart(2, '0')}`;
      return { label, ...statsForMonth(ym) };
    });
    const ingresos = meses.reduce((s, m) => s + m.ingresos, 0);
    const gastos = meses.reduce((s, m) => s + m.gastos, 0);
    const gastosIndirectos = meses.reduce((s, m) => s + m.gastosIndirectos, 0);
    const obrasNuevas = meses.reduce((s, m) => s + m.numObrasNuevas, 0);
    const max = Math.max(1, ...meses.map((m) => Math.max(m.ingresos, m.gastos)));
    return { year, meses, ingresos, gastos, gastosIndirectos, margen: ingresos - gastos, obrasNuevas, max };
  };

  const obrasActivas = obrasConStats.filter((o) => o.estado === 'activa');

  // ---------------- caja: entregas de efectivo a personal ----------------
  // El dinero de una entrega sale de caja en el momento de entregarse. Las
  // facturas de compra en efectivo vinculadas a esa entrega no vuelven a
  // restar caja (ya se contaron): solo sirven para saber cuánto se justificó.
  const entregaStats = (entregaId) => {
    const facturas = data.facturasCompra.filter((f) => f.entregaEfectivoId === entregaId);
    const justificado = sum(facturas, (f) => f.total);
    const entrega = data.entregasEfectivo.find((e) => e.id === entregaId);
    const pendiente = Math.max(0, (entrega ? Number(entrega.importe) : 0) - justificado);
    return { facturas, justificado, pendiente };
  };
  const entregasConStats = data.entregasEfectivo.map((e) => ({ ...e, stats: entregaStats(e.id) }));

  const ingresosEfectivo =
    sum(data.facturasVenta.filter((f) => f.cobrado && f.metodoCobro === 'efectivo'), (f) => f.total) +
    sum(data.abonos.filter((a) => a.metodoCobro === 'efectivo'), (a) => a.importe);
  const gastosEfectivoDirectos = sum(
    data.facturasCompra.filter((f) => f.pagado && f.metodoPago === 'efectivo' && !f.entregaEfectivoId),
    (f) => f.total
  );
  const totalEntregasEfectivo = sum(data.entregasEfectivo, (e) => e.importe);
  const cajaSaldo = ingresosEfectivo - gastosEfectivoDirectos - totalEntregasEfectivo;
  const cajaPendienteJustificar = sum(entregasConStats, (e) => e.stats.pendiente);

  return {
    currentYear,
    clienteById, obraById, personalById,
    obraStats, obrasConStats, obrasActivas,
    statsForMonth, statsForYear, indirectoObraMes,
    gastosIndirectosTotal, gastosIndirectosSinAsignar,
    pendienteCobroTotal, pendientePagoTotal, totalEnB,
    entregaStats, entregasConStats, cajaSaldo, cajaPendienteJustificar, ingresosEfectivo, gastosEfectivoDirectos, totalEntregasEfectivo,
  };
}
