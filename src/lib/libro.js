/* Lectura del libro original "Indicadores de Gestión" (Excel) y plan de importación.
 *
 * El libro tiene una hoja "Indicadores" (el catálogo: una fila por indicador) y una hoja por indicador
 * con su meta mensual, los valores de cada mes y el análisis y plan de acción escritos.
 *
 * Todo se lee por ETIQUETAS ("NOMBRE DEL INDICADOR", "Enero", "Indicador", "MES"…) y no por posiciones fijas,
 * porque de una hoja a otra las filas se corren. Las reglas se verificaron contra los 42 indicadores y los
 * 248 registros que ya estaban cargados: coinciden valor por valor, análisis por análisis y plan por plan.
 */

import { CALCULOS, calcularValor } from './calculo.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Texto comparable: sin tildes, sin ², en minúsculas y con espacios simples. */
export const normalizar = t => String(t ?? '').replace(/²/g, '2').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const limpio = t => (t == null ? '' : String(t).replace(/\s+/g, ' ').trim());
const numero = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const celda = (datos, r, c) => (datos[r - 1] ? datos[r - 1][c - 1] ?? null : null);

/** Busca la primera celda que cumple `pred`; devuelve [fila, columna] (base 1). */
function buscar(datos, pred, desde = 1, hasta = datos.length, cMax = 20) {
  for (let r = desde; r <= Math.min(hasta, datos.length); r++) {
    const fila = datos[r - 1] || [];
    for (let c = 1; c <= Math.min(cMax, fila.length); c++) {
      const v = fila[c - 1];
      if (v != null && v !== '' && pred(normalizar(v))) return [r, c];
    }
  }
  return null;
}

/** ¿Es el libro original? (tiene la hoja "Indicadores" con su encabezado) */
export function esLibroOriginal(hojas) {
  const h = hojas.find(x => normalizar(x.sheet) === 'indicadores');
  return !!h && !!buscar(h.data, t => t.startsWith('nombre del indicador'), 1, 15);
}

const COLUMNAS_CATALOGO = [
  ['directriz', t => t.startsWith('directriz')],
  ['estrategia_asg', t => t.startsWith('estrategia')],
  ['objetivo', t => t === 'objetivo'],
  ['nombre', t => t.startsWith('nombre del indicador')],
  ['unidad_medida', t => t.startsWith('unidad de medida')],
  ['tipo_indicador', t => t.startsWith('tipo de indicador')],
  ['meta', t => t === 'meta'],
  ['frecuencia', t => t.startsWith('frecuencia')],
  ['responsable_medicion', t => t.startsWith('responsable')],
  ['procesos_relacionados', t => t.startsWith('procesos relacionados')],
  ['fuente_informacion', t => t.startsWith('fuente')],
];

function leerCatalogo(datos) {
  const enc = buscar(datos, t => t.startsWith('nombre del indicador'), 1, 15);
  if (!enc) return [];
  const [rEnc] = enc;
  const col = {};
  for (let c = 1; c <= (datos[rEnc - 1] || []).length; c++) {
    const t = normalizar(celda(datos, rEnc, c));
    if (!t) continue;
    for (const [campo, pred] of COLUMNAS_CATALOGO) if (!(campo in col) && pred(t)) col[campo] = c;
  }
  const filas = [];
  for (let r = rEnc + 1; r <= datos.length; r++) {
    const nombre = limpio(celda(datos, r, col.nombre));
    if (!nombre) { if (filas.length) break; else continue; }
    const f = {};
    for (const [campo] of COLUMNAS_CATALOGO) f[campo] = col[campo] ? limpio(celda(datos, r, col[campo])) : '';
    f.meta_anual = numero(celda(datos, r, col.meta));   // "—" y textos quedan como "sin meta numérica"
    delete f.meta;
    f.frecuencia = normalizar(f.frecuencia) || 'mensual';
    filas.push(f);
  }
  return filas;
}

/** Valor que está justo debajo de una etiqueta de la cabecera de una hoja de indicador. */
function bajoEtiqueta(datos, pred, hasta = 15) {
  const p = buscar(datos, pred, 1, hasta);
  return p ? celda(datos, p[0] + 1, p[1]) : null;
}

