// Función de Cloudflare Pages: /api/enviar-recordatorios-indicadores
//
// IMPORTANTE: esta función NO corre con "npm run dev" (Vite solo sirve el
// frontend; por eso /api/... responde 404 en localhost:5173). Para probarla
// en tu computador usa:  npm run preview:api
// En producción funciona sola al desplegar en Cloudflare Pages.
//
// Formas de llamarla:
//   POST (desde la app, sesión iniciada):
//        { accion: 'recordatorio' | 'dos_dias' | 'cierre' | 'libre', procesoId?, titulo?, mensaje?, destinatarios? }
//   GET  ?secret=CRON_SECRET  (programador externo, una vez al día):
//        día 2  -> recordatorio del mes anterior
//        día (cierre - 2) -> aviso "quedan 2 días"
//        día 16 (después del 15) -> cierra el mes anterior y avisa
//
// Variables de entorno en Cloudflare Pages:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, CORREO_REMITENTE,
//   CRON_SECRET y (opcional) URL_PUBLICA para el logo de los correos.

import { correoRecordatorio, correoDosDias, correoCierre, correoLibre } from './_plantillas.js';
import { ACTIVOS } from './_logo.js';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/** Fecha y hora en Colombia (UTC-5, sin horario de verano). El día "2" o "16" debe
 *  contarse como lo vive la finca, no según el reloj del servidor en UTC. */
function ahoraColombia(base = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(base);
  const g = t => Number(partes.find(x => x.type === t).value);
  const anio = g('year'), mes = g('month'), dia = g('day');
  return { anio, mes, dia, iso: `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}` };
}

/** El "mes de reporte" es el mes anterior al actual (el que ya debería estar lleno). */
function mesReporteActual(fecha = new Date()) {
  const h = ahoraColombia(fecha);
  return h.mes === 1 ? { anioReporte: h.anio - 1, mesReporte: 12 } : { anioReporte: h.anio, mesReporte: h.mes - 1 };
}

/** Misma regla de metas que usa la aplicación: la "que rige" es la anual o la mensual. */
function tipoMetaEfectivo(ind) {
  if (ind.tipo_meta === 'anual' || ind.tipo_meta === 'mensual') return ind.tipo_meta;
  return ind.metas_mensuales && Object.keys(ind.metas_mensuales).length > 0 ? 'mensual' : 'anual';
}
function metaDelMes(ind, mes) {
  if (tipoMetaEfectivo(ind) === 'mensual') {
    const puntual = ind.metas_mensuales && ind.metas_mensuales[String(mes)];
    if (puntual != null) return Number(puntual);
    if (ind.meta_mensual != null) return Number(ind.meta_mensual);
  }
  return ind.meta_anual != null ? Number(ind.meta_anual) : null;
}
function cumpleMeta(ind, valor, mes) {
  const meta = metaDelMes(ind, mes);
  if (meta == null || valor == null) return null;
  return ind.sentido_meta === 'menor_mejor' ? Number(valor) <= meta : Number(valor) >= meta;
}

