export const ESTADOS_OBRA = [
  { id: 'presupuesto', label: 'En presupuesto' },
  { id: 'activa', label: 'Activa' },
  { id: 'finalizada', label: 'Finalizada' },
  { id: 'cancelada', label: 'Cancelada' },
];

// Categoría de una factura de compra que NO está asignada a una obra
// concreta (insumo general de la empresa).
export const CATEGORIAS_GENERALES = [
  { id: 'gasolina', label: 'Gasolina' },
  { id: 'mantenimiento', label: 'Servicios de mantenimiento' },
  { id: 'material_general', label: 'Material en general' },
  { id: 'autonomo', label: 'Autónomo / subcontrata' },
  { id: 'otro', label: 'Otro' },
];

export const METODOS_PAGO = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'transferencia', label: 'Transferencia' },
];

export const METODOS_COBRO = [
  { id: 'cuenta', label: 'En cuenta' },
  { id: 'efectivo', label: 'Efectivo' },
];

export const TIPOS_PERSONAL = [
  { id: 'empleado', label: 'Empleado' },
  { id: 'autonomo', label: 'Autónomo' },
];

export const ESTADOS_PRESUPUESTO = [
  { id: 'borrador', label: 'Borrador' },
  { id: 'enviado', label: 'Enviado' },
  { id: 'aceptado', label: 'Aceptado' },
  { id: 'rechazado', label: 'Rechazado' },
];

export const ESTADOS_INCIDENCIA = [
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'resuelto', label: 'Resuelto' },
];

export const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
