-- ---------------------------------------------------------------------------
-- Guardado atómico de facturas de compra (cabecera + líneas de producto).
--
-- Antes, el frontend hacía 3 pasos sueltos: guardar cabecera, borrar líneas
-- antiguas, insertar líneas nuevas. Si el paso 2 o 3 fallaba (red, permisos,
-- validación), la cabecera ya había quedado guardada con las líneas antiguas
-- borradas y las nuevas sin insertar -> datos inconsistentes.
--
-- Esta función hace las 3 operaciones dentro de una sola llamada, que
-- Postgres ejecuta como una única transacción: si algo falla a mitad de
-- camino, se deshace todo y no queda ningún cambio a medias.
--
-- SECURITY INVOKER (por defecto): la función corre con los permisos del
-- usuario que la llama, así que las políticas RLS de facturas_compra y
-- factura_compra_lineas se siguen aplicando exactamente igual que si se
-- hicieran los inserts/updates directamente.
-- ---------------------------------------------------------------------------

create or replace function guardar_factura_compra(
  p_id uuid,
  p_header jsonb,
  p_lineas jsonb
) returns facturas_compra
language plpgsql
security invoker
as $$
declare
  v_row facturas_compra;
begin
  if p_id is null then
    insert into facturas_compra (
      obra_id, categoria_general, personal_id, entrega_efectivo_id, fecha,
      proveedor, numero_factura, total, metodo_pago, pagado_por, pagado,
      notas, adjunto_path, adjunto_nombre, created_by
    ) values (
      nullif(p_header->>'obra_id', '')::uuid,
      p_header->>'categoria_general',
      nullif(p_header->>'personal_id', '')::uuid,
      nullif(p_header->>'entrega_efectivo_id', '')::uuid,
      nullif(p_header->>'fecha', '')::date,
      p_header->>'proveedor',
      p_header->>'numero_factura',
      coalesce((p_header->>'total')::numeric, 0),
      p_header->>'metodo_pago',
      p_header->>'pagado_por',
      coalesce((p_header->>'pagado')::boolean, true),
      p_header->>'notas',
      p_header->>'adjunto_path',
      p_header->>'adjunto_nombre',
      auth.uid()
    ) returning * into v_row;
  else
    update facturas_compra set
      obra_id = nullif(p_header->>'obra_id', '')::uuid,
      categoria_general = p_header->>'categoria_general',
      personal_id = nullif(p_header->>'personal_id', '')::uuid,
      entrega_efectivo_id = nullif(p_header->>'entrega_efectivo_id', '')::uuid,
      fecha = nullif(p_header->>'fecha', '')::date,
      proveedor = p_header->>'proveedor',
      numero_factura = p_header->>'numero_factura',
      total = coalesce((p_header->>'total')::numeric, 0),
      metodo_pago = p_header->>'metodo_pago',
      pagado_por = p_header->>'pagado_por',
      pagado = coalesce((p_header->>'pagado')::boolean, true),
      notas = p_header->>'notas',
      adjunto_path = p_header->>'adjunto_path',
      adjunto_nombre = p_header->>'adjunto_nombre'
    where id = p_id
    returning * into v_row;

    if not found then
      raise exception 'Factura de compra % no encontrada o sin permiso para editarla', p_id;
    end if;

    delete from factura_compra_lineas where factura_compra_id = v_row.id;
  end if;

  -- Solo se insertan las líneas con producto: coherente con lo que ya hacía
  -- el frontend (y con la restricción not null de la columna producto).
  insert into factura_compra_lineas (
    factura_compra_id, producto, cantidad, precio_unitario, tasa_iva,
    precio_unitario_con_iva, importe, orden
  )
  select
    v_row.id,
    l->>'producto',
    coalesce((l->>'cantidad')::numeric, 1),
    coalesce((l->>'precio_unitario')::numeric, 0),
    coalesce((l->>'tasa_iva')::numeric, 21),
    coalesce((l->>'precio_unitario_con_iva')::numeric, 0),
    coalesce((l->>'importe')::numeric, 0),
    (ord - 1)::int
  from jsonb_array_elements(coalesce(p_lineas, '[]'::jsonb)) with ordinality as t(l, ord)
  where nullif(trim(l->>'producto'), '') is not null;

  return v_row;
end;
$$;

grant execute on function guardar_factura_compra(uuid, jsonb, jsonb) to authenticated;