class Supa {
  constructor(url, key) { this.url = url.replace(/\/$/, ''); this.key = key; }
  async get(path) {
    const r = await fetch(`${this.url}/rest/v1/${path}`, { headers: { apikey: this.key, Authorization: `Bearer ${this.key}` } });
    if (!r.ok) throw new Error(`Supabase GET ${path}: ${r.status} ${await r.text()}`);
    return r.json();
  }
  async patch(path, body) {
    const r = await fetch(`${this.url}/rest/v1/${path}`, { method: 'PATCH',
      headers: { apikey: this.key, Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`Supabase PATCH ${path}: ${r.status} ${await r.text()}`);
  }
  async insert(path, body) {
    const r = await fetch(`${this.url}/rest/v1/${path}`, { method: 'POST',
      headers: { apikey: this.key, Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`Supabase POST ${path}: ${r.status} ${await r.text()}`);
  }
  async upsert(path, body, onConflict) {
    const r = await fetch(`${this.url}/rest/v1/${path}?on_conflict=${onConflict}`, { method: 'POST',
      headers: { apikey: this.key, Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`Supabase UPSERT ${path}: ${r.status} ${await r.text()}`);
  }
  /** Publica los activos del correo (logo e iconos) en un bucket público de Supabase
   *  Storage y devuelve sus direcciones. Los nombres llevan versión: si ya existen se
   *  reutilizan; si no, se suben. Lo que falle queda en null y el correo se adapta. */
  async asegurarActivos(activos) {
    const bucket = 'publico';
    const cab = { apikey: this.key, Authorization: `Bearer ${this.key}` };
    let bucketListo = false;
    const resultado = {};
    for (const [clave, a] of Object.entries(activos)) {
      const urlPublica = `${this.url}/storage/v1/object/public/${bucket}/${a.nombre}`;
      try {
        const ya = await fetch(urlPublica, { method: 'HEAD' });
        if (ya.ok) { resultado[clave] = urlPublica; continue; }
      } catch { /* intentamos subirlo */ }
      try {
        if (!bucketListo) {
          await fetch(`${this.url}/storage/v1/bucket`, { method: 'POST', headers: { ...cab, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: bucket, name: bucket, public: true }) }).catch(() => {});
          bucketListo = true;
        }
        const bin = atob(a.base64);
        const bytes = new Uint8Array(bin.length);
        for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
        const subida = await fetch(`${this.url}/storage/v1/object/${bucket}/${a.nombre}`, { method: 'POST', headers: { ...cab, 'Content-Type': 'image/png', 'x-upsert': 'true' }, body: bytes });
        resultado[clave] = subida.ok ? urlPublica : null;
      } catch { resultado[clave] = null; }
    }
    return resultado;
  }

  async usuarioDeToken(token) {
    const r = await fetch(`${this.url}/auth/v1/user`, { headers: { apikey: this.key, Authorization: `Bearer ${token}` } });
    return r.ok ? r.json() : null;
  }
}

/** Separa "Nombre <correo@dominio>" en sus dos partes. */
function partirRemitente(texto) {
  const m = String(texto || '').match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { nombre: m[1] || 'Finca Torremolinos', email: m[2].trim() };
  return { nombre: 'Finca Torremolinos', email: String(texto || '').trim() };
}

/** Envío con Resend (requiere dominio verificado para escribir a terceros). */
async function enviarConResend(env, { destinatarios, asunto, html, adjuntos }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CORREO_REMITENTE || 'Torremolinos Indicadores <onboarding@resend.dev>',
      to: destinatarios, subject: asunto, html,
      attachments: adjuntos && adjuntos.map(a => ({
        filename: a.nombre, content: a.base64, content_type: 'image/png',
        content_id: a.cid, disposition: 'inline',
      })),
    }),
  });
  if (r.ok) return;
  const texto = await r.text();
  if (r.status === 403 && texto.includes('your own email address')) {
    const propio = (texto.match(/\(([^)]+@[^)]+)\)/) || [])[1] || 'tu correo de registro';
    throw new Error(
      `Resend solo te deja enviar a ${propio} mientras uses el remitente de prueba. ` +
      `Opciones: verificar un dominio en resend.com/domains, o cambiar a Brevo ` +
      `(gratis, permite verificar una sola dirección de Gmail) poniendo PROVEEDOR_CORREO=brevo.`);
  }
  if (r.status === 401) throw new Error('La RESEND_API_KEY no es válida o fue revocada.');
  throw new Error(`Resend respondió ${r.status}: ${texto.slice(0, 250)}`);
}

/** Envío con Brevo: gratis hasta 300 correos al día y basta con verificar
 *  una sola dirección de remitente (sirve una de Gmail), sin dominio propio. */
async function enviarConBrevo(env, { destinatarios, asunto, html, adjuntos }) {
  const de = partirRemitente(env.CORREO_REMITENTE);
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: de.nombre, email: de.email },
      to: destinatarios.map(email => ({ email })),
      subject: asunto,
      htmlContent: html,
      attachment: adjuntos && adjuntos.map(a => ({ name: a.nombre, content: a.base64 })),
    }),
  });
  if (r.ok) return;
  const texto = await r.text();
  if (r.status === 400 && /sender/i.test(texto)) {
    throw new Error(
      `Brevo no reconoce el remitente "${de.email}". Entra a Brevo → Senders & IP → Senders, ` +
      `agrégalo y confirma el enlace que llega a esa bandeja. Luego vuelve a intentar.`);
  }
  if (r.status === 401) throw new Error('La BREVO_API_KEY no es válida.');
  throw new Error(`Brevo respondió ${r.status}: ${texto.slice(0, 250)}`);
}

