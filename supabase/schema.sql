-- =====================================================================
-- APP "INDICADORES DE GESTIÓN — TORREMOLINOS" (Sistema Integrado de Gestión — SIG)
-- Proyecto de Supabase nuevo y dedicado SOLO a esta app.
-- Corre este archivo UNA sola vez en Supabase → SQL Editor → New query → Run.
--
-- Qué trae:
--   1. indicadores_procesos        → las áreas/procesos (Producción, MIRFE, etc.)
--   2. indicadores_involucrados    → quién participa en cada proceso (para notificar)
--   3. indicadores                 → el catálogo (importado de la matriz Excel, 42 indicadores)
--   4. indicadores_registros       → el dato mes a mes, con análisis y plan de acción
--   5. indicadores_configuracion   → cada cuánto y qué día se envían los recordatorios
--   6. indicadores_notificaciones  → historial de correos enviados
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROCESOS
-- ---------------------------------------------------------------------
create table if not exists indicadores_procesos (
  id          bigserial primary key,
  clave       text not null unique,          -- 'produccion', 'mirfe', ...
  nombre      text not null,                 -- nombre visible
  orden       smallint not null default 0,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. INVOLUCRADOS por proceso (a quién se le avisa / quién llena el dato)
-- ---------------------------------------------------------------------
create table if not exists indicadores_involucrados (
  id            bigserial primary key,
  proceso_id    bigint not null references indicadores_procesos(id) on delete cascade,
  nombre        text not null,
  cargo         text,
  email         text,
  notificar     boolean not null default true,     -- si recibe los recordatorios por correo
  creado_en     timestamptz not null default now()
);
create index if not exists idx_involucrados_proceso on indicadores_involucrados (proceso_id);

-- ---------------------------------------------------------------------
-- 3. CATÁLOGO DE INDICADORES (una fila = un indicador de la matriz)
-- ---------------------------------------------------------------------
create table if not exists indicadores (
  id                      bigserial primary key,
  proceso_id              bigint not null references indicadores_procesos(id) on delete restrict,
  directriz               text,               -- Directriz de la política de gestión integral
  estrategia_asg          text,               -- Pilar / tema ASG
  objetivo                text,
  nombre                  text not null,
  formula_calculo         text,               -- editable: cómo se calcula
  unidad_medida           text,
  tipo_indicador          text,               -- Cumplimiento | Eficacia | Eficiencia
  categoria               text,               -- categoría visual, igual a la clasificación por color del Excel original
  color_categoria         text,               -- color hexadecimal de esa categoría (tal como aparece en la pestaña del Excel)
  meta_anual              numeric,
  metas_mensuales         jsonb,              -- opcional: { "1": 0.1, "2": 0.2, ... } si la meta varía mes a mes
  sentido_meta            text not null default 'mayor_mejor'   -- 'mayor_mejor' | 'menor_mejor'
                            check (sentido_meta in ('mayor_mejor','menor_mejor')),
  frecuencia              text not null default 'mensual'
                            check (frecuencia in ('mensual','trimestral','semestral','anual')),
  responsable_medicion    text,
  procesos_relacionados   text,
  fuente_informacion      text,
  activo                  boolean not null default true,
  orden                   smallint not null default 0 unique,
  creado_en               timestamptz not null default now()
);
create index if not exists idx_indicadores_proceso on indicadores (proceso_id);

-- ---------------------------------------------------------------------
-- 4. REGISTROS MENSUALES (el dato real + análisis + plan de acción)
-- ---------------------------------------------------------------------
create table if not exists indicadores_registros (
  id              bigserial primary key,
  indicador_id    bigint not null references indicadores(id) on delete cascade,
  anio            smallint not null,
  mes             smallint not null check (mes between 1 and 12),
  valor           numeric,                    -- null = aún no se ha llenado ese mes
  analisis        text,                       -- análisis de cumplimiento (texto libre)
  causa           text,                       -- causa raíz cuando no se cumple
  accion          text,                       -- plan de acción (editable; se sugiere automáticamente)
  plan_sugerido   boolean not null default false,  -- true si "accion" la generó el sistema y nadie la ha editado
  responsable_accion text,
  fecha_compromiso date,
  registrado_por  text,
  registrado_en   timestamptz,
  actualizado_en  timestamptz not null default now(),
  constraint indicadores_registro_unico unique (indicador_id, anio, mes)
);
create index if not exists idx_registros_indicador on indicadores_registros (indicador_id, anio, mes);

-- ---------------------------------------------------------------------
-- 5. CONFIGURACIÓN de notificaciones (una sola fila)
-- ---------------------------------------------------------------------
create table if not exists indicadores_configuracion (
  id                    smallint primary key default 1,
  frecuencia_envio      text not null default 'mensual'
                          check (frecuencia_envio in ('semanal','quincenal','mensual')),
  dia_envio             smallint not null default 25,   -- día del mes (1-28) o día ISO de la semana si es semanal
  activo                boolean not null default true,
  ultimo_envio_auto     date,
  ultimo_aviso_cierre   date,   -- último envío del aviso fijo de "faltan 12 días para el cierre del mes"
  constraint indicadores_config_una_fila check (id = 1)
);
insert into indicadores_configuracion (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 6. HISTORIAL DE NOTIFICACIONES ENVIADAS
-- ---------------------------------------------------------------------
create table if not exists indicadores_notificaciones (
  id              bigserial primary key,
  proceso_id      bigint references indicadores_procesos(id) on delete set null,
  modo            text not null default 'manual' check (modo in ('manual','automatico')),
  destinatarios   text,              -- correos separados por coma, como quedó enviado
  asunto          text,
  indicadores_pendientes smallint default 0,
  resultado       text,              -- 'enviado' | 'error' | 'sin_destinatarios'
  detalle_error   text,
  enviado_por     text,
  enviado_en      timestamptz not null default now()
);
create index if not exists idx_notificaciones_proceso on indicadores_notificaciones (proceso_id, enviado_en desc);

-- ---------------------------------------------------------------------
-- SEGURIDAD (RLS) — mismo criterio del resto del proyecto: acceso total
-- desde el cliente (el control de "quién ve qué módulo" ya se hace en la
-- app por rol; aquí no se guarda nada sensible de autenticación).
-- ---------------------------------------------------------------------
alter table indicadores_procesos       enable row level security;
alter table indicadores_involucrados   enable row level security;
alter table indicadores                enable row level security;
alter table indicadores_registros      enable row level security;
alter table indicadores_configuracion  enable row level security;
alter table indicadores_notificaciones enable row level security;

create policy "acceso_total_indicadores_procesos"       on indicadores_procesos       for all using (true) with check (true);
create policy "acceso_total_indicadores_involucrados"   on indicadores_involucrados   for all using (true) with check (true);
create policy "acceso_total_indicadores"                on indicadores                for all using (true) with check (true);
create policy "acceso_total_indicadores_registros"      on indicadores_registros      for all using (true) with check (true);
create policy "acceso_total_indicadores_configuracion"  on indicadores_configuracion  for all using (true) with check (true);
create policy "acceso_total_indicadores_notificaciones" on indicadores_notificaciones for all using (true) with check (true);

-- Por si ya habías corrido una versión anterior de este archivo: agrega las
-- columnas nuevas sin romper nada ni duplicar datos.
alter table indicadores add column if not exists categoria text;
alter table indicadores add column if not exists color_categoria text;
alter table indicadores_configuracion add column if not exists ultimo_aviso_cierre date;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'indicadores_orden_key') then
    alter table indicadores add constraint indicadores_orden_key unique (orden);
  end if;
end $$;

-- =====================================================================
-- DATOS SEMILLA — procesos e indicadores importados de la matriz Excel
-- "Indicadores de Gestión TM 2026" (versión 8). Los correos de los
-- involucrados quedan vacíos: se agregan desde la app, en
-- Indicadores → Involucrados y notificaciones.
-- =====================================================================
-- Procesos (áreas) del Sistema Integrado de Gestión — definen quién recibe las notificaciones de cada indicador
insert into indicadores_procesos (clave, nombre, orden) values
  ('produccion', 'Producción', 1),
  ('poscosecha', 'Poscosecha', 2),
  ('gestion_humana', 'Gestión Humana', 3),
  ('mirfe', 'MIRFE', 4),
  ('mantenimiento', 'Mantenimiento', 5),
  ('mipe', 'MIPE', 6),
  ('gestion_integral', 'Gestión Integral (SIG)', 7),
  ('seguridad', 'Seguridad', 8),
  ('ti', 'Tecnología de la Información', 9)
on conflict (clave) do nothing;

-- Catálogo completo: los 42 indicadores de la matriz Excel 'Indicadores de Gestión TM 2026' (versión 8),
-- con su categoría/color igual a como están clasificados en las pestañas del Excel original.
insert into indicadores (proceso_id, directriz, estrategia_asg, objetivo, nombre, unidad_medida, tipo_indicador, categoria, color_categoria, meta_anual, metas_mensuales, sentido_meta, frecuencia, responsable_medicion, procesos_relacionados, fuente_informacion, orden)
values
  ((select id from indicadores_procesos where clave = 'produccion'), 'Gestionar la sostenibilidad de la empresa', 'Pilar 4: Reputación e IntegridadTema: Gestión Integral de la Estrategia de Sostenibilidad', 'Mejorar asertividad en el PER4', 'Cumplimiento PER4 rosa color', '% Cumplimiento', 'Cumplimiento', 'Producción', '#92D050', 0.95, NULL, 'mayor_mejor', 'mensual', 'Dir. Producción - Analista P&P', 'Producción', 'Verdad Única', 1),
  ((select id from indicadores_procesos where clave = 'produccion'), 'Gestionar la sostenibilidad de la empresa', 'Pilar 4: Reputación e IntegridadTema: Gestión Integral de la Estrategia de Sostenibilidad', 'Mejorar asertividad en el PER4', 'Cumplimiento PER4 rosa roja', '% Cumplimiento', 'Cumplimiento', 'Producción', '#92D050', 0.95, NULL, 'mayor_mejor', 'mensual', 'Dir. Producción - Analista P&P', 'Producción', 'Verdad Única', 2),
  ((select id from indicadores_procesos where clave = 'produccion'), 'Gestionar la sostenibilidad de la empresa', 'Pilar 4: Reputación e IntegridadTema: Gestión Integral de la Estrategia de Sostenibilidad', 'Optimizar la productividad rentable', 'Productividad flor m² Color', 'Tallos / m²', 'Eficiencia', 'Producción', '#92D050', 142.0, '{"1": 18.46316466615009, "2": 12.176939721340956, "3": 8.195105191596369, "4": 21.239411394903435, "5": 10.667530566364675, "6": 9.475029554297704, "7": 12.961981530259274}'::jsonb, 'mayor_mejor', 'mensual', 'Dir. Producción', 'Producción', 'Verdad Única', 3),
  ((select id from indicadores_procesos where clave = 'produccion'), 'Gestionar la sostenibilidad de la empresa', 'Pilar 4: Reputación e IntegridadTema: Gestión Integral de la Estrategia de Sostenibilidad', 'Optimizar la productividad rentable', 'Productividad flor vendida Rojo', 'Tallos / m²', 'Eficiencia', 'Producción', '#92D050', 113.0, '{"1": 15.744840139447353, "2": 9.575899054925392, "3": 6.153320101603233, "4": 17.092389012864945, "5": 8.657522763707997, "6": 8.755042593543385, "7": 8.298636797049362}'::jsonb, 'mayor_mejor', 'mensual', 'Dir. Producción', 'Producción', 'Verdad Única', 4),
  ((select id from indicadores_procesos where clave = 'produccion'), 'Gestionar la sostenibilidad de la empresa', 'Pilar 3: Innovación y EficienciaTema: Eficiencia en los Procesos', 'Optimizar la productividad rentable', 'Nacional Color', '% Nacional', 'Eficiencia', 'Producción', '#92D050', 0.08, NULL, 'menor_mejor', 'mensual', 'Dir. Producción', 'Producción', 'WEB', 5),
  ((select id from indicadores_procesos where clave = 'produccion'), 'Gestionar la sostenibilidad de la empresa', 'Pilar 3: Innovación y EficienciaTema: Eficiencia en los Procesos', 'Optimizar la productividad rentable', 'Nacional Rojo', '% Nacional', 'Eficiencia', 'Producción', '#92D050', 0.08, NULL, 'menor_mejor', 'mensual', 'Dir. Producción', 'Producción', 'WEB', 6),
  ((select id from indicadores_procesos where clave = 'poscosecha'), 'Enfoque por procesos, como factor fundamental de la integración de la gestión al interior de nuestra empresa.', 'Pilar 3: Innovación y EficienciaTema: Eficiencia en los Procesos', 'Aumentar la satisfacción del cliente', 'Disminución de reclamos recibidos', '% Disminución de reclamos', 'Eficacia', 'Poscosecha', '#C4BD97', 0.1, NULL, 'mayor_mejor', 'mensual', 'Dir. Poscosecha', 'Poscosecha', 'WEB', 7),
  ((select id from indicadores_procesos where clave = 'gestion_humana'), 'Fomentar que la experiencia laboral de cada colaborador se refleje en un desarrollo integral de él y su familia y que redunde en su comunidad', 'Pilar 1: Prosperidad y BienestarTema: Impacto Social y Comunitario', 'Atender requerimientos de trabajadores y comunidad', 'Gestión de peticiones, quejas y reclamos de los trabajadores', '% Gestión peticiones / quejas / reclamos', 'Eficacia', 'Gestión Humana', '#E6B9B8', 0.9, NULL, 'mayor_mejor', 'mensual', 'Dir. Gestión Humana', 'Todos los procesos', 'Verdad Única', 8),
  ((select id from indicadores_procesos where clave = 'gestion_humana'), 'Fomentar que la experiencia laboral de cada colaborador se refleje en un desarrollo integral de él y su familia y que redunde en su comunidad', 'Pilar 1: Prosperidad y BienestarTema: Impacto Social y Comunitario', 'Fortalecer el sentido de pertenencia y fomentar un buen clima laboral en la organización, así como ofrecer una experiencia diferenciadora', 'Tasa horas ausentismo', '% Ausentismo', 'Eficiencia', 'Gestión Humana', '#E6B9B8', 0.06, NULL, 'menor_mejor', 'mensual', 'Dir. Gestión Humana', 'Todos los procesos', 'Verdad Única', 9),
  ((select id from indicadores_procesos where clave = 'gestion_humana'), 'Fomentar que la experiencia laboral de cada colaborador se refleje en un desarrollo integral de él y su familia y que redunde en su comunidad', 'Pilar 1: Prosperidad y BienestarTema: Impacto Social y Comunitario', 'Controlar la estabilidad laboral', 'Rotación', '% Rotación', 'Eficacia', 'Gestión Humana', '#E6B9B8', 0.06, NULL, 'menor_mejor', 'mensual', 'Dir. Gestión Humana', 'Todos los procesos', 'Verdad Única', 10),
  ((select id from indicadores_procesos where clave = 'gestion_humana'), 'Fomentar que la experiencia laboral de cada colaborador se refleje en un desarrollo integral de él y su familia y que redunde en su comunidad', 'Pilar 1: Prosperidad y BienestarTema: Impacto Social y Comunitario', 'Fortalecer el sentido de pertenencia y fomentar un buen clima laboral en la organización, así como ofrecer una experiencia diferenciadora', 'Cumplimiento cronograma de bienestar', '% Cumplimiento', 'Eficacia', 'Gestión Humana', '#E6B9B8', 0.95, NULL, 'mayor_mejor', 'mensual', 'Dir. Gestión Humana', 'Todos los procesos', 'Verdad Única', 11),
  ((select id from indicadores_procesos where clave = 'gestion_humana'), 'Fomentar que la experiencia laboral de cada colaborador se refleje en un desarrollo integral de él y su familia y que redunde en su comunidad', 'Pilar 1: Prosperidad y BienestarTema: Impacto Social y Comunitario', 'Fortalecer el sentido de pertenencia y fomentar un buen clima laboral en la organización, así como ofrecer una experiencia diferenciadora', 'Cobertura programas bienestar', '% Cobertura', 'Eficacia', 'Gestión Humana', '#E6B9B8', 0.9, '{"1": 1.0, "2": 0.9, "3": 0.9, "4": 0.9, "5": 0.9, "6": 0.9, "7": 0.9, "8": 0.9, "9": 0.9, "10": 0.9, "11": 0.9, "12": 0.9}'::jsonb, 'mayor_mejor', 'mensual', 'Dir. Gestión Humana', 'Todos los procesos', 'Verdad Única', 12),
  ((select id from indicadores_procesos where clave = 'gestion_humana'), 'Simplificar, estandarizar, controlar, asegurar y mejorar continuamente los procesos.', 'Pilar 1: Prosperidad y BienestarTema: Impacto Social y Comunitario', 'Garantizar la formación del personal de tal manera que cuenten con los conocimientos y habilidades requeridas', 'Planeación de formación', '% Gestión', 'Eficacia', 'Gestión Humana', '#E6B9B8', 1.0, NULL, 'mayor_mejor', 'mensual', 'Dir. Gestión Humana', 'Todos los procesos', 'Verdad Única', 13),
  ((select id from indicadores_procesos where clave = 'gestion_humana'), 'Simplificar, estandarizar, controlar, asegurar y mejorar continuamente los procesos.', 'Pilar 1: Prosperidad y BienestarTema: Impacto Social y Comunitario', 'Garantizar la formación del personal de tal manera que cuenten con los conocimientos y habilidades requeridas', 'Cumplimiento planeación de formación', '% Cumplimiento', 'Eficacia', 'Gestión Humana', '#E6B9B8', 0.95, NULL, 'mayor_mejor', 'mensual', 'Dir. Gestión Humana', 'Todos los procesos', 'Verdad Única', 14),
  ((select id from indicadores_procesos where clave = 'gestion_humana'), 'Cumplir con la legislación aplicable, los convenios internacionales ratificados por el país e incorporados al código de ética de la empresa', 'Pilar 4: Reputación e IntegridadTema: Ética Empresarial y Reputación', 'Mitigar el impacto individual, familiar y social ocasionado por los accidentes de trabajo', 'Accidentalidad', '% Disminución accidentalidad', 'Cumplimiento', 'Seguridad y Salud en el Trabajo', '#7F7F7F', 0.1, NULL, 'mayor_mejor', 'trimestral', 'Dir. Gestión Humana', 'Todos los procesos', 'Verdad Única', 15),
  ((select id from indicadores_procesos where clave = 'mirfe'), 'Usar racionalmente los recursos naturales.', 'Pilar 2: Operaciones responsables y sosteniblesTema: Gestión integral de recursos hídricos', 'Optimizar el consumo de agua', 'Reducción captación', '% Reducción de consumo', 'Eficacia', 'MIRFE', '#93CDDD', 0.05, NULL, 'mayor_mejor', 'mensual', 'Jefe MIRFE', 'MIRFE', 'Balance Hídrico', 16),
  ((select id from indicadores_procesos where clave = 'mirfe'), 'Usar racionalmente los recursos naturales.', 'Pilar 2: Operaciones responsables y sosteniblesTema: Gestión integral de recursos hídricos', 'Optimizar el consumo de agua', 'Reducción consumo agua', '% Reducción de consumo', 'Eficacia', 'MIRFE', '#93CDDD', 0.05, NULL, 'mayor_mejor', 'mensual', 'Jefe MIRFE', 'MIRFE', 'Balance Hídrico', 17),
  ((select id from indicadores_procesos where clave = 'mirfe'), 'Usar racionalmente los recursos naturales.', 'Pilar 2: Operaciones responsables y sosteniblesTema: Gestión integral de recursos hídricos', 'Optimizar el consumo de agua', 'Cumplimiento programa de ahorro y uso eficiente del agua (PUEAA)', '% Cumplimiento', 'Cumplimiento', 'MIRFE', '#93CDDD', 1.0, NULL, 'mayor_mejor', 'mensual', 'Jefe MIRFE', 'Mantenimiento - MIRFE', 'AM', 18),
  ((select id from indicadores_procesos where clave = 'mirfe'), 'Usar racionalmente los recursos naturales.', 'Pilar 2: Operaciones responsables y sosteniblesTema: Gestión integral de recursos hídricos', 'Optimizar el consumo de agua', 'Cumplimiento a inventarios de almacén', '% Cumplimiento', 'Cumplimiento', 'MIRFE', '#93CDDD', 1.0, NULL, 'mayor_mejor', 'mensual', 'Jefe MIRFE', 'Mantenimiento - MIRFE', 'AM', 19),
  ((select id from indicadores_procesos where clave = 'mantenimiento'), 'Simplificar, estandarizar, controlar, asegurar y mejorar continuamente los procesos.', 'Pilar 3: Innovación y EficienciaTema: Eficiencia en los Procesos', 'Garantizar el buen estado y funcionamiento de la infraestructura, máquinas y equipos necesarios para el desarrollo de las actividades', 'Cumplimiento programa de mantenimiento', '% Cumplimiento', 'Cumplimiento', 'Mantenimiento y Ambiental', '#FAC090', 0.95, NULL, 'mayor_mejor', 'mensual', 'Jefe Mantenimiento', 'Mantenimiento', 'AM', 20),
  ((select id from indicadores_procesos where clave = 'mantenimiento'), 'Usar racionalmente los recursos naturales.', 'Pilar 2: Operaciones responsables y sosteniblesTema: Neutralidad de Carbono – Gestión de la eficiencia energética', 'Optimizar el consumo de energía', 'Reducción consumo energía eléctrica', '% Reducción consumo', 'Eficacia', 'Mantenimiento y Ambiental', '#FAC090', 0.005, NULL, 'mayor_mejor', 'mensual', 'Jefe Mantenimiento', 'Mantenimiento', 'AM', 21),
  ((select id from indicadores_procesos where clave = 'mantenimiento'), 'Usar racionalmente los recursos naturales.', 'Pilar 2: Operaciones responsables y sosteniblesTema: Neutralidad de Carbono – Gestión de la eficiencia energética', 'Optimizar el consumo de energía', 'Consumo de energía por tallo', 'kW / unidad exportable', 'Eficiencia', 'Mantenimiento y Ambiental', '#FAC090', 0.002, NULL, 'menor_mejor', 'mensual', 'Jefe Mantenimiento', 'Mantenimiento', 'AM', 22),
  ((select id from indicadores_procesos where clave = 'mantenimiento'), 'Usar racionalmente los recursos naturales.', 'Pilar 2: Operaciones responsables y sosteniblesTema: Gestión integral de recursos hídricos', 'Optimizar el consumo de energía', 'Reducción de consumo de energía de fuentes no renovables (Gasolina y ACPM)', '% Reducción consumo', 'Eficacia', 'Mantenimiento y Ambiental', '#FAC090', 0.25, NULL, 'mayor_mejor', 'mensual', 'Jefe Mantenimiento', 'Mantenimiento', 'SAG', 23),
  ((select id from indicadores_procesos where clave = 'mantenimiento'), 'Cuantificar emisiones de Gases Efecto Invernadero, identificando y gestionando oportunidades de mitigación en la huella de carbono', 'Pilar 2: Operaciones responsables y sosteniblesTema: Gestión integral de recursos hídricos', 'Disminuir las toneladas equivalentes de CO₂ relacionadas a las emisiones directas de la empresa', 'Disminución de emisiones', '% Disminución Ton eq CO₂', 'Eficiencia', 'Mantenimiento y Ambiental', '#FAC090', 0.03, NULL, 'mayor_mejor', 'mensual', 'Jefe Mantenimiento', 'Mantenimiento', 'SIF', 24),
  ((select id from indicadores_procesos where clave = 'mantenimiento'), 'Manejar adecuadamente sustancias y residuos que puedan afectar el medio ambiente; basados en los principios de circularidad, promoviendo la reducción, reúso y aprovechamiento de éstos.', 'Pilar 2: Operaciones responsables y sosteniblesTema: Gestión integral de recursos hídricos', 'Mejorar el aprovechamiento de los residuos aportando a la disminución de costos en la empresa', 'Reducción de residuos no aprovechables generados', 'Kg / Persona', 'Eficiencia', 'Mantenimiento y Ambiental', '#FAC090', 0.05, NULL, 'mayor_mejor', 'mensual', 'Jefe Mantenimiento', 'Mantenimiento', 'Excel Generación de Residuos', 25),
  ((select id from indicadores_procesos where clave = 'mantenimiento'), 'Usar racionalmente los recursos naturales', 'Pilar 2: Operaciones responsables y sosteniblesTema: Gestión integral de recursos hídricos', 'Preservar y fomentar la vegetación nativa', 'Cobertura vegetal nativa', '% Cobertura con especies nativas', 'Cumplimiento', 'Mantenimiento y Ambiental', '#FAC090', 1.0, NULL, 'mayor_mejor', 'mensual', 'Jefe Mantenimiento', 'Mantenimiento', 'AM', 26),
  ((select id from indicadores_procesos where clave = 'mipe'), 'Manejar adecuadamente sustancias y residuos que puedan afectar el medio ambiente; basados en los principios de circularidad, promoviendo la reducción, reúso y aprovechamiento de éstos.', 'Pilar 2: Operaciones responsables y sosteniblesTema: Gestión integral de recursos hídricos', 'Optimizar el consumo de ingrediente activo', 'Consumo ingrediente activo', 'Kg i.a./Ha', 'Eficiencia', 'MIPE', '#FFFF00', NULL, NULL, 'menor_mejor', 'mensual', 'Jefe MIPE', 'MIPE', 'SIF', 27),
  ((select id from indicadores_procesos where clave = 'mipe'), 'Manejar adecuadamente sustancias y residuos que puedan afectar el medio ambiente; basados en los principios de circularidad, promoviendo la reducción, reúso y aprovechamiento de éstos.', 'Pilar 2: Operaciones responsables y sosteniblesTema: Gestión integral de recursos hídricos', 'Controlar el consumo de ingrediente activo', 'Reducción de consumo ingrediente activo', '% Reducción consumo ingrediente activo', 'Eficiencia', 'MIPE', '#FFFF00', 0.05, NULL, 'mayor_mejor', 'mensual', 'Jefe MIPE', 'MIPE', 'SIF', 28),
  ((select id from indicadores_procesos where clave = 'gestion_integral'), 'Cumplir con la legislación aplicable, los convenios internacionales ratificados por el país e incorporados al código de ética de la empresa', 'Pilar 4: Reputación e IntegridadTema: Ética Empresarial y Reputación', 'Garantizar que la empresa desarrolle su operación en cumplimiento de los trámites legales', 'Gestión de trámites legales aplicables', '% Cumplimiento', 'Cumplimiento', 'Seguridad y Gestión del Riesgo', '#8064A2', 1.0, NULL, 'mayor_mejor', 'mensual', 'Analista Gestión Integral', 'Todos los procesos', '—', 29),
  ((select id from indicadores_procesos where clave = 'seguridad'), 'Garantizar que los procesos se realicen de manera segura y controlada, evitando actividades ilícitas especificadas en la gestión integral de riesgos, tales como lavado de activos, corrupción y soborno.', 'Pilar 4: Reputación e IntegridadTema: Ética Empresarial y Reputación', 'Minimizar el número de novedades en el despacho con origen en finca', 'Disminución de eventos relacionados con la trazabilidad de la carga', '% Disminución de novedades', 'Eficacia', 'Seguridad y Gestión del Riesgo', '#8064A2', 0.98, NULL, 'mayor_mejor', 'mensual', 'Jefe Seguridad', 'Todos los procesos', '—', 30),
  ((select id from indicadores_procesos where clave = 'seguridad'), 'Garantizar que los procesos se realicen de manera segura y controlada, evitando actividades ilícitas especificadas en la gestión integral de riesgos, tales como lavado de activos, corrupción y soborno.', 'Pilar 4: Reputación e IntegridadTema: Ética Empresarial y Reputación', 'Contar con personal estable en los procesos críticos de la organización', 'Rotación cargos críticos', '% Rotación', 'Eficacia', 'Seguridad y Gestión del Riesgo', '#8064A2', 1.0, NULL, 'mayor_mejor', 'mensual', 'Jefe Seguridad', 'Todos los procesos', '—', 31),
  ((select id from indicadores_procesos where clave = 'seguridad'), 'Garantizar que los procesos se realicen de manera segura y controlada, evitando actividades ilícitas especificadas en la gestión integral de riesgos, tales como lavado de activos, corrupción y soborno.', 'Pilar 4: Reputación e IntegridadTema: Ética Empresarial y Reputación', 'Generar cultura preventiva y de reporte, a través de la formación al personal en temas de seguridad', 'Cumplimiento actividades programa de prevención del consumo de alcohol y droga', '% Cumplimiento', 'Cumplimiento', 'Seguridad y Gestión del Riesgo', '#8064A2', 1.0, NULL, 'mayor_mejor', 'mensual', 'Jefe Seguridad', 'Todos los procesos', '—', 32),
  ((select id from indicadores_procesos where clave = 'seguridad'), 'Garantizar que los procesos se realicen de manera segura y controlada, evitando actividades ilícitas especificadas en la gestión integral de riesgos, tales como lavado de activos, corrupción y soborno.', 'Pilar 4: Reputación e IntegridadTema: Ética Empresarial y Reputación', 'Fortalecer la cultura de seguridad al interior de la empresa a través de la ejecución de simulacros resultado de la evaluación de riesgos', 'Ejecución de simulacros planeados', '% Ejecución', 'Cumplimiento', 'Seguridad y Gestión del Riesgo', '#8064A2', 1.0, NULL, 'mayor_mejor', 'mensual', 'Jefe Seguridad', 'Todos los procesos', '—', 33),
  ((select id from indicadores_procesos where clave = 'seguridad'), 'Simplificar, estandarizar, controlar, asegurar y mejorar continuamente los procesos', 'Pilar 4: Reputación e IntegridadTema: Ética Empresarial y Reputación', 'Fortalecer la cultura de seguridad al interior de la empresa a través de la ejecución de simulacros resultado de la evaluación de riesgos', 'Eficacia de simulacros', '% Simulacros eficaces', 'Eficacia', 'Seguridad y Gestión del Riesgo', '#8064A2', 0.9, NULL, 'mayor_mejor', 'mensual', 'Jefe Seguridad', 'Todos los procesos', 'Informe Departamento Seguridad', 34),
  ((select id from indicadores_procesos where clave = 'gestion_integral'), 'Enfoque por procesos, como factor fundamental de la integración de la gestión al interior de nuestra empresa.', 'Pilar 3: Innovación y EficienciaTema: Eficiencia en los Procesos', 'Gestionar oportunamente acciones correctivas y preventivas del Sistema de Gestión', 'Gestión de acciones correctivas y preventivas', '% Cierres', 'Cumplimiento', 'Seguridad y Gestión del Riesgo', '#8064A2', 1.0, NULL, 'mayor_mejor', 'mensual', 'Analista Gestión Integral', 'Todos los procesos', 'SAC', 35),
  ((select id from indicadores_procesos where clave = 'seguridad'), 'Garantizar que los procesos se realicen de manera segura y controlada, evitando actividades ilícitas especificadas en la gestión integral de riesgos, tales como lavado de activos, corrupción y soborno.', 'Pilar 4: Reputación e IntegridadTema: Ética Empresarial y Reputación', 'Reforzar el cumplimiento de las normas de seguridad de manera cultural', 'Disminución en eventos inseguros', '% Disminución de eventos', 'Eficacia', 'Seguridad y Gestión del Riesgo', '#8064A2', 1.0, NULL, 'mayor_mejor', 'mensual', 'Jefe Seguridad', 'Seguridad', '—', 36),
  ((select id from indicadores_procesos where clave = 'seguridad'), 'Garantizar que los procesos se realicen de manera segura y controlada, evitando actividades ilícitas especificadas en la gestión integral de riesgos, tales como lavado de activos, corrupción y soborno.', 'Pilar 4: Reputación e IntegridadTema: Ética Empresarial y Reputación', 'Gestionar los riesgos de la organización', 'Riesgos materializados', '% Hallazgos gestionados', 'Cumplimiento', 'Seguridad y Gestión del Riesgo', '#8064A2', 1.0, NULL, 'mayor_mejor', 'semestral', 'Jefe Seguridad', 'Todos los procesos', 'Reportes', 37),
  ((select id from indicadores_procesos where clave = 'ti'), 'Aplicar las políticas de seguridad de la información en el uso de las tecnologías de la información y las comunicaciones, para todos los procesos de la empresa.', 'Pilar 3: Innovación y EficienciaTema: Eficiencia en los Procesos', 'Mantener la seguridad de la información', 'Disminución de eventos relacionados con la seguridad de la información', '% Disminución de eventos', 'Eficacia', 'Seguridad y Gestión del Riesgo', '#8064A2', 1.0, NULL, 'mayor_mejor', 'mensual', 'TI', 'Todos los procesos', '—', 38),
  ((select id from indicadores_procesos where clave = 'gestion_integral'), 'Cumplir con la legislación aplicable, los convenios internacionales ratificados por el país e incorporados al código de ética de la empresa', 'Pilar 4: Reputación e IntegridadTema: Ética Empresarial y Reputación', 'Generar cultura de seguridad a través de los eventos de capacitación sobre corrupción, sobornos, lavado de activos y financiación del terrorismo', 'Adquisición del conocimiento en capacitaciones BASC', '% Evaluación', 'Eficacia', 'Gestión Integral (SIG) y Cumplimiento', '#C9932B', 0.92, NULL, 'mayor_mejor', 'mensual', 'Analista Gestión Integral', 'Ingresos nuevos', 'Base de Evaluaciones', 39),
  ((select id from indicadores_procesos where clave = 'seguridad'), 'Garantizar que los procesos se realicen de manera segura y controlada, evitando actividades ilícitas especificadas en la gestión integral de riesgos, tales como lavado de activos, corrupción y soborno.', 'Pilar 4: Reputación e IntegridadTema: Ética Empresarial y Reputación', 'Asegurar los procesos que impacten en el sistema de gestión y control en seguridad', 'Disminución hallazgos auditoría externa BASC', '% Disminución de hallazgos', 'Eficacia', 'Seguridad y Gestión del Riesgo', '#8064A2', 1.0, NULL, 'mayor_mejor', 'anual', 'Jefe Seguridad', 'Todos los procesos', 'Auditoría', 40),
  ((select id from indicadores_procesos where clave = 'gestion_humana'), 'Cumplir con la legislación aplicable, los convenios internacionales ratificados por el país e incorporados al código de ética de la empresa', 'Pilar 4: Reputación e IntegridadTema: Ética Empresarial y Reputación', 'Generar cultura de seguridad a través de los eventos de capacitación sobre corrupción, sobornos, lavado de activos y financiación del terrorismo', 'Cumplimiento programa de formación referente a BASC', '% Cumplimiento', 'Cumplimiento', 'Gestión Integral (SIG) y Cumplimiento', '#C9932B', 1.0, NULL, 'mayor_mejor', 'mensual', 'Dir. Gestión Humana', 'Todos los procesos', '—', 41),
  ((select id from indicadores_procesos where clave = 'gestion_humana'), 'Cumplir con la legislación aplicable, los convenios internacionales ratificados por el país e incorporados al código de ética de la empresa', 'Pilar 4: Reputación e IntegridadTema: Ética Empresarial y Reputación', 'Gestionar los riesgos de la organización', 'Cumplimiento actividades del PTEE y SAGRILAFT', '% Cumplimiento', 'Cumplimiento', 'Gestión Integral (SIG) y Cumplimiento', '#C9932B', 1.0, NULL, 'mayor_mejor', 'mensual', 'Dir. Gestión Humana', 'Todos los procesos', '—', 42)
on conflict (orden) do nothing;

-- Histórico real ya cargado en el Excel (valores, análisis y plan de acción tal como estaban).
insert into indicadores_registros (indicador_id, anio, mes, valor, analisis, accion, plan_sugerido, registrado_por) values
  ((select id from indicadores where orden = 1), 2026, 1, 0.98, 'El cumplimiento del estimado a PER4 de Enero se da por la ejecución del ciclo anterior (202542 a 202545) que es el periodo denominado potencial de repique, adicional el MGD para ese bloque de semanas obtuvo un cumplimiento del 106%, lo que reflejaba una alta probabilidad de obtener ese volumen de flor que se ejecuto en el mes. Por otro lado,  el % nacional influye para cumplimiento en ese periodo de semanas 202601 a 202605 ya que se obtuvo 8,7% total finca.', NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 1), 2026, 2, 0.83, 'El incumplimiento del los estimados a PER4 de Febrero fue por un alto % de perdidas (44,5%) a nivel finca lo que impacto directamente en el volumen de flor esperado para este bloque semanas.', 'Ajustar el modelo grados dias mediente datos de programacione y aseguramiento en el numero reportado y ajuste de perdidas. .', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 1), 2026, 3, 1.22, 'No se da cumplimiento al indicador debido a que se realizo un ajuste del numeor de flor debido al hisotrico de valles.', 'Ajustar el modelo grados dias mediente datos de programacione y aseguramiento en el numero reportado y ajuste de perdidas. .', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 1), 2026, 4, 1.04, 'Se cumple con la meta establecida debido a los ajuste al modelo', 'Se manteiene aseguramienrto de registro de programaciones, relizar marcaciones adicionales para ajustar el modelo y se implementa aseguramierto fenologico mediante app', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 1), 2026, 5, 1.18, 'Debido a que svenia llevnaod la tendencia de grados dias con el modelo se evicnia sobrejecuón en las dps priomeras semanas del mes. Debido a que la producción en valles rtienen a disminuir, a disminuir  ademas por los ajustes de los rangos de cumplimieito', NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 1), 2026, 6, 0.97, 'se cumplio debido al ajuste del modelo', NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 2), 2026, 1, 1.01, 'El cumplimiento del estimado a PER4 de Enero se da por la ejecución del ciclo anterior (202542 a 202545) que es el periodo denominado potencial de repique, adicional el MGD para ese bloque de semanas obtuvo un cumplimiento del 106%, lo que reflejaba una alta probabilidad de obtener ese volumen de flor que se ejecuto en el mes. Por otro lado,  el % nacional influye para cumplimiento en ese periodo de semanas 202601 a 202605 ya que se obtuvo 8,7% total finca.', NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 2), 2026, 2, 0.76, 'El incumplimiento del los estimados a PER4 de Febrero fue por un alto % de perdidas (44,5%) a nivel finca lo que impacto directamente en el volumen de flor esperado para este bloque semanas.', 'Ajustar el modelo grados dias mediente datos de programacione y aseguramiento en el numero reportado y ajuste de perdidas. .', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 2), 2026, 3, 1.28, 'No se da cumplimiento al indicador debido a que se realizo un ajuste del numeor de flor debido al hisotrico de valles.', 'Ajustar el modelo grados dias mediente datos de programacione y aseguramiento en el numero reportado y ajuste de perdidas. .', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 2), 2026, 4, 1.13, 'Se cumple con la meta establecida debido a los ajuste al modelo', 'Se manteiene aseguramienrto de registro de programaciones, relizar marcaciones adicionales para ajustar el modelo y se implementa aseguramierto fenologico mediante app', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 2), 2026, 5, 1.16, 'Debido a que svenia llevnaod la tendencia de grados dias con el modelo se evicnia sobrejecuón en las dps priomeras semanas del mes. Debido a que la producción en valles rtienen a disminuir, a disminuir  ademas por los ajustes de los rangos de cumplimieito', NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 2), 2026, 6, 1.27, 'Se sobrejecuto', NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 3), 2026, 1, 14.859749411541104, 'Debido a los cambios climáticos presentados, la producción destinada para la temporada de San Valentín se desplazó hacia el mes de marzo, con el fin de cubrir los valles productivos y ajustar la planeación establecida.
