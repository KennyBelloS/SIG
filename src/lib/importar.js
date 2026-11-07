import {
  MESES, esPorcentaje, formatearValor, guardarRegistro, crearIndicador, estaCerrado, traducirError,
} from './indicadores';

/* Importación desde Excel (.xlsx).
   Principio: el archivo NUNCA escribe nada sin pasar antes por una vista previa en la que
   cada fila aparece como válida o con su error. Se aplican las mismas reglas que al
   registrar a mano: plan de acción obligatorio y meses cerrados bloqueados. */

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILAS = 2000;

/** Normaliza texto para comparar: sin tildes, minúsculas y espacios simples. */
export const norm = t => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const vacio = v => v == null || String(v).trim() === '';
const texto = v => (vacio(v) ? null : String(v).trim());

// --- Plantilla ----------------------------------------------------------------

export async function descargarPlantilla({ indicadores, procesos, anio, mes }) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const procesoNombre = new Map(procesos.map(p => [p.id, p.nombre]));
  const cab = (v, fondo = '#166534') => ({ value: v, fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: fondo, wrap: true, alignVertical: 'center' });
  const fijo = v => ({ value: v, backgroundColor: '#F2F0E8', textColor: '#4F5753' });

  const instrucciones = [
    [{ value: 'Cómo usar esta plantilla', fontWeight: 'bold', fontSize: 15 }],
    [null],
    ['1. Hoja "Registros": ya trae los indicadores del mes elegido. Completa solo Valor, Análisis, Causa y Plan de acción.'],
    ['2. El Plan de acción es OBLIGATORIO en cada fila con valor.'],
    ['3. Indicadores en %: escribe el porcentaje con el símbolo (95%) o como número entero (95). Un número menor a 2 se toma como fracción (0,95 = 95 %).'],
    ['4. Las filas sin Valor, Análisis, Causa ni Plan se ignoran.'],
    ['5. Los meses cerrados no se pueden importar: pide a un administrador que los reabra.'],
    ['6. Hoja "Indicadores nuevos" (solo administradores): una fila por indicador. Proceso debe coincidir con un proceso existente.'],
    ['7. Antes de guardar nada, la aplicación te muestra una vista previa con los errores de cada fila.'],
  ];
  const registros = [
    ['Indicador', 'Proceso', 'Año', 'Mes', 'Valor', 'Análisis', 'Causa (por qué cumplió o no cumplió)', 'Plan de acción'].map(v => cab(v)),
    ...indicadores.map(i => [fijo(i.nombre), fijo(procesoNombre.get(i.proceso_id) || ''), fijo(anio), fijo(mes), null, null, null, null]),
  ];
  const nuevos = [
    ['Proceso', 'Nombre', 'Unidad de medida', 'Tipo (Cumplimiento / Eficacia / Eficiencia)', 'Meta anual', 'Meta mensual', 'Tipo de meta (Anual / Mensual)',
      'Sentido (Mayor es mejor / Menor es mejor)', 'Frecuencia de medición', 'Frecuencia de seguimiento', 'Responsable', 'Fuente de información', 'Categoría', 'Objetivo', 'Fórmula'].map(v => cab(v, '#0F3D22')),
  ];
  await writeExcelFile([
    { data: instrucciones, sheet: 'Instrucciones', columns: [{ width: 120 }] },
    { data: registros, sheet: 'Registros', columns: [{ width: 46 }, { width: 24 }, { width: 8 }, { width: 6 }, { width: 12 }, { width: 44 }, { width: 40 }, { width: 44 }], stickyRowsCount: 1 },
    { data: nuevos, sheet: 'Indicadores nuevos', columns: Array.from({ length: 15 }, (_, i) => ({ width: i === 1 || i >= 13 ? 36 : 20 })), stickyRowsCount: 1 },
  ]).toFile(`Plantilla indicadores ${MESES[mes - 1]} ${anio}.xlsx`);
}

// --- Lectura -------------------------------------------------------------------

function tabla(hoja) {
  if (!hoja || !hoja.data || hoja.data.length < 2) return [];
  const [cab, ...filas] = hoja.data;
  const claves = cab.map(norm);
  return filas
    .map((f, i) => ({ fila: i + 2, ...Object.fromEntries(claves.map((k, j) => [k, f[j]])) }))
    .filter(o => Object.entries(o).some(([k, v]) => k !== 'fila' && !vacio(v)));
}

