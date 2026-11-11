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
    select coalesce(dia_cierre, 15) into dia from indicadores_configuracion where id = 1;
    dia := least(greatest(coalesce(dia, 15), 1), 28);
    -- dia = último día para registrar DE ESE MISMO MES (inclusive): se cierra al día siguiente; los meses pasados están cerrados
    cerrado := hoy > make_date(new.anio, new.mes, dia);
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

-- 7) Último día para registrar: 15 (el mes se cierra el 16).
--    Solo se cambia el valor si todavía tiene el anterior (12); un valor que tú ya personalizaste no se toca.
alter table indicadores_configuracion alter column dia_cierre set default 15;
update indicadores_configuracion set dia_cierre = 15 where id = 1 and dia_cierre = 12;

-- 8) Registros históricos: lo que viene del libro de Excel original puede no traer plan de acción.
--    La marca `historico` los exime de la regla; todo lo que se registre desde la aplicación sigue exigiendo plan.
--    Solo el servidor (llave de servicio) puede MARCAR un registro como histórico: así nadie se salta la regla desde la API.
alter table indicadores_registros drop constraint if exists plan_accion_obligatorio;   -- se vuelve a crear al final, ya con la excepción
alter table indicadores_registros add column if not exists historico boolean not null default false;

create or replace function public.indicadores_registros_proteger_historico()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then return new; end if;
  if tg_op = 'INSERT' then new.historico := false;
  else new.historico := new.historico and coalesce(old.historico, false);   -- se puede quitar la marca, nunca ponerla
  end if;
  return new;
end; $$;
drop trigger if exists trg_indicadores_registros_historico on indicadores_registros;
create trigger trg_indicadores_registros_historico before insert or update on indicadores_registros
  for each row execute function public.indicadores_registros_proteger_historico();

alter table indicadores_registros disable trigger trg_indicadores_bloquear_mes_cerrado;   -- el relleno toca meses ya cerrados
alter table indicadores_registros disable trigger trg_indicadores_registros_historico;    -- y lo hace el dueño de la base, no la aplicación
update indicadores_registros set historico = true where valor is not null and btrim(coalesce(accion, '')) = '' and not historico;
alter table indicadores_registros enable trigger trg_indicadores_bloquear_mes_cerrado;
alter table indicadores_registros enable trigger trg_indicadores_registros_historico;
alter table indicadores_registros add constraint plan_accion_obligatorio
  check (historico or valor is null or length(btrim(coalesce(accion, ''))) > 0) not valid;

-- 9) Cierre del año anterior (Hoja2 del libro): meta y resultado en texto, solo como referencia en la ficha.
alter table indicadores add column if not exists referencia_anterior jsonb;

-- 10) Nombre visible de cada persona. Cada una cambia SOLO el suyo; un administrador puede cambiar el de cualquiera.
alter table indicadores_usuarios add column if not exists nombre text;
create or replace function public.indicadores_cambiar_mi_nombre(p_nombre text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.' using errcode = '42501'; end if;
  p_nombre := nullif(btrim(p_nombre), '');
  if p_nombre is not null and length(p_nombre) > 80 then raise exception 'El nombre no puede pasar de 80 letras.' using errcode = '22001'; end if;
  insert into indicadores_usuarios (user_id, email, rol, nombre)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), 'usuario', p_nombre)
  on conflict (user_id) do update set nombre = excluded.nombre;
end $$;
grant execute on function public.indicadores_cambiar_mi_nombre(text) to authenticated;

-- 11) No todos los indicadores se calculan igual: unos se digitan, otros salen de dos números
--     (ejecutadas ÷ planeadas, numerador ÷ denominador, o la reducción frente al año anterior).
alter table indicadores add column if not exists calculo text not null default 'directo';
alter table indicadores drop constraint if exists indicadores_calculo_valido;
alter table indicadores add constraint indicadores_calculo_valido check (calculo in ('directo', 'ejecucion', 'razon', 'reduccion'));
alter table indicadores add column if not exists componentes jsonb;            -- nombres de los dos números, p. ej. {"a":"Planeadas","b":"Ejecutadas"}
alter table indicadores_registros add column if not exists componentes jsonb;  -- los dos números del mes, p. ej. {"a":3,"b":2}

