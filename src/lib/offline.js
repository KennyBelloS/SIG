import { supabase } from './supabaseClient';

/** Registrar indicadores SIN INTERNET: lo que se guarda mientras no hay conexión queda aquí, en el propio
 *  equipo (localStorage), y se envía solo en cuanto vuelve la señal. Si mientras tanto alguien más (desde
 *  otro equipo, con internet) ya guardó un valor distinto para el mismo indicador/mes, NO se sobrescribe
 *  en silencio: queda marcado como «conflicto» para que la persona decida qué hacer. */

const CLAVE = 'tm:cola-offline';
let sincronizando = false;

function leer() {
  try { return JSON.parse(localStorage.getItem(CLAVE) || '[]'); } catch { return []; }
}
function escribir(cola) {
  try { localStorage.setItem(CLAVE, JSON.stringify(cola)); } catch { /* si no hay almacenamiento, no se puede encolar */ }
  window.dispatchEvent(new Event('tm:cola-cambio'));
}

export function obtenerCola() { return leer(); }

/** ¿Hay internet de verdad? navigator.onLine puede mentir (dice «sí» con wifi sin salida a internet),
 *  así que además probamos a tocar la propia API de Supabase con un tiempo límite corto. */
export async function hayConexionReal() {
  if (!navigator.onLine) return false;
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url) return navigator.onLine;
    const controlador = new AbortController();
    const t = setTimeout(() => controlador.abort(), 3500);
    const r = await fetch(`${url}/auth/v1/health`, { signal: controlador.signal, cache: 'no-store' });
    clearTimeout(t);
    return r.ok || r.status === 404;   // 404 también cuenta: respondió el servidor, hay internet
  } catch { return false; }
}

/** Guarda un registro en la cola para enviarlo después. `vistoEn` es el «actualizado_en» que la persona
 *  tenía en pantalla cuando empezó a escribir (para detectar si alguien más cambió el dato mientras tanto). */
export function encolarRegistro(payload, vistoEn) {
  const cola = leer();
  const idCola = `${payload.indicador_id}-${payload.anio}-${payload.mes}`;
  const item = { idCola, payload, vistoEn: vistoEn || null, creadoEn: new Date().toISOString(), estado: 'pendiente' };
  const i = cola.findIndex(x => x.idCola === idCola);
  if (i >= 0) cola[i] = item; else cola.push(item);   // si ya había uno de ese mismo indicador/mes sin enviar, se reemplaza por el más nuevo
  escribir(cola);
  return item;
}

export function quitarDeCola(idCola) { escribir(leer().filter(x => x.idCola !== idCola)); }

/** El de más abajo decide: «Usar el mío» reintenta el envío saltándose el choque; «Descartar el mío» solo lo quita de la cola. */
export async function forzarEnvio(idCola) {
  const cola = leer(); const item = cola.find(x => x.idCola === idCola); if (!item) return;
  const { error } = await supabase.from('indicadores_registros').upsert(item.payload, { onConflict: 'indicador_id,anio,mes' });
  if (error) throw error;
  quitarDeCola(idCola);
}
export function descartarDeCola(idCola) { quitarDeCola(idCola); }

/** Mezcla lo que todavía no se ha podido enviar con lo que vino del servidor, para que la persona
 *  siga viendo su propio dato (con un avisito de «pendiente») aunque el servidor aún no lo tenga. */
export function fusionarConCola(registros) {
  const cola = leer(); if (cola.length === 0) return registros;
  const porLlave = new Map(registros.map(r => [`${r.indicador_id}-${r.anio}-${r.mes}`, r]));
  for (const item of cola) {
    if (item.estado === 'conflicto') continue;   // mientras hay choque sin resolver, se respeta lo del servidor
    porLlave.set(item.idCola, { ...(porLlave.get(item.idCola) || {}), ...item.payload, _pendienteOffline: true });
  }
  return Array.from(porLlave.values());
}

/** Intenta enviar, en orden, todo lo que esté pendiente. Antes de cada uno revisa si alguien más ya
 *  guardó algo más nuevo para ese mismo indicador/mes: si fue así, lo deja marcado como «conflicto»
 *  en vez de pisarlo. Se llama sola al recuperar internet, y de refuerzo cada minuto mientras hay cola. */
export async function sincronizarCola() {
  if (sincronizando) return; sincronizando = true;
  try {
    if (!(await hayConexionReal())) return;
    const cola = leer();
    for (const item of cola) {
      if (item.estado === 'conflicto') continue;   // ese espera a que la persona decida, no se reintenta solo
      try {
        if (item.vistoEn) {
          const { data } = await supabase.from('indicadores_registros').select('actualizado_en')
            .eq('indicador_id', item.payload.indicador_id).eq('anio', item.payload.anio).eq('mes', item.payload.mes).maybeSingle();
          if (data?.actualizado_en && new Date(data.actualizado_en) > new Date(item.vistoEn)) {
            const actual = leer(); const i = actual.findIndex(x => x.idCola === item.idCola);
            if (i >= 0) { actual[i] = { ...actual[i], estado: 'conflicto', valorServidor: data }; escribir(actual); }
            continue;
          }
        }
        const { error } = await supabase.from('indicadores_registros').upsert(item.payload, { onConflict: 'indicador_id,anio,mes' });
        if (error) throw error;
        quitarDeCola(item.idCola);
      } catch { /* sigue sin internet o falló: se queda en la cola para el próximo intento */ }
    }
  } finally { sincronizando = false; }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', sincronizarCola);
  setInterval(() => { if (leer().length > 0) sincronizarCola(); }, 60000);
  setTimeout(sincronizarCola, 3000);   // por si quedó algo pendiente de una sesión anterior
}
