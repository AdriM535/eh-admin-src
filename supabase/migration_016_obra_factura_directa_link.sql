-- ---------------------------------------------------------------------------
-- Enlaza cada obra con la factura de venta que se le crea automáticamente al
-- marcarla como "facturada" (ver migration_014), para poder actualizar esa
-- misma factura en vez de crear una nueva cada vez que se guarda la obra.
-- ---------------------------------------------------------------------------
alter table obras add column if not exists factura_directa_id uuid references facturas_venta(id) on delete set null;
