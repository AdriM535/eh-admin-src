import { describe, it, expect } from 'vitest';
import { fmtMoney, calcIva, calcLineaCompra, lineasCompraValidas, totalLineasCompra } from './utils.js';

describe('fmtMoney', () => {
  it('formatea con separador de miles "." y decimales ","', () => {
    expect(fmtMoney(1234.5)).toBe('1.234,50 €');
    expect(fmtMoney(0)).toBe('0,00 €');
    expect(fmtMoney(null)).toBe('0,00 €');
    expect(fmtMoney(undefined)).toBe('0,00 €');
  });
});

describe('calcIva', () => {
  it('calcula la cuota y el total a partir de la base', () => {
    const { totalIva, total } = calcIva(150, 21);
    expect(totalIva).toBe(31.5);
    expect(total).toBe(181.5);
  });

  it('trata valores no numéricos como 0', () => {
    expect(calcIva('abc', 21)).toEqual({ totalIva: 0, total: 0 });
  });
});

describe('calcLineaCompra', () => {
  it('aplica el IVA de la línea al precio unitario antes de multiplicar por cantidad', () => {
    const { precioUnitarioConIva, importe } = calcLineaCompra(10, 6.5, 21);
    expect(precioUnitarioConIva).toBe(7.87); // 6.5 * 1.21 = 7.865 -> redondeo a 7.87
    expect(importe).toBe(78.7); // 10 * 7.87
  });

  it('admite un tipo de IVA distinto por línea (p.ej. 10% en materiales de construcción)', () => {
    const { importe } = calcLineaCompra(2, 45, 10);
    expect(importe).toBe(99); // 2 * (45 * 1.10)
  });
});

describe('lineasCompraValidas / totalLineasCompra', () => {
  const lineas = [
    { producto: 'Saco cemento', cantidad: 1, importe: 78.65 },
    { producto: '', cantidad: 1, importe: 500 }, // sin producto: se descarta al guardar
    { producto: '   ', cantidad: 1, importe: 200 }, // solo espacios: también se descarta
    { producto: 'Pintura', cantidad: 1, importe: 99 },
  ];

  it('descarta las líneas sin producto (no se pueden guardar: la columna es NOT NULL)', () => {
    const validas = lineasCompraValidas(lineas);
    expect(validas).toHaveLength(2);
    expect(validas.map((l) => l.producto)).toEqual(['Saco cemento', 'Pintura']);
  });

  it('el total mostrado coincide con lo que realmente se persiste (no cuenta líneas descartadas)', () => {
    expect(totalLineasCompra(lineas)).toBeCloseTo(78.65 + 99, 2);
  });

  it('con todas las líneas válidas, el total es la suma completa', () => {
    const todasValidas = lineas.filter((l) => l.producto.trim());
    expect(totalLineasCompra(todasValidas)).toBeCloseTo(78.65 + 99, 2);
  });
});
