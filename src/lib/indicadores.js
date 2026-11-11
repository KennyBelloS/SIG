import { supabase } from './supabaseClient';

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// --- Catálogo ---------------------------------------------------------------

export async function getProcesos() {
  const { data, error } = await supabase.from('indicadores_procesos').select('*').eq('activo', true).order('orden');
  if (error) throw error;
  return data || [];
}

export async function getIndicadores({ procesoId = null } = {}) {
  let q = supabase.from('indicadores').select('*').eq('activo', true).order('orden');
  if (procesoId) q = q.eq('proceso_id', procesoId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getIndicador(id) {
  const { data, error } = await supabase.from('indicadores').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function actualizarIndicador(id, cambios) {
  const { error } = await supabase.from('indicadores').update(cambios).eq('id', id);
  if (error) throw error;
}

export async function actualizarProceso(id, cambios) {
  const { error } = await supabase.from('indicadores_procesos').update(cambios).eq('id', id);
  if (error) throw error;
}

// --- Cierre mensual (bloqueo de edición) -------------------------------------

export async function getCierre(anio, mes) {
  const { data, error } = await supabase.from('indicadores_cierres').select('*').eq('anio', anio).eq('mes', mes).maybeSingle();
  if (error) throw error;
  return data; // null = abierto (nunca se ha cerrado)
}

/** Cada mes se puede registrar HASTA el día `diaCierre` (inclusive) de ese mismo mes y se cierra al día siguiente.
 *  Los meses que ya pasaron están cerrados. Ejemplo con 15: el 7 de noviembre solo están abiertos noviembre y diciembre;
 *  el 16 de noviembre ya se cerró noviembre. Los meses por venir no se han cerrado. */
export function mesVencido(anio, mes, diaCierre = 15, hoy = new Date()) {
  const anioHoy = hoy.getFullYear(), mesHoy = hoy.getMonth() + 1;
  if (anio > anioHoy) return false;
  if (anio < anioHoy) return true;
  if (mes > mesHoy) return false;
  if (mes < mesHoy) return true;
  return hoy.getDate() > diaCierre;
}

/** Estado real de un mes: manda la decisión del administrador si existe;
 *  si no, se cierra solo al vencerse. */
export function estaCerrado(anio, mes, cierres = [], diaCierre = 15, hoy = new Date()) {
  const fila = (cierres || []).find(c => c.anio === anio && c.mes === mes);
  if (fila) return !!fila.cerrado;
  return mesVencido(anio, mes, diaCierre, hoy);
}

export async function getCierresDelAnio(anio) {
  const { data, error } = await supabase.from('indicadores_cierres').select('*').eq('anio', anio);
  if (error) throw error;
  return data || [];
}

export async function reabrirMes({ anio, mes, reabierto_por }) {
  const { error } = await supabase
    .from('indicadores_cierres')
    .upsert({ anio, mes, cerrado: false, reabierto_en: new Date().toISOString(), reabierto_por }, { onConflict: 'anio,mes' });
  if (error) throw error;
}

export async function cerrarMes({ anio, mes }) {
  const { error } = await supabase
    .from('indicadores_cierres')
    .upsert({ anio, mes, cerrado: true, cerrado_en: new Date().toISOString() }, { onConflict: 'anio,mes' });
  if (error) throw error;
}

// --- Involucrados -------------------------------------------------------------

export async function getInvolucrados(procesoId = null) {
  let q = supabase.from('indicadores_involucrados').select('*').order('creado_en');
  if (procesoId) q = q.eq('proceso_id', procesoId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function guardarInvolucrado({ id, proceso_id, nombre, cargo, email, notificar }) {
  if (id) {
    const { error } = await supabase.from('indicadores_involucrados').update({ nombre, cargo, email, notificar }).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('indicadores_involucrados').insert({ proceso_id, nombre, cargo, email, notificar });
    if (error) throw error;
  }
}

export async function eliminarInvolucrado(id) {
  const { error } = await supabase.from('indicadores_involucrados').delete().eq('id', id);
  if (error) throw error;
}

// --- Registros mensuales -------------------------------------------------------

export async function getRegistros(indicadorId, anio) {
  const { data, error } = await supabase
    .from('indicadores_registros').select('*')
    .eq('indicador_id', indicadorId).eq('anio', anio).order('mes');
  if (error) throw error;
  return data || [];
}

export async function getRegistrosDelMes({ procesoId = null, anio, mes }) {
  let indicadoresQ = supabase.from('indicadores').select('id, proceso_id').eq('activo', true);
  if (procesoId) indicadoresQ = indicadoresQ.eq('proceso_id', procesoId);
  const { data: inds, error: e1 } = await indicadoresQ;
  if (e1) throw e1;
  const ids = (inds || []).map(i => i.id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('indicadores_registros').select('*')
    .in('indicador_id', ids).eq('anio', anio).eq('mes', mes);
  if (error) throw error;
  return data || [];
}

export async function guardarRegistro({ indicador_id, anio, mes, valor, analisis, causa, accion, plan_sugerido, responsable_accion, fecha_compromiso, registrado_por, componentes }) {
  const hayValor = valor !== '' && valor !== undefined && valor !== null;
  // Regla de negocio: todo dato registrado lleva su plan de acción.
  if (hayValor && !String(accion || '').trim()) throw new Error('El plan de acción es obligatorio para registrar un dato.');
  const payload = {
    indicador_id, anio, mes,
    valor: hayValor ? valor : null,
    componentes: componentes ?? null,   // los dos números de los que sale el resultado (si el indicador se calcula)
    analisis: analisis ?? null,
    causa: causa ?? null,
    accion: accion ?? null,
    plan_sugerido: !!plan_sugerido,
    historico: false,   // lo que se registra desde la aplicación siempre exige plan de acción
    responsable_accion: responsable_accion ?? null,
    fecha_compromiso: fecha_compromiso || null,
    registrado_por: registrado_por ?? null,
    registrado_en: new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
  };
  const { error } = await supabase.from('indicadores_registros').upsert(payload, { onConflict: 'indicador_id,anio,mes' });
  if (error) throw error;
}

// --- Evaluación de cumplimiento --------------------------------------------------

/** Qué meta rige para un indicador: 'anual' o 'mensual'. Si no se eligió ninguna
 *  (tipo_meta vacío), se conserva el comportamiento histórico: mensual solo si el
 *  indicador trae metas mes a mes; en otro caso, la anual. */
export function tipoMetaEfectivo(indicador) {
  if (indicador?.tipo_meta === 'anual' || indicador?.tipo_meta === 'mensual') return indicador.tipo_meta;
  return indicador?.metas_mensuales && Object.keys(indicador.metas_mensuales).length > 0 ? 'mensual' : 'anual';
}

/** Meta mensual de un mes: la específica de ese mes (metas_mensuales) o la general mensual. */
export function metaMensualDe(indicador, mes) {
  const puntual = indicador?.metas_mensuales?.[String(mes)];
  if (puntual != null) return Number(puntual);
  return indicador?.meta_mensual != null ? Number(indicador.meta_mensual) : null;
}

/** Meta aplicable a un mes. `modo` ('anual' | 'mensual') permite forzar cuál usar,
 *  por ejemplo desde la gráfica; sin él se usa la configurada en el indicador. */
export function metaDelMes(indicador, mes, modo) {
  const tipo = modo || tipoMetaEfectivo(indicador);
  if (tipo === 'mensual') {
    const m = metaMensualDe(indicador, mes);
    if (m != null) return m;
  }
  return indicador?.meta_anual != null ? Number(indicador.meta_anual) : null;
}

export function cumpleMeta(indicador, valor, mes, modo) {
  const meta = metaDelMes(indicador, mes, modo);
  if (meta == null || valor == null || valor === '') return null;
  const v = Number(valor);
  return indicador.sentido_meta === 'menor_mejor' ? v <= meta : v >= meta;
}

/** true si el indicador se mide en porcentaje (se guarda como decimal: 0,95 = 95%). */
export function esPorcentaje(indicador) {
  return (indicador?.unidad_medida || '').toLowerCase().includes('%');
}

/** Convierte lo que la persona escribe en el formulario al valor que se guarda.
 *  En indicadores de %, la persona escribe 95 y se guarda 0.95. */
export function entradaAValor(indicador, entrada) {
  if (entrada === '' || entrada == null) return null;
  const n = Number(String(entrada).replace(',', '.'));
  if (Number.isNaN(n)) return null;
  return esPorcentaje(indicador) ? n / 100 : n;
}

/** Lo contrario: toma el valor guardado y lo muestra en el formulario. */
export function valorAEntrada(indicador, valor) {
  if (valor == null || valor === '') return '';
  const n = Number(valor);
  return esPorcentaje(indicador) ? Number((n * 100).toFixed(2)) : n;
}

/** Formatea un número para mostrarlo. Sin separador de miles en los
 *  porcentajes, porque en español el punto de miles se confunde con decimales
 *  (7.500% parecía 7,5% cuando en realidad era 7500%). */
export function formatearValor(indicador, valor) {
  if (valor == null || valor === '') return '—';
  const v = Number(valor);
  if (esPorcentaje(indicador)) {
    return `${(v * 100).toLocaleString('es-CO', { maximumFractionDigits: 1, useGrouping: false })}%`;
  }
  return v.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

export function formatearMeta(indicador) {
  if (indicador?.meta_anual == null) return '—';
  return formatearValor(indicador, indicador.meta_anual);
}

/** Meta mensual general formateada. */
export function formatearMetaMensual(indicador) {
  if (indicador?.meta_mensual == null) return indicador?.metas_mensuales && Object.keys(indicador.metas_mensuales).length ? 'Varía por mes' : '—';
  return formatearValor(indicador, indicador.meta_mensual);
}

/** Qué tan lejos quedó el valor de la meta, en puntos porcentuales o unidades. */
export function desviacionVsMeta(indicador, valor, mes) {
  const meta = metaDelMes(indicador, mes);
  if (meta == null || valor == null || valor === '') return null;
  const diff = Number(valor) - Number(meta);
  const favorable = indicador.sentido_meta === 'menor_mejor' ? diff <= 0 : diff >= 0;
  return { diff, favorable, texto: `${diff > 0 ? '+' : ''}${formatearValor(indicador, diff)}` };
}

/** El mes que se registra es el mes EN CURSO: se llena durante el mes y se cierra después del día 15 de ese mismo mes. */
export function mesReporteActual(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mesActual = fecha.getMonth() + 1;
  return { anio, mesActual, anioReporte: anio, mesReporte: mesActual };
}

// --- Plan de acción sugerido --------------------------------------------------

const CAUSAS_POR_TIPO = {
  Cumplimiento: ['Actividad programada no ejecutada a tiempo', 'Falta de seguimiento al cronograma', 'Recursos insuficientes para completar la actividad'],
  Eficacia: ['Desviación frente al estándar esperado', 'Causa raíz aún sin identificar — requiere análisis de campo', 'Condiciones externas (clima, mercado, proveedor) afectaron el resultado'],
  Eficiencia: ['Uso del recurso por encima de lo planeado', 'Proceso con oportunidad de optimización', 'Falta de ajuste al modelo/estándar de consumo'],
};

const ACCIONES_POR_PROCESO = {
  produccion: 'Revisar el modelo de estimación con el equipo de Producción y ajustar según el histórico de valles y pérdidas del mes.',
  poscosecha: 'Analizar con Poscosecha las causas raíz de los reclamos del mes y reforzar el punto de control asociado.',
  gestion_humana: 'Escalar a Gestión Humana para reforzar el seguimiento del cronograma/plan del mes y reprogramar lo pendiente.',
  mirfe: 'Revisar con MIRFE el balance hídrico del mes y los puntos de captación/consumo con mayor desviación.',
  mantenimiento: 'Validar con Mantenimiento la ejecución del programa (preventivo, PUEAA, energía o residuos) y reprogramar las actividades vencidas.',
  mipe: 'Revisar con MIPE el consumo de ingrediente activo del mes y ajustar el plan de aplicaciones.',
  gestion_integral: 'Escalar a Gestión Integral (SIG) para revisar trámites/acciones correctivas vencidas y definir responsables y fechas.',
  seguridad: 'Revisar con Seguridad los hallazgos/eventos del mes y reforzar la actividad de prevención correspondiente.',
  ti: 'Escalar a TI el evento de seguridad de la información para análisis y cierre.',
};

export function sugerirPlanAccion({ indicador, procesoClave, valor, mes, valorMesAnterior }) {
  const cumple = cumpleMeta(indicador, valor, mes);
  if (cumple !== false) {
    return {
      analisis: cumple === true ? `Se cumple la meta de ${indicador.nombre} en ${MESES[mes - 1]} (${formatearValor(indicador, valor)} vs. meta ${formatearMeta(indicador)}).` : '',
      causa: '', accion: '', plan_sugerido: false,
    };
  }
  const tendencia = valorMesAnterior != null
    ? (Number(valor) > Number(valorMesAnterior)
        ? (indicador.sentido_meta === 'menor_mejor' ? ' El valor empeoró frente al mes anterior.' : ' El valor mejoró frente al mes anterior, pero aún no alcanza la meta.')
        : Number(valor) < Number(valorMesAnterior)
          ? (indicador.sentido_meta === 'menor_mejor' ? ' El valor mejoró frente al mes anterior, pero aún no alcanza la meta.' : ' El valor empeoró frente al mes anterior.')
          : ' El valor se mantiene igual al mes anterior.')
    : '';
  const causas = CAUSAS_POR_TIPO[indicador.tipo_indicador] || CAUSAS_POR_TIPO.Eficacia;
  const accionBase = ACCIONES_POR_PROCESO[procesoClave] || 'Definir con el responsable de la medición la causa raíz y las acciones correctivas del mes.';
  return {
    analisis: `No se cumple la meta de ${indicador.nombre} en ${MESES[mes - 1]}: ${formatearValor(indicador, valor)} vs. meta ${formatearMeta(indicador)}.${tendencia}`,
    causa: causas[0],
    accion: accionBase,
    plan_sugerido: true,
  };
}

// --- Notificaciones por correo -------------------------------------------------

// --- Comparación entre años/meses ---------------------------------------------

/** Trae los registros de un indicador para varios años a la vez (para comparar). */
export async function getRegistrosMultiAnio(indicadorId, anios) {
  const { data, error } = await supabase
    .from('indicadores_registros').select('*')
    .eq('indicador_id', indicadorId).in('anio', anios).order('mes');
  if (error) throw error;
  return data || [];
}

/** % de incumplimiento de un indicador: de los meses con dato en ese año, cuántos no llegaron a la meta. */
export function pctIncumplimiento(indicador, registros) {
  const evaluables = (registros || []).filter(r => r.valor != null && cumpleMeta(indicador, r.valor, r.mes) != null);
  if (evaluables.length === 0) return null;
  const incumplidos = evaluables.filter(r => cumpleMeta(indicador, r.valor, r.mes) === false).length;
  return Math.round((incumplidos / evaluables.length) * 100);
}

/** Resumen completo de un indicador en un año: cumplimiento, incumplimiento,
 *  meses pendientes, promedio, mejor y peor mes. Se usa en la ficha y en las listas. */
export function estadisticasIndicador(indicador, registros) {
  const conDato = (registros || []).filter(r => r.valor != null);
  const evaluables = conDato.filter(r => cumpleMeta(indicador, r.valor, r.mes) != null);
  const cumplidos = evaluables.filter(r => cumpleMeta(indicador, r.valor, r.mes) === true);
  const incumplidos = evaluables.filter(r => cumpleMeta(indicador, r.valor, r.mes) === false);
  const pctIncump = evaluables.length ? Math.round((incumplidos.length / evaluables.length) * 100) : null;
  const pctCump = evaluables.length ? 100 - pctIncump : null;
  const promedio = conDato.length ? conDato.reduce((a, r) => a + Number(r.valor), 0) / conDato.length : null;

  let mejor = null, peor = null;
  for (const r of evaluables) {
    const d = desviacionVsMeta(indicador, r.valor, r.mes);
    if (!d) continue;
    const puntaje = indicador.sentido_meta === 'menor_mejor' ? -d.diff : d.diff;
    if (mejor == null || puntaje > mejor.puntaje) mejor = { ...r, puntaje };
    if (peor == null || puntaje < peor.puntaje) peor = { ...r, puntaje };
  }
  return {
    mesesConDato: conDato.length,
    mesesPendientes: 12 - conDato.length,
    evaluados: evaluables.length,
    cumplidos: cumplidos.length,
    incumplidos: incumplidos.length,
    pctCumplimiento: pctCump,
    pctIncumplimiento: pctIncump,
    promedio,
    mejorMes: mejor ? mejor.mes : null,
    peorMes: peor ? peor.mes : null,
    mesesIncumplidos: incumplidos.map(r => r.mes).sort((a, b) => a - b),
  };
}

/** Exporta a un archivo que Excel abre CON FORMATO (colores, encabezados,
 *  semáforos). Se usa HTML con marcado de hoja de cálculo, que Excel
 *  interpreta respetando estilos, a diferencia del CSV plano. */
/** Convierte el CSS sencillo de las columnas ("background:#E0EFE5;color:#166534;font-weight:bold;") en estilo de celda. */
function estiloExcel(css = '') {
  const tomar = re => (css.match(re) || [])[1];
  const fondo = tomar(/background(?:-color)?:\s*(#[0-9a-fA-F]{6})/);
  const color = tomar(/(?:^|;)\s*color:\s*(#[0-9a-fA-F]{6})/);
  return { ...(fondo ? { backgroundColor: fondo } : {}), ...(color ? { textColor: color } : {}), ...(/font-weight:\s*bold/.test(css) ? { fontWeight: 'bold' } : {}) };
}

/** Exporta una tabla a un .xlsx real: título, encabezado verde, filas alternadas y semáforos por celda. */
export async function exportarExcel({ nombreArchivo, titulo, subtitulo, columnas, filas }) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const n = columnas.length;
  const borde = { borderColor: '#E7E5DD', borderStyle: 'thin' };
  const datos = [];
  datos.push([{ value: titulo, fontWeight: 'bold', fontSize: 16, textColor: '#FFFFFF', backgroundColor: '#0F3D22', columnSpan: n, height: 30, alignVertical: 'center' }, ...Array(n - 1).fill(null)]);
  if (subtitulo) datos.push([{ value: subtitulo, textColor: '#1C2321', backgroundColor: '#E6F2EA', columnSpan: n, wrap: true, height: 34, alignVertical: 'center' }, ...Array(n - 1).fill(null)]);
  datos.push(Array(n).fill(null));
  datos.push(columnas.map(c => ({ value: c.titulo, fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: '#166534', align: c.alinear || 'left', alignVertical: 'center', wrap: true, ...borde })));
  filas.forEach((f, i) => {
    const base = i % 2 ? '#F7F7F2' : '#FFFFFF';
    datos.push(columnas.map(c => {
      const v = c.valor(f);
      const est = estiloExcel(c.estilo ? c.estilo(f) : '');
      return { value: v == null || v === '' ? null : (typeof v === 'number' ? v : String(v)), backgroundColor: base, align: c.alinear || 'left', alignVertical: 'top', wrap: true, ...borde, ...est };
    }));
  });
  await writeExcelFile(datos, { columns: columnas.map(c => ({ width: Math.max(8, Math.round((c.ancho || 120) / 7)) })), orientation: 'landscape', showGridLines: false, stickyRowsCount: subtitulo ? 4 : 3 })
    .toFile(`${nombreArchivo.replace(/\.(xls|xlsx|csv)$/i, '')}.xlsx`);
}

/** Descarga los registros de un año como CSV (se abre en Excel). */
export function exportarCSV({ nombreArchivo, filas, columnas }) {
  const escapar = v => {
    const s = v == null ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cabecera = columnas.map(c => escapar(c.titulo)).join(';');
  const cuerpo = filas.map(f => columnas.map(c => escapar(c.valor(f))).join(';')).join('\n');
  // BOM para que Excel en español reconozca los acentos
  const blob = new Blob(['\ufeff' + cabecera + '\n' + cuerpo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Resumen / Dashboard ------------------------------------------------------

/** Para el panel de Resumen: trae todos los indicadores con su proceso, y los
 * registros del año pedido, para calcular el % de cumplimiento por proceso y
 * por categoría (el color del Excel) y encontrar las áreas con mejor/peor desempeño. */
export async function getResumenCumplimiento(anio) {
  const [{ data: indicadores, error: e1 }, { data: procesos, error: e2 }] = await Promise.all([
    supabase.from('indicadores').select('*').eq('activo', true),
    supabase.from('indicadores_procesos').select('*').eq('activo', true),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const ids = (indicadores || []).map(i => i.id);
  let registros = [];
  if (ids.length) {
    const { data, error } = await supabase.from('indicadores_registros').select('*').in('indicador_id', ids).eq('anio', anio);
    if (error) throw error;
    registros = data || [];
  }
  const regsPorIndicador = new Map();
  for (const r of registros) {
    if (!regsPorIndicador.has(r.indicador_id)) regsPorIndicador.set(r.indicador_id, []);
    regsPorIndicador.get(r.indicador_id).push(r);
  }

  const procesoMap = new Map((procesos || []).map(p => [p.id, p]));
  const agrupar = (keyFn, labelFn) => {
    const grupos = new Map();
    for (const ind of indicadores || []) {
      const key = keyFn(ind);
      if (key == null) continue;
      if (!grupos.has(key)) grupos.set(key, { label: labelFn(ind), cumplidos: 0, evaluados: 0, pendientes: 0, color: ind.color_categoria || null });
      const g = grupos.get(key);
      const regs = regsPorIndicador.get(ind.id) || [];
      const mesesEsperados = 12;
      const mesesConDato = regs.filter(r => r.valor != null).length;
      g.pendientes += Math.max(0, mesesEsperados - mesesConDato);
      for (const r of regs) {
        if (r.valor == null) continue;
        const c = cumpleMeta(ind, r.valor, r.mes);
        if (c == null) continue;
        g.evaluados += 1;
        if (c) g.cumplidos += 1;
      }
    }
    return [...grupos.values()].map(g => ({ ...g, pct: g.evaluados > 0 ? Math.round((g.cumplidos / g.evaluados) * 100) : null }));
  };

  const porProceso = agrupar(ind => ind.proceso_id, ind => procesoMap.get(ind.proceso_id)?.nombre || '—');
  const porCategoria = agrupar(ind => ind.categoria, ind => ind.categoria);

  let totalCumplidos = 0, totalEvaluados = 0, totalPendientes = 0;
  for (const g of porProceso) { totalCumplidos += g.cumplidos; totalEvaluados += g.evaluados; totalPendientes += g.pendientes; }

  return {
    porProceso: porProceso.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1)),
    porCategoria: porCategoria.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1)),
    totalIndicadores: (indicadores || []).length,
    pctGlobal: totalEvaluados > 0 ? Math.round((totalCumplidos / totalEvaluados) * 100) : null,
    totalPendientes,
  };
}

export async function getConfiguracionNotificaciones() {
  const { data, error } = await supabase.from('indicadores_configuracion').select('*').eq('id', 1).single();
  if (error) throw error;
  return data;
}

export async function guardarConfiguracionNotificaciones(cambios) {
  const permitidos = ['dia_envio', 'dia_cierre', 'activo', 'firma_nombre', 'firma_cargo', 'firma_cargo2',
    'firma_telefono', 'firma_celular', 'firma_email', 'firma_ubicacion'];
  const payload = {};
  for (const k of permitidos) if (k in cambios) payload[k] = cambios[k];
  const { error } = await supabase.from('indicadores_configuracion').update(payload).eq('id', 1);
  if (error) throw error;
}

export async function getHistorialNotificaciones(limite = 20) {
  const { data, error } = await supabase
    .from('indicadores_notificaciones').select('*, indicadores_procesos(nombre)')
    .order('enviado_en', { ascending: false }).limit(limite);
  if (error) throw error;
  return data || [];
}

/** Elimina un solo envío del historial. */
export async function eliminarNotificacion(id) {
  const { error } = await supabase.from('indicadores_notificaciones').delete().eq('id', id);
  if (error) throw error;
}

/** Elimina todo el historial de envíos. */
export async function eliminarHistorialNotificaciones() {
  const { error } = await supabase.from('indicadores_notificaciones').delete().not('id', 'is', null);
  if (error) throw error;
}

async function leerRespuestaSegura(resp) {
  const texto = await resp.text();
  if (!texto) return { error: `El servidor respondió vacío (código ${resp.status}).` };
  try { return JSON.parse(texto); } catch { return { error: `Respuesta inesperada del servidor (código ${resp.status}).` }; }
}

export async function enviarRecordatorioAhora({ procesoId = null, accion = 'recordatorio', titulo, mensaje, destinatarios, mes, anio } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Debes iniciar sesión.');
  const resp = await fetch('/api/enviar-recordatorios-indicadores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ modo: 'manual', procesoId, accion, titulo, mensaje, destinatarios, mes, anio }),
  });
  if (resp.status === 404) {
    throw new Error('El servicio de correo no está disponible aquí. Las funciones de Cloudflare no corren con "npm run dev": usa "npm run preview:api", o despliega la app en Cloudflare Pages.');
  }
  const data = await leerRespuestaSegura(resp);
  if (!resp.ok) throw new Error(data.error || `No se pudo enviar el recordatorio (código ${resp.status}).`);
  return data;
}


/** Todos los registros de un año (para calcular estadísticas de varios indicadores a la vez). */
export async function supabaseRegistrosAnio(anio) {
  const { data, error } = await supabase
    .from('indicadores_registros')
    .select('indicador_id, anio, mes, valor')
    .eq('anio', anio);
  if (error) throw error;
  return data || [];
}


/** Analiza todo el año y arma las novedades que el administrador debe atender:
 *  alertas por meses sin registrar, incumplimientos repetidos, procesos en
 *  riesgo, rachas y comportamiento por área. */
export async function getNovedades(anio, mesCorte) {
  const [{ data: indicadores, error: e1 }, { data: procesos, error: e2 }] = await Promise.all([
    supabase.from('indicadores').select('*').eq('activo', true).order('orden'),
    supabase.from('indicadores_procesos').select('*').eq('activo', true).order('orden'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const ids = (indicadores || []).map(i => i.id);
  let registros = [];
  if (ids.length) {
    const { data, error } = await supabase.from('indicadores_registros').select('*').in('indicador_id', ids).eq('anio', anio);
    if (error) throw error;
    registros = data || [];
  }
  const { data: cierres } = await supabase.from('indicadores_cierres').select('*').eq('anio', anio);
  const cerrados = new Set((cierres || []).filter(c => c.cerrado).map(c => c.mes));

  const regsPorInd = new Map();
  for (const r of registros) {
    if (!regsPorInd.has(r.indicador_id)) regsPorInd.set(r.indicador_id, []);
    regsPorInd.get(r.indicador_id).push(r);
  }
  const procesoPorId = new Map((procesos || []).map(p => [p.id, p]));
  const alertas = [];
  const porProceso = new Map();

  for (const ind of indicadores || []) {
    const proc = procesoPorId.get(ind.proceso_id);
    const regs = regsPorInd.get(ind.id) || [];
    const porMes = new Map(regs.map(r => [r.mes, r]));

    if (!porProceso.has(ind.proceso_id)) {
      porProceso.set(ind.proceso_id, { proceso: proc?.nombre || '—', procesoId: ind.proceso_id, indicadores: 0, evaluados: 0, cumplidos: 0, faltantes: 0, incumplidos: 0, sinPlan: 0 });
    }
    const acc = porProceso.get(ind.proceso_id);
    acc.indicadores++;

    const mesesFaltantes = [];
    let rachaIncump = 0, mayorRacha = 0, mesesIncump = [];
    for (let m = 1; m <= mesCorte; m++) {
      const reg = porMes.get(m);
      if (!reg || reg.valor == null) { mesesFaltantes.push(m); rachaIncump = 0; continue; }
      acc.evaluados++;
      const c = cumpleMeta(ind, reg.valor, m);
      if (c === true) { acc.cumplidos++; rachaIncump = 0; }
      else if (c === false) {
        acc.incumplidos++; mesesIncump.push(m);
        rachaIncump++; mayorRacha = Math.max(mayorRacha, rachaIncump);
        if (!reg.accion) acc.sinPlan++;
      }
    }
    acc.faltantes += mesesFaltantes.length;

    const base = { indicadorId: ind.id, indicador: ind.nombre, proceso: proc?.nombre || '—', categoria: ind.categoria, color: ind.color_categoria };

    // Sin registrar en meses ya cerrados: lo más grave
    const faltantesCerrados = mesesFaltantes.filter(m => cerrados.has(m));
    if (faltantesCerrados.length) {
      alertas.push({ ...base, nivel: 'critico', tipo: 'Sin registrar en mes cerrado',
        detalle: `No se registró ${faltantesCerrados.map(m => MESES[m - 1]).join(', ')} y el mes ya está cerrado.`,
        meses: faltantesCerrados });
    }
    const faltantesAbiertos = mesesFaltantes.filter(m => !cerrados.has(m));
    if (faltantesAbiertos.length >= 2) {
      alertas.push({ ...base, nivel: 'alto', tipo: 'Varios meses sin registrar',
        detalle: `Faltan ${faltantesAbiertos.length} meses: ${faltantesAbiertos.map(m => MESES[m - 1].slice(0, 3)).join(', ')}.`,
        meses: faltantesAbiertos });
    } else if (faltantesAbiertos.length === 1) {
      alertas.push({ ...base, nivel: 'medio', tipo: 'Mes sin registrar',
        detalle: `Falta registrar ${MESES[faltantesAbiertos[0] - 1]}.`, meses: faltantesAbiertos });
    }
    if (mayorRacha >= 3) {
      alertas.push({ ...base, nivel: 'critico', tipo: 'Incumple de forma sostenida',
        detalle: `${mayorRacha} meses seguidos sin alcanzar la meta.`, meses: mesesIncump });
    } else if (mayorRacha === 2) {
      alertas.push({ ...base, nivel: 'alto', tipo: 'Dos meses seguidos incumpliendo',
        detalle: `No cumple en ${mesesIncump.slice(-2).map(m => MESES[m - 1]).join(' y ')}.`, meses: mesesIncump });
    }
    const incumpSinPlan = mesesIncump.filter(m => { const r = porMes.get(m); return r && !r.accion; });
    if (incumpSinPlan.length) {
      alertas.push({ ...base, nivel: 'alto', tipo: 'Incumple sin plan de acción',
        detalle: `${incumpSinPlan.length} mes(es) sin plan: ${incumpSinPlan.map(m => MESES[m - 1].slice(0, 3)).join(', ')}.`,
        meses: incumpSinPlan });
    }
  }

  const orden = { critico: 0, alto: 1, medio: 2 };
  alertas.sort((a, b) => orden[a.nivel] - orden[b.nivel] || a.proceso.localeCompare(b.proceso));

  const areas = [...porProceso.values()].map(a => ({
    ...a,
    pctCumplimiento: a.evaluados ? Math.round((a.cumplidos / a.evaluados) * 100) : null,
    pctDiligenciado: a.indicadores * mesCorte > 0 ? Math.round(((a.indicadores * mesCorte - a.faltantes) / (a.indicadores * mesCorte)) * 100) : null,
  })).sort((a, b) => (a.pctCumplimiento ?? 101) - (b.pctCumplimiento ?? 101));

  return {
    alertas,
    areas,
    mesesCerrados: [...cerrados].sort((a, b) => a - b),
    totales: {
      criticas: alertas.filter(a => a.nivel === 'critico').length,
      altas: alertas.filter(a => a.nivel === 'alto').length,
      medias: alertas.filter(a => a.nivel === 'medio').length,
      sinPlan: areas.reduce((n, a) => n + a.sinPlan, 0),
      faltantes: areas.reduce((n, a) => n + a.faltantes, 0),
    },
  };
}


/** Convierte la respuesta del servidor en un mensaje claro para la persona. */
export function describirEnvio(res, { mesNombre } = {}) {
  const mes = res?.mesNombre || mesNombre || 'ese mes';
  const lista = res?.resultados;
  if (Array.isArray(lista) && lista.length > 1) {
    const enviados = lista.filter(r => r.resultado === 'enviado');
    const personas = enviados.reduce((n, r) => n + (r.destinatarios || 0), 0);
    const sinCorreo = lista.filter(r => r.resultado === 'sin_destinatarios').length;
    const sinNada = lista.filter(r => r.resultado === 'sin_pendientes').length;
    const errores = lista.filter(r => r.resultado === 'error');
    if (errores.length) return { tipo: 'error', texto: `Hubo errores en ${errores.length} proceso(s): ${errores[0].error}` };
    if (!enviados.length) {
      if (sinNada && !sinCorreo) return { tipo: 'info', texto: `No se envió nada: ningún proceso tiene pendientes de ${mes}.` };
      if (sinCorreo) return { tipo: 'aviso', texto: `No se envió: ${sinCorreo} proceso(s) no tienen correos configurados en "Involucrados".` };
      return { tipo: 'info', texto: 'No había nada que notificar.' };
    }
    return { tipo: 'ok', texto: `Correo enviado a ${personas} persona(s) en ${enviados.length} proceso(s).` };
  }
  switch (res?.resultado) {
    case 'enviado':
      return { tipo: 'ok', texto: `Correo enviado a ${res.destinatarios} persona(s)${res.destino ? ` (${res.destino})` : ''}.` };
    case 'sin_destinatarios':
      return { tipo: 'aviso', texto: 'No se envió: este proceso no tiene correos en "Involucrados", o están con los avisos desactivados.' };
    case 'sin_pendientes':
      return { tipo: 'info', texto: `No se envió: no hay indicadores pendientes ni incumplimientos sin plan en ${mes}. El correo solo sale cuando hay algo que reportar.` };
    case 'error':
      return { tipo: 'error', texto: res.error || 'Ocurrió un error al enviar.' };
    default:
      return { tipo: 'info', texto: 'Operación realizada.' };
  }
}


/** Pilar de la estrategia ASG de un indicador ("Pilar 4: Reputación e Integridad"), tomado de su campo «Estrategia ASG».
 *  No depende de que alguien asigne categorías a mano: viene en el libro. */
const COLOR_PILAR = { 1: '#166534', 2: '#C9932B', 3: '#2F6FB0', 4: '#A91D3A' };
export function pilarDe(ind) {
  const m = String(ind?.estrategia_asg || '').match(/Pilar\s*(\d+)\s*:\s*(.*?)\s*(?=Tema\s*:|$)/i);
  if (!m) return { clave: 'zz-sin-pilar', label: 'Sin pilar', color: null };
  return { clave: `pilar-${m[1]}`, label: `Pilar ${m[1]}: ${m[2].trim()}`, color: COLOR_PILAR[m[1]] || null };
}
const TIPOS = [['cumplimiento', 'Cumplimiento', '#166534'], ['eficiencia', 'Eficiencia', '#C9932B'], ['eficacia', 'Eficacia', '#2F6FB0']];
export function tipoDe(ind) {
  const t = String(ind?.tipo_indicador || '').trim();
  const i = TIPOS.findIndex(x => x[0] === t.toLowerCase());
  if (!t) return { clave: 'z-sin-tipo', label: 'Sin tipo', color: null };
  return i >= 0 ? { clave: `${i}-${TIPOS[i][0]}`, label: TIPOS[i][1], color: TIPOS[i][2] } : { clave: `9-${t.toLowerCase()}`, label: t, color: null };
}

/** Datos completos para el Dashboard: cumplimiento global, evolución mes a
 *  mes, ranking por área y por categoría, y los indicadores extremos. */
/** Datos del Dashboard. Admite filtro por proceso y por rango de meses.
 *  Un mes "esperado" es uno ya vencido o con dato; el mes en curso sin dato todavía no cuenta.
 *  Hay DOS tipos de incumplimiento, que se cuentan por separado:
 *    - incumplenMeta: se registró el dato pero no alcanzó la meta
 *    - noDilig:       el mes venció y no se registró nada */
export async function getDashboard(anio, mesCorte, { procesoId = null, desde = 1, hasta = null, diaCierre = 15 } = {}) {
  const tope = Math.min(hasta || mesCorte, mesCorte);
  const ini = Math.max(1, desde);
  const [{ data: indicadores, error: e1 }, { data: procesos, error: e2 }] = await Promise.all([
    supabase.from('indicadores').select('*').eq('activo', true).order('orden'),
    supabase.from('indicadores_procesos').select('*').eq('activo', true).order('orden'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const inds = (indicadores || []).filter(i => !procesoId || i.proceso_id === Number(procesoId));
  const ids = inds.map(i => i.id);
  let registros = [];
  if (ids.length) {
    const { data, error } = await supabase.from('indicadores_registros').select('*').in('indicador_id', ids).eq('anio', anio);
    if (error) throw error;
    registros = data || [];
  }
  const regPorInd = new Map();
  for (const r of registros) {
    if (!regPorInd.has(r.indicador_id)) regPorInd.set(r.indicador_id, new Map());
    regPorInd.get(r.indicador_id).set(r.mes, r);
  }
  const procesoPorId = new Map((procesos || []).map(p => [p.id, p]));

  const estadoMes = (ind, m) => {
    const r = regPorInd.get(ind.id)?.get(m);
    if (r && r.valor != null) {
      const c = cumpleMeta(ind, r.valor, m);
      return { estado: c === true ? 'cumple' : c === false ? 'incumple' : 'sinmeta', r };
    }
    return { estado: mesVencido(anio, m, diaCierre) ? 'nodilig' : 'abierto' };
  };

  const agregar = lista => {
    const a = { indicadores: lista.length, esperados: 0, cumplen: 0, incumplenMeta: 0, noDilig: 0, sinMeta: 0, sinPlan: 0 };
    for (const ind of lista) {
      for (let m = ini; m <= tope; m++) {
        const { estado, r } = estadoMes(ind, m);
        if (estado === 'abierto') continue;
        a.esperados++;
        if (estado === 'cumple') a.cumplen++;
        else if (estado === 'incumple') { a.incumplenMeta++; if (!String(r?.accion || '').trim()) a.sinPlan++; }
        else if (estado === 'sinmeta') a.sinMeta++;
        else a.noDilig++;
      }
    }
    const evaluados = a.cumplen + a.incumplenMeta;
    const p = (n, d) => (d ? Math.round((n / d) * 100) : null);
    return { ...a, evaluados, faltantes: a.noDilig, pct: p(a.cumplen, evaluados),
      pctCumple: p(a.cumplen, a.esperados), pctIncumpleMeta: p(a.incumplenMeta, a.esperados), pctNoDilig: p(a.noDilig, a.esperados),
      pctDiligencia: a.esperados ? Math.round(((a.esperados - a.noDilig) / a.esperados) * 100) : null };
  };

  const global = agregar(inds);

  const evolucion = [];
  for (let m = 1; m <= 12; m++) {
    let evaluados = 0, cumplidos = 0, registrados = 0;
    for (const ind of inds) {
      const { estado } = estadoMes(ind, m);
      if (estado === 'cumple') { evaluados++; cumplidos++; registrados++; }
      else if (estado === 'incumple') { evaluados++; registrados++; }
      else if (estado === 'sinmeta') registrados++;
    }
    evolucion.push({ mes: m, pct: evaluados ? Math.round((cumplidos / evaluados) * 100) : null, registrados, total: inds.length, futuro: m > mesCorte, fuera: m < ini || m > tope,
      // mes todavía abierto: sus datos son parciales y no deben compararse con un mes completo
      abierto: !mesVencido(anio, m, diaCierre) });
  }

  const celda = (lista, m) => {
    let evaluados = 0, cumplidos = 0, registrados = 0, vencidosSinDato = 0, ultimo = null;
    for (const ind of lista) {
      const { estado, r } = estadoMes(ind, m);
      if (estado === 'cumple') { evaluados++; cumplidos++; registrados++; ultimo = { ind, r }; }
      else if (estado === 'incumple') { evaluados++; registrados++; ultimo = { ind, r }; }
      else if (estado === 'sinmeta') { registrados++; ultimo = { ind, r }; }
      else if (estado === 'nodilig') vencidosSinDato++;
    }
    return { mes: m, evaluados, cumplidos, registrados, total: lista.length, futuro: m > mesCorte, fuera: m < ini || m > tope,
      pct: evaluados ? Math.round((cumplidos / evaluados) * 100) : null,
      perdido: registrados === 0 && vencidosSinDato > 0,
      valorTexto: lista.length === 1 && ultimo ? formatearValor(ultimo.ind, ultimo.r.valor) : null };
  };
  const filasTipo = procesoId ? 'indicadores' : 'procesos';
  const matriz = (procesoId
    ? inds.map(ind => ({ id: ind.id, label: ind.nombre, indicadores: 1, meses: Array.from({ length: 12 }, (_, i) => celda([ind], i + 1)) }))
    : (procesos || []).map(p => ({ p, lista: inds.filter(i => i.proceso_id === p.id) })).filter(x => x.lista.length)
        .map(({ p, lista }) => ({ id: p.id, label: p.nombre, indicadores: lista.length, meses: Array.from({ length: 12 }, (_, i) => celda(lista, i + 1)) })));

  const agrupar = (claveDe, etiquetaDe, colorDe) => {
    const g = new Map();
    for (const ind of inds) {
      const k = claveDe(ind); if (k == null) continue;
      if (!g.has(k)) g.set(k, { clave: k, label: etiquetaDe(ind), color: colorDe ? colorDe(ind) : null, lista: [] });
      g.get(k).lista.push(ind);
    }
    return [...g.values()].map(x => ({ clave: x.clave, label: x.label, color: x.color, ...agregar(x.lista) })).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
  };
  const sinCat = i => !(i.categoria || '').trim();
  const porProceso = agrupar(i => i.proceso_id, i => procesoPorId.get(i.proceso_id)?.nombre || '—');
  const porCategoria = agrupar(i => (sinCat(i) ? '__sin_categoria__' : i.categoria.trim()), i => (sinCat(i) ? 'Sin categoría' : i.categoria.trim()), i => (sinCat(i) ? null : i.color_categoria));

  const porPilar = agrupar(i => pilarDe(i).clave, i => pilarDe(i).label, i => pilarDe(i).color).sort((a, b) => String(a.clave).localeCompare(String(b.clave)));
  const porTipo = agrupar(i => tipoDe(i).clave, i => tipoDe(i).label, i => tipoDe(i).color).sort((a, b) => String(a.clave).localeCompare(String(b.clave)));
  // una fila por indicador, con todo lo que hace falta para leerlo sin salir del Dashboard
  const tabla = inds.map(ind => {
    const a = agregar([ind]);
    const estados = [];
    for (let m = ini; m <= tope; m++) estados.push({ mes: m, estado: estadoMes(ind, m).estado });
    let ultimo = null;
    for (let m = tope; m >= ini && !ultimo; m--) { const { estado, r } = estadoMes(ind, m); if (r?.valor != null) ultimo = { mes: m, texto: formatearValor(ind, r.valor), estado }; }
    const p = pilarDe(ind), t = tipoDe(ind);
    return { id: ind.id, orden: ind.orden, nombre: ind.nombre, proceso: procesoPorId.get(ind.proceso_id)?.nombre || '—', pilar: p.label, pilarColor: p.color, tipo: t.label, tipoColor: t.color,
      meta: formatearMeta(ind), metaMensual: formatearMetaMensual(ind), ultimo, pct: a.pct, cumplen: a.cumplen, evaluados: a.evaluados, noDilig: a.noDilig, sinPlan: a.sinPlan, estados };
  });
  const actualizadoEn = registros.reduce((m, r) => { const t = r.actualizado_en || r.registrado_en || null; return t && (!m || t > m) ? t : m; }, null);

  const detalle = inds.map(ind => ({ ind, ...agregar([ind]) })).map(x => ({
    id: x.ind.id, nombre: x.ind.nombre, categoria: x.ind.categoria, color: x.ind.color_categoria,
    proceso: procesoPorId.get(x.ind.proceso_id)?.nombre || '—', pct: x.pct, incumplenMeta: x.incumplenMeta, noDilig: x.noDilig, evaluados: x.evaluados }));
  const conDato = detalle.filter(d => d.pct != null);
  const torta = (campo, cuantos = 7) => {
    const todos = detalle.filter(d => d[campo] > 0).sort((a, b) => b[campo] - a[campo]);
    const total = todos.reduce((n, d) => n + d[campo], 0);
    const cabeza = todos.slice(0, cuantos).map(d => ({ id: d.id, label: d.nombre, proceso: d.proceso, valor: d[campo] }));
    const resto = todos.slice(cuantos).reduce((n, d) => n + d[campo], 0);
    if (resto > 0) cabeza.push({ id: null, label: `Otros ${todos.length - cuantos} indicadores`, proceso: '', valor: resto });
    return { total, partes: cabeza.map(c => ({ ...c, pct: total ? Math.round((c.valor / total) * 1000) / 10 : 0 })) };
  };

  return {
    totalIndicadores: inds.length,
    totalProcesos: new Set(inds.map(i => i.proceso_id)).size,
    desde: ini, hasta: tope, filasTipo,
    pctGlobal: global.pct, pctDiligencia: global.pctDiligencia, faltantes: global.noDilig, sinPlan: global.sinPlan,
    acumulado: global,
    evolucion, matriz, porProceso, porCategoria, porPilar, porTipo, tabla, actualizadoEn,
    mejores: [...conDato].sort((a, b) => b.pct - a.pct).slice(0, 5),
    peores: [...conDato].sort((a, b) => a.pct - b.pct).slice(0, 5),
    torta: { meta: torta('incumplenMeta'), dilig: torta('noDilig') },
  };
}


/** Publica el logo en Supabase Storage y devuelve su dirección pública,
 *  para comprobar desde la app que los correos podrán mostrarlo. */
export async function verificarLogoCorreo() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Debes iniciar sesión.');
  const resp = await fetch('/api/enviar-recordatorios-indicadores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ accion: 'logo' }),
  });
  if (resp.status === 404) throw new Error('Las funciones no están activas aquí: usa "npm run preview:api" o despliega en Cloudflare Pages.');
  const texto = await resp.text();
  let data = {};
  try { data = JSON.parse(texto); } catch { throw new Error('Respuesta inesperada del servidor.'); }
  if (!resp.ok) throw new Error(data.error || 'No se pudo verificar el logo.');
  return data;
}


// --- Indicadores nuevos y baja -------------------------------------------------

/** Crea un indicador nuevo. Aparece solo en la lista, la matriz, el dashboard y los informes. */
export async function crearIndicador(datos) {
  const { data: ultimo, error: e0 } = await supabase.from('indicadores').select('orden').order('orden', { ascending: false }).limit(1);
  if (e0) throw e0;
  const orden = ((ultimo && ultimo[0] && ultimo[0].orden) || 0) + 1;
  const { error } = await supabase.from('indicadores').insert({ ...datos, orden, activo: true });
  if (error) throw error;
  return orden;
}

/** Da de baja un indicador sin borrar su historial (deja de verse en matriz, lista y dashboard). */
export async function desactivarIndicador(id) {
  const { error } = await supabase.from('indicadores').update({ activo: false }).eq('id', id);
  if (error) throw error;
}

// --- Tendencia ------------------------------------------------------------------

/** Recta de tendencia (mínimos cuadrados) sobre los meses con dato. Con menos de 3 puntos
 *  devuelve null: no hay una tendencia que valga la pena afirmar. */
export function tendenciaLineal(puntos) {
  const p = puntos.filter(q => q.y != null);
  if (p.length < 3) return null;
  const n = p.length, sx = p.reduce((a, q) => a + q.x, 0), sy = p.reduce((a, q) => a + q.y, 0);
  const sxx = p.reduce((a, q) => a + q.x * q.x, 0), sxy = p.reduce((a, q) => a + q.x * q.y, 0);
  const den = n * sxx - sx * sx;
  if (!den) return null;
  const pendiente = (n * sxy - sx * sy) / den;
  return { pendiente, intercepto: (sy - pendiente * sx) / n, n };
}

// --- Roles --------------------------------------------------------------------

export const ROLES = {
  admin: { nombre: 'Administrador', descripcion: 'Todo: configuración, cierres, usuarios, dashboard, novedades, importación y correos.' },
  digitador: { nombre: 'Digitador', descripcion: 'Registra datos de los indicadores (a mano o con Excel) y consulta matriz e informes. No configura.' },
  ingeniero: { nombre: 'Ingeniero', descripcion: 'Solo consulta, con sus procesos asignados a la vista. Entra con el usuario que le crea un administrador y un PIN.' },
  usuario: { nombre: 'Usuario', descripcion: 'Solo consulta: indicadores, matriz e informes. Entra con su cédula y un PIN que genera la aplicación.' },
};


/** Convierte los errores técnicos de la base en mensajes que una persona entiende. */
export function traducirError(e) {
  const m = (e && e.message) || String(e || '');
  if (/column .* does not exist|could not find the .* column|schema cache/i.test(m)) return 'Falta ejecutar la actualización de la base de datos (el SQL de la versión nueva). Pídele a quien administra que lo ejecute en Supabase → SQL Editor y vuelve a intentar.';
  if (/row-level security|permission denied/i.test(m)) return 'Tu rol no tiene permiso para hacer esto. Si crees que es un error, pídele a un administrador que revise tu rol.';
  if (/plan_accion_obligatorio/i.test(m)) return 'El plan de acción es obligatorio.';
  if (/está cerrado/i.test(m)) return m;
  if (/invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/email not confirmed/i.test(m)) return 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada.';
  if (/duplicate key|unique constraint/i.test(m)) return 'Ya existe un registro con esos datos.';
  if (/jwt|token.*expired|not authenticated/i.test(m)) return 'Tu sesión venció. Cierra sesión y vuelve a entrar.';
  if (/failed to fetch|networkerror|load failed/i.test(m)) return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
  return m;
}


/** Todos los registros de un año con su análisis y plan (para comparar con un libro de Excel). */
export async function getRegistrosAnioCompletos(anio) {
  const { data, error } = await supabase.from('indicadores_registros').select('indicador_id, anio, mes, valor, analisis, accion').eq('anio', anio).limit(5000);
  if (error) throw error;
  return data || [];
}


// ---------------------------------------------------------------------------------------------
// Bitácora, accesos y espacio (solo administradores; la base lo hace cumplir)
// ---------------------------------------------------------------------------------------------

/** Actividad: quién cambió qué. `tipos` filtra por clase de cambio; `desde` es una fecha ISO. */
export async function getAuditoria({ tipos = null, desde = null, limite = 60, soloAccesos = false } = {}) {
  let q = supabase.from('indicadores_auditoria').select('*').order('creado_en', { ascending: false }).limit(limite);
  if (soloAccesos) q = q.eq('tipo', 'acceso');
  else if (tipos && tipos.length) q = q.in('tipo', tipos);
  else q = q.neq('tipo', 'acceso');
  if (desde) q = q.gte('creado_en', desde);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/** Quién está en línea: la última actividad es de hace menos de 3 minutos. */
export async function getPresencia() {
  const { data, error } = await supabase.from('indicadores_presencia').select('*').order('ultima_actividad', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAlmacenamiento() {
  const { data, error } = await supabase.rpc('indicadores_almacenamiento');
  if (error) throw error;
  return data;
}

export async function guardarLimiteAlmacenamiento(mb) {
  const { error } = await supabase.from('indicadores_configuracion').update({ almacenamiento_limite_mb: mb }).eq('id', 1);
  if (error) throw error;
}


/** ¿El resultado pasó la meta máxima (la banda del Excel, p. ej. 95 % a 110 %)? No cambia si cumple: es una señal de que se excedió. */
export function superaMaximo(ind, valor) {
  return ind?.meta_maxima != null && valor != null && Number(valor) > Number(ind.meta_maxima) + 1e-12;
}


/** Cómo va el mes por proceso, para la pantalla de inicio del celular: cuántos indicadores hay, cuántos ya se registraron y cómo van contra su meta. */
export async function getResumenMes(anio, mes) {
  const [inds, procs, regs, cierres, cfg] = await Promise.all([
    getIndicadores(), getProcesos(),
    supabase.from('indicadores_registros').select('indicador_id, valor, accion').eq('anio', anio).eq('mes', mes).then(r => { if (r.error) throw r.error; return r.data || []; }),
    getCierresDelAnio(anio), getConfiguracionNotificaciones().catch(() => null),
  ]);
  const reg = new Map(regs.map(r => [r.indicador_id, r]));
  const t = { indicadores: 0, registrados: 0, cumplen: 0, noCumplen: 0, pendientes: 0, sinPlan: 0 };
  const porProceso = procs.map(p => {
    const lista = inds.filter(i => i.proceso_id === p.id);
    const items = lista.map(i => {
      const r = reg.get(i.id), v = r?.valor;
      if (v == null) return { id: i.id, nombre: i.nombre, estado: 'pendiente' };
      const c = cumpleMeta(i, v, mes);
      return { id: i.id, nombre: i.nombre, estado: c === true ? 'cumple' : c === false ? 'no' : 'sinmeta', sinPlan: c === false && !String(r.accion || '').trim() };
    });
    const x = { id: p.id, nombre: p.nombre, total: items.length, items };
    x.registrados = items.filter(i => i.estado !== 'pendiente').length; x.cumplen = items.filter(i => i.estado === 'cumple').length;
    x.noCumplen = items.filter(i => i.estado === 'no').length; x.pendientes = x.total - x.registrados;
    return x;
  }).filter(p => p.total > 0);
  for (const p of porProceso) { t.indicadores += p.total; t.registrados += p.registrados; t.cumplen += p.cumplen; t.noCumplen += p.noCumplen; t.pendientes += p.pendientes; t.sinPlan += p.items.filter(i => i.sinPlan).length; }
  const diaCierre = cfg?.dia_cierre ?? 15;
  return { anio, mes, porProceso, totales: t, diaCierre, cerrado: estaCerrado(anio, mes, cierres, diaCierre) };
}
