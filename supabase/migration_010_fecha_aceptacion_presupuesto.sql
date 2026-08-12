-- Migración 010 — Ejecutar UNA VEZ en el SQL Editor de Supabase sobre el
-- proyecto ya existente (para un proyecto nuevo basta con schema.sql, que
-- ya incluye este cambio).
--
-- Fecha en la que se aceptó un presupuesto (se rellena sola al marcarlo
-- como "Aceptado", pero se puede corregir a mano).

alter table presupuestos add column if not exists fecha_aceptacion date;
