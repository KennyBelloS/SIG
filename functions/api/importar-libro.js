/* Importación del libro de Excel original "Indicadores de Gestión". SOLO para administradores.
 *
 * La pantalla lee el libro en el navegador, lo compara con lo que ya hay y muestra una vista previa; recién
 * cuando el administrador confirma, manda aquí SOLO lo que cambia. Esta función es la que escribe.
 * Corre en el servidor porque debe poder guardar meses ya cerrados y crear indicadores, y eso exige la
 * llave de servicio, que nunca debe estar en la pantalla.
 *
 * Qué hace:
 *   1. comprueba que quien pide sea administrador
 *   2. valida TODO lo recibido: tipos, rangos, largos y una lista cerrada de campos (no se puede escribir cualquier columna)
 *   3. crea los indicadores nuevos y completa o actualiza el catálogo de los que ya existen
 *   4. guarda los registros mensuales (valor, análisis y plan de acción), marcados como "(libro original)"
 *
 * Los registros que vienen del libro sin plan de acción se guardan con la marca `historico`, que los exime de la regla
 * "plan obligatorio" (esa regla sigue vigente para todo lo que se registre desde la aplicación).
 */

const MAX_INDICADORES = 300;
const MAX_REGISTROS = 5000;
const FRECUENCIAS = ['mensual', 'trimestral', 'semestral', 'anual'];
const CALCULOS = ['directo', 'ejecucion', 'razon', 'reduccion'];

const json = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

const normalizar = t => String(t ?? '').replace(/²/g, '2').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function conexion(env) {
  const url = String(env.SUPABASE_URL || '').replace(/\/+$/, '');
  const llave = env.SUPABASE_SERVICE_ROLE_KEY;
  return url && llave ? { url, llave } : null;
}

