-- Migración 007 — Ejecutar UNA VEZ en el SQL Editor de Supabase sobre el
-- proyecto ya existente (para un proyecto nuevo basta con schema.sql, que
-- ya incluye este cambio).
--
-- Código consecutivo de obra, formato AAAA-NNN (se reinicia cada año, p.ej.
-- 2026-001, 2026-002...). Se asigna solo al crear una obra nueva desde la
-- app; el nombre libre se conserva para poder identificar la obra en listas
-- y desplegables.

alter table obras add column if not exists codigo text;

-- Asigna código a las obras que ya existen, en su orden de alta, agrupando
-- por año de creación.
with numeradas as (
  select id, created_at,
         row_number() over (partition by extract(year from created_at) order by created_at) as n
  from obras
  where codigo is null
)
update obras o
set codigo = extract(year from n.created_at)::text || '-' || lpad(n.n::text, 3, '0')
from numeradas n
where o.id = n.id;

alter table obras drop constraint if exists obras_codigo_unique;
alter table obras add constraint obras_codigo_unique unique (codigo);