function leerHojaIndicador(nombreHoja, datos) {
  const nombre = limpio(bajoEtiqueta(datos, t => t.startsWith('nombre del indicador')));
  if (!nombre) return null;
  const cab = buscar(datos, t => t === 'enero', 16, 60);
  if (!cab) return { hoja: nombreHoja, nombre, error: 'No encontré la fila de los meses.' };
  const [rCab, cEne] = cab;
  const cols = Array.from({ length: 12 }, (_, i) => cEne + i);
  const mesesOk = cols.every((c, i) => normalizar(celda(datos, rCab, c)).startsWith(MESES[i].slice(0, 3)));
  if (!mesesOk) return { hoja: nombreHoja, nombre, error: 'Los meses no están en columnas seguidas.' };

  // filas bajo la cabecera de meses, identificadas por su etiqueta (columna anterior a "Enero")
  const etiquetas = new Map(), textos = new Map();
  for (let r = rCab + 1; r <= rCab + 9; r++) {
    const t = normalizar(celda(datos, r, cEne - 1));
    if (t && !etiquetas.has(t)) { etiquetas.set(t, r); textos.set(t, limpio(celda(datos, r, cEne - 1))); }
  }
  const filaDe = (...claves) => { for (const [t, r] of etiquetas) if (claves.some(k => (k.endsWith('$') ? t === k.slice(0, -1) : t.startsWith(k)))) return r; return null; };
  const rVal = filaDe('indicador$', 'resultado', 'real$');
  const rMeta = filaDe('minimo', 'meta$');
  const valores = cols.map(c => (rVal ? numero(celda(datos, rVal, c)) : null));
  const metas = cols.map(c => (rMeta ? numero(celda(datos, rMeta, c)) : null));
  const rMax = filaDe('maximo');
  const maximas = cols.map(c => (rMax ? numero(celda(datos, rMax, c)) : null));

  // tabla de análisis: columna "MES", y a la derecha el análisis y el "PLAN DE ACCIÓN"
  const analisis = Array(12).fill(''), plan = Array(12).fill('');
  const tabla = buscar(datos, t => t === 'mes', rCab + 3, rCab + 14, 4);
  if (tabla) {
    const [rT, cT] = tabla;
    let cPlan = null;
    for (let c = cT + 2; c <= 20; c++) if (normalizar(celda(datos, rT, c)).includes('plan de accion')) { cPlan = c; break; }
    for (let i = 0; i < 12; i++) {
      const r = rT + 1 + i;
      if (normalizar(celda(datos, r, cT)).startsWith(MESES[i].slice(0, 3))) {
        analisis[i] = limpio(celda(datos, r, cT + 1));
        plan[i] = cPlan ? limpio(celda(datos, r, cPlan)) : '';
      }
    }
  }
  // filas de apoyo (planeadas/ejecutadas, numerador/denominador, año anterior/actual) y la fórmula que el libro aplicó
  const rPlan = filaDe('planeada', 'planeado'), rEjec = filaDe('ejecutada', 'ejecutado'), rNum = filaDe('numerador'), rDen = filaDe('denominador'), r25 = filaDe('2025'), r26 = filaDe('2026');
  let par = null;
  if (rPlan && rEjec) par = { tipo: 'ejecucion', a: rPlan, b: rEjec };
  else if (rNum && rDen) par = { tipo: 'razon', a: rNum, b: rDen };
  else if ((r25 || rNum) && r26) par = { tipo: 'anio', a: r25 || rNum, b: r26 };
  else { const rNP = filaDe('n personal', 'n° personal', 'numero de personal', 'n. personal'), rCal = filaDe('calificacion'); if (rNP && rCal) par = { tipo: 'apoyo', a: rNP, b: rCal }; }
  const A = par ? cols.map(c => numero(celda(datos, par.a, c))) : null, B = par ? cols.map(c => numero(celda(datos, par.b, c))) : null;
  let errores = 0;
  for (const r of [rVal, par?.a, par?.b]) if (r) for (const c of cols) { const v = celda(datos, r, c); if (typeof v === 'string' && v.startsWith('#')) errores++; }
  return { hoja: nombreHoja, nombre, formula_calculo: limpio(bajoEtiqueta(datos, t => t.startsWith('formula de calculo'))), valores, metas, maximas, analisis, plan, par, A, B, errores, textoA: par ? textos.get([...etiquetas].find(([, r]) => r === par.a)?.[0]) : null, textoB: par ? textos.get([...etiquetas].find(([, r]) => r === par.b)?.[0]) : null, formulaInferida: par ? inferirFormula(A, B, valores, metas) : null };
}