async function sb(c, ruta, { metodo = 'GET', cuerpo, cabeceras = {} } = {}) {
  const r = await fetch(`${c.url}${ruta}`, {
    method: metodo,
    headers: { apikey: c.llave, Authorization: `Bearer ${c.llave}`, 'Content-Type': 'application/json', ...cabeceras },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { /* sin JSON */ }
  return { ok: r.ok, status: r.status, datos };
}

/** El servidor escribe su propio resumen en la auditoría (la base no audita lo que hace la llave de servicio). Nunca debe romper la acción. */
async function auditar(c, quien, fila) {
  try { await sb(c, '/rest/v1/indicadores_auditoria', { metodo: 'POST', cabeceras: { Prefer: 'return=minimal' }, cuerpo: [{ user_id: quien.id, email: quien.email || null, nombre: quien.nombre || null, ...fila }] }); } catch { /* sin auditoría no se detiene la importación */ }
}

async function personaDeLaSesion(c, token) {
  if (!token) return null;
  const r = await fetch(`${c.url}/auth/v1/user`, { headers: { apikey: c.llave, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u && u.id ? u : null;
}

// ---- validación: lista cerrada de campos y de tipos --------------------------------------------------------------

const texto = (v, max = 2000) => (v == null || v === '' ? null : (typeof v === 'string' && v.length <= max ? v : undefined));
const num = v => (v == null ? null : (typeof v === 'number' && Number.isFinite(v) ? v : undefined));

const CAMPOS_CATALOGO = {
  nombre: v => texto(v, 300), directriz: v => texto(v), estrategia_asg: v => texto(v), objetivo: v => texto(v), unidad_medida: v => texto(v, 200),
  tipo_indicador: v => texto(v, 100), responsable_medicion: v => texto(v, 300), procesos_relacionados: v => texto(v, 300),
  fuente_informacion: v => texto(v, 300), formula_calculo: v => texto(v, 4000),
  frecuencia: v => (v == null ? null : (FRECUENCIAS.includes(v) ? v : undefined)),
  calculo: v => (CALCULOS.includes(v) ? v : undefined),
  componentes: v => {
    if (v == null) return null;
    if (typeof v !== 'object' || Array.isArray(v)) return undefined;
    const a = texto(v.a, 60), b = texto(v.b, 60);
    return a === undefined || b === undefined || !a || !b ? undefined : { a, b };
  },
  meta_anual: num, meta_mensual: num,
  tipo_meta: v => (v == null ? null : (['anual', 'mensual'].includes(v) ? v : undefined)),
  sentido_meta: v => (v == null ? null : (['mayor_mejor', 'menor_mejor'].includes(v) ? v : undefined)),
  metas_mensuales: v => {
    if (v == null) return null;
    if (typeof v !== 'object' || Array.isArray(v)) return undefined;
    const o = {};
    for (const [k, x] of Object.entries(v)) { if (!/^(?:[1-9]|1[0-2])$/.test(k) || num(x) === undefined || x === null) return undefined; o[k] = x; }
    return Object.keys(o).length ? o : null;
  },
  referencia_anterior: v => {
    if (v == null) return null;
    if (typeof v !== 'object' || Array.isArray(v)) return undefined;
    const meta = texto(v.meta, 200), resultado = texto(v.resultado, 200);
    return meta === undefined || resultado === undefined ? undefined : { meta, resultado };
  },
};

/** Devuelve { ok, valor } o { error }. Los campos que no están en la lista se descartan en silencio. */
function limpiarCampos(campos, { permitirNombre }) {
  if (!campos || typeof campos !== 'object' || Array.isArray(campos)) return { error: 'Los datos del indicador no son válidos.' };
  const salida = {};
  for (const [k, f] of Object.entries(CAMPOS_CATALOGO)) {
    if (!(k in campos)) continue;
    if (k === 'nombre' && !permitirNombre) continue;
    const v = f(campos[k]);
    if (v === undefined) return { error: `El campo "${k}" no es válido.` };
    salida[k] = v;
  }
  return { ok: true, valor: salida };
}

function limpiarRegistro(r) {
  if (!r || typeof r !== 'object') return { error: 'registro inválido' };
  const ref = typeof r.ref === 'string' && r.ref.trim() ? r.ref.trim() : null;
  if (!ref) return { error: 'falta el indicador' };
  if (!Number.isInteger(r.anio) || r.anio < 2000 || r.anio > 2100) return { error: 'año inválido' };
  if (!Number.isInteger(r.mes) || r.mes < 1 || r.mes > 12) return { error: 'mes inválido' };
  const valor = num(r.valor); if (valor === undefined) return { error: 'valor inválido' };
  const analisis = texto(r.analisis, 6000), accion = texto(r.accion, 6000);
  if (analisis === undefined || accion === undefined) return { error: 'texto demasiado largo' };
  if (!['nuevo', 'reemplazar', 'completar', 'recalcular'].includes(r.modo)) return { error: 'modo inválido' };
  let componentes = null;
  if (r.componentes != null) {
    if (typeof r.componentes !== 'object' || Array.isArray(r.componentes)) return { error: 'números del cálculo inválidos' };
    const a = num(r.componentes.a), b = num(r.componentes.b);
    if (a === undefined || b === undefined) return { error: 'números del cálculo inválidos' };
    componentes = { a, b };
  }
  if (r.modo === 'recalcular' && valor == null) return { error: 'recalcular necesita un resultado' };
  return { ok: true, valor: { ref, anio: r.anio, mes: r.mes, valor, analisis, accion, componentes, modo: r.modo } };
}

// ---- aplicación -----------------------------------------------------------------------------------------------------

async function aplicar(c, carga, quien) {
  const errores = [];
  const resumen = { indicadoresCreados: 0, indicadoresActualizados: 0, registrosGuardados: 0, registrosCompletados: 0, registrosRecalculados: 0 };

  const lista = await sb(c, '/rest/v1/indicadores?select=id,nombre,orden&limit=2000');
  if (!lista.ok || !Array.isArray(lista.datos)) return { fatal: 'No se pudo leer el catálogo de indicadores.' };
  const idPorNombre = new Map(lista.datos.map(i => [normalizar(i.nombre), i.id]));
  let siguienteOrden = lista.datos.reduce((m, i) => Math.max(m, i.orden || 0), 0) + 1;

  const procs = await sb(c, '/rest/v1/indicadores_procesos?select=id');
  const procesosValidos = new Set((procs.datos || []).map(p => p.id));

  // 1) catálogo
  for (const item of carga.catalogo) {
    const clave = normalizar(item.ref);
    try {
      if (item.nuevo && !idPorNombre.has(clave)) {
        if (!procesosValidos.has(item.proceso_id)) { errores.push({ ref: item.ref, mensaje: 'Elige a qué proceso pertenece este indicador nuevo.' }); continue; }
        const r = await sb(c, '/rest/v1/indicadores', {
          metodo: 'POST', cabeceras: { Prefer: 'return=representation' },
          cuerpo: { ...item.campos, sentido_meta: item.campos.sentido_meta || 'mayor_mejor', proceso_id: item.proceso_id, orden: siguienteOrden++, activo: true },
        });
        if (!r.ok || !Array.isArray(r.datos) || !r.datos[0]?.id) { errores.push({ ref: item.ref, mensaje: 'No se pudo crear el indicador.' }); continue; }
        idPorNombre.set(clave, r.datos[0].id); resumen.indicadoresCreados++;
      } else if (Object.keys(item.campos).length) {
        const id = idPorNombre.get(clave);
        if (!id) { errores.push({ ref: item.ref, mensaje: 'El indicador ya no existe en la aplicación.' }); continue; }
        const r = await sb(c, `/rest/v1/indicadores?id=eq.${id}`, { metodo: 'PATCH', cabeceras: { Prefer: 'return=minimal' }, cuerpo: item.campos });
        if (!r.ok) { errores.push({ ref: item.ref, mensaje: 'No se pudo actualizar el catálogo del indicador.' }); continue; }
        resumen.indicadoresActualizados++;
      }
    } catch { errores.push({ ref: item.ref, mensaje: 'Falló la comunicación con la base de datos.' }); }
  }

  // 2) registros mensuales
  const ahora = new Date().toISOString();
  const marca = `${quien.email || 'administrador'} (libro original)`;
  const masivos = [];
  for (const r of carga.registros) {
    const id = idPorNombre.get(normalizar(r.ref));
    if (!id) { errores.push({ ref: r.ref, mensaje: `Mes ${r.mes}: el indicador no existe en la aplicación.` }); continue; }
    if (r.modo === 'recalcular') {
      // solo cambia el resultado y los dos números; el análisis, el plan y quién lo registró no se tocan
      const x = await sb(c, '/rest/v1/indicadores_registros?on_conflict=indicador_id,anio,mes', { metodo: 'POST', cabeceras: { Prefer: 'resolution=merge-duplicates,return=minimal' }, cuerpo: [{ indicador_id: id, anio: r.anio, mes: r.mes, valor: r.valor, componentes: r.componentes, actualizado_en: ahora }] });
      if (x.ok) resumen.registrosRecalculados++; else errores.push({ ref: r.ref, mensaje: `Mes ${r.mes}: no se pudo recalcular.` });
    } else if (r.modo === 'completar') {
      // solo se envían las columnas que se van a llenar, una fila por vez, para no pisar nada con vacíos
      const fila = { indicador_id: id, anio: r.anio, mes: r.mes, actualizado_en: ahora };
      if (r.valor != null) { fila.valor = r.valor; fila.historico = !r.accion; }
      if (r.analisis) fila.analisis = r.analisis;
      if (r.accion) fila.accion = r.accion;
      if (r.componentes) fila.componentes = r.componentes;
      const x = await sb(c, '/rest/v1/indicadores_registros?on_conflict=indicador_id,anio,mes', { metodo: 'POST', cabeceras: { Prefer: 'resolution=merge-duplicates,return=minimal' }, cuerpo: [fila] });
      if (x.ok) resumen.registrosCompletados++; else errores.push({ ref: r.ref, mensaje: `Mes ${r.mes}: no se pudo completar.` });
    } else {
      masivos.push({ indicador_id: id, anio: r.anio, mes: r.mes, valor: r.valor, analisis: r.analisis, accion: r.accion, componentes: r.componentes,
        historico: r.valor != null && !r.accion, plan_sugerido: false, registrado_por: marca, registrado_en: ahora, actualizado_en: ahora });
    }
  }
  for (let i = 0; i < masivos.length; i += 100) {
    const lote = masivos.slice(i, i + 100);   // todas las filas del lote tienen las mismas columnas
    const x = await sb(c, '/rest/v1/indicadores_registros?on_conflict=indicador_id,anio,mes', { metodo: 'POST', cabeceras: { Prefer: 'resolution=merge-duplicates,return=minimal' }, cuerpo: lote });
    if (x.ok) resumen.registrosGuardados += lote.length;
    else errores.push({ ref: `registros ${i + 1} a ${i + lote.length}`, mensaje: 'No se pudo guardar este grupo de meses.' });
  }
  return { resumen, errores: errores.slice(0, 50), totalErrores: errores.length };
}

export async function onRequestPost({ request, env }) {
  try {
    const c = conexion(env);
    if (!c) return json({ error: 'Falta configurar SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en Cloudflare Pages.' }, 500);

    const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const quien = await personaDeLaSesion(c, token);
    if (!quien) return json({ error: 'Sesión inválida. Vuelve a iniciar sesión.' }, 401);
    const fila = await sb(c, `/rest/v1/indicadores_usuarios?user_id=eq.${encodeURIComponent(quien.id)}&select=rol,nombre,email`);
    if (!fila.ok || !Array.isArray(fila.datos) || fila.datos[0]?.rol !== 'admin') return json({ error: 'Solo un administrador puede importar el libro de indicadores.' }, 403);
    quien.nombre = fila.datos[0].nombre || null;
    quien.email = quien.email || fila.datos[0].email || null;

    let cuerpo;
    try { cuerpo = await request.json(); } catch { return json({ error: 'La petición no es válida.' }, 400); }
    if (!cuerpo || !Array.isArray(cuerpo.catalogo) || !Array.isArray(cuerpo.registros)) return json({ error: 'La petición no es válida.' }, 400);
    if (cuerpo.catalogo.length > MAX_INDICADORES) return json({ error: `El libro trae más de ${MAX_INDICADORES} indicadores.` }, 400);
    if (cuerpo.registros.length > MAX_REGISTROS) return json({ error: `El libro trae más de ${MAX_REGISTROS} registros.` }, 400);

    const carga = { catalogo: [], registros: [] };
    for (const [i, it] of cuerpo.catalogo.entries()) {
      const ref = typeof it?.ref === 'string' && it.ref.trim() ? it.ref.trim() : null;
      if (!ref) return json({ error: `Indicador ${i + 1}: falta el nombre.` }, 400);
      const l = limpiarCampos(it.campos, { permitirNombre: !!it.nuevo });
      if (l.error) return json({ error: `Indicador "${ref}": ${l.error}` }, 400);
      if (it.nuevo && !l.valor.nombre) return json({ error: `Indicador "${ref}": falta el nombre.` }, 400);
      if (it.nuevo && !Number.isInteger(it.proceso_id)) return json({ error: `Indicador "${ref}": elige a qué proceso pertenece.` }, 400);
      carga.catalogo.push({ nuevo: !!it.nuevo, ref, proceso_id: it.proceso_id, campos: l.valor });
    }
    for (const [i, r] of cuerpo.registros.entries()) {
      const l = limpiarRegistro(r);
      if (l.error) return json({ error: `Registro ${i + 1}: ${l.error}.` }, 400);
      carga.registros.push(l.valor);
    }

    const res = await aplicar(c, carga, quien);
    if (res.fatal) return json({ error: res.fatal }, 502);
    const r = res.resumen;
    await auditar(c, quien, { tipo: 'importacion', accion: 'importar', entidad: 'libro', despues: r,
      resumen: `Importó el libro de indicadores: ${r.indicadoresCreados} indicadores creados, ${r.indicadoresActualizados} actualizados, ${r.registrosGuardados + r.registrosCompletados + r.registrosRecalculados} meses guardados${res.totalErrores ? `, ${res.totalErrores} con error` : ''}` });
    return json({ ok: true, ...res });
  } catch {
    return json({ error: 'Error inesperado del servidor.' }, 500);
  }
}

export async function onRequest({ request, env }) {
  if (request.method === 'POST') return onRequestPost({ request, env });
  return json({ error: 'Método no permitido.' }, 405);
}