-- 12) Límite de almacenamiento del plan de Supabase (500 MB en el gratuito), para mostrar cuánto espacio queda.
alter table indicadores_configuracion add column if not exists almacenamiento_limite_mb numeric not null default 500;

-- 13) Auditoría: quién cambió qué, y quién entra y quién sale. Solo la leen los administradores y nadie puede escribirla a mano:
--     la llenan los disparadores y las funciones de abajo.
create table if not exists indicadores_auditoria (
  id bigserial primary key,
  creado_en timestamptz not null default now(),
  user_id uuid, email text, nombre text,
  tipo text not null,          -- acceso | registro | catalogo | cierre | usuario | configuracion | involucrado | importacion
  accion text not null,        -- ingreso | salida | crear | editar | eliminar | cerrar | reabrir | importar
  resumen text not null,
  entidad text, entidad_id text, antes jsonb, despues jsonb
);
create index if not exists indicadores_auditoria_fecha on indicadores_auditoria (creado_en desc);
create index if not exists indicadores_auditoria_tipo on indicadores_auditoria (tipo, creado_en desc);
alter table indicadores_auditoria enable row level security;
drop policy if exists auditoria_lectura_admin on indicadores_auditoria;
create policy auditoria_lectura_admin on indicadores_auditoria for select to authenticated using (public.rol_actual() = 'admin');
revoke all on indicadores_auditoria from anon;
revoke insert, update, delete on indicadores_auditoria from authenticated;

create table if not exists indicadores_presencia (
  user_id uuid primary key, email text, nombre text, pantalla text,
  desde timestamptz not null default now(), ultima_actividad timestamptz not null default now()
);
alter table indicadores_presencia enable row level security;
drop policy if exists presencia_lectura_admin on indicadores_presencia;
create policy presencia_lectura_admin on indicadores_presencia for select to authenticated using (public.rol_actual() = 'admin');
revoke all on indicadores_presencia from anon;
revoke insert, update, delete on indicadores_presencia from authenticated;

create or replace function public.indicadores_auditar()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r jsonb; v_uid uuid := auth.uid(); v_email text; v_nombre text; v_tipo text; v_accion text; v_res text; v_id text;
  v_antes jsonb; v_desp jsonb; v_cambios jsonb; v_ind text;