/** Meta mensual del libro (fila "Mínimos"): solo cuenta si difiere de la meta anual. Los ceros no son una meta. */
function metaMensualDe(metas, metaAnual) {
  const con = metas.map((m, i) => [i + 1, m]).filter(([, m]) => m != null && m !== 0);
  if (!con.length) return {};
  const difiere = con.some(([, m]) => metaAnual == null || Math.abs(m - metaAnual) > 1e-9);
  if (!difiere) return {};
  const unicos = new Set(con.map(([, m]) => Number(m.toPrecision(12))));
  if (unicos.size === 1) return { meta_mensual: [...unicos][0], tipo_meta: 'mensual' };
  return { metas_mensuales: Object.fromEntries(con.map(([mes, m]) => [String(mes), m])) };
}

/** Un mes cuenta como REPORTADO si tiene valor y (el valor no es cero o ese mes tiene análisis o plan escritos).
 *  El libro rellena con 0 los meses que aún no se reportan; un 0 sin ningún texto es ese relleno.
 *  Un mes con texto pero sin valor se conserva, como registro sin valor. */
function registrosDe(h) {
  const out = [];
  let ceros = 0;
  for (let i = 0; i < 12; i++) {
    const v = h.valores[i], a = h.analisis[i], p = h.plan[i];
    if (v != null && (v !== 0 || a || p)) out.push({ mes: i + 1, valor: v, analisis: a, accion: p });
    else if (a || p) out.push({ mes: i + 1, valor: null, analisis: a, accion: p });
    else if (v === 0) ceros++;
  }
  return { registros: out, cerosIgnorados: ceros };
}

const CANDIDATAS = {
  'b/a': (a, b) => (a > 0 ? b / a : null), 'a/b': (a, b) => (b > 0 ? a / b : null),
  '(b-a)/a': (a, b) => (a > 0 ? (b - a) / a : null), '(a-b)/a': (a, b) => (a > 0 ? (a - b) / a : null),
  '(a-b)/b': (a, b) => (b > 0 ? (a - b) / b : null), '(b-a)/b': (a, b) => (b > 0 ? (b - a) / b : null),
  '(a/b)/b': (a, b) => (b > 0 ? (a / b) / b : null),
};
const TEXTO_FORMULA = { 'b/a': 'ejecutadas ÷ planeadas', 'a/b': 'numerador ÷ denominador', '(b-a)/a': '(año actual − año anterior) ÷ año anterior', '(a-b)/a': '(año anterior − año actual) ÷ año anterior', '(a-b)/b': '(planeado − ejecutado) ÷ ejecutado', '(b-a)/b': '(denominador − numerador) ÷ denominador', '(a/b)/b': '(año anterior ÷ año actual) ÷ año actual', 'meta*b': 'la meta mensual × el valor del año actual' };

/** El libro trae solo los resultados ya calculados, no las fórmulas: se deduce cuál se aplicó probándolas contra los números. */
function inferirFormula(A, B, valores, metas) {
  const comp = valores.map((v, i) => ({ v, a: A[i], b: B[i], m: metas[i] })).filter(x => x.v != null && x.a != null && x.b != null);
  if (comp.length < 2) return null;
  for (const [k, f] of Object.entries(CANDIDATAS)) {
    if (comp.every(x => { const r = f(x.a, x.b); return r != null && Math.abs(r - x.v) <= 1e-6 * Math.max(1, Math.abs(x.v)); })) return k;
  }
  if (comp.every(x => x.m != null && Math.abs(x.m * x.b - x.v) <= 1e-6)) return 'meta*b';
  return null;
}

/** Qué forma de cálculo le corresponde a un indicador y si la fórmula del libro estaba mal. Solo se reconoce lo que tiene sentido. */
function decidirCalculo(h, ind) {
  const f = h.formulaInferida, par = h.par;
  if (!par || !f) return { calculo: 'directo' };
  const pct = /%/.test(ind.unidad_medida || '');
  if (par.tipo === 'ejecucion' && f === 'b/a') return { calculo: 'ejecucion', corregida: false };
  if (par.tipo === 'ejecucion' && f === '(a-b)/b') return { calculo: 'ejecucion', corregida: true, formulaLibro: '(Planeadas − Ejecutadas) ÷ Ejecutadas' };
  if (par.tipo === 'razon' && f === 'a/b') return { calculo: 'razon', corregida: false };
  if (par.tipo === 'anio' && pct && f === '(b-a)/a') return { calculo: 'reduccion', corregida: true, formulaLibro: '(Año actual − Año anterior) ÷ Año anterior' };
  if (par.tipo === 'anio' && pct && f === '(a/b)/b') return { calculo: 'reduccion', corregida: true, formulaLibro: '(Año anterior ÷ Año actual) ÷ Año actual' };
  return { calculo: 'directo', dudosa: TEXTO_FORMULA[f] };
}

