import { todayISO } from './utils.js';
import { MES_CORTO } from './constants.js';

// Todos los valores derivados de `data` que se reutilizan entre pestañas.
// Se recalcula en cada render (el volumen de datos de esta app es pequeño).
export function computeAll(data) {
  const thisMonth = todayISO().slice(0, 7);
  const currentYear = new Date().getFullYear();

  const clienteById = (id) => data.clientes.find((c) => c.id === id);
  const obraById = (id) => data.obras.find((o) => o.id === id);
  const personalById = (id) => data.personal.find((p) => p.id === id);

  const sum = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);

  // ---------------- estadísticas por obra ----------------
  const obraStats = (obraId) => {
    const ventas = data.facturasVenta.filter((f) => f.obraId === obraId);
    const compras = data.facturasCompra.filter((f) => f.obraId === obraId);
    const abonosObra = data.abonos.filter((a) => a.obraId === obraId);
    const incidenciasObra = data.incidencias.filter((i) => i.obraId === obraId);

    const totalFacturado = sum(ventas, (f) => f.total);
    const totalCobradoFacturas = sum(ventas.filter((f) => f.cobrado), (f) => f.total);
    const totalAbonos = sum(abonosObra, (a) => a.importe);
    const totalCobrado = totalCobradoFacturas + totalAbonos;
    const pendienteCobro = Math.max(0, totalFacturado - totalCobradoFacturas);

    const totalCompras = sum(compras, (f) => f.total);
    const costeIncidenciasEmpresa = sum(incidenciasObra.filter((i) => !i.asumidoEmpleado), (i) => i.coste);
    const costeIncidenciasEmpleado = sum(incidenciasObra.filter((i) => i.asumidoEmpleado), (i) => i.coste);
    const totalGastos = totalCompras + costeIncidenciasEmpresa;

    const margen = totalFacturado - totalGastos;

    return {
      ventas, compras, abonosObra, incidenciasObra,
      totalFacturado, totalCobrado, totalCobradoFacturas, totalAbonos, pendienteCobro,
      totalCompras, costeIncidenciasEmpresa, costeIncidenciasEmpleado, totalGastos, margen,
    };
  };

  const obrasConStats = data.obras.map((o) => ({ ...o, stats: obraStats(o.id) }));

  // ---------------- panorama del mes ----------------
  const ventasMes = data.facturasVenta.filter((f) => (f.fechaExpedicion || '').slice(0, 7) === thisMonth);
  const comprasMes = data.facturasCompra.filter((f) => (f.fecha || '').slice(0, 7) === thisMonth);
  const nominasMes = data.nominas.filter((n) => (n.fechaPago || n.periodoFin || '').slice(0, 7) === thisMonth);

  const ingresosMes = sum(ventasMes, (f) => f.total);
  const gastosMesCompras = sum(comprasMes, (f) => f.total);
  const gastosMesNominas = sum(nominasMes, (n) => n.total);
  const gastosMes = gastosMesCompras + gastosMesNominas;
  const margenMes = ingresosMes - gastosMes;

  const pendienteCobroTotal = sum(data.facturasVenta.filter((f) => !f.cobrado), (f) => f.total);
  const pendientePagoTotal = sum(data.facturasCompra.filter((f) => !f.pagado), (f) => f.total);

  // desglose por método de pago/cobro del mes (efectivo / tarjeta / transferencia / cuenta)
  const desgloseMetodo = (arr, campo) => {
    const acc = {};
    arr.forEach((x) => {
      const k = x[campo] || 'sin especificar';
      acc[k] = (acc[k] || 0) + Number(x.total || x.importe || 0);
    });
    return acc;
  };
  const cobrosMesPorMetodo = desgloseMetodo(ventasMes, 'metodoCobro');
  const gastosMesPorMetodo = desgloseMetodo(comprasMes, 'metodoPago');

  const totalEnB = sum(data.facturasVenta.filter((f) => f.enB), (f) => f.total) + sum(data.abonos.filter((a) => a.enB), (a) => a.importe);

  // ---------------- panorama anual ----------------
  const panoramaAnual = MES_CORTO.map((label, idx) => {
    const mk = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
    const ing = sum(data.facturasVenta.filter((f) => (f.fechaExpedicion || '').slice(0, 7) === mk), (f) => f.total);
    const gasCompras = sum(data.facturasCompra.filter((f) => (f.fecha || '').slice(0, 7) === mk), (f) => f.total);
    const gasNominas = sum(data.nominas.filter((n) => (n.fechaPago || n.periodoFin || '').slice(0, 7) === mk), (n) => n.total);
    return { label, mk, ingresos: ing, gastos: gasCompras + gasNominas, saldo: ing - gasCompras - gasNominas };
  });
  const anualIngresos = panoramaAnual.reduce((s, m) => s + m.ingresos, 0);
  const anualGastos = panoramaAnual.reduce((s, m) => s + m.gastos, 0);
  const anualMax = Math.max(1, ...panoramaAnual.map((m) => Math.max(m.ingresos, m.gastos)));

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
    thisMonth, currentYear,
    clienteById, obraById, personalById,
    obraStats, obrasConStats, obrasActivas,
    ingresosMes, gastosMes, gastosMesCompras, gastosMesNominas, margenMes,
    pendienteCobroTotal, pendientePagoTotal,
    cobrosMesPorMetodo, gastosMesPorMetodo, totalEnB,
    panoramaAnual, anualIngresos, anualGastos, anualMax,
    entregaStats, entregasConStats, cajaSaldo, cajaPendienteJustificar, ingresosEfectivo, gastosEfectivoDirectos, totalEntregasEfectivo,
  };
}
