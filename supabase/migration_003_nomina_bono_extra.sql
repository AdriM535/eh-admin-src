-- Migración 003 — Ejecutar UNA VEZ en el SQL Editor de Supabase sobre el
-- proyecto ya existente (para un proyecto nuevo basta con schema.sql, que
-- ya incluye este cambio).
--
-- nominas: añade "tipo" (periodica | bono_extra) para poder registrar
-- pagos puntuales al personal fuera del ciclo normal de nómina (adelantos,
-- bonos en efectivo) sin mezclarlos con las liquidaciones periódicas.

alter table nominas add column if not exists tipo text not null default 'periodica';
