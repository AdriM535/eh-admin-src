import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient.js';
import { rowToCamel, objToSnake, sanitizeForDb } from '../lib/utils.js';

const emptyData = () => ({
  clientes: [],
  obras: [],
  personal: [],
  facturasVenta: [],
  facturasCompra: [],
  abonos: [],
  nominas: [],
  presupuestos: [],
  presupuestoLineas: [],
  incidencias: [],
});

// key en `data` -> tabla en Supabase
const TABLES = {
  clientes: 'clientes',
  obras: 'obras',
  personal: 'personal',
  facturasVenta: 'facturas_venta',
  facturasCompra: 'facturas_compra',
  abonos: 'abonos',
  nominas: 'nominas',
  presupuestos: 'presupuestos',
  presupuestoLineas: 'presupuesto_lineas',
  incidencias: 'incidencias',
};

export function useData(userId) {
  const [data, setData] = useState(emptyData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const dataRef = useRef(data);
  dataRef.current = data;

  const fetchTable = useCallback(async (key) => {
    const table = TABLES[key];
    const { data: rows, error: err } = await supabase.from(table).select('*').order('created_at', { ascending: true });
    if (err) {
      setError(err.message);
      return;
    }
    setData((prev) => ({ ...prev, [key]: (rows || []).map(rowToCamel) }));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all(Object.keys(TABLES).map(fetchTable));
      setLoading(false);
    })();
  }, [fetchTable]);

  // Realtime: cualquier cambio de otro miembro del equipo refresca la tabla afectada
  // (para que Sindy vea en el móvil lo que se registra desde el ordenador y viceversa).
  useEffect(() => {
    const channel = supabase.channel('eh-data-changes');
    Object.entries(TABLES).forEach(([key, table]) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => fetchTable(key));
    });
    channel.subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchTable]);

  // ---------------- generic CRUD helpers ----------------
  const insertRow = async (table, key, obj) => {
    const payload = sanitizeForDb(objToSnake(obj));
    delete payload.id;
    delete payload.created_at;
    delete payload.created_by;
    if (userId) payload.created_by = userId;
    const { data: row, error: err } = await supabase.from(table).insert(payload).select().single();
    if (err) throw err;
    const camel = rowToCamel(row);
    setData((prev) => ({ ...prev, [key]: [...prev[key], camel] }));
    return camel;
  };

  const updateRow = async (table, key, id, obj) => {
    const payload = sanitizeForDb(objToSnake(obj));
    delete payload.id;
    delete payload.created_at;
    delete payload.created_by;
    const { data: row, error: err } = await supabase.from(table).update(payload).eq('id', id).select().single();
    if (err) throw err;
    const camel = rowToCamel(row);
    setData((prev) => ({ ...prev, [key]: prev[key].map((x) => (x.id === id ? camel : x)) }));
    return camel;
  };

  const deleteRow = async (table, key, id) => {
    const { error: err } = await supabase.from(table).delete().eq('id', id);
    if (err) throw err;
    setData((prev) => ({ ...prev, [key]: prev[key].filter((x) => x.id !== id) }));
  };

  const saveRow = (table, key, obj) => (obj.id ? updateRow(table, key, obj.id, obj) : insertRow(table, key, obj));

  // ---------------- CLIENTES ----------------
  const saveCliente = (c) => saveRow('clientes', 'clientes', c);
  const deleteCliente = (id) => {
    if (!window.confirm('¿Eliminar este cliente? Las obras y facturas asociadas no se borran automáticamente.')) return;
    return deleteRow('clientes', 'clientes', id);
  };

  // ---------------- OBRAS ----------------
  const saveObra = (o) => saveRow('obras', 'obras', o);
  const deleteObra = (id) => {
    if (!window.confirm('¿Eliminar esta obra? Las facturas, abonos e incidencias asociadas quedarán sin obra vinculada.')) return;
    return deleteRow('obras', 'obras', id);
  };

  // ---------------- PERSONAL ----------------
  const savePersonal = (p) => saveRow('personal', 'personal', p);
  const deletePersonal = (id) => {
    if (!window.confirm('¿Eliminar esta persona? Sus nóminas y registros asociados no se borran automáticamente.')) return;
    return deleteRow('personal', 'personal', id);
  };

  // ---------------- FACTURAS DE VENTA ----------------
  const saveFacturaVenta = (f) => saveRow('facturas_venta', 'facturasVenta', f);
  const deleteFacturaVenta = async (id) => {
    if (!window.confirm('¿Eliminar esta factura de venta?')) return;
    const f = dataRef.current.facturasVenta.find((x) => x.id === id);
    await deleteRow('facturas_venta', 'facturasVenta', id);
    return f;
  };

  // ---------------- FACTURAS DE COMPRA ----------------
  const saveFacturaCompra = (f) => saveRow('facturas_compra', 'facturasCompra', f);
  const deleteFacturaCompra = async (id) => {
    if (!window.confirm('¿Eliminar esta factura de compra?')) return;
    const f = dataRef.current.facturasCompra.find((x) => x.id === id);
    await deleteRow('facturas_compra', 'facturasCompra', id);
    return f;
  };

  // ---------------- ABONOS ----------------
  const saveAbono = (a) => saveRow('abonos', 'abonos', a);
  const deleteAbono = (id) => deleteRow('abonos', 'abonos', id);

  // ---------------- NÓMINAS ----------------
  const saveNomina = (n) => saveRow('nominas', 'nominas', n);
  const deleteNomina = (id) => deleteRow('nominas', 'nominas', id);

  // ---------------- PRESUPUESTOS (con líneas) ----------------
  // Se reemplazan todas las líneas del presupuesto en cada guardado: más simple
  // y fiable que hacer diffing, y el volumen de líneas por presupuesto es bajo.
  const savePresupuesto = async (p) => {
    const { lineas, ...cabecera } = p;
    const total = (lineas || []).reduce((s, l) => s + Number(l.importe || 0), 0);
    const saved = await saveRow('presupuestos', 'presupuestos', { ...cabecera, total });

    if (cabecera.id) {
      await supabase.from('presupuesto_lineas').delete().eq('presupuesto_id', saved.id);
    }
    const lineasPayload = (lineas || []).filter((l) => l.concepto).map((l, idx) => ({
      presupuesto_id: saved.id,
      concepto: l.concepto,
      cantidad: Number(l.cantidad) || 1,
      precio_unitario: Number(l.precioUnitario) || 0,
      importe: Number(l.importe) || 0,
      orden: idx,
    }));
    if (lineasPayload.length > 0) {
      const { error: err } = await supabase.from('presupuesto_lineas').insert(lineasPayload);
      if (err) throw err;
    }
    await fetchTable('presupuestoLineas');
    return saved;
  };

  const deletePresupuesto = (id) => {
    if (!window.confirm('¿Eliminar este presupuesto y sus líneas?')) return;
    return deleteRow('presupuestos', 'presupuestos', id);
  };

  // ---------------- INCIDENCIAS ----------------
  const saveIncidencia = (i) => saveRow('incidencias', 'incidencias', i);
  const deleteIncidencia = (id) => deleteRow('incidencias', 'incidencias', id);

  // ---------------- IMPORTAR DESDE EXCEL ----------------
  // Busca por nombre (sin distinguir mayúsculas) en una copia local de la
  // tabla; si no existe lo crea. La copia local (no el estado de React) es
  // la que se actualiza en cada fila, para que dos filas del mismo Excel con
  // el mismo cliente/obra/trabajador reutilicen el registro recién creado
  // en vez de duplicarlo.
  const findOrCreateByName = async (table, key, cache, name, extra = {}) => {
    const trimmed = (name || '').toString().trim();
    if (!trimmed) return null;
    const existing = cache.find((x) => (x.nombre || '').trim().toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const created = await insertRow(table, key, { nombre: trimmed, ...extra });
    cache.push(created);
    return created.id;
  };

  const importFacturasVenta = async (rows, onProgress) => {
    const clientesCache = dataRef.current.clientes.slice();
    const obrasCache = dataRef.current.obras.slice();
    let ok = 0;
    let fail = 0;
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const clienteId = await findOrCreateByName('clientes', 'clientes', clientesCache, r.clienteNombre);
        const obraId = await findOrCreateByName('obras', 'obras', obrasCache, r.obraNombre, clienteId ? { clienteId, estado: 'activa' } : { estado: 'activa' });
        await insertRow('facturas_venta', 'facturasVenta', {
          obraId, clienteId, serie: r.serie || '', numero: r.numero || '',
          fechaExpedicion: r.fechaExpedicion || null, fechaCobro: r.fechaCobro || null,
          baseImponible: r.baseImponible, tipoIva: r.tipoIva ?? 21,
          total: r.total || 0, cobrado: !!r.cobrado, metodoCobro: r.metodoCobro || 'cuenta',
          enB: !!r.enB, notas: r.notas || '',
        });
        ok++;
      } catch (err) {
        fail++;
        errors.push(`Fila ${i + 2}: ${err.message || err}`);
      }
      if (onProgress) onProgress(i + 1, rows.length);
    }
    return { ok, fail, errors };
  };

  const importFacturasCompra = async (rows, onProgress) => {
    const obrasCache = dataRef.current.obras.slice();
    const personalCache = dataRef.current.personal.slice();
    let ok = 0;
    let fail = 0;
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const obraId = await findOrCreateByName('obras', 'obras', obrasCache, r.obraNombre, { estado: 'activa' });
        let personalId = null;
        if (r.tipoGasto === 'autonomo' && r.proveedor) {
          personalId = await findOrCreateByName('personal', 'personal', personalCache, r.proveedor, { tipo: 'autonomo' });
        }
        await insertRow('facturas_compra', 'facturasCompra', {
          obraId, tipoGasto: r.tipoGasto || 'material', personalId,
          fecha: r.fecha || null, proveedor: r.proveedor || '', numeroFactura: r.numeroFactura || '',
          concepto: r.concepto || '', baseImponible: r.baseImponible, tipoIva: r.tipoIva ?? 21,
          total: r.total || 0, metodoPago: r.metodoPago || 'tarjeta', pagadoPor: r.pagadoPor || '',
          pagado: r.pagado !== false, notas: r.notas || '',
        });
        ok++;
      } catch (err) {
        fail++;
        errors.push(`Fila ${i + 2}: ${err.message || err}`);
      }
      if (onProgress) onProgress(i + 1, rows.length);
    }
    return { ok, fail, errors };
  };

  const importNominas = async (rows, onProgress) => {
    const personalCache = dataRef.current.personal.slice();
    let ok = 0;
    let fail = 0;
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const personalId = await findOrCreateByName('personal', 'personal', personalCache, r.trabajador, { tipo: 'empleado' });
        if (!personalId) throw new Error('Falta el nombre del trabajador/a');
        const total =
          r.total ||
          (Number(r.liquidado) || 0) + (Number(r.cotizacionSs) || 0) + (Number(r.adicionales) || 0) + (Number(r.horasExtra) || 0) - (Number(r.deducciones) || 0);
        await insertRow('nominas', 'nominas', {
          personalId, periodoInicio: r.periodoInicio || null, periodoFin: r.periodoFin || null,
          liquidado: r.liquidado || 0, cotizacionSs: r.cotizacionSs || 0, adicionales: r.adicionales || 0,
          deducciones: r.deducciones || 0, horasExtra: r.horasExtra || 0, total,
          pagado: !!r.pagado, fechaPago: r.fechaPago || null, notas: r.notas || '',
        });
        ok++;
      } catch (err) {
        fail++;
        errors.push(`Fila ${i + 2}: ${err.message || err}`);
      }
      if (onProgress) onProgress(i + 1, rows.length);
    }
    return { ok, fail, errors };
  };

  return {
    data,
    loading,
    error,
    actions: {
      saveCliente,
      deleteCliente,
      saveObra,
      deleteObra,
      savePersonal,
      deletePersonal,
      saveFacturaVenta,
      deleteFacturaVenta,
      saveFacturaCompra,
      deleteFacturaCompra,
      saveAbono,
      deleteAbono,
      saveNomina,
      deleteNomina,
      savePresupuesto,
      deletePresupuesto,
      saveIncidencia,
      deleteIncidencia,
      importFacturasVenta,
      importFacturasCompra,
      importNominas,
    },
  };
}