async function enviarCorreo(env, { destinatarios, asunto, html }) {
  const proveedor = (env.PROVEEDOR_CORREO || 'resend').trim().toLowerCase();
  if (proveedor === 'brevo' && !env.BREVO_API_KEY) throw new Error('Falta configurar BREVO_API_KEY.');
  if (proveedor !== 'brevo' && !env.RESEND_API_KEY) throw new Error('Falta configurar RESEND_API_KEY.');

  // MODO PRUEBAS: desvía todos los correos a una sola dirección.
  const prueba = (env.CORREO_PRUEBAS || '').trim();
  let destinoReal = destinatarios, asuntoFinal = asunto, htmlFinal = html;
  if (prueba) {
    destinoReal = [prueba];
    asuntoFinal = `[PRUEBA] ${asunto}`;
    htmlFinal = `<div style="font-family:Arial,Helvetica,sans-serif;background:#FAF0D8;border:1px solid #EBD9A8;color:#8A6410;padding:12px 16px;margin:0 0 14px;font-size:13px;">
        <strong>Modo pruebas.</strong> En producción este correo se habría enviado a: ${destinatarios.join(', ')}.
      </div>${html}`;
  }

  const datos = { destinatarios: destinoReal, asunto: asuntoFinal, html: htmlFinal };
  return proveedor === 'brevo' ? enviarConBrevo(env, datos) : enviarConResend(env, datos);
}

let _activosCache = null;
/** Direcciones públicas del logo y los iconos. Si algo falla, ese activo queda
 *  en null y el correo usa la marca en texto (nunca una imagen rota). */
async function resolverActivos(db, env) {
  if (_activosCache) return _activosCache;
  let a = {};
  try { a = await db.asegurarActivos(ACTIVOS); } catch (e) { console.log('No se pudieron publicar los activos:', e.message); }
  const manual = (env.LOGO_URL || '').trim();
  if (manual) a.logo = manual;
  _activosCache = a;
  return a;
}

function datosFirma(cfg) {
  return {
    // Los correos salen firmados solo con el cargo, sin nombre de persona.
    cargo: cfg?.firma_cargo || '',
    cargo2: cfg?.firma_cargo2 || '',
    telefono: cfg?.firma_telefono || '',
    celular: cfg?.firma_celular || '',
    email: cfg?.firma_email || '',
    ubicacion: cfg?.firma_ubicacion || 'Finca Torremolinos, Suesca – Colombia',
  };
}

async function evaluarProceso(db, proceso, anio, mes) {
  const indicadores = await db.get(`indicadores?proceso_id=eq.${proceso.id}&activo=eq.true&select=*`);
  const ids = indicadores.map(i => i.id);
  let registros = [];
  if (ids.length) registros = await db.get(`indicadores_registros?indicador_id=in.(${ids.join(',')})&anio=eq.${anio}&mes=eq.${mes}&select=*`);
  const porId = new Map(registros.map(r => [r.indicador_id, r]));
  const pendientes = [], sinPlan = [];
  let cumplen = 0, incumplen = 0;
  for (const ind of indicadores) {
    const reg = porId.get(ind.id);
    if (!reg || reg.valor == null) { pendientes.push(ind); continue; }
    const cumple = cumpleMeta(ind, reg.valor, mes);
    if (cumple === true) cumplen++;
    if (cumple === false) { incumplen++; if (!reg.accion) sinPlan.push(ind); }
  }
  return { pendientes, sinPlan, cumplen, incumplen, total: indicadores.length };
}

async function correosDe(db, procesoId) {
  const inv = await db.get(`indicadores_involucrados?proceso_id=eq.${procesoId}&select=email,notificar`);
  return inv.filter(i => i.notificar && i.email).map(i => i.email);
}

async function registrar(db, datos) { try { await db.insert('indicadores_notificaciones', datos); } catch { /* el historial no debe tumbar el envío */ } }