En cuanto a las podas programadas para esta temporada, no se logró ejecutar la totalidad de los cortes previstos. Se tenía una meta de 2.600.000 cortes, de los cuales se ejecutaron 2.166.090, evidenciando una desviación frente a lo planeado.
Adicionalmente, el número de pérdidas superó lo proyectado, registrándose 28 pérdidas ejecutadas, frente a 15 pérdidas planeadas.', 'Se debe fortalecer el aseguramiento en la programación de las labores. Para ello, se implementará el uso de planillas de planeación en cada cama, en las cuales se registre de manera detallada el día, el mes y el número de cortes realizados.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 3), 2026, 2, 11.077349028151632, 'El grupo de color con menor productividad corresponde a blanco (variedad Glacier), debido principalmente al incremento de plantas muertas. Esta situación está asociada a deficiencias en las estructuras de las camas hidropónicas (levantadas) y a problemas en los drenajes, relacionados con el manejo inadecuado del agua.
Los bloques más afectados por esta condición son: 2, 30, 10 y 11.', 'Se realizará el mantenimiento y la adecuación de todas las camas en hidroponía elevada que presentan problemas de nivelación y deficiencias en los drenajes.
Adicionalmente, se tiene programado para la semana 35 la resiembra de las plantas faltantes, con el fin de recuperar la densidad y mejorar la productividad del cultivo.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 3), 2026, 3, 8.746818880531412, 'Se realizó el aseguramiento, la planeación y la ejecución de los cortes en las camas valle durante los meses de noviembre y diciembre. Como resultado, se evidencia un incremento en el mes de marzo, debido al desplazamiento de la producción que originalmente correspondía al mes de enero.
Las pérdidas de flor fueron menores y se asociaron principalmente a defectos como ciegos, tallos cortos y delgados. No obstante, se presentaron afectaciones adicionales por plantas muertas y disminución en el número de puntas productivas, relacionadas con deficiencias en el riego.', 'Se fortalecerá el aseguramiento del mantenimiento de tuberías, así como el lavado periódico de mangueras, con el fin de garantizar el cumplimiento del volumen de riego programado.
Adicionalmente, se dará continuidad al grupo de labores, enfocando esfuerzos en el mejoramiento de la calidad de ejecución. Así mismo, se mantendrá el cronograma de retiro de palo seco, contribuyendo a la disminución de la pérdida de puntas productivas.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 3), 2026, 4, 15.8973659030374, 'Se cumplió con un resultado de 16%, frente a una meta de 21,2%. El resultado favorable está relacionado con la recuperación de la productividad después del comportamiento presentado en los meses anteriores y con el seguimiento realizado a la programación y ejecución de los cortes. El aseguramiento de las labores permitió mantener un adecuado número de tallos productivos durante el mes.', 'Mantener el seguimiento a la programación de los cortes y fortalecer el aseguramiento de las labores en cada cama. Continuar con el registro de las actividades ejecutadas y realizar seguimiento al comportamiento productivo por bloque y variedad.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 3), 2026, 5, 11.71773736732746, 'No se cumplió con el indicador, obteniendo un resultado de 12%, frente a una meta de 11%. El comportamiento estuvo relacionado con la variación de la productividad del cultivo y con la necesidad de fortalecer el aseguramiento de las labores que inciden sobre la generación y conservación de puntas productivas.', 'Fortalecer el seguimiento semanal a la productividad y a las labores programadas, realizando revisión por bloque para identificar oportunamente las condiciones que puedan afectar el número de puntas productivas. Mantener el control sobre riego, manejo de plantas y ejecución de cortes.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 3), 2026, 6, 6.402202663774912, 'Se cumplió con un resultado de 6%, frente a una meta de 9%. El resultado evidencia un comportamiento favorable del indicador, asociado al seguimiento de las labores de cultivo y al control de las condiciones que inciden en la productividad. La ejecución de las actividades permitió mantener un adecuado comportamiento durante el mes.', 'Mantener las estrategias de seguimiento implementadas, reforzando el control de las labores programadas y el seguimiento a las condiciones de riego y desarrollo de las plantas, con el fin de conservar el resultado favorable.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 3), 2026, 7, 9.629798902541816, 'Se cumplió con un resultado de 10%, frente a una meta de 13%. El comportamiento favorable refleja una mejora en el desempeño del indicador y un adecuado seguimiento de las labores productivas. El resultado permite evidenciar una recuperación frente al comportamiento presentado en mayo.', 'Continuar con el seguimiento semanal del indicador y fortalecer el aseguramiento de las labores de poda, riego y manejo de plantas. Mantener la revisión de los resultados por bloque y variedad para anticipar posibles afectaciones en la productividad.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 4), 2026, 1, 13.79075332321601, 'Debido a los cambios climáticos presentados, la producción destinada para la temporada de San Valentín se desplazó hacia el mes de marzo, con el fin de cubrir los valles productivos y ajustar la planeación establecida.
En cuanto a las labores de poda programadas para San Valentín, no se logró ejecutar la totalidad de los cortes previstos. Se tenía una meta de 1.944.420 cortes, de los cuales únicamente se ejecutaron 1.288.881, generando una desviación significativa frente a lo planeado.
Adicionalmente, el número de pérdidas superó lo proyectado, registrándose 28 pérdidas ejecutadas, frente a 15 pérdidas planeadas.', 'Se debe realizar un mayor aseguramiento en la programación de las labores. Asimismo, es necesario implementar el uso de planillas de planeación en cada cama, donde se registre de manera clara el día, el mes y el número de cortes realizados.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 4), 2026, 2, 8.382898084308698, 'En los bloques S5, 16 y 28 no se realizó un adecuado aseguramiento en la ejecución del número de podas. Adicionalmente, el incremento en el número de plantas muertas impactó negativamente el indicador.
Así mismo, se evidenció un atraso en las labores de retiro de palo seco, así como inconsistencias en los procesos de riego, lo cual contribuyó al deterioro del desempeño operativo en estos bloques.', 'Se conforma un grupo de trabajo para la ejecución de la labor de retiro de palo seco, estableciendo un cronograma con una frecuencia de cuatro veces al año.
Adicionalmente, se realiza el ajuste en los programas de riego y se implementa el seguimiento al desarrollo radicular mediante evaluaciones con rizotrones en las semanas 19, 20 y 26.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 4), 2026, 3, 6.063710051087107, 'El número de puntas productivas aumentó debido al mejoramiento en las condiciones de riego y al ajuste en los programas de fertilización, lo cual favoreció el desarrollo vegetativo y la productividad del cultivo.', 'Se realizará seguimiento continuo a las condiciones de ventilación y al control fitosanitario, debido al incremento del nacional y al aumento de BZC en el cultivo.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 4), 2026, 4, 16.38918233777084, 'El indicador alcanzó 16,39, frente a una meta de 17,09, presentando cumplimiento con una diferencia favorable de 0,70 puntos. El resultado refleja un comportamiento controlado del indicador y una adecuada respuesta de las labores realizadas en campo.', 'Mantener el seguimiento a la programación y ejecución de las labores culturales, fortaleciendo el control en campo y los registros de las actividades realizadas por bloque y cama, con el fin de conservar el comportamiento favorable del indicador.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 4), 2026, 5, 8.896628143362635, 'El indicador fue de 8,90, frente a una meta de 8,66, presentando incumplimiento con una desviación de 0,24 puntos. El resultado evidencia una variación desfavorable frente a lo esperado, por lo que se requiere fortalecer el seguimiento a las labores que inciden directamente en el comportamiento productivo y asegurar su ejecución dentro de los tiempos establecidos.', 'Realizar seguimiento semanal al indicador y a las labores programadas, especialmente poda, manejo de plantas y condiciones del cultivo. Identificar oportunamente los bloques con mayor desviación y establecer acciones de mejora específicas para evitar la recurrencia del incumplimiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 4), 2026, 6, 5.91559183299605, 'El indicador presentó un resultado de 5,92, frente a una meta de 8,76, evidenciando cumplimiento con una diferencia favorable de 2,84 puntos, siendo uno de los mejores resultados del semestre. El comportamiento refleja una mejora en el control y ejecución de las actividades que impactan el indicador.', 'Mantener las estrategias implementadas durante el semestre y fortalecer el seguimiento a las labores de cultivo, asegurando la continuidad de las condiciones que permitieron obtener el resultado favorable. Realizar seguimiento preventivo para evitar nuevas desviaciones.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 4), 2026, 7, 8.660085360863652, 'Para julio, el indicador alcanzó 8,66, frente a una meta de 8,30, presentando incumplimiento con una desviación de 0,36 puntos. El resultado evidencia una disminución en el desempeño frente al mes anterior y requiere revisar las condiciones y actividades que generaron la desviación.', 'Reforzar el seguimiento semanal al indicador y realizar análisis por bloque para identificar las principales causas de la desviación. Fortalecer el aseguramiento de las labores programadas y establecer acciones oportunas en los bloques que presenten mayores desviaciones.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 5), 2026, 1, 0.09, 'Se presentan defectos de calidad como tallos torcidos, guiadas deficientes, desbones y tallo corto, asociados a retrasos en la ejecución de labores, así como a fallas en el sistema de riego y en los procesos de aseguramiento.
Adicionalmente, se evidencia daño mecánico con una incidencia del 2,4%, así como un 1,5% de tallo corto y un 1,3% de tallo torcido.', 'Se conformara un grupo de labores enfocado en asegurar la correcta ejecución de los desbotones. Asimismo, se realizara retroalimentación al personal, resaltando la importancia de llevar a cabo las labores de manera oportuna y adecuada.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 5), 2026, 2, 0.12, 'Se evidencia daño mecánico con una incidencia del 2,5%, tallo corto con 2,4%, tallo torcido con 2,1% y presencia de botrytis con 1,5%.', 'Se realizará el aseguramiento en el transporte de la flor, así como en los procesos de poscorte y poscosecha, con el fin de garantizar la calidad del producto.
Adicionalmente, se llevarán a cabo reuniones diarias para la revisión y ajuste de estrategias de control a nivel nacional.
Se implementarán aplicaciones planas con productos fitosanitarios y se realizará el manejo de termonebulizadoras como parte del control y la prevención de enfermedades.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 5), 2026, 3, 0.106, 'Se evidencia daño mecánico con una incidencia del 2,9%, presencia de botrytis con 1,2% y 2,0%, y tallo torcido.', 'Se realizará el aseguramiento en el transporte de la flor, así como en los procesos de poscorte y poscosecha, con el fin de garantizar la calidad del producto.
Adicionalmente, se llevarán a cabo reuniones diarias para revisar y ajustar las estrategias de control a nivel nacional.
Se implementarán aplicaciones planas con productos fitosanitarios y se realizará el manejo de termonebulizadoras como parte del control y la prevención de enfermedades.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 5), 2026, 4, 0.12, 'No se cumple con el indicador ppor causas fitosanitarias (Botritys) en variedades como; orange crush, agatha, galcier, rosita vendela, vainilla y momentum', 'Embolsar las variedades con mayor indidencia fitosanitaria, el grupo de monitoreo MIPE realizara descabece de variedades.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 5), 2026, 5, 0.099, 'tallo torcido 1,8 , daño mecanico  1,5, botrytis 1,5,  y tallo corto 1,2', NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 5), 2026, 6, 0.132, 'Botrytis 3,4, daño mecanico 3,0 , tallo toricdo 2,2 y tallo corto 1,9', NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 6), 2026, 1, 0.06, 'Se evidencia daño mecánico con una incidencia del 1,6%, tallo torcido con 1,2% y flor abierta con 1,1%, además de otras causas menores que afectan la calidad.', 'Se conformara un grupo de labores enfocado en asegurar la correcta ejecución de los desbotones. Asimismo, se realizara retroalimentación al personal, resaltando la importancia de llevar a cabo las labores de manera oportuna y adecuada.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 6), 2026, 2, 0.074, 'Se evidencia daño mecánico con una incidencia del 1,4%, tallo torcido con 1,6% y cuello de ganso con 0,9%.', 'Se realizará el aseguramiento en el transporte de la flor, así como en los procesos de poscorte y poscosecha, con el fin de garantizar la calidad del producto.
Adicionalmente, se llevarán a cabo reuniones diarias para la revisión y ajuste de estrategias de control a nivel nacional.
Se implementarán aplicaciones planas con productos fitosanitarios y se realizará el manejo de termonebulizadoras como parte del control y la prevención de enfermedades.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 6), 2026, 3, 0.068, 'Se evidencia daño mecánico con una incidencia del 1,5%, tallo torcido con 1,5% y cuello de ganso con 0,7%.', 'Se realizará el aseguramiento en el transporte de la flor, así como en los procesos de poscorte y poscosecha, con el fin de garantizar la calidad del producto.
Adicionalmente, se llevarán a cabo reuniones diarias para revisar y ajustar las estrategias de control a nivel nacional.
Se implementarán aplicaciones planas con productos fitosanitarios y se realizará el manejo de termonebulizadoras como parte del control y la prevención de enfermedades.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 6), 2026, 4, 0.048, 'Se cumple con la meta establecida debido a que se viene trabajando en el aseguramiento de la flor nacional en postcosecha', 'Se realizará el aseguramiento en el transporte de la flor, así como en los procesos de poscorte y poscosecha, con el fin de garantizar la calidad del producto.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 6), 2026, 5, 0.056, 'tallo torcido 0,8, flor abierta 0,8, saño mecanico 0,7 y tallo corto 0,6', NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 6), 2026, 6, 0.065, 'Tallo toricdo 1,3, daño mecanio 1,1 , flor abierta 0,8 y flor deforme 0,8', NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 7), 2026, 1, 0.75, 'Durante enero, los reclamos estuvieron asociados principalmente a Botrytis (20 %) y calidad de la flor (30 %), siendo estas las principales causas identificadas durante el periodo.', 'Realizar retroalimentación al personal y fortalecer la revisión de la calidad de la flor, especialmente en la detección de Botrytis y en los criterios de calidad relacionados con la vida en florero.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 7), 2026, 2, -0.47368421052631576, 'En febrero, las principales causas de los reclamos fueron Botrytis (30 %), calidad de verdes (15 %) y calidad de la flor (30 %). Estas novedades evidencian la necesidad de mantener controles permanentes sobre las condiciones de calidad del producto.', 'Fortalecer las inspecciones de calidad y la identificación temprana de Botrytis. Realizar retroalimentación al personal sobre los criterios de calidad de verdes y flor, y reforzar el seguimiento a la vida en florero.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 7), 2026, 3, 4.666666666666667, 'Durante marzo, los reclamos estuvieron relacionados principalmente con daño mecánico (23 %), Botrytis (27 %) y calidad de verdes (13 %), evidenciando oportunidades de mejora en la manipulación y control de calidad del producto.', 'Reforzar las buenas prácticas de manipulación para disminuir el daño mecánico y fortalecer los controles para la identificación y prevención de Botrytis. Mantener la revisión de la calidad de verdes durante el proceso.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 7), 2026, 4, 0.0, 'En abril, las principales causas identificadas fueron daño mecánico (22 %), Botrytis (17 %) y daño de la flor (39 %). Se evidencia una mayor participación de las novedades relacionadas con la condición física y manipulación de la flor.', 'Fortalecer las buenas prácticas de manipulación y los controles de calidad en los diferentes puntos del proceso, haciendo énfasis en la prevención de daños en la flor y daños mecánicos.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 7), 2026, 5, 0.16666666666666666, 'Durante mayo, los reclamos estuvieron asociados principalmente a Botrytis (60 %) y daño mecánico, evidenciando que Botrytis fue la principal causa de las novedades de calidad durante el mes.', 'Intensificar las acciones preventivas frente a Botrytis y fortalecer las inspecciones de calidad durante cosecha, poscosecha y almacenamiento. Reforzar las prácticas de manipulación para reducir los daños mecánicos.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 7), 2026, 6, 0.8571428571428571, 'En junio, Botrytis representó el 75 % de los reclamos, mientras que la calidad de verdes representó el 13 %, siendo Botrytis la principal causa de las novedades identificadas durante el periodo.', 'Fortalecer la identificación temprana y los controles preventivos frente a Botrytis. Reforzar la inspección de verdes y la aplicación de los criterios de calidad antes del despacho.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 7), 2026, 7, 0.6, '69% botryitis, 10% daño mecanico y 10% en calidad de tallo', NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 8), 2026, 1, 1.0, 'Debido a que se presentaron quejas y reclamos relacionados con lockers y casino, el indicador se mantiene en un 100% de eficacia, ya que todas las solicitudes fueron atendidas de manera oportuna y se brindó respuesta dentro de los tiempos establecidos.', 'Se reforzará la socialización del código QR durante la inducción y mediante audios informativos, debido a que no se han presentado solicitudes ni reportes por estos medios.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 8), 2026, 2, 1.0, 'Para el mes de febrero se presentaron quejas relacionadas con vestieres y rutas, las cuales fueron atendidas de manera oportuna, permitiendo mantener el indicador en un 100% de eficacia.', 'Como plan de acción para el mes de enero, se realizará la implementación de un buzón físico.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 8), 2026, 3, 1.0, 'Durante marzo se recibieron quejas relacionadas con suministro de agua en baños de poscosecha, tiempos de salida de rutas y fallas en el sistema de sonido de cultivo. Se realizaron las correcciones correspondientes y se socializaron los tiempos y condiciones de salida. Como plan de acción, se continuará con el seguimiento a estas condiciones para prevenir su recurrencia.', 'Debido a que en algunas ocasiones las quejas se presentan de manera verbal y no quedan registradas, se adoptó como medida complementaria la implementación de un buzón físico en el casino. Adicionalmente, de manera mensual se publicarán los cierres correspondientes a cada mes.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 8), 2026, 4, 1.0, 'Durante el periodo se recibieron quejas relacionadas con aseo y mantenimiento de vestieres, lockers y baños, comportamiento en las rutas de transporte y servicio de casino. Se realizaron las respectivas socializaciones, asignación de responsables y retroalimentación a los encargados. Como plan de acción, se continuará con el seguimiento al cumplimiento de las actividades de aseo, normas de comportamiento y calidad del servicio.', 'reforzando durante las inducciones la importancia de comunicar oportunamente cualquier queja, sugerencia o inquietud a través de los canales establecidos.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 8), 2026, 5, 1.0, 'No se presentaron quejas', 'reforzando durante las inducciones la importancia de comunicar oportunamente cualquier queja, sugerencia o inquietud a través de los canales establecidos.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 8), 2026, 6, 1.0, 'Nose presentaron quejas', 'reforzando durante las inducciones la importancia de comunicar oportunamente cualquier queja, sugerencia o inquietud a través de los canales establecidos.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 8), 2026, 7, 0.0, 'Nose presentaron quejas', 'reforzando durante las inducciones la importancia de comunicar oportunamente cualquier queja, sugerencia o inquietud a través de los canales establecidos.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 9), 2026, 1, 0.0563, 'Se cumple con el indicador, registrando un total de 4.497 horas de ausentismo, relacionadas principalmente con causas de salud (2.600 horas), permisos personales y ausencias (1.339 horas), maternidad (535 horas) y sanciones (14,66 horas).
Sin embargo, se evidencia la importancia de continuar fortaleciendo el acompañamiento, el seguimiento y la atención oportuna a los colaboradores, con el fin de contribuir al bienestar y disminuir el impacto del ausentismo.', 'Se continuará realizando acompañamiento y seguimiento al personal, verificando el cumplimiento de las recomendaciones médicas y fortaleciendo el aseguramiento de las condiciones laborales, con el fin de contribuir a la disminución del ausentismo.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 9), 2026, 2, 0.0522, 'Se cumple con el indicador, registrando un total de 4.360 horas de ausentismo, de las cuales 2.745 horas corresponden a causas de salud, 1.300 horas a permisos personales y 313 horas a licencias de maternidad.', 'Se continuará realizando acompañamiento y seguimiento al personal, verificando el cumplimiento de las recomendaciones médicas y fortaleciendo el aseguramiento de las condiciones laborales, con el fin de contribuir a la disminución del ausentismo.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 9), 2026, 3, 0.0633, 'Para este mes no se cumple con el indicador establecido del 6%, ya que se obtuvo un resultado de 6,33%, registrando un total de 4.517 horas de ausentismo. De estas, 2.670 horas corresponden a causas de salud, citas médicas y otros motivos relacionados; 1.116 horas a permisos personales; 707 horas a licencias de maternidad y 22 horas a sanciones.', 'Se continuará realizando acompañamiento y seguimiento al personal, verificando el cumplimiento de las recomendaciones médicas y fortaleciendo el aseguramiento de las condiciones laborales, con el fin de contribuir a la disminución del ausentismo.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 9), 2026, 4, 0.0597, 'Se cumple con el indicador, registrando un total de 4.931 horas de ausentismo, de las cuales 3.192 horas corresponden a causas de salud, 1.248 horas a permisos personales, 475 horas a licencias de maternidad y 14 horas a sanciones.
Sin embargo, es importante continuar ejecutando las acciones implementadas en meses anteriores, con el fin de fortalecer el seguimiento y contribuir a la disminución del ausentismo.', 'Como plan de acción, se continuará realizando acompañamiento mediante el comité mensual de Gestión Humana. Adicionalmente, se retoma el seguimiento a las personas que presentan ausentismo, fortaleciendo el control y seguimiento a través de llamadas y acompañamiento oportuno.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 9), 2026, 5, 0.0641, 'Durante el mes de mayo, el indicador de ausentismo debe continuar siendo objeto de seguimiento frente a la meta establecida del 6.4 %. Para este periodo no se cuenta en la información disponible con el detalle de horas ni con la distribución de las causas, por lo que se recomienda mantener el seguimiento individual de los casos y fortalecer el acompañamiento al personal.', 'Como plan de acción, se continuará realizando acompañamiento mediante el comité mensual de Gestión Humana. Adicionalmente, se retoma el seguimiento a las personas que presentan ausentismo, fortaleciendo el control y seguimiento a través de llamadas y acompañamiento oportuno.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 9), 2026, 6, 0.066, 'En junio se presentó un resultado de 6,6 % frente a una meta del 6 %, evidenciando un incumplimiento. Este comportamiento requiere fortalecer el seguimiento a las novedades de ausentismo y a las principales causas que estén generando el incremento, manteniendo el acompañamiento a los colaboradores y la verificación de las situaciones que afectan la asistencia.', 'Como plan de acción, se continuará realizando acompañamiento mediante el comité mensual de Gestión Humana. Adicionalmente, se retoma el seguimiento a las personas que presentan ausentismo, fortaleciendo el control y seguimiento a través de llamadas y acompañamiento oportuno.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 9), 2026, 7, 0.0669, 'Para julio se mantiene un resultado de 6,7 % frente a la meta del 6 %, presentando nuevamente una desviación de 1 punto porcentual. La permanencia del indicador por encima de la meta evidencia la necesidad de reforzar las acciones de seguimiento y control del ausentismo, con énfasis en la identificación de las causas recurrentes y el acompañamiento oportuno a los colaboradores.', 'Como plan de acción, se continuará realizando acompañamiento mediante el comité mensual de Gestión Humana. Adicionalmente, se retoma el seguimiento a las personas que presentan ausentismo, fortaleciendo el control y seguimiento a través de llamadas y acompañamiento oportuno.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 10), 2026, 1, 0.0422, 'Se cumple la meta establecida del 6 %, alcanzando un indicador de 4,22 %. Aunque el resultado es favorable, se identifica la importancia de continuar acompañando al personal, especialmente durante el proceso de adaptación de los nuevos colaboradores.', 'Continuar con el acompañamiento a las nuevas personas, fortaleciendo su proceso de adaptación e integración a la finca y al equipo de trabajo.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 10), 2026, 2, 0.0577, 'Se cumple la meta establecida del 6 %, con un resultado de 5,77 %. El comportamiento se mantiene dentro del límite establecido, aunque cercano a la meta, por lo que es importante continuar realizando seguimiento a las causas de rotación.', 'comportamiento se mantiene dentro del límite establecido, aunque cercano a la meta, por lo que es importante continuar realizando seguimiento a las causas de rotación.
Mantener el acompañamiento al personal y fortalecer el proceso de adaptación, realizando seguimiento a las novedades de retiro para identificar oportunamente las causas recurrentes.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 10), 2026, 3, 0.0266, 'Se presenta un resultado favorable de 2,66 %, cumpliendo la meta del 6 %. El comportamiento evidencia una disminución de la rotación durante el periodo y un resultado por debajo del límite establecido.', 'Continuar fortaleciendo las estrategias de acompañamiento, adaptación e integración del personal, manteniendo las acciones que han contribuido a la permanencia de los colaboradores.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 10), 2026, 4, 0.0393, 'Se cumple la meta establecida, con un indicador de 3,93 % frente al 6 %. Aunque el resultado es favorable, se continúa revisando la información de las entrevistas de retiro para identificar las principales causas de rotación y establecer acciones enfocadas en la permanencia del personal.', 'Fortalecer el análisis de las entrevistas de retiro y continuar promoviendo estrategias como Siembra Valor, Fondo de Empleados y espacios de integración, además de mejorar el acompañamiento y la respuesta oportuna a las necesidades del personal.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 10), 2026, 5, 0.098, 'No se cumple la meta, registrando un indicador de 9,80 % frente al 6 %. El incremento de la rotación está asociado principalmente a cambios de vivienda y búsqueda de mejores oportunidades laborales, situaciones que afectan la permanencia de algunos colaboradores.', 'Fortalecer el acompañamiento al personal, especialmente durante las etapas iniciales de adaptación, y continuar promoviendo programas como Siembra Valor y Fondo de Empleados, buscando generar mayores alternativas de bienestar y permanencia.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 10), 2026, 6, 0.0663, 'No se cumple la meta, con un indicador de 6,63 %, superando en 0,63 puntos porcentuales el límite establecido. Se mantienen como principales causas identificadas el cambio de vivienda y la búsqueda de mejores oportunidades laborales.', '0,63 puntos porcentuales el límite establecido. Se mantienen como principales causas identificadas el cambio de vivienda y la búsqueda de mejores oportunidades laborales.
Continuar con el acompañamiento y seguimiento a los colaboradores, fortaleciendo la adaptación al cargo y la divulgación de los beneficios y programas disponibles, especialmente Siembra Valor y Fondo de Empleados.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 10), 2026, 7, 0.1249, 'Se presenta un incumplimiento significativo de la meta, con un indicador de 12,49 %, superando en 6,49 puntos porcentuales el límite establecido del 6 %. Las principales causas continúan relacionadas con cambios de vivienda y búsqueda de mejores oportunidades laborales, evidenciando la necesidad de fortalecer las estrategias de retención y permanencia.', 'indicador de 12,49 %, superando en 6,49 puntos porcentuales el límite establecido del 6 %. Las principales causas continúan relacionadas con cambios de vivienda y búsqueda de mejores oportunidades laborales, evidenciando la necesidad de fortalecer las estrategias de retención y permanencia.
Reforzar el acompañamiento y seguimiento a los colaboradores, fortalecer los procesos de adaptación y continuar impulsando Siembra Valor, Fondo de Empleados y demás estrategias de bienestar, buscando mejorar la permanencia y reducir la rotación.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 11), 2026, 1, 1.0, 'Se alcanza el 100% de cumplimiento, debido a que se ejecutaron las actividades planeadas para la celebración de cumpleaños.', 'Mantener la ejecución de actividades de bienestar y reforzar la socialización de las celebraciones programadas para garantizar la participación del personal', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 11), 2026, 2, 1.0, 'Se alcanza el 100% de cumplimiento, debido a que se ejecutaron las actividades planeadas para la celebración de San Valentín y cumpleaños.', 'Mantener la ejecución de actividades de bienestar y reforzar la socialización de las celebraciones programadas para garantizar la participación del personal', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 11), 2026, 3, 1.0, 'Se alcanza el 100% de cumplimiento, debido a que se ejecutaron las actividades planeadas para la celebración del Día de la Mujer, Día del Hombre, Semana Santa y cumpleaños.', 'Mantener la ejecución de actividades de bienestar y reforzar la socialización de las celebraciones programadas para garantizar la participación del personal', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 11), 2026, 4, 1.0, 'Se alcanza el 100% de cumplimiento, debido a que se ejecutaron las actividades planeadas para la celebración de cumpleaños y el Día de la Secretaria.', 'Como plan de acción, se incentivará por medio de audios y TV la divulgación de temas alusivos del mes, promoviendo espacios de sensibilización y reconocimiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 11), 2026, 5, NULL, 'Se alcanza el 100% de cumplimiento, debido a que se ejecutaron las actividades planeadas para la celebración de cumpleaños y el Día de la madre', 'Como plan de acción, se incentivará por medio de audios y TV la divulgación de temas alusivos del mes, promoviendo espacios de sensibilización y reconocimiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 11), 2026, 6, NULL, 'Se alcanza el 100% de cumplimiento, debido a que se ejecutaron las actividades planeadas para la celebración de cumpleaños', 'Como plan de acción, se incentivará por medio de audios y TV la divulgación de temas alusivos del mes, promoviendo espacios de sensibilización y reconocimiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 11), 2026, 7, NULL, 'Se alcanza el 100% de cumplimiento, debido a que se ejecutaron las actividades planeadas para la celebración de cumpleaños', 'Como plan de acción, se incentivará por medio de audios y TV la divulgación de temas alusivos del mes, promoviendo espacios de sensibilización y reconocimiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 12), 2026, 1, 0.95, 'Se obtuvo un cumplimiento del 95%. No se alcanzó el 100% de cobertura debido a ausencias relacionadas con novedades presentadas en el indicador de ausentismo, principalmente por temas de salud y permisos personales.', 'Fortalecer la divulgación de las actividades mediante audios, TV y comunicación directa, incentivando la participación del personal en las actividades programadas.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 12), 2026, 2, 0.96, 'Durante el mes se alcanzó un cumplimiento del 96%; sin embargo, la cobertura total se vio afectada por ausencias del personal derivadas de incapacidades, permisos y demás novedades reportadas en el indicador de ausentismo.', 'Continuar promoviendo las actividades de bienestar y realizar seguimiento oportuno al personal ausente, buscando incrementar la participación en las celebraciones programadas.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 12), 2026, 3, 0.92, 'No se logró el 100% de cobertura, debido a que algunos colaboradores no participaron en las actividades por ausencias asociadas a temas de salud y permisos personales. Adicionalmente, no se celebraron 4 cumpleaños programados durante el mes.', 'Realizar seguimiento mensual al cronograma de celebraciones y reforzar la comunicación con los líderes para garantizar la participación y ejecución de las actividades pendientes.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 12), 2026, 4, 0.98, 'Se alcanzó un cumplimiento del 98%; sin embargo, 4 de 49 personas no asistieron a las actividades programadas debido a novedades relacionadas con ausentismo y permisos reportados durante el mes.', 'Asegurar el cubrimiento del personal mediante una planeación anticipada y fortalecer el seguimiento a la asistencia en las actividades de bienestar.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 13), 2026, 1, 0.5384615384615384, 'No se cumplió con la totalidad de las actividades programadas, ejecutándose 13 de 20 actividades planeadas, equivalente al 65 % de cumplimiento. Sin embargo, la ejecución en cobertura de personal fue favorable, alcanzando 223 %, con 3.316 personas ejecutadas frente a 1.486 planeadas. En cuanto a las horas, se ejecutaron 81 frente a 34 planeadas, alcanzando un 238 % de ejecución. Esto evidencia que, aunque no se ejecutó la totalidad de las actividades programadas, las actividades realizadas tuvieron una cobertura y duración superior a la inicialmente proyectada.', 'Fortalecer la programación y el seguimiento semanal de las actividades pendientes, asegurando su ejecución dentro del periodo establecido. Mantener el control sobre la cobertura de participantes y las horas ejecutadas para garantizar el cumplimiento integral del plan.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 13), 2026, 2, 0.5, 'No se cumplió con la totalidad de las actividades programadas, ejecutándose 18 de 27 actividades, correspondiente a un 67 % de cumplimiento. En personas, se ejecutaron 1.478 frente a 1.482 planeadas, alcanzando aproximadamente el 100 % de cobertura. En horas se ejecutaron 51 frente a 45 planeadas, alcanzando un 113 % de ejecución. El comportamiento muestra que, aunque quedaron actividades pendientes, la cobertura de personal y las horas programadas fueron atendidas.', 'Realizar seguimiento a las actividades pendientes y fortalecer la programación para evitar acumulación de formación en meses posteriores. Mantener el control de asistencia y de las horas ejecutadas para asegurar el cumplimiento de los objetivos establecidos.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 13), 2026, 3, 0.9444444444444444, 'No se cumplió con la totalidad de las actividades programadas, ejecutándose 18 de 35 actividades, equivalente al 51 % de cumplimiento. En cobertura se alcanzaron 1.991 personas frente a 2.277 planeadas, correspondiente al 87 %. En horas se ejecutaron 79 frente a 68 planeadas, alcanzando un 116 %. El resultado evidencia que, aunque el número de actividades y participantes estuvo por debajo de lo programado, las horas de formación ejecutadas superaron lo planeado.', 'Reforzar el seguimiento a la programación mensual y establecer controles semanales sobre las actividades pendientes. Revisar la planeación de grupos y participantes para mejorar la cobertura y asegurar la ejecución de las actividades programadas.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 13), 2026, 4, 0.17647058823529413, 'No se cumplió con la totalidad de las actividades programadas, ejecutándose 17 de 20 actividades, correspondiente al 85 % de cumplimiento. La cobertura alcanzó 2.024 personas frente a 2.216 planeadas, equivalente al 91 %. En horas se ejecutaron 44 frente a 32 planeadas, alcanzando un 138 % de ejecución. El comportamiento de las horas fue favorable, aunque se mantuvieron actividades y participantes pendientes frente a la programación.', 'Realizar seguimiento a las actividades no ejecutadas y fortalecer la programación de los grupos pendientes. Mantener el control sobre las horas de formación para garantizar que la ejecución corresponda a las necesidades identificadas.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 13), 2026, 5, 0.6875, 'No se cumplió con la totalidad de las actividades programadas, ejecutándose 16 de 27 actividades, equivalente al 59 % de cumplimiento. En personas se alcanzaron 1.820 frente a 2.159 planeadas, correspondiente al 84 %. Las horas ejecutadas fueron 92 frente a 44 planeadas, alcanzando un 209 % de ejecución. Se evidencia una ejecución de horas significativamente superior a lo planeado, aunque con menor número de actividades y participantes frente a la programación.', 'Fortalecer el seguimiento al cumplimiento de las actividades y revisar la distribución de las horas y participantes programados. Reprogramar oportunamente las actividades pendientes y realizar seguimiento semanal a su ejecución.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 13), 2026, 6, 0.5833333333333334, 'No se cumplió con la totalidad de las actividades programadas, ejecutándose 24 de 38 actividades, equivalente al 63 % de cumplimiento. En personas se ejecutaron 529 frente a 1.265 planeadas, alcanzando el 42 % de cobertura. En horas se ejecutaron 93 frente a 47 planeadas, alcanzando un 198 % de ejecución. El resultado evidencia que las actividades realizadas tuvieron una duración superior a la prevista, pero no permitieron alcanzar la cobertura de personas programada.', 'Fortalecer la programación de los grupos de formación y priorizar las actividades con mayor número de participantes pendientes. Realizar seguimiento semanal a la cobertura y reprogramar oportunamente las actividades que no puedan ejecutarse en las fechas establecidas.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 13), 2026, 7, NULL, 'No se cumplió con la totalidad de las actividades programadas, ejecutándose 13 de 21 actividades, equivalente al 62 % de cumplimiento. En cobertura de personas se ejecutaron 878 frente a 654 planeadas, alcanzando un 134 %. En horas se ejecutaron 53 frente a 25 planeadas, alcanzando un 212 % de ejecución. Aunque no se ejecutó la totalidad de las actividades, las actividades realizadas permitieron superar la cobertura de personas y horas inicialmente programadas.', 'Mantener el seguimiento a la ejecución del plan y fortalecer el cumplimiento de las actividades pendientes. Continuar controlando la cobertura y duración de las capacitaciones, buscando equilibrar el número de actividades ejecutadas con la población objetivo programada.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 14), 2026, 1, -0.5518697225572979, 'Se ejecutaron 3,316 horas frente a 1,486 horas planeadas, superando lo programado. El resultado refleja una mayor ejecución de actividades de formación frente a la planificación inicial, permitiendo ampliar la cobertura del personal.', 'Mantener el seguimiento de la programación y ajustar la planeación mensual de acuerdo con las necesidades reales de formación y disponibilidad del personal.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 14), 2026, 2, 0.0027063599458728035, 'Se ejecutaron 1,478 horas frente a 1,482 horas planeadas, alcanzando prácticamente el 100% de lo programado. Se evidencia una adecuada correspondencia entre la planeación y la ejecución de las actividades de formación.', 'Continuar con el seguimiento mensual de personas y horas planeadas frente a las ejecutadas, procurando mantener el cumplimiento de la programación.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 14), 2026, 3, 0.14364640883977903, 'Se ejecutaron 1,991 horas frente a 2,277 horas planeadas, alcanzando aproximadamente el 87% de ejecución. Se presentó una disminución frente a lo inicialmente programado, asociada a ajustes en la programación y disponibilidad del personal para participar en las jornadas.', 'Reprogramar las horas pendientes e identificar oportunamente las actividades o grupos que no logren ejecutarse, priorizando el personal que presente mayor necesidad de formación.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 14), 2026, 4, 0.09486166007905146, 'Se ejecutaron 2,024 horas frente a 2,216 horas planeadas, alcanzando aproximadamente el 91% de ejecución. Aunque se presentó una diferencia frente a lo planeado, se mantuvo un nivel de cumplimiento favorable.', 'Realizar seguimiento semanal a las actividades programadas y fortalecer la coordinación con las áreas operativas para garantizar la asistencia del personal.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 14), 2026, 5, 0.18626373626373613, 'Se ejecutaron 1,820 horas frente a 2,159 horas planeadas, alcanzando aproximadamente el 84% de ejecución. La diferencia evidencia que parte de las horas previstas no fueron desarrolladas durante el mes, generando una brecha en la ejecución acumulada.', 'Reforzar la programación de jornadas y realizar recuperación de las horas pendientes, priorizando los temas y colaboradores que no hayan completado su formación.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 14), 2026, 6, -0.9976086956521739, 'Se ejecutaron 529 horas frente a 1,265 horas planeadas, alcanzando aproximadamente el 42% de ejecución, siendo el resultado más bajo del semestre. La reducción se relaciona con la menor disponibilidad del personal y con las condiciones operativas propias del periodo, que limitaron la participación en las jornadas programadas.', 'Establecer un plan de recuperación para las horas y personas pendientes, mediante reprogramación de jornadas, priorización de grupos y seguimiento semanal al avance de la formación.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 15), 2026, 1, 1.0, 'Durante enero se presentaron 6 accidentes, de los cuales 2 estuvieron relacionados con actos inseguros en cultivo y los restantes con condiciones inseguras en poscosecha. Por lo anterior, no se cumplió con el objetivo de reducción de la accidentalidad.', 'Fortalecer las actividades de prevención mediante capacitaciones, inspecciones periódicas de seguridad, seguimiento al uso adecuado de los elementos de protección personal y análisis de la accidentalidad.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 15), 2026, 2, 6.0, 'Durante febrero se presentaron 7 accidentes, de los cuales 3 estuvieron asociados a actos inseguros en cultivo y poscosecha. Los demás casos estuvieron relacionados con la manipulación de cargas y condiciones inseguras, principalmente por daños en puentes.', 'Fortalecer las inspecciones de seguridad y generar órdenes de mantenimiento para corregir oportunamente las condiciones identificadas en instalaciones, equipos y herramientas. Continuar el trabajo conjunto con el COPASST para fortalecer la cultura de prevención y reporte', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 15), 2026, 3, 4.0, 'Durante marzo se presentaron 5 accidentes, asociados principalmente a actos inseguros y manipulación inadecuada de cargas, incluyendo un caso relacionado con la manipulación de tabacos que generó una lesión en un dedo.', 'Reforzar la capacitación en manipulación segura de cargas y herramientas, especialmente en las actividades de poscosecha, y realizar sensibilizaciones dirigidas a la prevención de actos inseguros.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 15), 2026, 4, 4.0, 'Durante abril se presentaron 10 accidentes, relacionados con actos inseguros en rutas, labores de corte, inspección de verdes y desplazamiento de patinadores, así como condiciones inseguras en equipos e instalaciones, incluyendo garruchas, zancos y puentes.', 'Implementar seguimiento a las condiciones y actos inseguros identificados, priorizando la revisión de equipos e instalaciones y reforzando las capacitaciones sobre desplazamiento seguro, manipulación de herramientas y ejecución de labores de corte.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 15), 2026, 5, 3.0, 'Durante mayo se presentaron 4 accidentes, relacionados principalmente con actos inseguros durante el uso de carros de corte, labores de boncheo y manipulación de cajas, además de situaciones asociadas a las condiciones del área de trabajo.', 'Reforzar las prácticas seguras durante las actividades de corte, boncheo y manipulación de cargas. Realizar seguimiento a las condiciones de los puestos de trabajo y fortalecer la sensibilización sobre autocuidado y prevención de actos inseguros.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 15), 2026, 6, 0.3333333333333333, 'Durante junio se presentaron 4 accidentes, asociados a condiciones inseguras, actos inseguros y daños en instalaciones, incluyendo caída de zancos, deterioro de puentes de balsa y comportamientos inseguros como correr dentro de los bloques.', 'Realizar seguimiento y corrección de las condiciones inseguras identificadas, priorizando el mantenimiento de puentes y equipos. Reforzar las campañas de sensibilización sobre autocuidado, desplazamiento seguro y prevención de actos inseguros.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 16), 2026, 1, -0.2691525974905829, 'Se cumple con el indicador, debido a que se presentó un mayor aprovechamiento de aguas de reúso y drenajes, disminuyendo la demanda hídrica en el proceso por factores climáticos de temporada de lluvias.', 'Continuar con el monitoreo y análisis de drenajes y aguas lluvias, fortaleciendo el aprovechamiento y control del consumo hídrico.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 16), 2026, 2, -0.3087634902047663, 'Se mantiene el cumplimiento del indicador gracias al control del volumen de riego y al aprovechamiento de aguas de reúso, permitiendo una reducción en el consumo frente al periodo anterior.', 'Dar continuidad al monitoreo de aprovechamiento de aguas de drenaje y lluvias, realizando seguimiento permanente a los consumos y volúmenes utilizados.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 16), 2026, 3, 0.008800353487001988, 'No se cumple con el indicador, debido al incremento en la demanda hídrica utilizada para el lavado de líneas principales y secundarias, aumentando el consumo de agua durante el mes.', 'Ajustar el cronograma de lavado de tuberías principales y secundarias, fortaleciendo la toma de decisiones en las horas de bombeo y consumo.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 16), 2026, 4, -0.30873915943962643, 'Se evidencia cumplimiento del indicador debido al control realizado sobre el consumo hídrico y al seguimiento de los volúmenes de riego implementados durante el mes.', 'Revisar la calibración de las volumétricas y continuar fortaleciendo la toma de decisiones relacionadas con riego y encendido del pozo, buscando optimizar el consumo de agua.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 16), 2026, 5, 0.14247980111870728, 'lavado de plasticos, mojado de camas para siembras, siembras en el bloque 4 con 62 camas y aplicaciones preormone , disminución de rpecipítaciones en comparación al mes anterior', 'hacer trazablidad de la utilización de los consumos de aguas, reforzar el monitoreo en campo', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 16), 2026, 6, 0.5400092864881597, 'siembras,', 'Asegurar el monitreo en campo, tomar decisiones de acuerdo al monitoreo', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 17), 2026, 1, -0.2691525974905829, 'Se cumple con la meta establecida de reducir el consumo en un 5%, debido a que durante el mes se presentaron mayores precipitaciones, permitiendo disminuir la demanda hídrica frente al año 2025.', 'Ajustar el riego de acuerdo con la necesidad de las plantas, mediante el monitoreo constante, la reducción del caudal aplicado en los ciclos de riego y el manejo adecuado de la aplicación de melaza.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 17), 2026, 2, -0.3087634902047663, 'Se cumple con el indicador gracias al aprovechamiento de aguas lluvias y drenajes, así como al control implementado en los volúmenes de riego durante el mes.', 'Continuar fortaleciendo la toma de decisiones de riego, ajustando las horas de bombeo del pozo y promoviendo el aprovechamiento de aguas de reservorios y drenajes.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 17), 2026, 3, 0.20248747624805666, 'No se cumple con la meta establecida, debido al incremento en el consumo de agua generado por el lavado de tuberías principales y secundarias, además del incumplimiento en el cronograma de lavado definido para el mes.', 'Ajustar el cronograma de lavado de tuberías principales y fortalecer el seguimiento a las actividades programadas para evitar consumos excesivos.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 17), 2026, 4, -0.02293700682091748, 'No se cumple con la reducción de la meta, debido a que se realizó el lavado de líneas de goteo, incrementando el consumo hídrico durante el periodo evaluado.', 'Fortalecer la toma de decisiones relacionadas con el riego mediante monitoreos y tablas de control, además de mapear el sistema de redes para optimizar el consumo de agua.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 17), 2026, 5, 0.04181048007530593, 'lavado de plasticos, mojado de camas para siembras, siembras en el bloque 4 con 62 camas y aplicaciones preormone , disminución de rpecipítaciones en comparación al mes anterior', 'hacer trazablidad de la utilización de los consumos de aguas, reforzar el monitoreo en campo', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 17), 2026, 6, 0.5088256973270745, 'siembras,', 'Asegurar el monitreo en campo, tomar decisiones de acuerdo al monitoreo', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 18), 2026, 1, 1.0, 'Se cumple con la meta establecida, debido a que se ejecutaron las dos actividades programadas correspondientes al registro diario de datos de los medidores y la reparación oportuna de fugas identificadas.', 'Coordinar con el área de mantenimiento el seguimiento continuo de las actividades ejecutadas y fortalecer el control sobre los registros diarios.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 18), 2026, 2, 1.0, 'Se alcanza el cumplimiento de la meta gracias a la ejecución de las actividades definidas para el control y seguimiento de medidores, así como la atención de fugas presentadas durante el periodo.', 'Mantener la articulación con el área de mantenimiento para garantizar el seguimiento y cierre oportuno de las novedades identificadas.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 18), 2026, 3, 1.0, 'Se da cumplimiento al indicador, evidenciando la correcta ejecución de las actividades relacionadas con el registro diario de consumos y la reparación de fugas detectadas en el proceso.', 'Continuar realizando seguimiento conjunto con el área de mantenimiento, fortaleciendo las inspecciones y controles preventivos en los sistemas de medición.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 18), 2026, 4, 0.6666666666666666, 'falta ejecutar el mantrenimeito de vallados, debido al', NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 18), 2026, 5, 1.3333333333333333, 'se ejecuta el mantenimiento de meduidores antes de la fecha planeada', NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 18), 2026, 6, 0.8, 'falta acompañar a escuela', 'se reporgrama para le siguiente mes', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 19), 2026, 1, 1.0, 'Se cumple con la meta establecida, alcanzando el 100% de ejecución de las actividades programadas. Durante el mes se realizaron los inventarios correspondientes de cartón, capuchones, láminas y productos, así como las verificaciones semanales de los productos de agroquímicos y el inventario mensual para identificar y controlar productos vencidos. El cumplimiento se logró mediante el seguimiento permanente de los inventarios y la verificación de las existencias físicas frente a los registros.', 'Mantener la programación y ejecución de los inventarios, fortaleciendo la verificación física y documental de las existencias y el seguimiento a los productos con fechas próximas a vencimiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 19), 2026, 2, 1.0, 'Se alcanza el 100% de cumplimiento de la meta, realizando oportunamente los inventarios establecidos para cartón, capuchones, láminas y productos. Adicionalmente, se efectuaron las verificaciones semanales de agroquímicos y el inventario mensual de productos vencidos. El cumplimiento se debe al seguimiento continuo realizado por las áreas responsables y al control periódico de las existencias.', 'Continuar con la frecuencia establecida para los inventarios y mantener las verificaciones semanales y mensuales, asegurando la actualización de los registros y la identificación oportuna de novedades.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 19), 2026, 3, 1.0, 'Se cumple con la meta del 100%, debido a la ejecución de los inventarios programados y a la realización de las verificaciones semanales de productos de agroquímicos. De igual manera, se efectuó el inventario mensual para validar la existencia de productos vencidos. El resultado refleja la continuidad del control de inventarios y el seguimiento de las cantidades físicas disponibles.', 'Mantener el control periódico de los inventarios y fortalecer la revisión de los productos almacenados, especialmente aquellos próximos a su fecha de vencimiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 19), 2026, 4, 1.0, 'Se cumple con el 100% del indicador mediante la ejecución de los inventarios de cartón, capuchones, láminas y productos, junto con las verificaciones semanales de agroquímicos y el inventario mensual de productos vencidos. El cumplimiento se logró gracias a la programación de las actividades y al seguimiento realizado durante el periodo.', 'Continuar con la ejecución de los inventarios de acuerdo con la frecuencia establecida y mantener el seguimiento a las diferencias o novedades identificadas.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 19), 2026, 5, 1.0, 'Se alcanza el 100% de cumplimiento de la meta. Durante el mes se realizaron los inventarios establecidos para los diferentes materiales y productos, además de las verificaciones semanales de agroquímicos y la revisión mensual de productos vencidos. El cumplimiento se relaciona con la ejecución oportuna de las actividades y la verificación constante de las existencias.', 'Mantener la metodología de control implementada y reforzar la trazabilidad de los movimientos de materiales y productos para garantizar que los inventarios se mantengan actualizados.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 19), 2026, 6, 1.0, 'Se cumple con la meta establecida, con un 100% de ejecución de las actividades programadas. Se realizaron los inventarios de cartón, capuchones, láminas y productos, las verificaciones semanales de agroquímicos y el inventario mensual destinado a validar la existencia de productos vencidos. El resultado se debe al seguimiento permanente y a la articulación de las áreas responsables para mantener actualizada la información de inventarios.', 'Continuar con la ejecución de los inventarios y verificaciones establecidas, fortaleciendo el control sobre los productos vencidos y la conciliación entre las existencias físicas y los registros.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 20), 2026, 1, 1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 20), 2026, 2, 0.9893617021276596, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 20), 2026, 3, 1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 20), 2026, 4, 0.9873417721518988, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 20), 2026, 5, 1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 20), 2026, 6, 0.9924242424242424, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 21), 2026, 1, -0.061555881527513394, 'Se inicia el año con una disminución del consumo de energía respecto al año anterior, gracias a la implementación del apagado programado de los equipos de sublimación en áreas específicas y al fortalecimiento de las campañas de uso eficiente de la energía.', 'Mantener los horarios de apagado de sublimación, realizar seguimiento al consumo energético y sensibilizar al personal sobre el uso eficiente de los equipos.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 21), 2026, 2, -0.1897450266181003, 'Aunque se presenta un incremento en las actividades operativas por la temporada de San Valentín (jornadas extendidas, mayor uso de maquinaria en poscosecha, habilitación de cuartos fríos, trabajos de mantenimiento y adecuaciones), el indicador continúa cumpliéndose debido a la reducción del consumo generada por el apagado de los equipos de sublimación en las áreas definidas', 'Continuar con la reducción del uso de sublimación en las zonas de menor incidencia de polvoso, fortalecer el seguimiento a los consumos durante temporadas de alta producción y verificar el cumplimiento de los horarios de apagado.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 21), 2026, 3, -0.2438215332960947, 'Se mantiene el cumplimiento del indicador gracias a la optimización de la operación de los equipos de sublimación y a la redistribución de su uso únicamente en las áreas donde es estrictamente necesario, disminuyendo el consumo energético sin afectar la operación.', 'Mantener la redistribución de la sublimación de acuerdo con las necesidades operativas y realizar seguimiento mensual para identificar nuevas oportunidades de reducción del consumo.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 21), 2026, 4, -0.2033739019155658, 'El indicador continúa mostrando una reducción frente al año anterior debido a la implementación del apagado de equipos de sublimación y al control en el funcionamiento de los cuartos fríos durante periodos de menor demanda, optimizando el consumo de energía.', 'Mantener el apagado programado de cuartos fríos en épocas valle y verificar el cumplimiento de los tiempos de operación establecidos para los equipos de sublimación.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 21), 2026, 5, -0.2331950476437415, 'Se evidencia una reducción significativa del consumo energético asociada a la continuidad del programa de apagado de equipos de sublimación en áreas específicas y al seguimiento permanente de los consumos por proceso, permitiendo mantener el indicador dentro de la meta.', 'Continuar con el monitoreo diario de los consumos energéticos, validar el funcionamiento eficiente de los equipos y reforzar las campañas de ahorro de energía con el personal operativo.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 21), 2026, 6, -0.2180057262026793, 'El comportamiento del indicador continúa siendo favorable, evidenciando la efectividad de las acciones implementadas para el uso eficiente de la energía, principalmente el apagado controlado de los equipos de sublimación y la optimización de los tiempos de operación de los procesos.', 'Mantener las estrategias implementadas, realizar inspecciones periódicas para verificar el cumplimiento de los apagados programados e identificar nuevos equipos susceptibles de optimización energética.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 22), 2026, 1, 0.24137931034482743, 'La producción disminuyó 24,15 %, pasando de 5.204.139 a 3.947.469 tallos. Esta reducción está relacionada principalmente con la dinámica productiva de inicio de año y con las actividades de preparación y manejo del cultivo asociadas a la temporada de San Valentín, periodo que implica ajustes operativos y de producción para atender los requerimientos comerciales. La menor cantidad de tallos producidos contribuyó al aumento del indicador del 24,14 %, debido a que el resultado se distribuye sobre un menor volumen de producción.', 'Realizar seguimiento a los equipos de mayor consumo y reforzar las buenas prácticas de ahorro de energía en las diferentes áreas.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 22), 2026, 10, -1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 22), 2026, 11, -1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 22), 2026, 12, -1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 22), 2026, 2, -0.24242424242424243, 'La producción aumentó 6,31 %, pasando de 2.176.439 a 2.313.859 tallos. Durante este periodo se desarrollan actividades de poda y manejo del cultivo, propias de la programación productiva posterior a la temporada de San Valentín. A pesar de estas labores, se logró mantener un nivel de producción superior al año anterior, acompañado de una reducción del indicador del 24,24 %, evidenciando un comportamiento favorable.', 'Revisar los consumos por área, especialmente en poscosecha y sistemas de refrigeración, e identificar equipos que puedan optimizar sus tiempos de operación.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 22), 2026, 3, -0.5392156862745098, 'Se presentó el comportamiento más favorable en términos de producción, con un incremento de 66,16 %, pasando de 1.394.164 a 2.316.551 tallos. Este aumento se relaciona con la recuperación de la producción posterior a las labores de poda y manejo realizadas en los meses anteriores. De manera paralela, el indicador presentó una reducción del 53,92 %, reflejando una mejora significativa frente al año anterior.', 'Fortalecer el seguimiento a los consumos base y realizar inspecciones para identificar equipos encendidos o funcionando sin requerimiento operativo.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 22), 2026, 4, 0.0399999999999999, 'Los tallos producidos disminuyeron 24,34 %, pasando de 5.998.289 a 4.538.113 tallos. Este comportamiento puede estar asociado a la programación y dinámica propia del cultivo y a las actividades operativas desarrolladas durante el periodo. Adicionalmente, durante este mes se adelantaron visitas y trabajos relacionados con adecuaciones y arreglos de infraestructura, los cuales implicaron actividades adicionales de mantenimiento y gestión en la finca. En este contexto, el indicador presentó un aumento del 4 %, comportamiento que debe analizarse considerando tanto la menor producción como las actividades operativas adicionales realizadas durante el mes.', 'Realizar seguimiento a los equipos de mayor demanda energética y verificar horarios de operación, buscando evitar consumos innecesarios.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 22), 2026, 5, -0.44578313253012053, 'La producción aumentó 39,33 %, pasando de 1.858.224 a 2.589.045 tallos, mientras que el indicador presentó una reducción del 44,58 %. Este comportamiento favorable se presenta en un periodo posterior a la temporada de Madres, en el cual la dinámica productiva empieza a estabilizarse. Asimismo, las actividades de mantenimiento, adecuación de infraestructura y seguimiento realizadas en la finca pudieron contribuir a una mejor gestión de los recursos y a la optimización de los procesos, favoreciendo el comportamiento del indicador frente al mayor volumen de producción.', 'Revisar consumos por proceso y reforzar el apagado de equipos e iluminación cuando no se encuentren en operación.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 22), 2026, 6, -1.0, 'Se presentó una disminución importante de 53,37 % en los tallos producidos, pasando de 3.004.531 a 1.400.902 tallos. Esta reducción puede estar relacionada con la dinámica normal del ciclo productivo y las actividades de manejo del cultivo, incluyendo los efectos posteriores a las podas y a la programación de producción. A pesar de la disminución significativa en los tallos, el indicador presentó una reducción del 100 %, pasando de 4,70 % en 2025 a 0 % en 2026. Este resultado evidencia que, aunque el volumen de producción fue menor, se logró un comportamiento totalmente favorable del indicador durante el periodo.', 'Seguir con las acciones que se han venido implementando', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 22), 2026, 7, -1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 22), 2026, 8, -1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 22), 2026, 9, -1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 23), 2026, 1, 1.1419753086419753, 'No cumple. Se presenta un incremento en el consumo de ACPM del 130,77 %, pasando de 130 a 300 gal, y de gasolina del 46,88 %, pasando de 32 a 47 gal. El comportamiento se relaciona principalmente con la temporada de San Valentín, que genera una mayor intensidad de las actividades operativas, desplazamientos y uso de maquinaria y equipos.', 'Reforzar el control de abastecimiento de ACPM y gasolina, verificando los consumos asociados a tractores y equipos y realizando seguimiento a los tanques para identificar consumos superiores a los habituales.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 23), 2026, 10, -1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 23), 2026, 11, -1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 23), 2026, 12, -1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 23), 2026, 2, 4.3164556962025316, 'No cumple. El consumo de ACPM aumentó 77,78 % (de 45 a 80 gal) y la gasolina aumentó 17,65 % (de 34 a 40 gal). El resultado continúa asociado a las actividades de cierre de la temporada de San Valentín y podas.', 'Mantener el control de abastecimiento e iniciar un registro más detallado por equipo, diferenciando el consumo de tractores y demás equipos para establecer las principales fuentes de consumo.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 23), 2026, 3, 1.8231707317073171, 'Cumple. Se evidencia una reducción importante, principalmente en gasolina, con una disminución del 72,62 % (de 84 a 23 gal), mientras que el ACPM disminuye 25,00 % (de 80 a 60 gal). El resultado evidencia una mejor gestión del consumo y una disminución de las actividades asociadas a las temporadas de alta demanda.', 'Fortalecer el seguimiento de consumos mediante verificación de cada abastecimiento, control del llenado de tanques y registro de consumo por tractor y equipo, buscando mantener la tendencia de reducción.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 23), 2026, 4, -0.40276179516685845, 'Cumple. El consumo de ACPM disminuye 41,18 %, pasando de 850 a 500 gal, mientras que el consumo de gasolina se mantiene en 19 gal, sin variación frente a 2025. Aunque se presenta una reducción, el consumo de ACPM continúa siendo representativo debido a los trabajos de adecuación y arreglos realizados en la finca y al traslado de material vegetal hacia la finca vecina, actividades que demandaron un mayor uso de tractores y equipos.', 'Implementar un control más estricto del consumo de combustible, verificando el abastecimiento de los tanques y llevando seguimiento individual de los consumos de tractores y equipos, con el fin de identificar oportunidades de optimización.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 23), 2026, 5, -0.36153846153846153, 'Cumple. Se presenta una reducción de 33,33 % en ACPM, pasando de 600 a 400 gal, y de 70,00 % en gasolina, pasando de 50 a 15 gal. La disminución evidencia el efecto de los controles implementados y una optimización del uso de maquinaria y equipos, aun cuando se mantienen actividades relacionadas con la preparación y operación de la temporada de Madres.', 'Mantener el control detallado de los consumos y realizar seguimiento a los equipos con mayores requerimientos de combustible, reforzando la verificación de abastecimientos y evitando consumos no asociados directamente a la operación.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 23), 2026, 6, -0.5081967213114754, 'Cumple. El consumo de ACPM disminuye 55,00 %, pasando de 200 a 90 gal, y la gasolina disminuye 31,82 %, pasando de 44 a 30 gal. Este es el comportamiento más favorable del semestre para ACPM y evidencia una mayor efectividad del control de consumo implementado por Mantenimiento.', 'Mantener el sistema de control implementado, consolidando mensualmente los registros de abastecimiento, verificando los consumos de cada tractor y equipo y realizando análisis de desviaciones para conservar la tendencia de reducción.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 23), 2026, 7, -1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 23), 2026, 8, -1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 23), 2026, 9, -1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 24), 2026, 1, 0.198641136504015, 'Al revisar la generación de gases de efecto invernadero se da cumplimiento a al meta de reducción del 10% mensual, debid a que se pasaron de 242,85tCo2 en el año 2025 a 217,13tCo2 al año 2026', NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 24), 2026, 2, -0.0019159019864878261, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 24), 2026, 3, 1.106376229248176, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 24), 2026, 4, -0.3331446469678101, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 24), 2026, 5, 0.7277451114453712, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 24), 2026, 6, -0.5747600606162655, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 25), 2026, 1, -0.10714285714285714, 'Se cumple la meta establecida, logrando una reducción del 7 % en la generación de residuos, equivalente a 100 kg menos en comparación con el año anterior. Este resultado evidencia la efectividad de las actividades de acompañamiento y retroalimentación al personal para fortalecer la correcta separación de residuos.Se cumple la meta establecida, logrando una reducción del 7 % en la generación de residuos, equivalente a 100 kg menos en comparación con el año anterior. Este resultado evidencia la efectividad de las actividades de acompañamiento y retroalimentación al personal para fortalecer la correcta separación de residuos.', 'Continuar con las actividades de acompañamiento y seguimiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 25), 2026, 2, -0.7837837837837838, 'Se cumple ampliamente la meta establecida, alcanzando una reducción del 78 % en la generación de residuos, equivalente a 2.900 kg menos respecto al año anterior. Este resultado se atribuye al acompañamiento permanente y a las acciones de sensibilización y retroalimentación realizadas al personal.', 'Continuar con las actividades de acompañamiento y seguimiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 25), 2026, 3, 4.3, 'No se cumple la meta establecida debido al incremento en la cantidad de residuos dispuestos, asociado a la evacuación de residuos que permanecían acumulados en el centro de acopio.', 'Continuar con las actividades de acompañamiento y seguimiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 25), 2026, 4, NULL, 'No se cumple la meta establecida debido al aumento en la generación reportada de residuos, resultado de la disposición de material que se encontraba represado en el centro de acopio.', 'Continuar con las actividades de acompañamiento y seguimiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 25), 2026, 5, 1.3333333333333333, 'No se cumple con la meta establecida, sin embargo se identificó la necesidad de fortalecer la separación en la fuente para mejorar el aprovechamiento de residuos reciclables. Ademas la causa de incumplimiento son los retrasos en la recolección de reiduos', 'Implementar un plan piloto para la correcta separación de residuos en casino y contratistas, realizar la clasificación independiente de botellas y tapas, e iniciar el registro y seguimiento diario de los kg de residuos generados.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 25), 2026, 6, -0.9186666666666666, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 26), 2026, 1, 0.04, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 26), 2026, 2, 0.041666666666666664, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 27), 2026, 1, 0.04, 'En enero se presentaron consumos de 4,98 kg i.a./ha en categoría II y 4,46 kg i.a./ha en categoría III, asociados a las necesidades de manejo fitosanitario, principalmente para el control de enfermedades y plagas.', 'Fortalecer el monitoreo MIPE, revisar las condiciones de aplicación y optimizar dosis, frecuencias y rotación de mecanismos de acción.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 27), 2026, 2, 0.041666666666666664, 'Durante febrero se mantuvo el manejo fitosanitario del cultivo de acuerdo con las condiciones presentadas. El comportamiento del consumo debe analizarse frente a la incidencia de plagas y enfermedades para determinar la necesidad de las aplicaciones realizadas.', 'Continuar el seguimiento mensual del consumo y relacionarlo con los registros de monitoreo MIPE, priorizando medidas preventivas y controles biológicos o biorracionales.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 27), 2026, 3, NULL, 'En marzo, la categoría III alcanzó 5,81 kg i.a./ha, reflejando una mayor necesidad de intervención fitosanitaria durante el periodo, asociada al manejo de plagas y enfermedades.', 'Reforzar el monitoreo de focos y priorizar alternativas de manejo integrado antes de incrementar las aplicaciones químicas.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 27), 2026, 4, NULL, 'En abril se registró el mayor consumo de categoría II, con 5,35 kg i.a./ha, asociado a una mayor exigencia en el manejo de enfermedades durante el periodo.', 'Revisar la eficacia de las aplicaciones, mantener la rotación de mecanismos de acción y utilizar los productos únicamente cuando las condiciones del cultivo lo requieran.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 27), 2026, 5, NULL, 'Durante mayo, la categoría III presentó un consumo de 5,37 kg i.a./ha, relacionado con los requerimientos de manejo de plagas y enfermedades del cultivo.', 'Fortalecer las estrategias MIPE y el uso de controles biológicos y biorracionales, buscando disminuir la dependencia de aplicaciones químicas.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 27), 2026, 6, NULL, 'En junio se registró el mayor consumo de categoría III del semestre, con 7,42 kg i.a./ha, evidenciando una mayor demanda de intervención fitosanitaria durante el periodo.', 'Analizar las causas del incremento y fortalecer las medidas preventivas, el monitoreo de incidencia y la optimización de las aplicaciones.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 28), 2026, 1, 0.10182049776430986, 'El consumo disminuyó 1,10 % frente a 2025, sin alcanzar la meta del 5 %, comportamiento asociado a las condiciones fitosanitarias y necesidades de aplicación del periodo.', 'Fortalecer el monitoreo MIPE, realizar seguimiento al consumo y optimizar las aplicaciones.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 28), 2026, 2, 0.12133772629043114, 'El consumo aumentó 41,61 % frente a 2025, debido principalmente a una mayor presión fitosanitaria y requerimiento de aplicaciones.', 'Ajustar el manejo fitosanitario y hacer seguimiento a los productos de mayor consumo.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 28), 2026, 3, 0.10289283366206445, 'Se presentó un incremento del 24,60 % frente a 2025, relacionado con una mayor incidencia fitosanitaria y necesidad de intervenciones en el cultivo.', 'Fortalecer el monitoreo y priorizar controles preventivos.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 28), 2026, 4, 0.12034838892947003, 'El consumo disminuyó 6,43 %, superando la meta del 5 %, asociado a una mayor eficiencia en el manejo fitosanitario y uso de productos.', 'Mantener el seguimiento a dosis, frecuencias y oportunidad de las aplicaciones.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 28), 2026, 5, 0.08969389197850879, 'El consumo aumentó 35,30 % frente a 2025, relacionado con un mayor requerimiento de aplicaciones por las condiciones fitosanitarias del cultivo.', 'Fortalecer el seguimiento técnico y optimizar el uso de ingrediente activo.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 28), 2026, 6, 0.06815992077341375, 'El consumo aumentó 26,70 % frente a 2025, debido principalmente a una mayor necesidad de intervenciones fitosanitarias durante el periodo.', 'Implementar el plan de mejora para el segundo semestre y mantener seguimiento mensual al indicador.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 29), 2026, 1, 1.0, 'Se realiza tramitses legales en cuanto al reporte de consumo de agua a cierre del año 2025 para el paso TUSO y se realiza el reporte trimestral de consumo de agua del ultimo trimestre del año 2025. 
Se inica con la gestión de documentos para el Reporte Unico Ambiental
Se actualizan firmas autorizadas de salias de material de la finca', 'Continuar con la revisión de requisitos legales para su oportunuo diligencionamiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 29), 2026, 2, 1.0, 'Se continua con la gestión de documentos del RUA y se empiezan a subir datos de la concesión', 'Continuar con la revisión de requisitos legales para su oportunuo diligencionamiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 29), 2026, 3, 1.0, 'Se realiza el cargue total y cierre del Reporte Unico Ambiental', 'Continuar con la revisión de requisitos legales para su oportunuo diligencionamiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 29), 2026, 4, 1.0, 'se realiza seguimiento y actualización de la matriz de tramites legales', 'Continuar con la revisión de requisitos legales para su oportunuo diligencionamiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 29), 2026, 5, 1.0, 'Se realiza envio de la documentación sobre tramites de la concesión (requisición de la CAR) , se actualizan SV', 'Continuar con la revisión de requisitos legales para su oportunuo diligencionamiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 29), 2026, 6, 1.0, 'Se hace cierre de los PCBs en conjunto con LN y AJ, se hace seguimiento al reporte trimestras en simplifica', 'Continuar con la revisión de requisitos legales para su oportunuo diligencionamiento.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 30), 2026, 1, 0.245, 'No se dio cumplimiento a la meta de reducir el número de novedades de despacho en temas de seguridad, ya que se presentaron tres eventos: cajas de cartón mojadas (2) y objeto extraño. De estos, únicamente el evento de objeto extraño es atribuible a la finca.
Del análisis realizado, se encontró que las causas están asociadas a deficiencias en la inspección del vehículo y a la falta de aseguramiento en el proceso de empaque, lo que permitió la materialización de las novedades.', 'Fortalecer en todos los despachadores el aseguramiento de los procedimientos de despacho, mediante retroalimentaciones mensuales, con el fin de garantizar su correcta ejecución y prevenir novedades.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 30), 2026, 2, 0.08166666666666667, 'Se evidencian eventos de cartón rasgado y cajas mojadas. En el caso de las cajas mojadas, la afectación se asocia a condiciones del furgón de transporte; mientras que el cartón rasgado probablemente ocurrió durante el proceso de cargue en despacho.
En consecuencia, no se logra una reducción del 10% en los eventos en comparación con el año anterior.', 'Fortalecer en todos los despachadores el aseguramiento de los procedimientos de despacho, mediante retroalimentaciones mensuales, con el fin de garantizar su correcta ejecución y prevenir novedades.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 30), 2026, 3, 0.0, 'Se da cumplimeinto a la meta menusal debido a que no se presentaron novedades relacionadas con el depacho', 'Fortalecer en todos los despachadores el aseguramiento de los procedimientos de despacho, mediante retroalimentaciones mensuales, con el fin de garantizar su correcta ejecución y prevenir novedades.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 30), 2026, 4, 0.0, 'Se da cumplimeinto a la meta menusal debido a que no se presentaron novedades relacionadas con el depacho', 'Fortalecer en todos los despachadores el aseguramiento de los procedimientos de despacho, mediante retroalimentaciones mensuales, con el fin de garantizar su correcta ejecución y prevenir novedades.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 30), 2026, 5, 0.0, 'Se da cumplimeinto a la meta menusal debido a que no se presentaron novedades relacionadas con el depacho', 'Fortalecer en todos los despachadores el aseguramiento de los procedimientos de despacho, mediante retroalimentaciones mensuales, con el fin de garantizar su correcta ejecución y prevenir novedades.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 30), 2026, 6, 0.0, 'Se da cumplimeinto a la meta menusal debido a que no se presentaron novedades relacionadas con el depacho', 'Fortalecer en todos los despachadores el aseguramiento de los procedimientos de despacho, mediante retroalimentaciones mensuales, con el fin de garantizar su correcta ejecución y prevenir novedades.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 31), 2026, 1, 0.04, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 31), 2026, 2, 0.041666666666666664, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 32), 2026, 1, 1.0, 'En el mes de enero, en conjunto con el departamento de seguridad, se realizaron pruebas de alcoholemia al personal del área administrativa. No se evidenciaron casos de estado de embriaguez, por lo cual se da cumplimiento a la meta establecida en la ejecución de las actividades.', 'Se continuará trabajando de manera conjunta con los diferentes procesos de la finca, con el fin de prevenir la ocurrencia de casos relacionados.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 32), 2026, 2, 1.0, 'En el mes de febrero, en conjunto con el departamento de seguridad, se realizaron pruebas de alcoholemia al personal del área de poscosecha. No se evidenciaron casos de estado de embriaguez, por lo cual se da cumplimiento a la meta establecida en la ejecución de las actividades.', 'Se continuará trabajando de manera conjunta con los diferentes procesos de la finca, con el fin de prevenir la ocurrencia de casos relacionados.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 32), 2026, 3, 1.0, 'En el mes marzo, en conjunto con el departamento de seguridad, se realizaron pruebas de alcoholemia al personal contratista de H&H. No se evidenciaron casos de estado de embriaguez, por lo cual se da cumplimiento a la meta establecida en la ejecución de las actividades.', 'Se continuará trabajando de manera conjunta con los diferentes procesos de la finca, con el fin de prevenir la ocurrencia de casos relacionados.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 32), 2026, 4, 1.0, 'En el mes abril, en conjunto con el departamento de seguridad, se realizaron pruebas de alcoholemia al personal del área de recepción de la poscosecha. No se evidenciaron casos de estado de embriaguez, por lo cual se da cumplimiento a la meta establecida en la ejecución de las actividades.', 'Se continuará trabajando de manera conjunta con los diferentes procesos de la finca, con el fin de prevenir la ocurrencia de casos relacionados.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 32), 2026, 5, 1.0, 'En el mes mayo en conjunto con el departamento de seguridad, se realizaron pruebas de alcoholemia al personal contratista de casino. No se evidenciaron casos de estado de embriaguez, por lo cual se da cumplimiento a la meta establecida en la ejecución de las actividades.', 'Se continuará trabajando de manera conjunta con los diferentes procesos de la finca, con el fin de prevenir la ocurrencia de casos relacionados.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 32), 2026, 6, 1.0, 'En el mes junio, en conjunto con el departamento de seguridad, se realizaron pruebas de alcoholemia al personal del área de empaque. No se evidenciaron casos de estado de embriaguez, por lo cual se da cumplimiento a la meta establecida en la ejecución de las actividades.', 'Se continuará trabajando de manera conjunta con los diferentes procesos de la finca, con el fin de prevenir la ocurrencia de casos relacionados.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 33), 2026, 1, 0.0833, 'En el mes de enero se ejecutó un simulacro de intrusión en el área MIRFE, en conjunto con el departamento de seguridad, con el objetivo de evaluar la capacidad de respuesta y la efectividad de los controles establecidos. Durante la actividad se verificó la adecuada reacción del personal y la correcta aplicación de los protocolos definidos.
Se da cumplimiento a la actividad programada, evidenciando el compromiso con el fortalecimiento de la seguridad en la finca.', 'Continuar en coordinación con el departamento de seguridad en la ejecución de actividades orientadas a fortalecer la cultura de seguridad en la finca.  Cada vez que finaliza la actividad se realiza retoalimentación al personal', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 33), 2026, 2, 0.0833, 'En el mes de febrero se ejecutó un simulacro de contaminación de la carga en ramos del área de empaque, en conjunto con el departamento de seguridad, con el objetivo de evaluar la capacidad de respuesta y la efectividad de los controles establecidos frente a este tipo de riesgo. Se da cumplimiento a la actividad programada, evidenciando el compromiso con el fortalecimiento de la seguridad en la finca.', 'Continuar en coordinación con el departamento de seguridad en la ejecución de actividades orientadas a fortalecer la cultura de seguridad en la finca.  Cada vez que finaliza la actividad se realiza retoalimentación al personal, se planea simulacro para cierre del primer semestre', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 33), 2026, 3, 0.0833, 'En el mes de marzo se ejecutó un simulacro de paquete sospechoso dirigido al área de Gestión Humana, en conjunto con el departamento de seguridad, con el objetivo de evaluar la capacidad de respuesta y la efectividad de los controles establecidos frente a este tipo de riesgo. Se da cumplimiento a la actividad programada, evidenciando el compromiso con el fortalecimiento de la seguridad en la finca.', 'Continuar en coordinación con el departamento de seguridad en la ejecución de actividades orientadas a fortalecer la cultura de seguridad en la finca.  Cada vez que finaliza la actividad se realiza retoalimentación al personal', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 33), 2026, 4, 0.0833, 'En el mes de abril se ejecutó un simulacro de intrusión dirigido al área de mantenimiento (taller), en conjunto con el departamento de seguridad, con el objetivo de evaluar la capacidad de respuesta y la efectividad de los controles establecidos frente a este tipo de riesgo. Se da cumplimiento a la actividad programada, evidenciando el compromiso con el fortalecimiento de la seguridad en la finca.', 'Continuar en coordinación con el departamento de seguridad en la ejecución de actividades orientadas a fortalecer la cultura de seguridad en la finca. Cada vez que finaliza la actividad se realiza retoalimentación al personal', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 33), 2026, 5, 0.0833, 'En el mes de mayo se ejecutó un simulacro de hurto dirigido al contratista ip-support, en conjunto con el departamento de seguridad, con el objetivo de evaluar la capacidad de respuesta y la efectividad de los controles establecidos frente a este tipo de riesgo. No se da cumplimiento a la actividad programada, evidenciando el compromiso con el fortalecimiento de la seguridad en la finca.', 'Continuar en coordinación con el departamento de seguridad en la ejecución de actividades orientadas a fortalecer la cultura de seguridad en la finca. Una vez finalizada la actividad se hace retroalimentación al persona y se programa nueva actividad', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 33), 2026, 6, 0.0833, 'En el mes dejunio se ejecutó un simulacro de contaminación de la carga dirigido al área de empaque, en conjunto con el departamento de seguridad, con el objetivo de evaluar la capacidad de respuesta y la efectividad de los controles establecidos frente a este tipo de riesgo. Se da cumplimiento a la actividad programada, evidenciando el compromiso con el fortalecimiento de la seguridad en la finca.', 'Continuar en coordinación con el departamento de seguridad en la ejecución de actividades orientadas a fortalecer la cultura de seguridad en la finca. Cada vez que finaliza la actividad se realiza retoalimentación al personal', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 34), 2026, 1, 0.0833, 'Durante la actividad del simulacro de intrusión, el bombero del área MIRFE identificó oportunamente a la persona e informó al jefe del área, quien a su vez notificó al jefe de seguridad, cumpliendo con el protocolo establecido y el objetivo del simulacro.', 'Se realiza retroalimentación al personal con el fin de fortalecer la cultura de prevención y mejorar la respuesta ante este tipo de situaciones.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 34), 2026, 2, 0.0, 'Durante la actividad de simulacro de contaminación de la carga, no se dio cumplimiento al objetivo, ya que el personal del área de empaque no identificó los ramos contaminados. La causa principal se asocia al trabajo repetitivo de la labor, lo que genera disminución en la atención frente a posibles riesgos de contaminación.', 'Como acción de mejora, se realizó retroalimentación al personal una vez finalizado el simulacro. Adicionalmente, se establece como acción el acompañamiento periódico al área, con el fin de fortalecer la cultura en la identificación de posibles riesgos de contaminación.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 34), 2026, 3, 0.0833, 'Durante el simulacro de paquete sospechoso, la directora de Gestión Humana identificó el paquete y notificó oportunamente al jefe de seguridad de la finca, procediéndose a la evacuación de la zona conforme a los protocolos establecidos.', 'Se realiza retroalimentación al personal con el fin de fortalecer la cultura de prevención y mejorar la respuesta ante este tipo de situaciones.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 34), 2026, 4, 0.0833, 'Durante el simulacro la persona que iba a realiza la intrusión es aborada por el personal del taller quienes generarón la alerta al supervisor, obteniendo un resultado satisfactorio', 'Se realiza retroalimentación al personal con el fin de fortalecer la cultura de prevención y mejorar la respuesta ante este tipo de situaciones.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 34), 2026, 5, 0.0, 'No se da cumplimiento al objetivo de salvaguardar las herramientas por parte del contratista IP-SUPPORT debido a que la persona dejo la herramienta con la que estaba laborando sin previo aseguramiento ocasionado un hurto por parte de personal de pruebas', 'Se realiza retroalimentación al personal con el fin de fortalecer la cultura de prevención y mejorar la respuesta ante este tipo de situaciones. Se programa nuevamente el simulacro', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 34), 2026, 6, 0.0833, 'Se da cumplimiento al objetivo ya que las cajas que iban contaminadas desde el área de cartón fueron identificadas por el personal del área de empaque y generarón la alerta', 'Se realiza retroalimentación al personal con el fin de fortalecer la cultura de prevención y mejorar la respuesta ante este tipo de situaciones.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 36), 2026, 1, NULL, 'No se presentaron eventos de vulnerabilidad', 'Seguir con el acompañamiento a jefes y personal de la finca en controles de seguridad previniendo posibles riesgos', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 36), 2026, 11, -1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 36), 2026, 12, -1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 36), 2026, 2, 1.0, 'En el mes de febrero se presento un evento relacionado con una lamina que se desprendio del almacen, sin embargo ocurrio despues que no habia personal en la finca, se realiza orden de mantenimiento para el arreglo el dia despues.', 'Seguir con el acompañamiento a jefes y personal de la finca en controles de seguridad previniendo posibles riesgos', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 36), 2026, 3, NULL, 'Se presenta riesgo por posibole intrusión al área de contratistas por que dejaron sin asegurar el cubiculo (se refuerzan rondas por parte del personal de seguridad), al dia siguiente se realiza retroalimentación', 'Seguir con el acompañamiento a jefes y personal de la finca en controles de seguridad previniendo posibles riesgos', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 36), 2026, 4, -1.0, 'No se presentaron eventos de vulnerabilidad', 'Seguir con el acompañamiento a jefes y personal de la finca en controles de seguridad previniendo posibles riesgos', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 36), 2026, 5, -0.8, 'Se presenta el riesgo de hurto por el abandono de una bomba de riego del área de MIRFE, el personal de seguridad realiza resguardo del equipo y al dia siguiente se realzia retroalimentación al personal', 'Seguir con el acompañamiento a jefes y personal de la finca en controles de seguridad previniendo posibles riesgos (se dara retroalimentación al personal por medio de audio)', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 36), 2026, 6, -1.0, 'No se presentaron eventos de vulnerabilidad', 'Seguir con el acompañamiento a jefes y personal de la finca en controles de seguridad previniendo posibles riesgos (se dara retroalimentación al personal por medio de audio)', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 36), 2026, 9, -1.0, NULL, NULL, false, 'Importado del Excel'),
  ((select id from indicadores where orden = 37), 2026, 1, NULL, 'Durante el primer semestre del 2026 no se materializaron riesgos que pongan en riesgo a la organización', 'Se realiza seguimiento a todas las áreas en conjunto con el departamento de seguridad fortaleciendo la cultura de prevención de riesgos identificados en la compañía', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 38), 2026, 1, 0.0833, 'Se da cumplimiento a la meta establecida ya que durante este mes no se presentaron novedades relacionadas con la información digital', 'Por parte de TI se raliza asguramiento del estado de cada usuario, ademas se realizan recomendacions constantes (no dejar el portatil desatentido, no dar contraseñas) y mediante correo se envian recomendaciones', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 38), 2026, 2, 0.0833, 'Se da cumplimiento a la meta establecida ya que durante este mes no se presentaron novedades relacionadas con la información digital', 'Por parte de TI se raliza asguramiento del estado de cada usuario, ademas se realizan recomendacions constantes (no dejar el portatil desatentido, no dar contraseñas) y mediante correo se envian recomendaciones', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 38), 2026, 3, 0.0833, 'Se da cumplimiento a la meta establecida ya que durante este mes no se presentaron novedades relacionadas con la información digital', 'Por parte de TI se raliza asguramiento del estado de cada usuario, ademas se realizan recomendacions constantes (no dejar el portatil desatentido, no dar contraseñas) y mediante correo se envian recomendaciones', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 38), 2026, 4, 0.0833, 'Se da cumplimiento a la meta establecida ya que durante este mes no se presentaron novedades relacionadas con la información digital', 'Por parte de TI se raliza asguramiento del estado de cada usuario, ademas se realizan recomendacions constantes (no dejar el portatil desatentido, no dar contraseñas) y mediante correo se envian recomendaciones', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 38), 2026, 5, 0.0833, 'Se da cumplimiento a la meta establecida ya que durante este mes no se presentaron novedades relacionadas con la información digital', 'Por parte de TI se raliza asguramiento del estado de cada usuario, ademas se realizan recomendacions constantes (no dejar el portatil desatentido, no dar contraseñas) y mediante correo se envian recomendaciones', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 38), 2026, 6, 0.0833, 'Se da cumplimiento a la meta establecida ya que durante este mes no se presentaron novedades relacionadas con la información digital', 'Por parte de TI se raliza asguramiento del estado de cada usuario, ademas se realizan recomendacions constantes (no dejar el portatil desatentido, no dar contraseñas) y mediante correo se envian recomendaciones, ademas en el mes de julio se realizara la inducción a ususarios que manejes equipos dentro de la finca', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 39), 2026, 1, 0.0644, 'En enero se empiezan a llevar las evaluaciones por medio de formatos diitales y se busca realizar evaluaciones al 100% de ingresos', 'Mantener actualizado el registro de evaluaciones y fortalecer la metodología de aprendizaje de acuerdo con los resultados obtenidos.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 39), 2026, 2, 0.07206666666666667, 'Se da continuidad a la aplicación de las evaluaciones digitales, consolidando el proceso y garantizando el seguimiento al personal de nuevo ingreso.', 'Conservar la metodología de capacitación implementada y documentar las buenas prácticas para replicarlas en los siguientes procesos de inducción.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 39), 2026, 3, 0.06593333333333334, 'Se alcanza el puntaje mínimo esperado; sin embargo, se evidencia que la falta de atención durante la inducción y los bajos conocimientos previos del personal influyen en los resultados obtenidos.', 'Reforzar los contenidos con menor porcentaje de aciertos y utilizar estrategias más participativas durante la inducción.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 39), 2026, 4, 0.061333333333333344, 'Se evaluaron 104 colaboradores, con una adquisición del conocimiento del 80 %. El resultado evidencia la necesidad de fortalecer la comprensión de algunos temas antes de finalizar el proceso de inducción.', 'Mantener el resgistro actualizado y ajustar la forma de aprendiaje teneindo en cuenta los resultados obtenidos', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 39), 2026, 5, 0.06056666666666668, 'ANÁLISIS DE CUMPLIMIENTO', 'Revisar la metodología de inducción, fortalecer los temas con menor desempeño e incorporar herramientas didácticas que faciliten el aprendizaje.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 39), 2026, 6, 0.06210000000000001, 'Se evaluaron 18 colaboradores, alcanzando una adquisición del conocimiento del 81 %. Además, se incorporaron preguntas relacionadas con los requisitos BASC para fortalecer la cultura de seguridad en el personal.', 'Mantener el seguimiento a los resultados e integrar de manera permanente las evaluaciones de BASC, reforzando los temas con menor nivel de apropiación.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 41), 2026, 1, 1.0, NULL, 'Mantener la ejecución del cronograma de capacitaciones BASC, garantizando la participación del personal y el registro de evidencias de formación.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 41), 2026, 2, 0.8333333333333334, NULL, 'Dar continuidad al plan de capacitaciones BASC y realizar seguimiento al cumplimiento de los temas programados, fortaleciendo la cultura de seguridad.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 41), 2026, 3, 1.0, NULL, 'Continuar con la ejecución de las capacitaciones previstas y verificar la comprensión de los temas mediante las evaluaciones y registros de asistencia.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 41), 2026, 4, 1.0, NULL, 'Mantener el cumplimiento del cronograma de formación BASC y reforzar los temas de seguridad y control con el personal de la organización.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 41), 2026, 5, 0.8571428571428571, NULL, 'Reprogramar las capacitaciones de Gestión de Riesgos y Seguridad de la Información para el mes de junio, garantizando su ejecución y ajustando el cronograma sin afectar el cumplimiento anual del programa de formación BASC.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 41), 2026, 6, 1.4, NULL, 'Ejecutar las capacitaciones reprogramadas de Gestión de Riesgos y Seguridad de la Información, realizar seguimiento a la cobertura de los participantes y continuar fortaleciendo la cultura BASC mediante actividades de sensibilización y formación continua.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 42), 2026, 1, 1.0, 'Se ejecutó la actividad de formación en temas de corrupción, soborno, lavado de activos y financiación del terrorismo para el personal de nuevo ingreso, alcanzando un 100 % de cumplimiento.', 'Mantener la ejecución de las capacitaciones al 100 % para todo el personal de nuevo ingreso y realizar seguimiento a los registros de asistencia y evaluación.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 42), 2026, 2, 1.0, 'Se dio cumplimiento al 100 % de las actividades de formación programadas para el personal de nuevo ingreso.', 'Continuar garantizando la formación del personal de nuevo ingreso y verificar la actualización del material de capacitación en temas de corrupción, soborno, lavado de activos y financiación del terrorismo.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 42), 2026, 3, 1.0, 'Se mantuvo un 100 % de cumplimiento, garantizando la capacitación de todos los colaboradores de nuevo ingreso en los temas establecidos.', 'Realizar seguimiento al cumplimiento del cronograma de capacitaciones y asegurar que la totalidad de los nuevos colaboradores reciban la inducción correspondiente.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 42), 2026, 4, 1.0, 'Se alcanzó un 100 % de cumplimiento. Además de las actividades de formación a nuevos ingresos, se realizó la divulgación del Oficial de Cumplimiento, conforme a lo programado.', 'Dar continuidad a las capacitaciones y fortalecer la divulgación del rol y las responsabilidades del Oficial de Cumplimiento entre los colaboradores.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 42), 2026, 5, 0.5, 'Se registró un cumplimiento del 50%, debido a la ejecución de actividades adicionales frente a las programadas. La divulgación de las infografías, prevista inicialmente para este mes, fue reprogramada para junio.', 'Reprogramar la divulgación de las infografías para el siguiente mes, garantizando su difusión a todo el personal y ajustando el cronograma de actividades sin afectar el cumplimiento anual.', false, 'Importado del Excel'),
  ((select id from indicadores where orden = 42), 2026, 6, 2.0, 'Se obtuvo un cumplimiento del 200 %, ya que durante este mes se realizó la divulgación de las infografías reprogramadas desde mayo, ajustando el cronograma sin afectar el cumplimiento general del plan de acción.', 'Ejecutar la divulgación de las infografías reprogramadas, verificar su cobertura y retomar el cronograma normal de actividades para el segundo semestre. Reforzar mediante audios', false, 'Importado del Excel')
