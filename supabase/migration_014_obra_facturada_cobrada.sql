-- ---------------------------------------------------------------------------
-- Registro directo de facturación/cobro en la obra, para obras que no pasan
-- por una factura de venta formal (trabajos pequeños cobrados directamente).
-- Sin esto, esas obras aparecían siempre con 0,00 € de Facturado/Cobrado
-- aunque el trabajo sí se hubiera cobrado.
-- ---------------------------------------------------------------------------
alter table obras add column if not exists facturada boolean not null default false;
alter table obras add column if not exists cobrada boolean not null default false;
alter table obras add column if not exists metodo_cobro text;              -- cuenta | efectivo (igual que en facturas de venta)
alter table obras add column if not exists importe_directo numeric;        -- importe cobrado directamente, sin factura de venta formal
