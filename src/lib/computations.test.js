import { describe, it, expect } from 'vitest';
import { computeAll } from './computations.js';

// `data` mínimo con todas las colecciones que espera computeAll — un objeto
// vacío haría que algunos .filter()/.map() internos fallen sobre undefined.
function baseData(overrides = {}) {
  return {
    clientes: [], obras: [], personal: [], facturasVenta: [], facturasCompra: [],
    facturaCompraLineas: [], abonos: [], nominas: [], presupuestos: [], presupuestoLineas: [],
    incidencias: [], entregasEfectivo: [], servicios: [], obraEvidencias: [],
    ...overrides,
  };
}

describe('obraStats: facturación directa (obras sin factura de venta formal)', () => {
  it('cuenta el importe directo en Facturado solo si "facturada" está marcada', () => {
    const data = baseData({
      obras: [{ id: 'o1', estado: 'finalizada', facturada: true, cobrada: false, importeDirecto: 500 }],
    });
    const { obrasConStats } = computeAll(data);
    const s = obrasConStats[0].stats;
    expect(s.totalFacturado).toBe(500);
    expect(s.totalCobradoFacturas).toBe(0);
    expect(s.pendienteCobro).toBe(500);
  });

  it('cuenta el importe directo en Cobrado solo si "cobrada" está marcada, aunque no esté facturada', () => {
    const data = baseData({
      obras: [{ id: 'o1', estado: 'finalizada', facturada: false, cobrada: true, importeDirecto: 300 }],
    });
    const { obrasConStats } = computeAll(data);
    const s = obrasConStats[0].stats;
    expect(s.totalFacturado).toBe(0); // no marcada como facturada
    expect(s.totalCobrado).toBe(300); // pero sí como cobrada
  });

  it('no duplica nada cuando ni facturada ni cobrada están marcadas', () => {
    const data = baseData({ obras: [{ id: 'o1', estado: 'finalizada', importeDirecto: 999 }] });
    const { obrasConStats } = computeAll(data);
    const s = obrasConStats[0].stats;
    expect(s.totalFacturado).toBe(0);
    expect(s.totalCobrado).toBe(0);
  });

  it('pendienteCobroTotal (Panorama) suma las obras facturadas directamente y aún sin cobrar', () => {
    const data = baseData({
      facturasVenta: [{ id: 'v1', total: 100, cobrado: false }],
      obras: [
        { id: 'o1', facturada: true, cobrada: false, importeDirecto: 500 }, // pendiente: cuenta
        { id: 'o2', facturada: true, cobrada: true, importeDirecto: 200 }, // ya cobrada: no cuenta
        { id: 'o3', facturada: false, cobrada: false, importeDirecto: 800 }, // ni facturada: no cuenta
      ],
    });
    const { pendienteCobroTotal } = computeAll(data);
    expect(pendienteCobroTotal).toBe(600); // 100 (factura pendiente) + 500 (obra o1)
  });
});

describe('obraStats: totalPresupuestado', () => {
  it('solo suma presupuestos ACEPTADOS vinculados a la obra, no borradores ni de otras obras', () => {
    const data = baseData({
      obras: [{ id: 'o1', estado: 'activa' }],
      presupuestos: [
        { id: 'p1', obraId: 'o1', estado: 'aceptado', total: 1000 },
        { id: 'p2', obraId: 'o1', estado: 'borrador', total: 5000 }, // no cuenta: no aceptado
        { id: 'p3', obraId: 'otra-obra', estado: 'aceptado', total: 2000 }, // no cuenta: otra obra
      ],
    });
    const { obrasConStats } = computeAll(data);
    const o1 = obrasConStats.find((o) => o.id === 'o1');
    expect(o1.stats.totalPresupuestado).toBe(1000);
  });

  it('es 0 cuando la obra no tiene ningún presupuesto aceptado', () => {
    const data = baseData({ obras: [{ id: 'o1', estado: 'activa' }] });
    const { obrasConStats } = computeAll(data);
    expect(obrasConStats[0].stats.totalPresupuestado).toBe(0);
  });
});

describe('obraStats: margen se calcula sobre base imponible (sin IVA), no sobre el total', () => {
  it('usa baseImponible de la venta y cantidad×precioUnitario (sin IVA) de las líneas de compra', () => {
    const data = baseData({
      obras: [{ id: 'o1', estado: 'finalizada' }],
      facturasVenta: [
        // Total 1210 € con 21% de IVA -> base imponible real 1000 €
        { id: 'v1', obraId: 'o1', total: 1210, baseImponible: 1000, tipoIva: 21, cobrado: true },
      ],
      facturasCompra: [{ id: 'c1', obraId: 'o1', total: 242 }], // 200 € base + 21% IVA, según su línea
      facturaCompraLineas: [
        { id: 'l1', facturaCompraId: 'c1', cantidad: 1, precioUnitario: 200, tasaIva: 21, importe: 242 },
      ],
    });
    const { obrasConStats } = computeAll(data);
    const s = obrasConStats.find((o) => o.id === 'o1').stats;
    // Facturado/Gastos siguen mostrando el total CON IVA, sin cambios.
    expect(s.totalFacturado).toBe(1210);
    expect(s.totalCompras).toBe(242);
    // El margen usa las bases imponibles: 1000 - 200 = 800, no 1210 - 242.
    expect(s.margen).toBe(800);
  });

  it('sin desglose de IVA (factura antigua sin baseImponible ni líneas), usa el total como aproximación y marca el margen como estimado', () => {
    const data = baseData({
      obras: [{ id: 'o1', estado: 'finalizada' }],
      facturasVenta: [{ id: 'v1', obraId: 'o1', total: 1000, cobrado: true }], // sin baseImponible
      facturasCompra: [{ id: 'c1', obraId: 'o1', total: 300 }], // sin líneas
    });
    const { obrasConStats } = computeAll(data);
    const s = obrasConStats.find((o) => o.id === 'o1').stats;
    expect(s.margen).toBe(700); // 1000 - 300, como aproximación
    expect(s.margenEstimado).toBe(true);
  });

  it('una obra activa (no finalizada) siempre se marca como estimada, aunque el IVA esté bien desglosado', () => {
    const data = baseData({
      obras: [{ id: 'o1', estado: 'activa' }],
      facturasVenta: [{ id: 'v1', obraId: 'o1', total: 1210, baseImponible: 1000, cobrado: true }],
    });
    const { obrasConStats } = computeAll(data);
    expect(obrasConStats[0].stats.margenEstimado).toBe(true);
  });
});

describe('statsForMonth: cobrosPorMetodo solo cuenta ventas realmente cobradas', () => {
  it('no incluye facturas emitidas pero pendientes de cobro', () => {
    const data = baseData({
      facturasVenta: [
        { id: 'v1', fechaExpedicion: '2026-03-10', total: 500, cobrado: true, metodoCobro: 'cuenta' },
        { id: 'v2', fechaExpedicion: '2026-03-15', total: 300, cobrado: false, metodoCobro: 'cuenta' }, // pendiente: no debe contar como "cobro"
      ],
    });
    const { statsForMonth } = computeAll(data);
    const ms = statsForMonth('2026-03');
    expect(ms.ventasCobradasMes).toHaveLength(1);
    expect(ms.cobrosPorMetodo.cuenta).toBe(500);
    // "facturado"/"ingresos" siguen contando lo emitido, cobrado o no —
    // es un dato distinto, no debe confundirse con "cobros".
    expect(ms.facturado).toBe(800);
  });
});
