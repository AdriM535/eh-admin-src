-- Migración 002 — Ejecutar UNA VEZ en el SQL Editor de Supabase sobre el
-- proyecto ya existente (no en un proyecto nuevo: para un proyecto nuevo
-- basta con supabase/schema.sql, que ya incluye estos cambios).
--
-- Cambios:
--  1. obras: añade "ciudad" (para poder filtrar obras por ciudad).
--  2. facturas_compra: pasa de importe único a cabecera + líneas de
--     producto (factura_compra_lineas), y sustituye "tipo_gasto" por
--     "categoria_general" (gasolina | mantenimiento | material_general |
--     autonomo | otro), usado solo cuando la factura no está asignada a
--     una obra.

alter table obras add column if not exists ciudad text;

alter table facturas_compra add column if not exists categoria_general text;
alter table facturas_compra drop column if exists tipo_gasto;
alter table facturas_compra drop column if exists concepto;
alter table facturas_compra drop column if exists base_imponible;
alter table facturas_compra drop column if exists tipo_iva;
alter table facturas_compra drop column if exists total_iva;

create table if not exists factura_compra_lineas (
  id uuid primary key default gen_random_uuid(),
  factura_compra_id uuid not null references facturas_compra(id) on delete cascade,
  producto text not null,
  cantidad numeric not null default 1,
  precio_unitario numeric not null default 0,
  tasa_iva numeric not null default 21,
  precio_unitario_con_iva numeric not null default 0,
  importe numeric not null default 0,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists factura_compra_lineas_factura_compra_id_idx on factura_compra_lineas(factura_compra_id);

alter table factura_compra_lineas enable row level security;
drop policy if exists "team_full_access" on factura_compra_lineas;
create policy "team_full_access" on factura_compra_lineas for all to authenticated using (true) with check (true);

do $$
begin
  execute 'alter publication supabase_realtime add table factura_compra_lineas';
exception when duplicate_object then
  null;
end $$;
