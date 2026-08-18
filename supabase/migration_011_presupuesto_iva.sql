-- Migración 011 — Ejecutar UNA VEZ en el SQL Editor de Supabase sobre el
-- proyecto ya existente (para un proyecto nuevo basta con schema.sql, que
-- ya incluye este cambio).
--
-- El presupuesto pasa a calcular el IVA: las líneas guardan el importe
-- base (sin IVA), y el total final = base + IVA. Los presupuestos que ya
-- existen se quedan con IVA 21% por defecto (ajustable en cada uno).

alter table presupuestos add column if not exists iva numeric not null default 21;