/** Envía a un proceso el correo que corresponda. */
async function enviarAProceso(db, env, { proceso, tipo, anio, mes, cfg, activos, appUrl, modo, forzar }) {
  const { pendientes, sinPlan, cumplen, incumplen, total } = await evaluarProceso(db, proceso, anio, mes);
  const nada = pendientes.length === 0 && sinPlan.length === 0;
  // Los envíos automáticos de los días 2 y 16 llegan a TODOS los procesos, tengan o no pendientes.
  if (tipo !== 'cierre' && nada && !forzar) return { proceso: proceso.nombre, resultado: 'sin_pendientes', destinatarios: 0 };

  const firmaDatos = datosFirma(cfg);
  const base = { proceso: proceso.nombre, mesNombre: MESES[mes - 1], anio, pendientes, firmaDatos, activos, appUrl };
  const resumen = { cumplen, incumplen, pendientes: pendientes.length, total };
  const { asunto, html } =
    tipo === 'dos_dias' ? correoDosDias({ ...base, diaCierre: cfg?.dia_cierre ?? 15 })
    : tipo === 'cierre' ? correoCierre(base)
    : correoRecordatorio({ ...base, sinPlan, resumen, diaCierre: cfg?.dia_cierre ?? 15 });

  const correos = await correosDe(db, proceso.id);
  if (!correos.length) {
    await registrar(db, { proceso_id: proceso.id, modo, destinatarios: '', asunto, indicadores_pendientes: pendientes.length, resultado: 'sin_destinatarios' });
    return { proceso: proceso.nombre, resultado: 'sin_destinatarios', destinatarios: 0 };
  }
  try {
    await enviarCorreo(env, { destinatarios: correos, asunto, html });
    await registrar(db, { proceso_id: proceso.id, modo, destinatarios: correos.join(', '), asunto, indicadores_pendientes: pendientes.length, resultado: 'enviado' });
    return { proceso: proceso.nombre, resultado: 'enviado', destinatarios: correos.length };
  } catch (e) {
    await registrar(db, { proceso_id: proceso.id, modo, destinatarios: correos.join(', '), asunto, indicadores_pendientes: pendientes.length, resultado: 'error', detalle_error: String(e.message || e).slice(0, 500) });
    return { proceso: proceso.nombre, resultado: 'error', error: String(e.message || e) };
  }
}

async function recorrerProcesos(db, env, opciones) {
  const procesos = opciones.procesoId
    ? await db.get(`indicadores_procesos?id=eq.${opciones.procesoId}&select=*`)
    : await db.get('indicadores_procesos?activo=eq.true&select=*');
  const out = [];
  for (const p of procesos) {
    try { out.push(await enviarAProceso(db, env, { ...opciones, proceso: p })); }
    catch (e) { out.push({ proceso: p.nombre, resultado: 'error', error: String(e.message || e) }); }
  }
  return out;
}

const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

function entorno(env, request) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const base = (env.URL_PUBLICA || new URL(request.url).origin).replace(/\/$/, '');
  // El logo solo se puede ver si la dirección es pública: desde localhost el
  // cliente de correo no puede descargarlo, así que en ese caso se omite y el
  // correo usa la marca en texto (que siempre se ve).
  const esLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(base);
  // LOGO_URL tiene prioridad: permite usar cualquier dirección pública
  // (por ejemplo Supabase Storage) y así el logo sale SIEMPRE, incluso
  // mientras pruebas en local.
  // El logo lo resuelve resolverLogo(): se publica solo en Supabase Storage
  // la primera vez y desde ahí lo usan todos los proveedores de correo.
  return {
    db: new Supa(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
    appUrl: esLocal ? null : base,
  };
}