/** Lee el libro y devuelve las filas de "Registros" y de "Indicadores nuevos". */
export async function leerLibro(archivo) {
  if (!/\.xlsx$/i.test(archivo.name)) throw new Error('El archivo debe ser .xlsx. Si es .xls o .csv, ábrelo en Excel y guárdalo como .xlsx.');
  if (archivo.size > MAX_BYTES) throw new Error('El archivo pesa más de 5 MB.');
  let hojas;
  try {
    const { default: leer } = await import('read-excel-file/browser');
    hojas = await leer(archivo);
  } catch {
    throw new Error('No se pudo leer el archivo. Verifica que sea un .xlsx válido y que no esté protegido con contraseña.');
  }
  const hoja = (...nombres) => hojas.find(h => nombres.includes(norm(h.sheet)));
  const registros = tabla(hoja('registros'));
  const nuevos = tabla(hoja('indicadores nuevos', 'indicadores'));
  if (registros.length + nuevos.length > MAX_FILAS) throw new Error(`El archivo tiene más de ${MAX_FILAS} filas.`);
  return { registros, nuevos, hojas: hojas.map(h => h.sheet) };
}

// --- Validación de valores ---------------------------------------------------------

/** Convierte lo que viene en la celda en el valor que se guarda. Para indicadores en %:
 *  "95%" o 95 -> 0,95; un número menor a 2 (0,95 ó 1,22) ya es la fracción. */
export function interpretarValor(ind, crudo) {
  if (vacio(crudo)) return { error: 'Falta el valor' };
  let n, simbolo = false;
  if (typeof crudo === 'number') n = crudo;
  else {
    const t = String(crudo).trim();
    simbolo = t.includes('%');
    n = Number(t.replace('%', '').replace(/\s/g, '').replace(',', '.'));
  }
  if (!Number.isFinite(n)) return { error: `"${crudo}" no es un número` };
  if (!esPorcentaje(ind)) return { valor: n };
  if (simbolo) return { valor: n / 100, nota: `${n} %` };
  if (n >= 2) return { valor: n / 100, nota: `${n} se tomó como ${n} %` };
  if (n > 1) return { valor: n, nota: `${n} se tomó como ${Math.round(n * 1000) / 10} % (si querías ${n} %, escríbelo con el símbolo: ${n}%)` };
  return { valor: n };
}

function interpretarMes(v) {
  if (typeof v === 'number' && v >= 1 && v <= 12) return Math.round(v);
  const t = norm(v); if (!t) return null;
  const n = Number(t); if (Number.isInteger(n) && n >= 1 && n <= 12) return n;
  const i = MESES.findIndex(m => norm(m) === t || norm(m).slice(0, 3) === t);
  return i >= 0 ? i + 1 : null;
}

// --- Registros mensuales ---------------------------------------------------------

/** Valida cada fila de la hoja "Registros". No guarda nada. */
export function validarRegistros(filas, indicadores, { cierresPorAnio = new Map(), diaCierre = 15 } = {}) {
  const porNombre = new Map(indicadores.map(i => [norm(i.nombre), i]));
  const vistos = new Map();
  const salida = [];
  for (const f of filas) {
    const tieneContenido = ['valor', 'analisis', 'causa (por que cumplio o no cumplio)', 'causa', 'plan de accion'].some(k => !vacio(f[k]));
    if (!tieneContenido) continue; // fila de la plantilla sin diligenciar: se ignora
    const errores = [];
    const ind = porNombre.get(norm(f.indicador));
    if (!ind) errores.push(`No existe un indicador llamado "${f.indicador ?? ''}"`);
    const anio = Number(f.ano ?? f.anio);
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) errores.push('El año no es válido');
    const mes = interpretarMes(f.mes);
    if (!mes) errores.push('El mes no es válido (1 a 12 o su nombre)');
    const accion = texto(f['plan de accion']);
    if (!accion) errores.push('El plan de acción es obligatorio');
    let valor = null, nota = null;
    if (ind) {
      const r = interpretarValor(ind, f.valor);
      if (r.error) errores.push(r.error); else { valor = r.valor; nota = r.nota || null; }
    }
    if (ind && Number.isInteger(anio) && mes) {
      if (estaCerrado(anio, mes, cierresPorAnio.get(anio) || [], diaCierre)) errores.push(`${MESES[mes - 1]} ${anio} está cerrado; un administrador debe reabrirlo`);
      const clave = `${ind.id}|${anio}|${mes}`;
      if (vistos.has(clave)) errores.push(`Repetido: ya aparece en la fila ${vistos.get(clave)}`); else vistos.set(clave, f.fila);
    }
    salida.push({
      fila: f.fila, ok: errores.length === 0, errores, nota,
      indicador: ind?.nombre || String(f.indicador ?? ''), anio, mes,
      valorTexto: ind && valor != null ? formatearValor(ind, valor) : '—',
      datos: ind && errores.length === 0 ? {
        indicador_id: ind.id, anio, mes, valor, analisis: texto(f.analisis), causa: texto(f['causa (por que cumplio o no cumplio)']) || texto(f.causa), accion,
      } : null,
    });
  }
  return salida;
}

