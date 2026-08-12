-- Gestión de Obras — Estructuras Humanizadoras
-- Esquema Supabase: operación COMPARTIDA por todo el equipo (Sindy + quien
-- ella invite). Cualquier usuario autenticado (auth.role() = 'authenticated')
-- puede leer y escribir todas las filas de todas las tablas. El control de
-- acceso real se hace decidiendo QUIÉN puede tener una cuenta (ver README:
-- desactivar el alta pública e invitar manualmente a cada persona del equipo
-- desde el panel de Supabase).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- CLIENTES
-- ---------------------------------------------------------------------------
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nif text,
  telefono text,
  email text,
  direccion text,                                  -- histórico, en desuso a favor de los campos de abajo
  calle text,
  numero text,
  interior text,
  municipio text,
  provincia text,
  cp text,
  notas text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- OBRAS / PROYECTOS
-- ---------------------------------------------------------------------------
create table if not exists obras (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo text unique,    -- código consecutivo AAAA-NNN, se reinicia cada año, asignado al crear la obra
  cliente_id uuid references clientes(id) on delete set null,
  direccion text,
  ciudad text,
  estado text not null default 'presupuesto',    -- presupuesto | activa | finalizada | cancelada
  fecha_inicio date,
  fecha_fin date,
  notas text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists obras_cliente_id_idx on obras(cliente_id);

-- ---------------------------------------------------------------------------
-- PERSONAL (empleados directos y autónomos/especialistas externos)
-- ---------------------------------------------------------------------------
create table if not exists personal (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null default 'empleado',          -- empleado | autonomo
  especialidad text,                              -- solo si tipo = autonomo: albañilería, electricidad…
  nif text,
  telefono text,
  email text,
  activo boolean not null default true,
  notas text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- La obra puede tener una persona (empleado o autónomo) como responsable.
alter table obras add column if not exists responsable_id uuid references personal(id) on delete set null;
create index if not exists obras_responsable_id_idx on obras(responsable_id);

-- ---------------------------------------------------------------------------
-- FACTURAS DE VENTA (ingresos a clientes)
-- ---------------------------------------------------------------------------
create table if not exists facturas_venta (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references obras(id) on delete set null,
  cliente_id uuid references clientes(id) on delete set null,
  serie text,
  numero text,
  fecha_expedicion date,
  fecha_cobro date,
  base_imponible numeric,
  tipo_iva numeric default 21,
  total_iva numeric,
  total numeric not null default 0,
  cobrado boolean not null default false,
  metodo_cobro text,                              -- cuenta | efectivo
  en_b boolean not null default false,             -- cobro no declarado, control interno
  notas text,
  adjunto_path text,
  adjunto_nombre text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists facturas_venta_obra_id_idx on facturas_venta(obra_id);
create index if not exists facturas_venta_cliente_id_idx on facturas_venta(cliente_id);

-- ---------------------------------------------------------------------------
-- FACTURAS DE COMPRA (gastos): cabecera de la factura. Se asigna a UNA obra,
-- o si no es de una obra concreta, se clasifica como insumo general
-- (gasolina, mantenimiento, material general, autónomo, otro). Los productos
-- de la factura van en factura_compra_lineas.
-- ---------------------------------------------------------------------------
create table if not exists facturas_compra (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references obras(id) on delete set null,
  categoria_general text,                         -- gasolina | mantenimiento | material_general | autonomo | otro (solo si no hay obra_id)
  personal_id uuid references personal(id) on delete set null,
  entrega_efectivo_id uuid,                       -- si el pago sale de una entrega de caja (ver entregas_efectivo), referencia añadida más abajo
  fecha date,
  proveedor text,                                 -- comercio
  numero_factura text,
  total numeric not null default 0,               -- suma de factura_compra_lineas.importe
  metodo_pago text,                               -- efectivo | tarjeta | transferencia
  pagado_por text,
  pagado boolean not null default true,
  notas text,
  adjunto_path text,
  adjunto_nombre text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists facturas_compra_obra_id_idx on facturas_compra(obra_id);
create index if not exists facturas_compra_personal_id_idx on facturas_compra(personal_id);
create index if not exists facturas_compra_entrega_efectivo_id_idx on facturas_compra(entrega_efectivo_id);

-- ---------------------------------------------------------------------------
-- ENTREGAS DE EFECTIVO (caja): dinero que Sindy entrega a un empleado para
-- que compre algo. Se descuenta de caja en el momento de la entrega. Las
-- facturas de compra pagadas con ese dinero se vinculan aquí (campo
-- entrega_efectivo_id en facturas_compra) para saber qué falta justificar.
-- ---------------------------------------------------------------------------
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

do $$
begin
  alter table facturas_compra add constraint facturas_compra_entrega_efectivo_id_fkey
    foreign key (entrega_efectivo_id) references entregas_efectivo(id) on delete set null;
exception when duplicate_object then
  null;
end $$;

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

-- ---------------------------------------------------------------------------
-- ABONOS Y ANTICIPOS DE CLIENTES
-- ---------------------------------------------------------------------------
create table if not exists abonos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references obras(id) on delete set null,
  cliente_id uuid references clientes(id) on delete set null,
  fecha date not null default current_date,
  importe numeric not null default 0,
  concepto text,
  es_anticipo boolean not null default false,
  metodo_cobro text,                              -- cuenta | efectivo
  en_b boolean not null default false,
  notas text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists abonos_obra_id_idx on abonos(obra_id);
create index if not exists abonos_cliente_id_idx on abonos(cliente_id);

-- ---------------------------------------------------------------------------
-- NÓMINAS (personal tipo "empleado")
-- ---------------------------------------------------------------------------
create table if not exists nominas (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references personal(id) on delete cascade,
  tipo text not null default 'periodica',        -- periodica | bono_extra (pago fuera de nómina normal)
  periodo_inicio date,
  periodo_fin date,
  liquidado numeric not null default 0,
  cotizacion_ss numeric not null default 0,
  adicionales numeric not null default 0,
  deducciones numeric not null default 0,
  horas_extra numeric not null default 0,
  total numeric not null default 0,
  pagado boolean not null default false,
  fecha_pago date,
  notas text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists nominas_personal_id_idx on nominas(personal_id);

-- ---------------------------------------------------------------------------
-- PRESUPUESTOS
-- ---------------------------------------------------------------------------
create table if not exists presupuestos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete set null,
  obra_id uuid references obras(id) on delete set null,
  numero text,
  fecha date not null default current_date,
  validez_dias integer default 30,
  estado text not null default 'borrador',        -- borrador | enviado | aceptado | rechazado
  notas text,
  total numeric not null default 0,
  enviado_a text,                                 -- email al que se envió por última vez
  fecha_envio timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists presupuestos_cliente_id_idx on presupuestos(cliente_id);

create table if not exists presupuesto_lineas (
  id uuid primary key default gen_random_uuid(),
  presupuesto_id uuid not null references presupuestos(id) on delete cascade,
  concepto text not null,
  cantidad numeric not null default 1,
  precio_unitario numeric not null default 0,
  importe numeric not null default 0,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists presupuesto_lineas_presupuesto_id_idx on presupuesto_lineas(presupuesto_id);

-- ---------------------------------------------------------------------------
-- CATÁLOGO DE SERVICIOS (para elegir al crear un presupuesto)
-- ---------------------------------------------------------------------------
create table if not exists servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  unidad text,                                    -- ej. m2, hora, ud
  precio_unitario numeric not null default 0,
  categoria text,
  activo boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- INCIDENCIAS (daños por no seguir protocolo: fotos, medidas, tiempos...)
-- ---------------------------------------------------------------------------
create table if not exists incidencias (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references obras(id) on delete set null,
  personal_id uuid references personal(id) on delete set null,
  fecha date not null default current_date,
  descripcion text not null,
  coste numeric default 0,
  asumido_empleado boolean not null default false,
  estado text not null default 'pendiente',       -- pendiente | resuelto
  notas text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists incidencias_obra_id_idx on incidencias(obra_id);
create index if not exists incidencias_personal_id_idx on incidencias(personal_id);

-- ---------------------------------------------------------------------------
-- PERFILES: rol de cada cuenta.
--   admin      — Administradora/desarrolladora: ve/edita todo, gestiona
--                usuarios/roles, respaldos e importación.
--   directivo  — ve y opera todo el negocio, sin gestionar usuarios ni
--                entrar a Respaldos/Importar.
--   operativo  — obras (cambia a "finalizada" solo con ≥3 fotos de
--                evidencia), incidencias propias, caja en solo lectura y
--                captura de facturas de compra propias.
-- ---------------------------------------------------------------------------
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nombre text,
  role text not null default 'operativo',           -- admin | directivo | operativo
  personal_id uuid references personal(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Alta automática de perfil (como operativo) cada vez que se registra una
-- cuenta nueva; se asciende manualmente desde la pestaña Usuarios si hace falta.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, email, role) values (new.id, new.email, 'operativo')
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

create or replace function public.my_role()
returns text language sql security definer set search_path = public stable as $$
  select role from public.perfiles where id = auth.uid();
$$;

-- admin o directivo: acceso completo a la operación del negocio.
create or replace function public.is_staff()
returns boolean language sql security definer set search_path = public stable as $$
  select public.my_role() in ('admin', 'directivo');
$$;

-- ---------------------------------------------------------------------------
-- RESPALDO SEMANAL (lo genera la Edge Function weekly-backup)
-- ---------------------------------------------------------------------------
create table if not exists respaldos_semanales (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  storage_path text not null,
  nombre_archivo text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- OBRA_EVIDENCIAS: fotos adjuntas al marcar una obra como "finalizada".
-- ---------------------------------------------------------------------------
create table if not exists obra_evidencias (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  storage_path text not null,
  nombre_archivo text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists obra_evidencias_obra_id_idx on obra_evidencias(obra_id);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- admin/directivo (is_staff): acceso completo a la operación del negocio.
-- Respaldos e Importar (implícito, sin tabla propia) siguen exclusivos de
-- admin. El operativo solo lee obras/personal/entregas de caja, gestiona
-- sus propias facturas de compra e incidencias, y solo puede cerrar una
-- obra ("finalizada") si adjuntó ≥3 fotos de evidencia.
-- ---------------------------------------------------------------------------
alter table perfiles enable row level security;
drop policy if exists "perfiles_select" on perfiles;
create policy "perfiles_select" on perfiles for select to authenticated
  using (id = auth.uid() or is_admin());
drop policy if exists "perfiles_update_admin" on perfiles;
create policy "perfiles_update_admin" on perfiles for update to authenticated
  using (is_admin()) with check (is_admin());

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'clientes','facturas_venta','abonos','nominas','presupuestos','presupuesto_lineas',
    'respaldos_semanales','servicios'
  ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "team_full_access" on %I;', t);
    execute format('drop policy if exists "admin_full_access" on %I;', t);
    execute format(
      'create policy "admin_full_access" on %I for all to authenticated using (is_staff()) with check (is_staff());',
      t
    );
  end loop;
end $$;
-- respaldos_semanales debe quedar exclusivo de admin (Directivo no entra a Respaldos).
drop policy if exists "admin_full_access" on respaldos_semanales;
create policy "admin_full_access" on respaldos_semanales for all to authenticated using (is_admin()) with check (is_admin());

do $$
declare
  t text;
begin
  for t in select unnest(array['obras','personal','entregas_efectivo'])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "team_full_access" on %I;', t);
    execute format('drop policy if exists "admin_full_access" on %I;', t);
    execute format('drop policy if exists "operario_read" on %I;', t);
    execute format(
      'create policy "admin_full_access" on %I for all to authenticated using (is_staff()) with check (is_staff());',
      t
    );
    execute format('create policy "operario_read" on %I for select to authenticated using (true);', t);
  end loop;
end $$;

-- El operativo puede marcar una obra como "finalizada" solo si ya adjuntó
-- al menos 3 fotos de evidencia; para cualquier otro cambio de estado no
-- hay restricción de fotos.
drop policy if exists "operativo_update_estado" on obras;
create policy "operativo_update_estado" on obras for update to authenticated
  using (my_role() = 'operativo')
  with check (
    my_role() = 'operativo'
    and (estado <> 'finalizada' or (select count(*) from obra_evidencias where obra_id = obras.id) >= 3)
  );

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

alter table facturas_compra enable row level security;
drop policy if exists "team_full_access" on facturas_compra;
drop policy if exists "admin_full_access" on facturas_compra;
create policy "admin_full_access" on facturas_compra for all to authenticated using (is_staff()) with check (is_staff());
drop policy if exists "operario_select_own" on facturas_compra;
create policy "operario_select_own" on facturas_compra for select to authenticated using (created_by = auth.uid());
drop policy if exists "operario_insert" on facturas_compra;
create policy "operario_insert" on facturas_compra for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "operario_update_own" on facturas_compra;
create policy "operario_update_own" on facturas_compra for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists "operario_delete_own" on facturas_compra;
create policy "operario_delete_own" on facturas_compra for delete to authenticated using (created_by = auth.uid());

alter table factura_compra_lineas enable row level security;
drop policy if exists "team_full_access" on factura_compra_lineas;
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

-- incidencias: admin/directivo todo; el operativo ve todas, crea las suyas
-- y edita/borra solo las suyas.
alter table incidencias enable row level security;
drop policy if exists "team_full_access" on incidencias;
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

-- ---------------------------------------------------------------------------
-- STORAGE: bucket privado para los adjuntos de facturas (PDF/foto) y otro
-- para los respaldos semanales (solo lectura para admin).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

drop policy if exists "eh_team_read_documentos" on storage.objects;
create policy "eh_team_read_documentos" on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos');

drop policy if exists "eh_team_write_documentos" on storage.objects;
create policy "eh_team_write_documentos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documentos');

drop policy if exists "eh_team_update_documentos" on storage.objects;
create policy "eh_team_update_documentos" on storage.objects
  for update to authenticated
  using (bucket_id = 'documentos');

drop policy if exists "eh_team_delete_documentos" on storage.objects;
create policy "eh_team_delete_documentos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documentos');

insert into storage.buckets (id, name, public)
values ('respaldos', 'respaldos', false)
on conflict (id) do nothing;

drop policy if exists "eh_admin_read_respaldos" on storage.objects;
create policy "eh_admin_read_respaldos" on storage.objects
  for select to authenticated
  using (bucket_id = 'respaldos' and is_admin());

-- ---------------------------------------------------------------------------
-- REALTIME: publicar cambios de todas las tablas para que el equipo vea
-- las actualizaciones de los demás en vivo (móvil y escritorio a la vez).
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'clientes','obras','obra_evidencias','personal','facturas_venta','facturas_compra',
    'factura_compra_lineas','entregas_efectivo','abonos','nominas','presupuestos','presupuesto_lineas',
    'incidencias','perfiles','servicios'
  ])
  loop
    begin
      execute format('alter publication supabase_realtime add table %I;', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;
