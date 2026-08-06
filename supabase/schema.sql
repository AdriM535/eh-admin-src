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
  direccion text,
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
-- PERSONAL (empleados y autónomos)
-- ---------------------------------------------------------------------------
create table if not exists personal (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null default 'empleado',          -- empleado | autonomo
  nif text,
  telefono text,
  email text,
  activo boolean not null default true,
  notas text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

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
-- ROW LEVEL SECURITY
-- Modelo "operación compartida": cualquier usuario autenticado tiene acceso
-- completo de lectura/escritura. El aislamiento se hace a nivel de cuenta
-- (quién puede registrarse/ser invitado), no a nivel de fila.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'clientes','obras','personal','facturas_venta','facturas_compra',
    'factura_compra_lineas','abonos','nominas','presupuestos','presupuesto_lineas','incidencias'
  ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "team_full_access" on %I;', t);
    execute format(
      'create policy "team_full_access" on %I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- STORAGE: bucket privado para los adjuntos de facturas (PDF/foto)
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

-- ---------------------------------------------------------------------------
-- REALTIME: publicar cambios de todas las tablas para que el equipo vea
-- las actualizaciones de los demás en vivo (móvil y escritorio a la vez).
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'clientes','obras','personal','facturas_venta','facturas_compra',
    'factura_compra_lineas','abonos','nominas','presupuestos','presupuesto_lineas','incidencias'
  ])
  loop
    begin
      execute format('alter publication supabase_realtime add table %I;', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;
