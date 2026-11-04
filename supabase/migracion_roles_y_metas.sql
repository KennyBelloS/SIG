-- =====================================================================
-- Indicadores de Gestión · Finca Torremolinos
-- Migración: metas anual/mensual, frecuencia de seguimiento, tres roles,
-- plan de acción obligatorio, cierre automático en el servidor y permisos
-- reales por rol.
--
-- Es segura de repetir (se puede ejecutar más de una vez).
-- Ejecútala completa en Supabase → SQL Editor.
-- =====================================================================

-- 1) Campos nuevos del indicador ---------------------------------------
alter table indicadores add column if not exists frecuencia_seguimiento text;
alter table indicadores add column if not exists meta_mensual numeric;
alter table indicadores add column if not exists tipo_meta text;
alter table indicadores drop constraint if exists indicadores_tipo_meta_check;
alter table indicadores add constraint indicadores_tipo_meta_check check (tipo_meta is null or tipo_meta in ('anual','mensual'));

-- 2) Tres roles: admin, digitador, usuario -----------------------------
alter table indicadores_usuarios drop constraint if exists indicadores_usuarios_rol_check;
alter table indicadores_usuarios add constraint indicadores_usuarios_rol_check check (rol in ('admin','digitador','usuario'));

-- 3) Plan de acción obligatorio ----------------------------------------
-- NOT VALID: no revisa lo que ya estaba guardado (el histórico del Excel trae meses
-- sin plan), pero sí exige plan en todo lo que se guarde o edite desde ahora.
alter table indicadores_registros drop constraint if exists plan_accion_obligatorio;
alter table indicadores_registros add constraint plan_accion_obligatorio
  check (valor is null or length(btrim(coalesce(accion, ''))) > 0) not valid;

-- 4) Cierre automático también en el servidor --------------------------
-- Un mes se cierra solo cuando llega el día de cierre del mes siguiente (12 por defecto,
-- hora de Colombia). Si un administrador lo reabrió (o lo cerró antes), manda esa decisión.
create or replace function public.indicadores_bloquear_mes_cerrado()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  fila   record;
  dia    int;
  hoy    date := (now() at time zone 'America/Bogota')::date;
  cerrado boolean;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  select * into fila from indicadores_cierres where anio = new.anio and mes = new.mes;
  if found then
    cerrado := coalesce(fila.cerrado, false);
  else
    select coalesce(dia_cierre, 12) into dia from indicadores_configuracion where id = 1;
    dia := least(greatest(coalesce(dia, 12), 1), 28);
    cerrado := hoy >= (make_date(new.anio, new.mes, 1) + interval '1 month' + ((dia - 1) * interval '1 day'))::date;
  end if;

  if cerrado then
    raise exception 'Este mes (%/%) está cerrado. Pide a un administrador que lo reabra en Configuración.', new.mes, new.anio
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_indicadores_bloquear_mes_cerrado on indicadores_registros;
create trigger trg_indicadores_bloquear_mes_cerrado
  before insert or update on indicadores_registros
  for each row execute function public.indicadores_bloquear_mes_cerrado();

-- 5) Permisos reales por rol (RLS) -------------------------------------
-- Antes cualquier persona con sesión podía escribir en todo. Ahora:
--   admin      lee y escribe todo
--   digitador  lee todo lo de seguimiento y escribe SOLO registros mensuales
--   usuario    solo lee (y una cuenta sin fila en indicadores_usuarios cuenta como usuario)
create or replace function public.rol_actual()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select rol from indicadores_usuarios where user_id = auth.uid()), 'usuario')
$$;
revoke all on function public.rol_actual() from public;
grant execute on function public.rol_actual() to authenticated, service_role;

do $$
declare t text;
begin
  -- se quitan las políticas "acceso total" anteriores y las de esta migración (para poder repetirla)
  for t in select unnest(array['indicadores','indicadores_procesos','indicadores_registros','indicadores_cierres',
                               'indicadores_configuracion','indicadores_involucrados','indicadores_notificaciones','indicadores_usuarios'])
  loop
    execute format('drop policy if exists %I on %I', 'acceso_total_' || t, t);
    execute format('drop policy if exists %I on %I', 'rol_leer_' || t, t);
    execute format('drop policy if exists %I on %I', 'rol_escribir_' || t, t);
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Catálogo y configuración: todos leen, solo el administrador escribe
do $$
declare t text;
begin
  foreach t in array array['indicadores','indicadores_procesos','indicadores_cierres','indicadores_configuracion'] loop
    execute format('create policy %I on %I for select to authenticated using (true)', 'rol_leer_' || t, t);
    execute format('create policy %I on %I for all to authenticated using (rol_actual() = ''admin'') with check (rol_actual() = ''admin'')', 'rol_escribir_' || t, t);
  end loop;
end $$;

-- Registros mensuales: todos leen; administrador y digitador escriben
create policy rol_leer_indicadores_registros on indicadores_registros for select to authenticated using (true);
create policy rol_escribir_indicadores_registros on indicadores_registros for all to authenticated
  using (rol_actual() in ('admin','digitador')) with check (rol_actual() in ('admin','digitador'));

-- Correos de las personas, historial de envíos y usuarios: solo el administrador
create policy rol_leer_indicadores_involucrados on indicadores_involucrados for select to authenticated using (rol_actual() = 'admin');
create policy rol_escribir_indicadores_involucrados on indicadores_involucrados for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');
create policy rol_leer_indicadores_notificaciones on indicadores_notificaciones for select to authenticated using (rol_actual() = 'admin');
create policy rol_escribir_indicadores_notificaciones on indicadores_notificaciones for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');
-- Cada persona puede leer su propia fila (así la app sabe su rol); el administrador lee y cambia todas
create policy rol_leer_indicadores_usuarios on indicadores_usuarios for select to authenticated using (user_id = auth.uid() or rol_actual() = 'admin');
create policy rol_escribir_indicadores_usuarios on indicadores_usuarios for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

-- Quien no inició sesión no ve nada (solo se tocan las tablas de esta aplicación)
revoke all on indicadores, indicadores_procesos, indicadores_registros, indicadores_cierres,
  indicadores_configuracion, indicadores_involucrados, indicadores_notificaciones, indicadores_usuarios from anon;

-- 6) Latido del envío automático: cada vez que el despertador diario llama, queda anotado
--    (así el administrador ve en Configuración si el envío automático está funcionando).
alter table indicadores_configuracion add column if not exists ultimo_pulso timestamptz;