/** Parecido entre dos textos (0 a 1), por pares de letras: tolera erratas como "Adquisión" por "Adquisición". */
function parecido(a, b) {
  const x = normalizar(a), y = normalizar(b);
  if (x === y) return 1;
  const pares = t => { const m = new Map(); for (let i = 0; i < t.length - 1; i++) { const k = t.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; };
  const A = pares(x), B = pares(y); let comun = 0;
  for (const [k, v] of A) comun += Math.min(v, B.get(k) || 0);
  return (2 * comun) / Math.max(1, x.length - 1 + (y.length - 1));
}

/** Hoja2: cierre del año anterior. Solo se toma como referencia en texto (mezcla unidades). */
function leerReferencia(datos) {
  const enc = buscar(datos, t => t === 'indicador', 1, 6);
  if (!enc) return [];
  const [r0, c0] = enc;
  const filas = [];
  for (let r = r0 + 1; r <= datos.length; r++) {
    const nombre = limpio(celda(datos, r, c0));
    if (!nombre) continue;
    filas.push({ indicador: nombre, meta: limpio(celda(datos, r, c0 + 1)), resultado: limpio(celda(datos, r, c0 + 2)) });
  }
  return filas;
}

/** Lee el libro completo (hojas ya cargadas con read-excel-file: [{ sheet, data }]). */
export function parsearLibro(hojas) {
  const avisos = [];
  const hCat = hojas.find(h => normalizar(h.sheet) === 'indicadores');
  if (!hCat) throw new Error('No encontré la hoja "Indicadores". ¿Es el libro de Indicadores de Gestión?');
  const catalogo = leerCatalogo(hCat.data);
  if (!catalogo.length) throw new Error('La hoja "Indicadores" no tiene filas de indicadores.');

  const hojasInd = [];
  for (const h of hojas) {
    if (h === hCat || normalizar(h.sheet) === 'hoja2') continue;
    const r = leerHojaIndicador(h.sheet, h.data);
    if (!r) continue;
    if (r.error) { avisos.push(`La hoja "${h.sheet}": ${r.error}`); continue; }
    hojasInd.push(r);
  }
  const hRef = hojas.find(h => normalizar(h.sheet) === 'hoja2');
  const referencia = hRef ? leerReferencia(hRef.data) : [];

  // cada fila del catálogo se une con su hoja: 1) por nombre exacto, 2) por parecido (erratas) y 3) por descarte
  const unida = new Map();           // índice del catálogo -> hoja
  const usadas = new Set();
  catalogo.forEach((f, i) => { const h = hojasInd.find(x => !usadas.has(x) && normalizar(x.nombre) === normalizar(f.nombre)); if (h) { unida.set(i, { h, nota: null }); usadas.add(h); } });
  catalogo.forEach((f, i) => {
    if (unida.has(i)) return;
    const mejores = hojasInd.filter(x => !usadas.has(x)).map(x => ({ x, p: parecido(x.nombre, f.nombre) })).sort((m, n) => n.p - m.p);
    if (mejores[0] && mejores[0].p >= 0.8 && (!mejores[1] || mejores[0].p - mejores[1].p >= 0.05)) {
      unida.set(i, { h: mejores[0].x, nota: `La hoja "${mejores[0].x.hoja}" dice "${mejores[0].x.nombre}" y el catálogo dice "${f.nombre}". Se unieron por ser casi iguales: conviene corregir la errata en el libro.` });
      usadas.add(mejores[0].x);
    }
  });
  const sinHoja = catalogo.map((_, i) => i).filter(i => !unida.has(i)), hojasLibres = hojasInd.filter(x => !usadas.has(x));
  if (sinHoja.length === 1 && hojasLibres.length === 1) {
    unida.set(sinHoja[0], { h: hojasLibres[0], nota: `La hoja "${hojasLibres[0].hoja}" ("${hojasLibres[0].nombre}") se unió con "${catalogo[sinHoja[0]].nombre}" por descarte: era la única que quedaba.` });
    usadas.add(hojasLibres[0]);
  }
  const indicadores = catalogo.map((f, i) => {
    const u = unida.get(i); const h = u?.h;
    const ind = { orden: i + 1, ...f, formula_calculo: h?.formula_calculo || '', hoja: h?.hoja || null, registros: [], cerosIgnorados: 0, avisos: u?.nota ? [u.nota] : [] };
    if (!h) { ind.avisos.push('No tiene hoja propia en el libro: se importa solo el catálogo.'); return ind; }
    Object.assign(ind, metaMensualDe(h.metas, f.meta_anual));
    const { registros, cerosIgnorados } = registrosDe(h);
    ind.registros = registros; ind.cerosIgnorados = cerosIgnorados;
    const maxs = [...new Set(h.maximas.filter(m => m != null && m !== 0).map(m => Number(m.toPrecision(12))))];
    if (maxs.length === 1) ind.meta_maxima = maxs[0];
    else if (maxs.length > 1) ind.avisos.push('El libro trae una meta máxima distinta en cada mes; la aplicación guarda una sola, así que no se importa.');
    const dec = decidirCalculo(h, ind);
    ind.calculo = dec.calculo;
    // un indicador que se digita también puede traer filas de apoyo (numerador y denominador, n.º de personal y calificación): se conservan como datos de apoyo
    if (dec.calculo === 'directo' && h.par && (h.A.some(x => x != null) || h.B.some(x => x != null))) {
      const nombresPar = { razon: ['Numerador', 'Denominador'], anio: ['Año anterior', 'Año actual'], ejecucion: ['Planeadas', 'Ejecutadas'] }[h.par.tipo] || [h.textoA || 'Dato 1', h.textoB || 'Dato 2'];
      ind.componentes = { a: nombresPar[0], b: nombresPar[1] };
      for (const r of ind.registros) { const a = h.A[r.mes - 1], b = h.B[r.mes - 1]; if (a != null || b != null) r.componentes = { a, b }; }
    }
    if (dec.calculo !== 'directo') {
      const lab = CALCULOS[dec.calculo].etiquetas;
      ind.componentes = { a: lab.a, b: lab.b };
      for (const r of ind.registros) {
        const a = h.A[r.mes - 1], b = h.B[r.mes - 1];
        if (a != null || b != null) r.componentes = { a, b };
        if (r.valor != null) { const v = calcularValor({ calculo: dec.calculo }, { a, b }); if (v != null) r.valorCorregido = v; }
      }
      if (dec.corregida) {
        const cambian = ind.registros.filter(r => r.valor != null && r.valorCorregido != null && Math.abs(r.valor - r.valorCorregido) > 1e-6);
        ind.correccion = { formulaLibro: dec.formulaLibro, formulaApp: CALCULOS[dec.calculo].formula, cambian: cambian.length, total: ind.registros.filter(r => r.valor != null).length,
          ejemplo: cambian[0] ? { mes: cambian[0].mes, libro: cambian[0].valor, app: cambian[0].valorCorregido } : null };
        if (dec.calculo === 'reduccion') ind.sentido_meta = 'mayor_mejor';   // aquí un resultado POSITIVO es bueno: bajó el consumo
      }
    } else if (dec.dudosa) ind.avisos.push(`El libro calcula este indicador con una fórmula dudosa (${dec.dudosa}); se deja el resultado tal como está en el libro. Conviene revisarla con el área.`);
    if (!ind.registros.length) ind.avisos.push('El libro no trae resultados para este indicador (celdas vacías o con error en el Excel). Se importa su catálogo; los resultados se registrarán desde la aplicación.');
    if (h.errores) ind.avisos.push(`El libro tiene ${h.errores} celda${h.errores === 1 ? '' : 's'} con error (#REF! o #DIV/0!) en este indicador: esos meses no se pueden calcular.`);
    if (f.meta_anual == null && !ind.meta_mensual && !ind.metas_mensuales) ind.avisos.push('No tiene meta numérica: se registra pero no se puede evaluar.');
    return ind;
  });
  for (const h of hojasInd) if (!usadas.has(h)) avisos.push(`La hoja "${h.hoja}" (${h.nombre}) no coincide con ningún indicador del catálogo y no se importa.`);

  // referencia 2025: solo se asocia cuando el nombre coincide sin ambigüedad
  const referenciasAsociadas = [];
  let sinAsociar = 0;
  for (const r of referencia) {
    const n = normalizar(r.indicador);
    const cand = indicadores.filter(i => normalizar(i.nombre) === n);
    const aprox = cand.length ? cand : indicadores.filter(i => normalizar(i.nombre).startsWith(n) || n.startsWith(normalizar(i.nombre)));
    if (aprox.length === 1) referenciasAsociadas.push({ orden: aprox[0].orden, meta: r.meta, resultado: r.resultado });
    else sinAsociar++;
  }
  const porOrden = new Map();
  for (const r of referenciasAsociadas) if (!porOrden.has(r.orden)) porOrden.set(r.orden, r); else porOrden.set(r.orden, null);
  for (const i of indicadores) { const r = porOrden.get(i.orden); if (r && (r.meta || r.resultado)) i.referencia_anterior = { meta: r.meta || null, resultado: r.resultado || null }; }

  return { indicadores, avisos, referencia: { filas: referencia.length, asociadas: [...porOrden.values()].filter(Boolean).length, sinAsociar: referencia.length - [...porOrden.values()].filter(Boolean).length } };
}

// ---------------------------------------------------------------------------------------------
// Plan de importación: compara el libro con lo que ya hay en la aplicación
// ---------------------------------------------------------------------------------------------

const CAMPOS_TEXTO = ['directriz', 'estrategia_asg', 'objetivo', 'unidad_medida', 'tipo_indicador', 'frecuencia', 'responsable_medicion', 'procesos_relacionados', 'fuente_informacion', 'formula_calculo'];
const vacio = v => v == null || String(v).trim() === '';
const igualNum = (a, b) => (a == null && b == null) || (a != null && b != null && Math.abs(Number(a) - Number(b)) < 1e-9);
const iguales = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Sugerencia de proceso para un indicador NUEVO: por coincidencia de nombre y, si no, por quien lo mide. */
export function sugerirProceso(ind, procesos) {
  const t = normalizar(`${ind.procesos_relacionados} ${ind.responsable_medicion}`);
  const exacto = procesos.find(p => normalizar(ind.procesos_relacionados) === normalizar(p.nombre));
  if (exacto) return exacto.id;
  const con = procesos.find(p => t.includes(normalizar(p.nombre).split(' (')[0]));
  return (con || procesos[0])?.id ?? null;
}

/**
 * @param libro        resultado de parsearLibro
 * @param app          { indicadores: [...], registros: [...] }  (lo que hay hoy en la aplicación)
 * @param opciones     { anio, modo: 'completar' | 'reemplazar', procesos, procesoDe: {orden: id} }
 */
export function planificarImportacion(libro, app, { anio, modo = 'completar', procesos = [], procesoDe = {}, corregir = true }) {
  const porNombre = new Map(app.indicadores.map(i => [normalizar(i.nombre), i]));
  const regApp = new Map(app.registros.filter(r => r.anio === anio).map(r => [`${r.indicador_id}|${r.mes}`, r]));
  const filas = [];
  const total = { indicadoresNuevos: 0, indicadoresCoinciden: 0, cambiosCatalogo: 0, regNuevos: 0, regIguales: 0, regDistintos: 0, regCompletar: 0, regOmitidos: 0, sinPlanHistorico: 0, cerosIgnorados: 0, conMetaMensualNueva: 0, regRecalcular: 0, conFormulaCorregida: 0, mesesQueCambianPorFormula: 0, conComponentes: 0, conApoyo: 0, conMaxima: 0 };

  for (const ind of libro.indicadores) {
    const ex = porNombre.get(normalizar(ind.nombre));
    const fila = { orden: ind.orden, nombre: ind.nombre, hoja: ind.hoja, estado: ex ? 'coincide' : 'nuevo', cambios: [], registros: [], avisos: [...ind.avisos], cerosIgnorados: ind.cerosIgnorados };
    total.cerosIgnorados += ind.cerosIgnorados;

    // --- catálogo ---
    const propuesto = {};
    if (ex) {
      for (const campo of CAMPOS_TEXTO) {
        const nuevo = ind[campo], antes = ex[campo];
        if (vacio(nuevo) || normalizar(nuevo) === normalizar(antes)) continue;
        if (vacio(antes) || modo === 'reemplazar') { propuesto[campo] = nuevo; fila.cambios.push({ campo, antes: antes || null, despues: nuevo }); }
      }
      if (ind.meta_anual != null && !igualNum(ind.meta_anual, ex.meta_anual) && (ex.meta_anual == null || modo === 'reemplazar')) { propuesto.meta_anual = ind.meta_anual; fila.cambios.push({ campo: 'meta_anual', antes: ex.meta_anual, despues: ind.meta_anual }); }
      if (ind.calculo && ind.calculo !== 'directo' && (ex.calculo || 'directo') !== ind.calculo && ((ex.calculo || 'directo') === 'directo' || modo === 'reemplazar')) {
        propuesto.calculo = ind.calculo; propuesto.componentes = ind.componentes;
        fila.cambios.push({ campo: 'calculo', antes: ex.calculo || 'directo', despues: ind.calculo }); total.conComponentes++;
      }
      if (corregir && ind.correccion && ind.sentido_meta && ex.sentido_meta !== ind.sentido_meta) { propuesto.sentido_meta = ind.sentido_meta; fila.cambios.push({ campo: 'sentido_meta', antes: ex.sentido_meta, despues: ind.sentido_meta }); }
      if (ind.correccion) { total.conFormulaCorregida++; total.mesesQueCambianPorFormula += ind.correccion.cambian; }
      if (ind.calculo === 'directo' && ind.componentes && !ex.componentes) { propuesto.componentes = ind.componentes; fila.cambios.push({ campo: 'componentes', antes: null, despues: 'datos de apoyo' }); total.conApoyo++; }
      if (ind.meta_maxima != null && !igualNum(ind.meta_maxima, ex.meta_maxima) && (ex.meta_maxima == null || modo === 'reemplazar')) { propuesto.meta_maxima = ind.meta_maxima; fila.cambios.push({ campo: 'meta_maxima', antes: ex.meta_maxima ?? null, despues: ind.meta_maxima }); total.conMaxima++; }
      // meta mensual: es lo que hace que el indicador se evalúe como lo evalúa el libro; se carga si la app no la tiene
      if (ind.meta_mensual != null && !igualNum(ind.meta_mensual, ex.meta_mensual) && (ex.meta_mensual == null || modo === 'reemplazar')) {
        propuesto.meta_mensual = ind.meta_mensual; propuesto.tipo_meta = 'mensual';
        fila.cambios.push({ campo: 'meta_mensual', antes: ex.meta_mensual, despues: ind.meta_mensual }); total.conMetaMensualNueva++;
      }
      if (ind.metas_mensuales && !iguales(ind.metas_mensuales, ex.metas_mensuales) && (!ex.metas_mensuales || !Object.keys(ex.metas_mensuales).length || modo === 'reemplazar')) {
        propuesto.metas_mensuales = ind.metas_mensuales; fila.cambios.push({ campo: 'metas_mensuales', antes: ex.metas_mensuales ? 'por mes' : null, despues: 'por mes' });
      }
      if (ind.referencia_anterior && !iguales(ind.referencia_anterior, ex.referencia_anterior)) { propuesto.referencia_anterior = ind.referencia_anterior; fila.cambios.push({ campo: 'referencia_anterior', antes: ex.referencia_anterior ? 'cargada' : null, despues: 'cierre del año anterior' }); }
      total.indicadoresCoinciden++;
    } else {
      total.indicadoresNuevos++;
      fila.procesoSugerido = procesoDe[ind.orden] ?? sugerirProceso(ind, procesos);
    }
    total.cambiosCatalogo += fila.cambios.length;
    fila.propuesto = propuesto;

    // --- registros del año ---
    if (!ex && ind.calculo && ind.calculo !== 'directo') fila.calculo = ind.calculo;
    for (const r of ind.registros) {
      const actual = ex ? regApp.get(`${ex.id}|${r.mes}`) : null;
      let accion = 'nuevo';
      const valorFinal = corregir && r.valorCorregido != null ? r.valorCorregido : r.valor;
      const comp = r.componentes || null;
      let datos = { mes: r.mes, valor: valorFinal, analisis: r.analisis || null, accion: r.accion || null, componentes: comp };
      if (actual) {
        const mismoValor = igualNum(valorFinal, actual.valor);
        const mismoTexto = normalizar(r.analisis) === normalizar(actual.analisis) && normalizar(r.accion) === normalizar(actual.accion);
        const mismosNumeros = iguales(comp, actual.componentes ?? null) || !comp;
        if (mismoValor && mismoTexto && mismosNumeros) { accion = 'igual'; }
        else if (modo === 'reemplazar') { accion = 'reemplazar'; }
        else if (corregir && r.valorCorregido != null && !mismoValor) { accion = 'recalcular'; datos = { mes: r.mes, valor: valorFinal, componentes: comp }; }   // la app tenía el resultado del libro con la fórmula mala
        else if (mismoValor && mismoTexto && !mismosNumeros && comp) { accion = 'completar'; datos = { mes: r.mes, componentes: comp }; }
        else {
          // completar: nunca pisa lo que la app ya tiene; solo llena lo que está vacío
          const llenar = {};
          if (actual.valor == null && r.valor != null) llenar.valor = r.valor;
          if (vacio(actual.analisis) && r.analisis) llenar.analisis = r.analisis;
          if (vacio(actual.accion) && r.accion) llenar.accion = r.accion;
          if (comp && !actual.componentes) llenar.componentes = comp;
          if (Object.keys(llenar).length) { accion = 'completar'; datos = { mes: r.mes, ...llenar }; }
          else accion = !mismoValor || !mismoTexto ? 'distinto' : 'igual';
        }
      }
      const resumen = { nuevo: 'regNuevos', igual: 'regIguales', reemplazar: 'regDistintos', completar: 'regCompletar', distinto: 'regOmitidos', recalcular: 'regRecalcular' }[accion];
      total[resumen]++;
      if ((accion === 'nuevo' || accion === 'reemplazar') && valorFinal != null && !r.accion) total.sinPlanHistorico++;
      fila.registros.push({ ...datos, estado: accion, valorApp: actual?.valor ?? null });
    }
    filas.push(fila);
  }
  return { anio, modo, corregir, filas, total };
}

/** Lo que se le manda al servidor: solo lo que realmente cambia. */
export function cargaParaServidor(plan, libro, procesoDe = {}) {
  const catalogo = [], registros = [];
  for (const f of plan.filas) {
    const ind = libro.indicadores.find(i => i.orden === f.orden);
    const porAplicar = f.registros.filter(r => ['nuevo', 'reemplazar', 'completar', 'recalcular'].includes(r.estado));
    if (f.estado === 'nuevo') {
      catalogo.push({
        nuevo: true, ref: f.nombre, proceso_id: procesoDe[f.orden] ?? f.procesoSugerido,
        campos: Object.fromEntries(['nombre', ...CAMPOS_TEXTO].map(k => [k, ind[k] || null]).concat([['meta_anual', ind.meta_anual], ['meta_mensual', ind.meta_mensual ?? null], ['tipo_meta', ind.tipo_meta ?? null], ['metas_mensuales', ind.metas_mensuales ?? null], ['referencia_anterior', ind.referencia_anterior ?? null], ['sentido_meta', ind.sentido_meta && plan.corregir ? ind.sentido_meta : 'mayor_mejor'], ['calculo', ind.calculo || 'directo'], ['componentes', ind.componentes ?? null], ['meta_maxima', ind.meta_maxima ?? null]])),
      });
    } else if (Object.keys(f.propuesto).length) catalogo.push({ nuevo: false, ref: f.nombre, nombre: f.nombre, campos: f.propuesto });
    for (const r of porAplicar) registros.push({ ref: f.nombre, anio: plan.anio, mes: r.mes, valor: r.valor ?? null, analisis: r.analisis ?? null, accion: r.accion ?? null, componentes: r.componentes ?? null, modo: r.estado });
  }
  return { catalogo, registros };
}


/** Cuánto cambia la evaluación de los indicadores a los que el libro les agrega una meta mensual.
 *  Antes se evaluaban contra la meta anual; ahora, como en el libro, contra la mensual. */
export function impactoMetaMensual(libro, app) {
  const porNombre = new Map(app.indicadores.map(i => [normalizar(i.nombre), i]));
  const evalua = (v, meta, sentido) => (meta == null ? null : sentido === 'menor_mejor' ? v <= meta : v >= meta);
  const filas = [];
  for (const ind of libro.indicadores) {
    if (ind.meta_mensual == null) continue;
    const ex = porNombre.get(normalizar(ind.nombre));
    if (ex && ex.meta_mensual != null) continue;           // ya la tiene: no cambia nada
    const sentido = ex?.sentido_meta || 'mayor_mejor';
    const metaAntes = ex ? (ex.meta_anual == null ? null : Number(ex.meta_anual)) : ind.meta_anual;
    let evaluados = 0, antes = 0, despues = 0, cambian = 0;
    for (const r of ind.registros) {
      if (r.valor == null) continue;
      const a = evalua(r.valor, metaAntes, sentido), d = evalua(r.valor, ind.meta_mensual, sentido);
      if (a == null || d == null) continue;
      evaluados++; if (a) antes++; if (d) despues++; if (a !== d) cambian++;
    }
    filas.push({ orden: ind.orden, nombre: ind.nombre, metaAnual: metaAntes, metaMensual: ind.meta_mensual, evaluados, antes, despues, cambian });
  }
  return filas;
}
