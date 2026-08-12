import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient.js';
import { rowToCamel, objToSnake, sanitizeForDb } from '../lib/utils.js';

const emptyData = () => ({
  clientes: [],
  obras: [],
  personal: [],
  facturasVenta: [],
  facturasCompra: [],
  facturaCompraLineas: [],
  entregasEfectivo: [],
  abonos: [],
  nominas: [],
  presupuestos: [],
  presupuestoLineas: [],
  incidencias: [],
  servicios: [],
  obraEvidencias: [],
});

// key en `data` -> tabla en Supabase
const TABLES = {
  clientes: 'clientes',
  obras: 'obras',
  personal: 'personal',
  facturasVenta: 'facturas_venta',
  facturasCompra: 'facturas_compra',
  facturaCompraLineas: 'factura_compra_lineas',
  entregasEfectivo: 'entregas_efectivo',
  abonos: 'abonos',
  nominas: 'nominas',
  presupuestos: 'presupuestos',
  presupuestoLineas: 'presupuesto_lineas',
  incidencias: 'incidencias',
  servicios: 'servicios',
  obraEvidencias: 'obra_evidencias',
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

  // Borra muchas filas de una tabla de una vez, en tandas pequeñas (con
  // cientos/miles de ids, mandarlos todos en una sola petición supera el
  // límite de tamaño y falla sin avisar).
  const BULK_CHUNK = 150;
  const deleteRowsBulk = async (table, key, ids, onProgress) => {
    if (ids.length === 0) return;
    const borrados = [];
    for (let i = 0; i < ids.length; i += BULK_CHUNK) {
      const tanda = ids.slice(i, i + BULK_CHUNK);
      const { error: err } = await supabase.from(table).delete().in('id', tanda);
      if (err) throw err;
      borrados.push(...tanda);
      setData((prev) => ({ ...prev, [key]: prev[key].filter((x) => !borrados.includes(x.id)) }));
      if (onProgress) onProgress(borrados.length, ids.length);
    }
  };

  // Igual que deleteRowsBulk pero para actualizar muchas filas a la vez con
  // el mismo cambio (p.ej. marcar un lote de facturas como cobradas/pagadas).
  const updateRowsBulk = async (table, key, ids, patch, onProgress) => {
    if (ids.length === 0) return;
    const payload = sanitizeForDb(objToSnake(patch));
    const hechos = [];
    for (let i = 0; i < ids.length; i += BULK_CHUNK) {
      const tanda = ids.slice(i, i + BULK_CHUNK);
      const { error: err } = await supabase.from(table).update(payload).in('id', tanda);
      if (err) throw err;
      hechos.push(...tanda);
      setData((prev) => ({ ...prev, [key]: prev[key].map((x) => (hechos.includes(x.id) ? { ...x, ...patch } : x)) }));
      if (onProgress) onProgress(hechos.length, ids.length);
    }
  };

  // ---------------- CLIENTES ----------------
  const saveCliente = (c) => saveRow('clientes', 'clientes', c);
  const deleteCliente = (id) => {
    if (!window.confirm('¿Eliminar este cliente? Las obras y facturas asociadas no se borran automáticamente.')) return;
    return deleteRow('clientes', 'clientes', id);
  };
  const deleteClientesBulk = (ids, onProgress) => {
    if (ids.length === 0) return;
    if (!window.confirm(`¿Eliminar ${ids.length} cliente(s)? Las obras y facturas asociadas no se borran, solo quedan sin cliente vinculado. Esta acción no se puede deshacer.`)) return;
    return deleteRowsBulk('clientes', 'clientes', ids, onProgress);
  };

  // ---------------- OBRAS ----------------
  // Código consecutivo AAAA-NNN, se reinicia cada año. `cache` es la lista de
  // obras conocidas en ese momento (dataRef.current en un alta suelta, o un
  // array local que se va empujando en bucles de importación, para que cada
  // obra nueva del mismo lote continúe la numeración de la anterior).
  const nextObraCodigo = (cache) => {
    const prefix = `${new Date().getFullYear()}-`;
    let max = 0;
    cache.forEach((o) => {
      if (o.codigo && o.codigo.startsWith(prefix)) {
        const n = parseInt(o.codigo.slice(prefix.length), 10);
        if (!isNaN(n) && n > max) max = n;
      }
    });
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  };
  const saveObra = (o) => saveRow('obras', 'obras', o.id ? o : { ...o, codigo: nextObraCodigo(dataRef.current.obras) });
  const deleteObra = (id) => {
    if (!window.confirm('¿Eliminar esta obra? Las facturas, abonos e incidencias asociadas quedarán sin obra vinculada.')) return;
    return deleteRow('obras', 'obras', id);
  };
  const deleteObrasBulk = (ids, onProgress) => {
    if (ids.length === 0) return;
    if (!window.confirm(`¿Eliminar ${ids.length} obra(s)? Las facturas, abonos e incidencias asociadas no se borran, solo quedan sin obra vinculada. Esta acción no se puede deshacer.`)) return;
    return deleteRowsBulk('obras', 'obras', ids, onProgress);
  };

  // Fotos de evidencia adjuntas a una obra (obligatorias, mínimo 3, para que
  // el rol Operativo pueda marcarla como "finalizada" — lo exige también la
  // RLS en la base de datos).
  const addObraEvidencia = (obraId, adjunto) =>
    insertRow('obra_evidencias', 'obraEvidencias', { obraId, storagePath: adjunto.adjuntoPath, nombreArchivo: adjunto.adjuntoNombre });
  const deleteObraEvidencia = (id) => deleteRow('obra_evidencias', 'obraEvidencias', id);

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
  const marcarFacturasVentaCobradas = (ids, onProgress) => {
    if (ids.length === 0) return;
    if (!window.confirm(`¿Marcar ${ids.length} factura(s) de venta como cobradas?`)) return;
    return updateRowsBulk('facturas_venta', 'facturasVenta', ids, { cobrado: true }, onProgress);
  };

  // ---------------- FACTURAS DE COMPRA (cabecera + líneas de producto) ----------------
  // Igual que los presupuestos: se reemplazan todas las líneas en cada guardado.
  const saveFacturaCompra = async (f) => {
    const { lineas, ...cabecera } = f;
    const total = (lineas || []).reduce((s, l) => s + Number(l.importe || 0), 0);
    const saved = await saveRow('facturas_compra', 'facturasCompra', { ...cabecera, total });

    if (cabecera.id) {
      await supabase.from('factura_compra_lineas').delete().eq('factura_compra_id', saved.id);
    }
    const lineasPayload = (lineas || []).filter((l) => l.producto).map((l, idx) => ({
      factura_compra_id: saved.id,
      producto: l.producto,
      cantidad: Number(l.cantidad) || 1,
      precio_unitario: Number(l.precioUnitario) || 0,
      tasa_iva: Number(l.tasaIva) ?? 21,
      precio_unitario_con_iva: Number(l.precioUnitarioConIva) || 0,
      importe: Number(l.importe) || 0,
      orden: idx,
    }));
    if (lineasPayload.length > 0) {
      const { error: err } = await supabase.from('factura_compra_lineas').insert(lineasPayload);
      if (err) throw err;
    }
    await fetchTable('facturaCompraLineas');
    return saved;
  };

  const deleteFacturaCompra = async (id) => {
    if (!window.confirm('¿Eliminar esta factura de compra y sus líneas?')) return;
    const f = dataRef.current.facturasCompra.find((x) => x.id === id);
    await deleteRow('facturas_compra', 'facturasCompra', id);
    return f;
  };

  // Borra varias facturas de compra de una vez (p.ej. las que quedaron en
  // 0€ por una importación con la columna de importe mal mapeada), con un
  // único aviso de confirmación en vez de uno por factura.
  const deleteFacturasCompraBulk = (ids, onProgress) => {
    if (ids.length === 0) return;
    if (!window.confirm(`¿Eliminar ${ids.length} factura(s) de compra y sus líneas? Esta acción no se puede deshacer.`)) return;
    return deleteRowsBulk('facturas_compra', 'facturasCompra', ids, onProgress);
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

    // Al aceptar un presupuesto, pasa directo a Obras: si ya tenía una obra
    // vinculada (todavía "en presupuesto") se activa; si no tenía ninguna,
    // se crea una nueva a partir del cliente/número del presupuesto.
    let obraId = cabecera.obraId || null;
    if (cabecera.estado === 'aceptado') {
      if (obraId) {
        const obra = dataRef.current.obras.find((o) => o.id === obraId);
        if (obra && obra.estado === 'presupuesto') {
          await updateRow('obras', 'obras', obraId, { estado: 'activa' });
        }
      } else {
        const cliente = dataRef.current.clientes.find((c) => c.id === cabecera.clienteId);
        const nuevaObra = await insertRow('obras', 'obras', {
          nombre: cabecera.numero || (cliente ? cliente.nombre : 'Obra sin nombre'),
          codigo: nextObraCodigo(dataRef.current.obras),
          clienteId: cabecera.clienteId || null,
          estado: 'activa',
        });
        obraId = nuevaObra.id;
      }
    }

    const saved = await saveRow('presupuestos', 'presupuestos', { ...cabecera, obraId, total });

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

  // ---------------- CATÁLOGO DE SERVICIOS ----------------
  const saveServicio = (s) => saveRow('servicios', 'servicios', s);
  const deleteServicio = (id) => {
    if (!window.confirm('¿Eliminar este servicio del catálogo? Los presupuestos que ya lo usan no se modifican.')) return;
    return deleteRow('servicios', 'servicios', id);
  };
  // Importar/actualizar el catálogo desde Excel: si el nombre ya existe (sin
  // distinguir mayúsculas), actualiza su precio/descripción; si no, lo crea.
  // Así se puede volver a subir el mismo archivo con precios nuevos sin
  // duplicar servicios.
  const importServicios = async (rows, onProgress) => {
    const cache = dataRef.current.servicios.slice();
    let ok = 0;
    let fail = 0;
    let creados = 0;
    let actualizados = 0;
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.nombre) throw new Error('Falta el nombre del servicio');
        const payload = {
          nombre: r.nombre, descripcion: r.descripcion || '', unidad: r.unidad || '',
          precioUnitario: r.precioUnitario || 0, categoria: r.categoria || '',
        };
        const existing = cache.find((x) => (x.nombre || '').trim().toLowerCase() === r.nombre.trim().toLowerCase());
        if (existing) {
          const updated = await updateRow('servicios', 'servicios', existing.id, payload);
          const idx = cache.findIndex((x) => x.id === existing.id);
          cache[idx] = updated;
          actualizados++;
        } else {
          const created = await insertRow('servicios', 'servicios', payload);
          cache.push(created);
          creados++;
        }
        ok++;
      } catch (err) {
        fail++;
        errors.push(`Fila ${i + 2}: ${err.message || err}`);
      }
      if (onProgress) onProgress(i + 1, rows.length);
    }
    return { ok, fail, errors, creados, actualizados };
  };

  // ---------------- CAJA: ENTREGAS DE EFECTIVO A PERSONAL ----------------
  const saveEntregaEfectivo = (e) => saveRow('entregas_efectivo', 'entregasEfectivo', e);
  const deleteEntregaEfectivo = (id) => {
    if (!window.confirm('¿Eliminar esta entrega de efectivo? Las facturas de compra que la justificaban quedarán sin vincular.')) return;
    return deleteRow('entregas_efectivo', 'entregasEfectivo', id);
  };

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
        const clienteId = await findOrCreateByName('clientes', 'clientes', clientesCache, r.clienteNombre, r.clienteNif ? { nif: r.clienteNif } : {});
        const obraExtra = { estado: 'activa', codigo: nextObraCodigo(obrasCache) };
        if (clienteId) obraExtra.clienteId = clienteId;
        const obraId = await findOrCreateByName('obras', 'obras', obrasCache, r.obraNombre, obraExtra);
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

  // `groups` = facturas ya agrupadas por (fecha + nº factura + proveedor), cada una
  // con su array `lineas` de productos — ver excelImport.js:groupFacturasCompra.
  const importFacturasCompra = async (groups, onProgress) => {
    const obrasCache = dataRef.current.obras.slice();
    const personalCache = dataRef.current.personal.slice();
    let ok = 0;
    let fail = 0;
    const errors = [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      try {
        const obraId = await findOrCreateByName('obras', 'obras', obrasCache, g.obraNombre, { estado: 'activa', codigo: nextObraCodigo(obrasCache) });
        let personalId = null;
        if (!obraId && g.categoriaGeneral === 'autonomo' && g.proveedor) {
          personalId = await findOrCreateByName('personal', 'personal', personalCache, g.proveedor, { tipo: 'autonomo' });
        }
        const total = (g.lineas || []).reduce((s, l) => s + Number(l.importe || 0), 0);
        const saved = await insertRow('facturas_compra', 'facturasCompra', {
          obraId, categoriaGeneral: obraId ? null : (g.categoriaGeneral || 'otro'), personalId,
          fecha: g.fecha || null, proveedor: g.proveedor || '', numeroFactura: g.numeroFactura || '',
          total, metodoPago: g.metodoPago || 'tarjeta', pagadoPor: g.pagadoPor || '',
          pagado: g.pagado !== false, notas: g.notas || '',
        });
        const lineasPayload = (g.lineas || []).filter((l) => l.producto).map((l, idx) => ({
          factura_compra_id: saved.id,
          producto: l.producto,
          cantidad: Number(l.cantidad) || 1,
          precio_unitario: Number(l.precioUnitario) || 0,
          tasa_iva: Number(l.tasaIva) ?? 21,
          precio_unitario_con_iva: Number(l.precioUnitarioConIva) || 0,
          importe: Number(l.importe) || 0,
          orden: idx,
        }));
        if (lineasPayload.length > 0) {
          const { error: err } = await supabase.from('factura_compra_lineas').insert(lineasPayload);
          if (err) throw err;
        }
        ok++;
      } catch (err) {
        fail++;
        errors.push(`Factura ${g.numeroFactura || i + 1}: ${err.message || err}`);
      }
      if (onProgress) onProgress(i + 1, groups.length);
    }
    await fetchTable('facturaCompraLineas');
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

  const ESTADOS_OBRA_VALIDOS = new Set(['presupuesto', 'activa', 'finalizada', 'cancelada']);

  const importClientes = async (rows, onProgress) => {
    let ok = 0;
    let fail = 0;
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.nombre) throw new Error('Falta el nombre del cliente');
        await insertRow('clientes', 'clientes', {
          nombre: r.nombre, nif: r.nif || '', telefono: r.telefono || '', email: r.email || '',
          calle: r.calle || '', numero: r.numero || '', interior: r.interior || '',
          municipio: r.municipio || '', provincia: r.provincia || '', cp: r.cp || '', notas: r.notas || '',
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

  const importObras = async (rows, onProgress) => {
    const clientesCache = dataRef.current.clientes.slice();
    const obrasCache = dataRef.current.obras.slice();
    let ok = 0;
    let fail = 0;
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.nombre) throw new Error('Falta el nombre de la obra');
        const clienteId = await findOrCreateByName('clientes', 'clientes', clientesCache, r.clienteNombre);
        const estadoNorm = (r.estado || '').toString().trim().toLowerCase();
        const created = await insertRow('obras', 'obras', {
          nombre: r.nombre, codigo: nextObraCodigo(obrasCache), clienteId, direccion: r.direccion || '', ciudad: r.ciudad || '',
          estado: ESTADOS_OBRA_VALIDOS.has(estadoNorm) ? estadoNorm : 'activa',
          fechaInicio: r.fechaInicio || null, fechaFin: r.fechaFin || null, notas: r.notas || '',
        });
        obrasCache.push(created);
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
      deleteClientesBulk,
      saveObra,
      deleteObra,
      deleteObrasBulk,
      addObraEvidencia,
      deleteObraEvidencia,
      savePersonal,
      deletePersonal,
      saveFacturaVenta,
      deleteFacturaVenta,
      marcarFacturasVentaCobradas,
      saveFacturaCompra,
      deleteFacturaCompra,
      deleteFacturasCompraBulk,
      saveAbono,
      deleteAbono,
      saveNomina,
      deleteNomina,
      savePresupuesto,
      deletePresupuesto,
      saveIncidencia,
      deleteIncidencia,
      saveServicio,
      deleteServicio,
      importServicios,
      saveEntregaEfectivo,
      deleteEntregaEfectivo,
      importFacturasVenta,
      importFacturasCompra,
      importNominas,
      importClientes,
      importObras,
    },
  };
}
