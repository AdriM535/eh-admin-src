-- Migración 006 — Ejecutar UNA VEZ en el SQL Editor de Supabase sobre el
-- proyecto ya existente (para un proyecto nuevo basta con schema.sql, que
-- ya incluye este cambio).
--
-- Catálogo de servicios: para poder elegirlos al armar un presupuesto, en
-- vez de escribir cada concepto y precio a mano cada vez. Se puede cargar
-- y actualizar por Excel (pestaña Importar → Servicios): si el nombre ya
-- existe, actualiza el precio; si no, lo crea.

create table if not exists servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  unidad text,
  precio_unitario numeric not null default 0,
  categoria text,
  activo boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table servicios enable row level security;
drop policy if exists "team_full_access" on servicios;
drop policy if exists "admin_full_access" on servicios;
create policy "admin_full_access" on servicios for all to authenticated using (is_admin()) with check (is_admin());

do $$
begin
  execute 'alter publication supabase_realtime add table servicios';
exception when duplicate_object then
  null;
end $$;
