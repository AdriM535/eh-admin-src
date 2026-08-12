export const ESTADOS_OBRA = [
  { id: 'presupuesto', label: 'En presupuesto' },
  { id: 'activa', label: 'Activa' },
  { id: 'finalizada', label: 'Finalizada' },
  { id: 'cancelada', label: 'Cancelada' },
];

// Categoría de una factura de compra que NO está asignada a una obra
// concreta (insumo general de la empresa). Las marcadas como "indirecta"
// (ver CATEGORIAS_INDIRECTAS) son gasto de operación de toda la empresa:
// cada mes se reparten automáticamente entre las obras que facturaron ese
// mes, en proporción a lo facturado — así el margen de cada obra refleja
// también su parte de los gastos generales, no solo el coste directo.
export const CATEGORIAS_GENERALES = [
  { id: 'gasolina', label: 'Gasolina' },
  { id: 'mantenimiento', label: 'Servicios de mantenimiento' },
  { id: 'material_general', label: 'Material en general' },
  { id: 'autonomo', label: 'Autónomo / subcontrata' },
  { id: 'papeleria', label: 'Papelería y oficina (indirecto, se prorratea)' },
  { id: 'impuestos', label: 'Impuestos y tasas (indirecto, se prorratea)' },
  { id: 'personal_admin', label: 'Personal administrativo (indirecto, se prorratea)' },
  { id: 'otro', label: 'Otro' },
];

// Categorías generales que son gasto de operación (no ligado a una obra en
// concreto) y por tanto se reparten automáticamente entre las obras con
// movimiento cada mes.
export const CATEGORIAS_INDIRECTAS = ['papeleria', 'impuestos', 'personal_admin'];

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

export const TIPOS_NOMINA = [
  { id: 'periodica', label: 'Nómina periódica' },
  { id: 'bono_extra', label: 'Bono / pago extra (fuera de nómina)' },
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
