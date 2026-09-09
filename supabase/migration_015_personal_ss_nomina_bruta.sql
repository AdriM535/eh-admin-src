-- ---------------------------------------------------------------------------
-- Datos completos de personal (afiliación S.S., categoría, grupo de
-- cotización, fecha de ingreso) y desglose de nómina en bruto (salario
-- bruto, % IRPF, SS empleado, SS empresa) en vez de solo el líquido a
-- percibir. No se toca ninguna columna existente ni se borra ningún dato.
-- ---------------------------------------------------------------------------
alter table personal add column if not exists numero_afiliacion_ss text;
alter table personal add column if not exists categoria text;
alter table personal add column if not exists grupo_cotizacion text;
alter table personal add column if not exists fecha_ingreso date;

alter table nominas add column if not exists salario_bruto numeric;
alter table nominas add column if not exists irpf_porcentaje numeric;
alter table nominas add column if not exists irpf_importe numeric;
alter table nominas add column if not exists ss_empleado numeric;
alter table nominas add column if not exists ss_empresa numeric;
alter table nominas add column if not exists liquido numeric;