begin
  -- lo que hace el servidor (importar el libro, crear usuarios, cierre automático) registra su propio resumen
  if auth.role() = 'service_role' then return coalesce(new, old); end if;
  r := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  select email, nombre into v_email, v_nombre from indicadores_usuarios where user_id = v_uid;
  v_accion := case tg_op when 'INSERT' then 'crear' when 'UPDATE' then 'editar' else 'eliminar' end;
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_cambios
      from jsonb_each(to_jsonb(new)) e where to_jsonb(old) -> e.key is distinct from e.value and e.key not in ('actualizado_en');
    if v_cambios = '{}'::jsonb then return new; end if;
    select coalesce(jsonb_object_agg(k, to_jsonb(old) -> k), '{}'::jsonb) into v_antes from jsonb_object_keys(v_cambios) k;
    v_desp := v_cambios;
  elsif tg_op = 'INSERT' then v_desp := r;
  else v_antes := r; end if;
  case tg_table_name
    when 'indicadores_registros' then
      v_tipo := 'registro'; v_id := r ->> 'id';
      select nombre into v_ind from indicadores where id = (r ->> 'indicador_id')::bigint;
      v_res := format('%s, mes %s de %s', coalesce(v_ind, 'Indicador ' || (r ->> 'indicador_id')), r ->> 'mes', r ->> 'anio');
    when 'indicadores' then v_tipo := 'catalogo'; v_id := r ->> 'id'; v_res := 'Indicador: ' || coalesce(r ->> 'nombre', '');
    when 'indicadores_cierres' then
      v_tipo := 'cierre'; v_id := (r ->> 'anio') || '-' || (r ->> 'mes');
      v_accion := case when coalesce((r ->> 'cerrado')::boolean, false) then 'cerrar' else 'reabrir' end;
      v_res := format('Mes %s de %s', r ->> 'mes', r ->> 'anio');
    when 'indicadores_usuarios' then v_tipo := 'usuario'; v_id := r ->> 'user_id'; v_res := 'Usuario: ' || coalesce(r ->> 'email', r ->> 'user_id');
    when 'indicadores_configuracion' then v_tipo := 'configuracion'; v_id := r ->> 'id'; v_res := 'Configuración de notificaciones y cierre';
    when 'indicadores_involucrados' then v_tipo := 'involucrado'; v_id := r ->> 'id'; v_res := 'Involucrado: ' || coalesce(r ->> 'nombre', r ->> 'email', '');
    else v_tipo := 'otro'; v_res := tg_table_name;
  end case;
  insert into indicadores_auditoria (user_id, email, nombre, tipo, accion, resumen, entidad, entidad_id, antes, despues)
  values (v_uid, v_email, v_nombre, v_tipo, v_accion, v_res, tg_table_name, v_id, v_antes, v_desp);
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['indicadores_registros', 'indicadores', 'indicadores_cierres', 'indicadores_usuarios', 'indicadores_configuracion', 'indicadores_involucrados'] loop
    execute format('drop trigger if exists trg_auditar on %I', t);
    execute format('create trigger trg_auditar after insert or update or delete on %I for each row execute function public.indicadores_auditar()', t);
  end loop;
end $$;

-- Quién entra y quién sale. La pantalla las llama al iniciar y al cerrar sesión; el latido marca quién está en línea.
create or replace function public.indicadores_registrar_sesion(p_evento text)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text; v_nombre text;
begin
  if auth.uid() is null then return; end if;
  if p_evento not in ('ingreso', 'salida') then raise exception 'Evento de sesión no válido.' using errcode = '22023'; end if;
  select email, nombre into v_email, v_nombre from indicadores_usuarios where user_id = auth.uid();
  v_email := coalesce(v_email, (select email from auth.users where id = auth.uid()));
  insert into indicadores_auditoria (user_id, email, nombre, tipo, accion, resumen)
  values (auth.uid(), v_email, v_nombre, 'acceso', p_evento, case p_evento when 'ingreso' then 'Entró a la aplicación' else 'Salió de la aplicación' end);
  if p_evento = 'salida' then delete from indicadores_presencia where user_id = auth.uid();
  else
    insert into indicadores_presencia (user_id, email, nombre, desde, ultima_actividad) values (auth.uid(), v_email, v_nombre, now(), now())
    on conflict (user_id) do update set desde = now(), ultima_actividad = now(), email = excluded.email, nombre = excluded.nombre;
  end if;
end $$;
grant execute on function public.indicadores_registrar_sesion(text) to authenticated;

create or replace function public.indicadores_latido(p_pantalla text)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text; v_nombre text;
begin
  if auth.uid() is null then return; end if;
  select email, nombre into v_email, v_nombre from indicadores_usuarios where user_id = auth.uid();
  v_email := coalesce(v_email, (select email from auth.users where id = auth.uid()));
  insert into indicadores_presencia (user_id, email, nombre, pantalla, desde, ultima_actividad) values (auth.uid(), v_email, v_nombre, left(p_pantalla, 80), now(), now())
  on conflict (user_id) do update set pantalla = excluded.pantalla, ultima_actividad = now(), email = coalesce(excluded.email, indicadores_presencia.email), nombre = excluded.nombre;
end $$;
grant execute on function public.indicadores_latido(text) to authenticated;

