-- Migración 005 — Ejecutar UNA VEZ en el SQL Editor de Supabase sobre el
-- proyecto ya existente, DESPUÉS de las migraciones 003 y 004 (para un
-- proyecto nuevo basta con schema.sql, que ya incluye todo esto).
--
-- Incluye:
--   1) Roles de usuario (perfiles: admin | operario) + reescritura de RLS
--      tabla por tabla según el rol.
--   2) Dirección de clientes con más detalle (calle, número, interior,
--      provincia, municipio, CP) — la dirección ya guardada de los
--      clientes existentes NO se toca ni se reparte automáticamente.
--   3) Presupuestos: columnas para registrar el envío por correo.
--   4) Tabla respaldos_semanales + bucket de Storage para el respaldo
--      automático semanal (lo genera una Edge Function, ver
--      supabase/functions/weekly-backup).

-- ===========================================================================
-- 1) ROLES DE USUARIO
-- ===========================================================================
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nombre text,
  role text not null default 'operario',           -- admin | operario
  personal_id uuid references personal(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Todas las cuentas que YA existen se consideran admin: hasta ahora
-- cualquier persona registrada tenía acceso completo, así que nadie pierde
-- acceso con esta migración. Las cuentas nuevas (altas futuras) entran
-- como "operario" por defecto y Sindy las asciende a admin si hace falta
-- desde la pestaña Usuarios.
insert into perfiles (id, email, role)
select id, email, 'admin' from auth.users
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, email, role) values (new.id, new.email, 'operario')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and role = 'admin');
$$;

-- ===========================================================================
-- 2) DIRECCIÓN DE CLIENTES CON MÁS DETALLE
-- ===========================================================================
alter table clientes add column if not exists calle text;
alter table clientes add column if not exists numero text;
alter table clientes add column if not exists interior text;
alter table clientes add column if not exists municipio text;
alter table clientes add column if not exists provincia text;
alter table clientes add column if not exists cp text;
-- La columna "direccion" original se mantiene (histórico / clientes ya
-- guardados); los campos nuevos se usan de aquí en adelante.

-- ===========================================================================
-- 3) PRESUPUESTOS: ENVÍO POR CORREO
-- ===========================================================================
alter table presupuestos add column if not exists enviado_a text;
alter table presupuestos add column if not exists fecha_envio timestamptz;

-- ===========================================================================
-- 4) RESPALDO SEMANAL
-- ===========================================================================
create table if not exists respaldos_semanales (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  storage_path text not null,
  nombre_archivo text not null,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('respaldos', 'respaldos', false)
on conflict (id) do nothing;

drop policy if exists "eh_admin_read_respaldos" on storage.objects;
create policy "eh_admin_read_respaldos" on storage.objects
  for select to authenticated
  using (bucket_id = 'respaldos' and is_admin());

-- ===========================================================================
-- RLS — reescritura por tabla según rol
-- ===========================================================================

-- perfiles: cada uno ve su propia fila (para saber su rol); admin ve/edita todas.
alter table perfiles enable row level security;
drop policy if exists "perfiles_select" on perfiles;
create policy "perfiles_select" on perfiles for select to authenticated
  using (id = auth.uid() or is_admin());
drop policy if exists "perfiles_update_admin" on perfiles;
create policy "perfiles_update_admin" on perfiles for update to authenticated
  using (is_admin()) with check (is_admin());

-- Tablas de solo admin (el operario no tiene ningún acceso)
do $$
declare t text;
begin
  for t in select unnest(array[
    'clientes','facturas_venta','abonos','nominas','presupuestos','presupuesto_lineas',
    'incidencias','respaldos_semanales'
  ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "team_full_access" on %I;', t);
    execute format('drop policy if exists "admin_full_access" on %I;', t);
    execute format(
      'create policy "admin_full_access" on %I for all to authenticated using (is_admin()) with check (is_admin());',
      t
    );
  end loop;
end $$;

-- Tablas de referencia: admin todo, operario solo lectura (para elegir
-- obra/persona/entrega en el formulario de factura de compra)
do $$
declare t text;
begin
  for t in select unnest(array['obras','personal','entregas_efectivo'])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "team_full_access" on %I;', t);
    execute format('drop policy if exists "admin_full_access" on %I;', t);
    execute format('drop policy if exists "operario_read" on %I;', t);
    execute format(
      'create policy "admin_full_access" on %I for all to authenticated using (is_admin()) with check (is_admin());',
      t
    );
    execute format('create policy "operario_read" on %I for select to authenticated using (true);', t);
  end loop;
end $$;

-- facturas_compra: admin todo; operario puede crear y ver/editar/borrar
-- solo lo que él mismo dio de alta (foto de factura + envío).
alter table facturas_compra enable row level security;
drop policy if exists "team_full_access" on facturas_compra;
drop policy if exists "admin_full_access" on facturas_compra;
create policy "admin_full_access" on facturas_compra for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists "operario_select_own" on facturas_compra;
create policy "operario_select_own" on facturas_compra for select to authenticated using (created_by = auth.uid());
drop policy if exists "operario_insert" on facturas_compra;
create policy "operario_insert" on facturas_compra for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "operario_update_own" on facturas_compra;
create policy "operario_update_own" on facturas_compra for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists "operario_delete_own" on facturas_compra;
create policy "operario_delete_own" on facturas_compra for delete to authenticated using (created_by = auth.uid());

-- factura_compra_lineas: sigue el mismo acceso que su factura de compra.
alter table factura_compra_lineas enable row level security;
drop policy if exists "team_full_access" on factura_compra_lineas;
drop policy if exists "compra_lineas_access" on factura_compra_lineas;
create policy "compra_lineas_access" on factura_compra_lineas for all to authenticated
  using (exists (
    select 1 from facturas_compra fc
    where fc.id = factura_compra_lineas.factura_compra_id and (is_admin() or fc.created_by = auth.uid())
  ))
  with check (exists (
    select 1 from facturas_compra fc
    where fc.id = factura_compra_lineas.factura_compra_id and (is_admin() or fc.created_by = auth.uid())
  ));

-- respaldos_semanales y entregas_efectivo ya publicados en tiempo real;
-- añadimos perfiles también para que la app reaccione si Sindy cambia un rol.
do $$
begin
  execute 'alter publication supabase_realtime add table perfiles';
exception when duplicate_object then
  null;
end $$;
