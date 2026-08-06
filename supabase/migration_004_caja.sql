-- Migración 004 — Ejecutar UNA VEZ en el SQL Editor de Supabase sobre el
-- proyecto ya existente (para un proyecto nuevo basta con schema.sql, que
-- ya incluye este cambio).
--
-- Añade la "Caja": entregas de efectivo a personal (para que compren algo)
-- y su justificación con facturas de compra pagadas en efectivo.

create table if not exists entregas_efectivo (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid references personal(id) on delete set null,
  fecha date not null default current_date,
  importe numeric not null default 0,
  concepto text,
  notas text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists entregas_efectivo_personal_id_idx on entregas_efectivo(personal_id);

alter table facturas_compra add column if not exists entrega_efectivo_id uuid;
create index if not exists facturas_compra_entrega_efectivo_id_idx on facturas_compra(entrega_efectivo_id);

do $$
begin
  alter table facturas_compra add constraint facturas_compra_entrega_efectivo_id_fkey
    foreign key (entrega_efectivo_id) references entregas_efectivo(id) on delete set null;
exception when duplicate_object then
  null;
end $$;

alter table entregas_efectivo enable row level security;
drop policy if exists "team_full_access" on entregas_efectivo;
create policy "team_full_access" on entregas_efectivo for all to authenticated using (true) with check (true);

do $$
begin
  execute 'alter publication supabase_realtime add table entregas_efectivo';
exception when duplicate_object then
  null;
end $$;