-- Cuánto espacio ocupa la base y cuándo se llenaría, calculado con el ritmo real de los últimos 60 días.
create or replace function public.indicadores_almacenamiento()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_limite numeric; v_base bigint; v_tablas jsonb; v_nuevo numeric := 0; v_n bigint; v_tot bigint; v_ult bigint;
begin
  if public.rol_actual() is distinct from 'admin' then raise exception 'Solo un administrador puede ver el almacenamiento.' using errcode = '42501'; end if;
  select coalesce(almacenamiento_limite_mb, 500) into v_limite from indicadores_configuracion where id = 1;
  v_base := pg_database_size(current_database());
  select coalesce(jsonb_agg(jsonb_build_object('tabla', c.relname, 'bytes', pg_total_relation_size(c.oid), 'filas', coalesce(s.n_live_tup, 0)) order by pg_total_relation_size(c.oid) desc), '[]'::jsonb)
    into v_tablas
    from pg_class c join pg_namespace n on n.oid = c.relnamespace left join pg_stat_user_tables s on s.relid = c.oid
    where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'indicadores%';
  -- bytes de datos nuevos en 60 días = filas nuevas × tamaño medio de una fila
  select count(*) into v_n from indicadores_registros where registrado_en >= now() - interval '60 days';
  select count(*) into v_tot from indicadores_registros;
  v_nuevo := v_nuevo + case when v_tot = 0 then 0 else v_n::numeric / v_tot * pg_total_relation_size('indicadores_registros') end;
  select count(*) into v_n from indicadores_auditoria where creado_en >= now() - interval '60 days';
  select count(*) into v_tot from indicadores_auditoria;
  v_nuevo := v_nuevo + case when v_tot = 0 then 0 else v_n::numeric / v_tot * pg_total_relation_size('indicadores_auditoria') end;
  return jsonb_build_object('base_bytes', v_base, 'limite_mb', v_limite, 'tablas', v_tablas, 'nuevo_60d_bytes', round(v_nuevo));
end $$;
grant execute on function public.indicadores_almacenamiento() to authenticated;

-- 14) Un mes cerrado no se toca de NINGUNA manera: ni se cambia, ni se borra, ni se mueve a otro mes.
--     (Antes solo se revisaba el mes nuevo de un cambio: se podía borrar un registro cerrado o cambiarle el mes.)
create or replace function public.indicadores_mes_esta_cerrado(p_anio int, p_mes int)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare fila record; dia int; hoy date := (now() at time zone 'America/Bogota')::date;
begin
  select * into fila from indicadores_cierres where anio = p_anio and mes = p_mes;
  if found then return coalesce(fila.cerrado, false); end if;
  select coalesce(dia_cierre, 15) into dia from indicadores_configuracion where id = 1;
  dia := least(greatest(coalesce(dia, 15), 1), 28);
  -- dia = último día para registrar DE ESE MISMO MES (inclusive): se cierra al día siguiente; los meses pasados están cerrados
  return hoy > make_date(p_anio, p_mes, dia);
end $$;

create or replace function public.indicadores_bloquear_mes_cerrado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' then return coalesce(new, old); end if;
  if tg_op in ('UPDATE', 'DELETE') and public.indicadores_mes_esta_cerrado(old.anio, old.mes) then
    raise exception 'Este mes (%/%) está cerrado. Pide a un administrador que lo reabra en Configuración.', old.mes, old.anio using errcode = 'P0001';
  end if;
  if tg_op in ('INSERT', 'UPDATE') and public.indicadores_mes_esta_cerrado(new.anio, new.mes) then
    raise exception 'Este mes (%/%) está cerrado. Pide a un administrador que lo reabra en Configuración.', new.mes, new.anio using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_indicadores_bloquear_mes_cerrado on indicadores_registros;
create trigger trg_indicadores_bloquear_mes_cerrado before insert or update or delete on indicadores_registros
  for each row execute function public.indicadores_bloquear_mes_cerrado();