/** Guarda las filas válidas, una a una; una fila con problema no frena a las demás. */
export async function aplicarRegistros(validas, registradoPor) {
  let guardadas = 0; const fallos = [];
  for (const v of validas.filter(x => x.ok)) {
    try { await guardarRegistro({ ...v.datos, plan_sugerido: false, registrado_por: `${registradoPor} (Excel)` }); guardadas++; }
    catch (e) { fallos.push({ fila: v.fila, indicador: v.indicador, mensaje: traducirError(e) }); }
  }
  return { guardadas, fallos };
}

// --- Indicadores nuevos -----------------------------------------------------------------

const FREC = ['mensual', 'trimestral', 'semestral', 'anual'];
const FREC_SEG = ['mensual', 'bimestral', 'trimestral', 'semestral', 'anual'];

/** Valida cada fila de la hoja "Indicadores nuevos". No guarda nada. */
export function validarIndicadoresNuevos(filas, procesos, indicadores) {
  const procPorNombre = new Map(procesos.map(p => [norm(p.nombre), p]));
  const existentes = new Set(indicadores.map(i => norm(i.nombre)));
  const vistos = new Set();
  const salida = [];
  for (const f of filas) {
    const errores = [];
    const proc = procPorNombre.get(norm(f.proceso));
    if (!proc) errores.push(`El proceso "${f.proceso ?? ''}" no existe. Procesos válidos: ${procesos.map(p => p.nombre).join(', ')}`);
    const nombre = texto(f.nombre);
    if (!nombre) errores.push('Falta el nombre'); else {
      if (existentes.has(norm(nombre))) errores.push('Ya existe un indicador con ese nombre');
      if (vistos.has(norm(nombre))) errores.push('Nombre repetido en el archivo');
      vistos.add(norm(nombre));
    }
    const unidad = texto(f['unidad de medida']);
    const fake = { unidad_medida: unidad };
    const meta = (crudo, etiqueta) => {
      if (vacio(crudo)) return null;
      const r = interpretarValor(fake, crudo);
      if (r.error) { errores.push(`${etiqueta}: ${r.error}`); return null; }
      return r.valor;
    };
    const metaAnual = meta(f['meta anual'], 'Meta anual');
    const metaMensual = meta(f['meta mensual'], 'Meta mensual');
    const tmeta = norm(f['tipo de meta (anual / mensual)'] ?? f['tipo de meta']);
    const tipoMeta = tmeta === 'anual' ? 'anual' : tmeta === 'mensual' ? 'mensual' : null;
    if (tmeta && !tipoMeta) errores.push('Tipo de meta debe ser Anual o Mensual');
    const sent = norm(f['sentido (mayor es mejor / menor es mejor)'] ?? f.sentido);
    const sentido = sent.startsWith('menor') ? 'menor_mejor' : 'mayor_mejor';
    const fr = norm(f['frecuencia de medicion']) || 'mensual';
    if (!FREC.includes(fr)) errores.push(`Frecuencia de medición debe ser: ${FREC.join(', ')}`);
    const fs = norm(f['frecuencia de seguimiento']) || null;
    if (fs && !FREC_SEG.includes(fs)) errores.push(`Frecuencia de seguimiento debe ser: ${FREC_SEG.join(', ')}`);
    if (metaAnual == null && metaMensual == null) errores.push('Falta la meta (anual o mensual)');
    const tipoRaw = norm(f['tipo (cumplimiento / eficacia / eficiencia)'] ?? f.tipo);
    const tipo = ['cumplimiento', 'eficacia', 'eficiencia'].includes(tipoRaw) ? tipoRaw[0].toUpperCase() + tipoRaw.slice(1) : null;
    salida.push({
      fila: f.fila, ok: errores.length === 0, errores, nombre: nombre || '', proceso: proc?.nombre || String(f.proceso ?? ''),
      meta: metaAnual != null ? formatearValor(fake, metaAnual) : metaMensual != null ? formatearValor(fake, metaMensual) : '—',
      datos: errores.length === 0 ? {
        proceso_id: proc.id, nombre, unidad_medida: unidad, tipo_indicador: tipo, meta_anual: metaAnual, meta_mensual: metaMensual, tipo_meta: tipoMeta,
        sentido_meta: sentido, frecuencia: fr, frecuencia_seguimiento: fs, responsable_medicion: texto(f.responsable), fuente_informacion: texto(f['fuente de informacion']),
        categoria: texto(f.categoria), color_categoria: null, objetivo: texto(f.objetivo), formula_calculo: texto(f.formula),
      } : null,
    });
  }
  return salida;
}

export async function aplicarIndicadores(validas) {
  let creados = 0; const fallos = [];
  for (const v of validas.filter(x => x.ok)) {
    try { await crearIndicador(v.datos); creados++; }
    catch (e) { fallos.push({ fila: v.fila, indicador: v.nombre, mensaje: traducirError(e) }); }
  }
  return { creados, fallos };
}
