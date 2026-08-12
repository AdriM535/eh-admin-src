-- Migración 009 — Ejecutar UNA VEZ en el SQL Editor de Supabase sobre el
-- proyecto ya existente (para un proyecto nuevo basta con schema.sql, que
-- ya incluye este cambio).
--
-- 1) Cada obra puede tener un responsable, tomado del personal (empleado
--    directo o autónomo/especialista externo).
-- 2) El personal autónomo/especialista externo puede tener una especialidad
--    (albañilería, electricidad, fontanería, pintura, aire acondicionado,
--    calderas, carpintería, otro).

alter table obras add column if not exists responsable_id uuid references personal(id) on delete set null;
create index if not exists obras_responsable_id_idx on obras(responsable_id);

alter table personal add column if not exists especialidad text;