on conflict (indicador_id, anio, mes) do nothing;

-- Involucrados de ejemplo (uno por proceso, con el cargo que aparece en la
-- matriz como "Responsable de la medición"). Edita el nombre y agrega el
-- correo real desde la app — mientras no tengan correo, no reciben avisos.
insert into indicadores_involucrados (proceso_id, nombre, cargo, email, notificar)
select id, responsable, responsable, null, true
from (
  select distinct on (p.id) p.id, i.responsable_medicion as responsable
  from indicadores_procesos p
  join indicadores i on i.proceso_id = p.id
  order by p.id, i.orden
) base
on conflict do nothing;

-- =====================================================================
-- AMPLIACIÓN: roles de usuario, cierre mensual y días fijos de aviso.
-- Seguro de correr sobre una base ya cargada (no borra nada existente).
-- =====================================================================

-- Roles: 'admin' ve el resumen/dashboard y la Configuración; 'usuario' solo
-- ve y diligencia los indicadores. El primer administrador se agrega a mano
-- (ver manual) insertando su propio user_id en esta tabla con rol 'admin'.
create table if not exists indicadores_usuarios (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text,
  rol         text not null default 'usuario' check (rol in ('admin', 'usuario')),
  creado_en   timestamptz not null default now()
);
alter table indicadores_usuarios enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'indicadores_usuarios' and policyname = 'acceso_total_indicadores_usuarios') then
    create policy "acceso_total_indicadores_usuarios" on indicadores_usuarios for all using (true) with check (true);
  end if;