/* ------------------------- Llamada manual (app) ------------------------- */
export async function onRequestPost({ request, env }) {
  try {
    const ctx = entorno(env, request);
    if (!ctx) return json({ error: 'Falta configurar SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en Cloudflare Pages.' }, 500);
    const { db, appUrl } = ctx;

    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Debes iniciar sesión.' }, 401);
    const usuario = await db.usuarioDeToken(token);
    if (!usuario) return json({ error: 'Sesión inválida.' }, 401);
    // Solo un administrador puede enviar correos o cerrar meses desde la app.
    const [fila] = await db.get(`indicadores_usuarios?user_id=eq.${encodeURIComponent(usuario.id)}&select=rol`);
    if (!fila || fila.rol !== 'admin') return json({ error: 'Solo un administrador puede enviar correos o cerrar meses.' }, 403);

    const body = await request.json().catch(() => ({}));
    const [cfg] = await db.get('indicadores_configuracion?id=eq.1&select=*');
    const activos = await resolverActivos(db, env);
    // Si la app manda un mes concreto (el que la persona está viendo) se usa ese;
    // si no, el mes anterior al actual.
    const porDefecto = mesReporteActual();
    const mesReporte = Number(body.mes) >= 1 && Number(body.mes) <= 12 ? Number(body.mes) : porDefecto.mesReporte;
    const anioReporte = Number(body.anio) || porDefecto.anioReporte;

    // Diagnóstico del logo: lo publica y devuelve la dirección, para poder
    // comprobar desde la app que quedó accesible.
    if (body.accion === 'logo') {
      _activosCache = null; // forzar la comprobación
      const a = await resolverActivos(db, env);
      let accesible = false;
      try { accesible = !!a.logo && (await fetch(a.logo, { method: 'HEAD' })).ok; } catch { accesible = false; }
      const iconos = ['cel', 'tel', 'mail', 'ubic'].filter(k => a[k]).length;
      if (!a.logo) return json({ ok: false, error: 'No se pudo publicar el logo en Supabase Storage. Revisa que SUPABASE_SERVICE_ROLE_KEY sea correcta.' }, 500);
      return json({ ok: true, logoUrl: a.logo, accesible, iconos });
    }

    // Correo de prueba: se envía siempre, para comprobar que el envío funciona
    if (body.accion === 'prueba') {
      const destino = (body.destinatarios && body.destinatarios[0]) || cfg?.firma_email;
      if (!destino) return json({ error: 'Escribe un correo de destino o configura el correo de la firma.' }, 400);
      const { asunto, html } = correoLibre({
        titulo: 'Correo de prueba del Sistema Integrado de Gestión',
        mensaje: 'Este es un correo de prueba.\n\nSi lo estás leyendo, la configuración de envío quedó funcionando correctamente y los recordatorios automáticos podrán salir sin problema.',
        firmaDatos: datosFirma(cfg), activos, appUrl,
      });
      await enviarCorreo(env, { destinatarios: [destino], asunto, html });
      await registrar(db, { modo: 'prueba', destinatarios: destino, asunto, resultado: 'enviado' });
      return json({ ok: true, resultado: 'enviado', destinatarios: 1, destino });
    }

    // Correo libre redactado por el administrador
    if (body.accion === 'libre') {
      if (!body.titulo || !body.mensaje) return json({ error: 'Escribe el asunto y el mensaje.' }, 400);
      let correos = Array.isArray(body.destinatarios) ? body.destinatarios.filter(Boolean) : [];
      if (!correos.length) {
        const procesos = body.procesoId
          ? await db.get(`indicadores_procesos?id=eq.${body.procesoId}&select=id,nombre`)
          : await db.get('indicadores_procesos?activo=eq.true&select=id,nombre');
        for (const p of procesos) correos.push(...await correosDe(db, p.id));
      }
      correos = [...new Set(correos)];
      if (!correos.length) return json({ ok: true, resultado: 'sin_destinatarios', destinatarios: 0 });
      const { asunto, html } = correoLibre({ titulo: body.titulo, mensaje: body.mensaje, firmaDatos: datosFirma(cfg), activos, appUrl });
      await enviarCorreo(env, { destinatarios: correos, asunto, html });
      await registrar(db, { proceso_id: body.procesoId || null, modo: 'libre', destinatarios: correos.join(', '), asunto, resultado: 'enviado' });
      return json({ ok: true, resultado: 'enviado', destinatarios: correos.length });
    }

    const tipo = ['dos_dias', 'cierre'].includes(body.accion) ? body.accion : 'recordatorio';
    if (tipo === 'cierre') {
      await db.upsert('indicadores_cierres', { anio: anioReporte, mes: mesReporte, cerrado: true, cerrado_en: new Date().toISOString() }, 'anio,mes');
    }
    const resultados = await recorrerProcesos(db, env, { tipo, anio: anioReporte, mes: mesReporte, cfg, activos, appUrl, modo: 'manual', procesoId: body.procesoId });
    return json({ ok: true, mes: mesReporte, anio: anioReporte, mesNombre: MESES[mesReporte - 1], resultados, ...(resultados.length === 1 ? resultados[0] : {}) });
  } catch (e) {
    return json({ error: e.message || 'Error inesperado del servidor.' }, 500);
  }
}

