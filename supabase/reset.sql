-- =====================================================================
-- RESET — borra SOLO los datos del módulo de Indicadores (no toca nada
-- de autenticación ni de otras apps). Úsalo si ya habías corrido
-- schema.sql antes y los indicadores quedaron duplicados o incompletos.
--
-- Pasos:
--   1. Corre este archivo completo una vez (SQL Editor → New query → Run).
--   2. Después corre schema.sql completo otra vez.
--   3. Listo: vas a quedar con el catálogo limpio y el histórico real
--      cargado correctamente, sin duplicados.
-- =====================================================================

-- Nota: esto NO borra indicadores_usuarios (los roles de admin/usuario que
-- hayas asignado se conservan) ni tu cuenta de Supabase Auth.
truncate table
  indicadores_notificaciones,
  indicadores_cierres,
  indicadores_registros,
  indicadores_involucrados,
  indicadores,
  indicadores_procesos
restart identity cascade;

update indicadores_configuracion set ultimo_envio_auto = null where id = 1;