-- 15) Meta máxima: el Excel tiene una fila "Máximos" junto a "Mínimos" (la banda de la meta, p. ej. 95 % a 110 %).
alter table indicadores add column if not exists meta_maxima numeric;

-- 16) Cada mes se cierra solo DESPUÉS DEL DÍA 15 DE ESE MISMO MES; los meses que ya pasaron quedan cerrados.
--     (Antes el mes anterior seguía abierto hasta el 15 del mes siguiente.) Un administrador puede reabrir cualquier mes.
create or replace function public.indicadores_mes_esta_cerrado(p_anio int, p_mes int)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare fila record; dia int; hoy date := (now() at time zone 'America/Bogota')::date;
begin
  select * into fila from indicadores_cierres where anio = p_anio and mes = p_mes;
  if found then return coalesce(fila.cerrado, false); end if;     -- lo que decidió un administrador manda
  select coalesce(dia_cierre, 15) into dia from indicadores_configuracion where id = 1;
  dia := least(greatest(coalesce(dia, 15), 1), 28);
  return hoy > make_date(p_anio, p_mes, dia);
end $$;

-- =====================================================================
-- 17) La actividad (bitácora) se elimina cada mes
--     Se conserva solo la del mes en curso. El 1.º de cada mes (hora de Colombia) el despertador diario borra la anterior
--     y deja UNA nota que dice cuántos registros se eliminaron. Solo un administrador (o el despertador) puede ejecutarla.
-- =====================================================================
create or replace function public.indicadores_depurar_bitacora()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_corte timestamptz := (date_trunc('month', now() at time zone 'America/Bogota')) at time zone 'America/Bogota';
  v_desde timestamptz;
  v_n bigint;
begin
  if auth.role() is distinct from 'service_role' and public.rol_actual() is distinct from 'admin' then
    raise exception 'Solo un administrador puede depurar la bitácora.' using errcode = '42501';
  end if;
  select min(creado_en) into v_desde from public.indicadores_auditoria where creado_en < v_corte;
  delete from public.indicadores_auditoria where creado_en < v_corte;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    insert into public.indicadores_auditoria (tipo, accion, resumen, despues)
    values ('configuracion', 'depurar',
            format('Se eliminó la actividad anterior al %s (%s registros)', to_char(v_corte at time zone 'America/Bogota', 'DD/MM/YYYY'), v_n),
            jsonb_build_object('eliminados', v_n, 'desde', v_desde, 'hasta', v_corte));
  end if;
  return jsonb_build_object('eliminados', v_n, 'corte', v_corte);
end;
$$;
revoke all on function public.indicadores_depurar_bitacora() from public, anon;
grant execute on function public.indicadores_depurar_bitacora() to authenticated, service_role;

-- =====================================================================
-- 18) Bitácora: borrado MANUAL (accesos / actividad / todo) y borrado AUTOMÁTICO el primer martes de cada mes,
--     con aviso previo y 2 días de plazo para cancelarlo. Reemplaza al bloque 17.
-- =====================================================================
alter table public.indicadores_configuracion
  add column if not exists depuracion_objetivo date,            -- el martes para el que se avisó
  add column if not exists depuracion_aviso_en timestamptz,     -- cuándo se avisó (el borrado exige 2 días completos después)
  add column if not exists depuracion_cancelada boolean not null default false;

drop function if exists public.indicadores_depurar_bitacora();

-- p_modo: 'accesos' (quién entra y sale), 'actividad' (todo lo demás) o 'todo'. Las notas de depuración anteriores se conservan.
create or replace function public.indicadores_depurar_bitacora(p_modo text default 'todo')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n bigint;
  v_quien text;
  v_texto text;