end $$;

-- Cierre mensual: cuando un mes queda cerrado, sus registros no se pueden
-- editar desde la app hasta que un administrador lo reabra.
create table if not exists indicadores_cierres (
  anio          smallint not null,
  mes           smallint not null check (mes between 1 and 12),
  cerrado       boolean not null default false,
  cerrado_en    timestamptz,
  reabierto_en  timestamptz,
  reabierto_por text,
  primary key (anio, mes)
);
alter table indicadores_cierres enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'indicadores_cierres' and policyname = 'acceso_total_indicadores_cierres') then
    create policy "acceso_total_indicadores_cierres" on indicadores_cierres for all using (true) with check (true);
  end if;
end $$;

-- Días fijos: por defecto, recordatorio el día 2 y cierre del mes el día 12.
alter table indicadores_configuracion add column if not exists dia_cierre smallint not null default 12;
update indicadores_configuracion set dia_envio = 2 where id = 1 and dia_envio = 25;

-- Bloqueo real a nivel de base de datos: si (anio, mes) está cerrado en
-- indicadores_cierres, nadie puede insertar/editar registros de ese mes
-- desde la app (anon/autenticado). La función de correos usa la llave de
-- servicio, que sí puede seguir escribiendo (para poder cerrar el mes y
-- dejar su propio registro de auditoría).
create or replace function indicadores_bloquear_mes_cerrado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if exists (
    select 1 from indicadores_cierres
    where anio = new.anio and mes = new.mes and cerrado = true
  ) then
    raise exception 'Este mes (%/%) está cerrado. Pide a un administrador que lo reabra en Configuración.', new.mes, new.anio
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_indicadores_bloquear_mes_cerrado on indicadores_registros;
create trigger trg_indicadores_bloquear_mes_cerrado
  before insert or update on indicadores_registros
  for each row execute function indicadores_bloquear_mes_cerrado();

-- >>> MIGRACIÓN: roles, metas y permisos <<<
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
    -- dia = último día para registrar (inclusive): el mes se cierra al día siguiente
    cerrado := hoy > (make_date(new.anio, new.mes, 1) + interval '1 month' + ((dia - 1) * interval '1 day'))::date;
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
  -- dia = último día para registrar (inclusive): el mes se cierra al día siguiente
  return hoy > (make_date(p_anio, p_mes, 1) + interval '1 month' + ((dia - 1) * interval '1 day'))::date;
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
