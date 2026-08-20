-- Migración 012 — Ejecutar UNA VEZ en el SQL Editor de Supabase sobre el
-- proyecto ya existente (para un proyecto nuevo basta con schema.sql, que
-- ya incluye este cambio).
--
-- Dirección de la obra en el presupuesto, cuando es distinta de la
-- dirección del cliente (si se deja vacío, se entiende que la obra es en
-- la misma dirección del cliente).

alter table presupuestos add column if not exists direccion_obra text;
