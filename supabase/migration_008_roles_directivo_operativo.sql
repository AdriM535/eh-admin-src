-- Migración 008 — Ejecutar UNA VEZ en el SQL Editor de Supabase sobre el
-- proyecto ya existente (para un proyecto nuevo basta con schema.sql, que
-- ya incluye este cambio).
--
-- Amplía los roles de 2 a 3:
--   - admin      (Administradora/desarrolladora): ve y edita todo, gestiona
--                usuarios/roles, respaldos e importación.
--   - directivo  (nuevo): ve y opera todo el negocio (obras, facturas,
--                clientes, caja, presupuestos, personal, nóminas,
--                incidencias, panorama) pero NO gestiona usuarios, ni entra
--                a Respaldos ni a Importar Excel.
--   - operativo  (antes "operario", mismo concepto ampliado): ve las obras,
--                puede cambiar su estado a "finalizada" solo si adjunta al
--                menos 3 fotos de evidencia, gestiona incidencias, ve la
--                caja (entregas de efectivo y su estatus) en solo lectura,
--                y captura facturas de compra (como ya hacía "operario").
--
-- También añade la tabla obra_evidencias (fotos adjuntas al cerrar una obra).

-- ===========================================================================
-- 1) RENOMBRAR "operario" -> "operativo" y ajustar el alta por defecto
-- ===========================================================================
update perfiles set role = 'operativo' where role = 'operario';
alter table perfiles alter column role set default 'operativo';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, email, role) values (new.id, new.email, 'operativo')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ===========================================================================
-- 2) FUNCIONES DE ROL
-- ===========================================================================
create or replace function public.my_role()
returns text language sql security definer set search_path = public stable as $$
  select role from public.perfiles where id = auth.uid();
$$;

-- admin o directivo: acceso completo a la operación del negocio.
create or replace function public.is_staff()
returns boolean language sql security definer set search_path = public stable as $$
  select public.my_role() in ('admin', 'directivo');
$$;

-- is_admin() ya existía (migración 005) y se mantiene igual: solo 'admin'.
-- Se sigue usando para Usuarios, Respaldos e Importar (exclusivos de admin).

-- ===========================================================================
-- 3) OBRA_EVIDENCIAS (fotos al marcar una obra como "finalizada")
-- ===========================================================================
create table if not exists obra_evidencias (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  storage_path text not null,
  nombre_archivo text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists obra_evidencias_obra_id_idx on obra_evidencias(obra_id);

alter table obra_evidencias enable row level security;
drop policy if exists "staff_full_access" on obra_evidencias;
create policy "staff_full_access" on obra_evidencias for all to authenticated using (is_staff()) with check (is_staff());
drop policy if exists "read_all" on obra_evidencias;
create policy "read_all" on obra_evidencias for select to authenticated using (true);
drop policy if exists "operativo_insert" on obra_evidencias;
create policy "operativo_insert" on obra_evidencias for insert to authenticated
  with check (my_role() = 'operativo' and created_by = auth.uid());
drop policy if exists "operativo_delete_own" on obra_evidencias;
create policy "operativo_delete_own" on obra_evidencias for delete to authenticated
  using (my_role() = 'operativo' and created_by = auth.uid());

do $$
begin
  execute 'alter publication supabase_realtime add table obra_evidencias';
exception when duplicate_object then
  null;
end $$;

-- ===========================================================================
-- 4) RLS — tablas de negocio: admin+directivo (is_staff), sin acceso operativo
-- ===========================================================================
do $$
declare t text;
begin
  for t in select unnest(array[
    'clientes','facturas_venta','abonos','nominas','presupuestos','presupuesto_lineas','servicios'
  ])
  loop
    execute format('drop policy if exists "admin_full_access" on %I;', t);
    execute format(
      'create policy "admin_full_access" on %I for all to authenticated using (is_staff()) with check (is_staff());',
      t
    );
  end loop;
end $$;

-- respaldos_semanales sigue exclusivo de admin (Directivo no entra a Respaldos).

-- ===========================================================================
-- 5) OBRAS, PERSONAL, ENTREGAS_EFECTIVO: admin+directivo escritura completa,
--    cualquier autenticado (incluido operativo) puede leer.
-- ===========================================================================
do $$
declare t text;
begin
  for t in select unnest(array['obras','personal','entregas_efectivo'])
  loop
    execute format('drop policy if exists "admin_full_access" on %I;', t);
    execute format(
      'create policy "admin_full_access" on %I for all to authenticated using (is_staff()) with check (is_staff());',
      t
    );
    -- "operario_read" ya deja leer a cualquier autenticado; se mantiene tal cual.
  end loop;
end $$;

-- Además, el operativo puede cambiar el estado de una obra a "finalizada"
-- solo si ya adjuntó al menos 3 fotos de evidencia (obra_evidencias). Para
-- cualquier otro cambio de estado no hay restricción de fotos.
drop policy if exists "operativo_update_estado" on obras;
create policy "operativo_update_estado" on obras for update to authenticated
  using (my_role() = 'operativo')
  with check (
    my_role() = 'operativo'
    and (estado <> 'finalizada' or (select count(*) from obra_evidencias where obra_id = obras.id) >= 3)
  );

-- ===========================================================================
-- 6) FACTURAS_COMPRA / FACTURA_COMPRA_LINEAS: admin+directivo todo;
--    operativo (antes "operario") crea/ve/edita/borra solo lo suyo.
-- ===========================================================================
drop policy if exists "admin_full_access" on facturas_compra;
create policy "admin_full_access" on facturas_compra for all to authenticated using (is_staff()) with check (is_staff());
-- Las políticas "operario_select_own/insert/update_own/delete_own" ya
-- comprueban created_by = auth.uid(), sin depender del nombre del rol:
-- se mantienen sin cambios, solo aplican ahora al rol "operativo".

drop policy if exists "compra_lineas_access" on factura_compra_lineas;
create policy "compra_lineas_access" on factura_compra_lineas for all to authenticated
  using (exists (
    select 1 from facturas_compra fc
    where fc.id = factura_compra_lineas.factura_compra_id and (is_staff() or fc.created_by = auth.uid())
  ))
  with check (exists (
    select 1 from facturas_compra fc
    where fc.id = factura_compra_lineas.factura_compra_id and (is_staff() or fc.created_by = auth.uid())
  ));

-- ===========================================================================
-- 7) INCIDENCIAS: antes exclusiva de admin; ahora admin+directivo todo, y el
--    operativo puede verlas todas, crear las suyas y editar/borrar las suyas.
-- ===========================================================================
alter table incidencias enable row level security;
drop policy if exists "admin_full_access" on incidencias;
create policy "admin_full_access" on incidencias for all to authenticated using (is_staff()) with check (is_staff());
drop policy if exists "operativo_select_all" on incidencias;
create policy "operativo_select_all" on incidencias for select to authenticated using (my_role() = 'operativo');
drop policy if exists "operativo_insert" on incidencias;
create policy "operativo_insert" on incidencias for insert to authenticated with check (my_role() = 'operativo' and created_by = auth.uid());
drop policy if exists "operativo_update_own" on incidencias;
create policy "operativo_update_own" on incidencias for update to authenticated using (my_role() = 'operativo' and created_by = auth.uid()) with check (my_role() = 'operativo' and created_by = auth.uid());
drop policy if exists "operativo_delete_own" on incidencias;
create policy "operativo_delete_own" on incidencias for delete to authenticated using (my_role() = 'operativo' and created_by = auth.uid());