/* --------------------- Llamada diaria del programador -------------------- */
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    if (!env.CRON_SECRET || url.searchParams.get('secret') !== env.CRON_SECRET) return json({ error: 'No autorizado.' }, 401);
    const ctx = entorno(env, request);
    if (!ctx) return json({ error: 'Falta configurar SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.' }, 500);
    const { db, appUrl } = ctx;

    const [cfg] = await db.get('indicadores_configuracion?id=eq.1&select=*');
    if (!cfg || !cfg.activo) return json({ ok: true, omitido: 'inactivo' });
    const activos = await resolverActivos(db, env);

    const hoy = ahoraColombia();
    const hoyISO = hoy.iso;
    const dia = hoy.dia;
    const diaCierre = cfg.dia_cierre ?? 15;
    const diaAviso = Math.max(1, diaCierre - 2);
    const { anioReporte, mesReporte } = mesReporteActual();
    const salida = { ok: true, fecha: hoyISO };
    const comun = { anio: anioReporte, mes: mesReporte, cfg, activos, appUrl, modo: 'automatico' };
    const esteMes = hoyISO.slice(0, 7);
    const yaEnviado = fecha => String(fecha || '').slice(0, 7) === esteMes;

    // Latido: queda anotado que el despertador llamó, así el administrador ve que funciona.
    try { await db.patch('indicadores_configuracion?id=eq.1', { ultimo_pulso: new Date().toISOString() }); } catch { /* si la columna aún no existe, no pasa nada */ }

    // Recordatorio del mes anterior (día 2 por defecto) a TODOS los procesos, con pendientes o sin ellos.
    // Si el despertador falló ese día, se recupera en los días siguientes, una sola vez al mes.
    if (dia >= cfg.dia_envio && dia < diaAviso && !yaEnviado(cfg.ultimo_envio_auto)) {
      salida.recordatorio = await recorrerProcesos(db, env, { ...comun, tipo: 'recordatorio', forzar: true });
      await db.patch('indicadores_configuracion?id=eq.1', { ultimo_envio_auto: hoyISO });
    }

    // Aviso de dos días antes del cierre (solo a quienes tienen pendientes), también con recuperación
    if (dia >= diaAviso && dia <= diaCierre && !yaEnviado(cfg.ultimo_aviso_cierre)) {
      salida.dos_dias = await recorrerProcesos(db, env, { ...comun, tipo: 'dos_dias' });
      await db.patch('indicadores_configuracion?id=eq.1', { ultimo_aviso_cierre: hoyISO });
    }

    // Cierre: se cierra el mes y se avisa a todos. Solo si nadie decidió ya sobre ese mes:
    // si un administrador lo reabrió, esa decisión se respeta y no se vuelve a cerrar.
    // diaCierre es el ÚLTIMO día para registrar: el mes se cierra al día siguiente.
    if (dia > diaCierre) {
      const [c] = await db.get(`indicadores_cierres?anio=eq.${anioReporte}&mes=eq.${mesReporte}&select=*`);
      if (!c) {
        await db.upsert('indicadores_cierres', { anio: anioReporte, mes: mesReporte, cerrado: true, cerrado_en: new Date().toISOString() }, 'anio,mes');
        salida.cierre = await recorrerProcesos(db, env, { ...comun, tipo: 'cierre' });
      } else salida.cierre = c.cerrado ? 'ya_cerrado' : 'reabierto_por_un_administrador';
    }

    return json(salida);
  } catch (e) {
    return json({ error: e.message || 'Error inesperado del servidor.' }, 500);
  }
}