begin
  if auth.role() is distinct from 'service_role' and public.rol_actual() is distinct from 'admin' then
    raise exception 'Solo un administrador puede depurar la bitácora.' using errcode = '42501';
  end if;
  if p_modo not in ('accesos', 'actividad', 'todo') then
    raise exception 'Modo no válido: %', p_modo using errcode = '22023';
  end if;
  v_quien := coalesce((select email from public.indicadores_usuarios where user_id = auth.uid()), 'el despertador automático');
  delete from public.indicadores_auditoria
   where accion <> 'depurar'
     and case p_modo when 'accesos' then tipo = 'acceso' when 'actividad' then tipo <> 'acceso' else true end;
  get diagnostics v_n = row_count;
  v_texto := case p_modo when 'accesos' then 'los accesos' when 'actividad' then 'la actividad' else 'los accesos y la actividad' end;
  if v_n > 0 then
    insert into public.indicadores_auditoria (tipo, accion, resumen, despues)
    values ('configuracion', 'depurar', format('Se eliminaron %s registros de %s (por %s)', v_n, v_texto, v_quien), jsonb_build_object('modo', p_modo, 'eliminados', v_n, 'por', v_quien));
  end if;
  return jsonb_build_object('eliminados', v_n, 'modo', p_modo);
end;
$$;
revoke all on function public.indicadores_depurar_bitacora(text) from public, anon;
grant execute on function public.indicadores_depurar_bitacora(text) to authenticated, service_role;

-- Cancelar (o reactivar) la eliminación automática de este mes. Solo un administrador.
create or replace function public.indicadores_depuracion_cancelar(p_cancelar boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_obj date;
begin
  if public.rol_actual() is distinct from 'admin' then
    raise exception 'Solo un administrador puede cancelar la eliminación automática.' using errcode = '42501';
  end if;
  update public.indicadores_configuracion set depuracion_cancelada = p_cancelar where id = 1 returning depuracion_objetivo into v_obj;
  insert into public.indicadores_auditoria (tipo, accion, resumen, user_id, email)
  select 'configuracion', 'editar',
         case when p_cancelar then 'Se canceló la eliminación automática de la bitácora de este mes' else 'Se reactivó la eliminación automática de la bitácora' end,
         u.user_id, u.email
    from public.indicadores_usuarios u where u.user_id = auth.uid();
  return jsonb_build_object('cancelada', p_cancelar, 'objetivo', v_obj);
end;
$$;
revoke all on function public.indicadores_depuracion_cancelar(boolean) from public, anon;
grant execute on function public.indicadores_depuracion_cancelar(boolean) to authenticated, service_role;

-- =====================================================================
-- 19) Rol «ingeniero», accesos por cédula / usuario y actualización en tiempo real
--     Los usuarios de consulta entran con su CÉDULA y un PIN que genera la aplicación; los ingenieros, con el USUARIO que
--     crea un administrador (y también un PIN). Administradores y digitadores siguen entrando con correo y contraseña.
-- =====================================================================
alter table public.indicadores_usuarios drop constraint if exists indicadores_usuarios_rol_check;
alter table public.indicadores_usuarios add constraint indicadores_usuarios_rol_check check (rol in ('admin','digitador','ingeniero','usuario'));
alter table public.indicadores_usuarios add column if not exists identificador text;                       -- cédula (usuarios) o nombre de usuario (ingenieros)
alter table public.indicadores_usuarios add column if not exists tipo_acceso text not null default 'correo';
alter table public.indicadores_usuarios drop constraint if exists indicadores_usuarios_tipo_acceso_check;
alter table public.indicadores_usuarios add constraint indicadores_usuarios_tipo_acceso_check check (tipo_acceso in ('correo','cedula','usuario'));
alter table public.indicadores_usuarios add column if not exists procesos integer[] not null default '{}';  -- procesos asignados (ingeniero)
create unique index if not exists indicadores_usuarios_identificador_uq on public.indicadores_usuarios (lower(identificador)) where identificador is not null;

-- Que la Matriz, el Dashboard y las fichas se actualicen solos cuando alguien registra o cambia algo
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['indicadores','indicadores_registros','indicadores_cierres','indicadores_procesos'] loop
      begin execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then null; when undefined_table then null; end;
    end loop;
  end if;
end $$;
