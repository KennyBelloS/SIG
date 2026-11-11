import { proximaDepuracion } from './depuracion';
import { useEffect, useState } from 'react';
import { esIOS, esAndroid } from './movil';
import { getResumenMes, mesReporteActual, MESES } from './indicadores';

/** Plataforma para decidir de dónde sale el avión. Se puede forzar (pruebas) con window.__TM_PLATAFORMA o localStorage tm:plataforma-prueba. */
export function plataforma() {
  let forzada = typeof window !== 'undefined' ? window.__TM_PLATAFORMA : null;
  if (!forzada) { try { forzada = localStorage.getItem('tm:plataforma-prueba'); } catch { /* nada */ } }
  if (forzada) return forzada;
  return esIOS() ? 'ios' : esAndroid() ? 'android' : 'pc';
}
export const NOMBRE_PLATAFORMA = { ios: 'iPhone: sale de la isla', android: 'Android: sale de abajo, al centro', pc: 'Computador: sale de la esquina inferior derecha' };

/** El punto de partida del avión según la plataforma, dentro de un espacio de ancho×alto (la pantalla o el marco de un dispositivo de prueba). */
export function origenVuelo(plat, ancho, alto, arriba = 0) {
  if (plat === 'ios') return { x: ancho / 2, y: arriba + 26 };
  if (plat === 'android') return { x: ancho / 2, y: alto - 84 };
  return { x: ancho - 34, y: alto - 34 };
}

const CLAVE = 'tm:avisos-vistos';
const vistos = () => { try { return new Set(JSON.parse(localStorage.getItem(CLAVE) || '[]')); } catch { return new Set(); } };
let lista = [];
const oyentes = new Set();
const emitir = () => oyentes.forEach(f => f());

export const avisosActuales = () => lista;

/** Avisos del navegador: si la pestaña está en segundo plano, un aviso nuevo también sale como notificación del sistema (no llega con la app cerrada). */
const NAV = 'tm:avisos-nav';
export const avisosNavegadorSoportados = () => typeof Notification !== 'undefined';
export const avisosNavegadorBloqueados = () => avisosNavegadorSoportados() && Notification.permission === 'denied';
export const avisosNavegadorActivos = () => { try { return localStorage.getItem(NAV) === '1' && avisosNavegadorSoportados() && Notification.permission === 'granted'; } catch { return false; } };
export async function activarAvisosNavegador(si) {
  try {
    if (!si) { localStorage.setItem(NAV, '0'); return false; }
    if (!avisosNavegadorSoportados()) return false;
    let p = Notification.permission; if (p === 'default') p = await Notification.requestPermission();
    if (p === 'granted') { localStorage.setItem(NAV, '1'); return true; }
  } catch { /* sin permiso */ }
  return false;
}

/** Agrega avisos (sin repetir los que ya están). Si hay alguno sin ver, avisa UNA vez con 'tm:aviso-nuevo' para que salga el avión. */
export function agregarAvisos(nuevos, { silencioso = false } = {}) {
  const v = vistos();
  const reales = nuevos.filter(a => !lista.some(x => x.id === a.id)).map(a => ({ hora: Date.now(), tono: 'info', icono: 'fa-bell', ...a, visto: v.has(a.id) }));
  if (!reales.length) return;
  lista = [...reales, ...lista]; emitir();
  const sinVer = reales.filter(a => !a.visto);
  if (!silencioso && sinVer.length) {
    window.dispatchEvent(new CustomEvent('tm:aviso-nuevo', { detail: { ...sinVer[0], cantidad: sinVer.length } }));
    if (document.hidden && avisosNavegadorActivos()) { try { new Notification(sinVer[0].titulo + (sinVer.length > 1 ? ` (+${sinVer.length - 1})` : ''), { body: sinVer[0].detalle || '', icon: '/icon-192.png' }); } catch { /* nada */ } }
  }
}
export const agregarAviso = (a, o) => agregarAvisos([a], o);

export function marcarVistos() {
  const v = vistos(); lista.forEach(a => v.add(a.id));
  try { localStorage.setItem(CLAVE, JSON.stringify([...v].slice(-200))); } catch { /* nada */ }
  lista = lista.map(a => ({ ...a, visto: true })); emitir();
}
export function useAvisos() {
  const [, f] = useState(0);
  useEffect(() => { const o = () => f(n => n + 1); oyentes.add(o); return () => oyentes.delete(o); }, []);
  return { avisos: lista, sinVer: lista.filter(a => !a.visto).length };
}
if (typeof window !== 'undefined') window.__tmAvisos = { agregarAviso, agregarAvisos };   // para las pruebas y el laboratorio de animaciones

/** Los avisos que salen de cómo va el mes: plazo, pendientes y los que no cumplen y no tienen plan. */
export async function avisosDeLaSesion(sesion) {
  const { anio, mesActual } = mesReporteActual();
  const r = await getResumenMes(anio, mesActual);
  const t = r.totales, mes = MESES[mesActual - 1].toLowerCase(), restan = r.diaCierre - new Date().getDate(), out = [];
  if (r.cerrado) out.push({ id: `cerrado-${anio}-${mesActual}`, tono: 'mal', icono: 'fa-lock', titulo: `${MESES[mesActual - 1]} está cerrado`, detalle: 'Solo un administrador puede reabrirlo.', ruta: '/indicadores' });
  else if (restan <= 3) out.push({ id: `plazo-${anio}-${mesActual}-${restan}`, tono: restan <= 1 ? 'mal' : 'aten', icono: 'fa-hourglass-half', titulo: restan <= 0 ? `Hoy es el último día para registrar ${mes}` : `Quedan ${restan} ${restan === 1 ? 'día' : 'días'} para registrar ${mes}`, detalle: `El ${r.diaCierre} se cierra el mes.`, ruta: '/indicadores' });
  if (sesion?.puedeRegistrar && t.pendientes > 0 && !r.cerrado) out.push({ id: `pend-${anio}-${mesActual}-${t.pendientes}`, tono: 'aten', icono: 'fa-list-check', titulo: `Faltan ${t.pendientes} indicadores por registrar`, detalle: `De ${t.indicadores} que hay en ${mes}.`, ruta: '/indicadores' });
  if (t.sinPlan > 0) out.push({ id: `plan-${anio}-${mesActual}-${t.sinPlan}`, tono: 'mal', icono: 'fa-triangle-exclamation', titulo: `${t.sinPlan} ${t.sinPlan === 1 ? 'indicador no cumple y no tiene' : 'indicadores no cumplen y no tienen'} plan de acción`, detalle: 'Necesitan una acción correctiva.', ruta: '/indicadores' });
  // La actividad y los accesos se eliminan el primer martes del mes: se avisa a los administradores de 5 días antes (con 2 de plazo para cancelar)
  if (sesion?.esAdmin) {
    const plan = proximaDepuracion();
    let cancelada = false; try { cancelada = localStorage.getItem(`tm:dep-cancelada:${plan.iso}`) === '1'; } catch { /* nada */ }
    if (plan.faltan >= 1 && plan.faltan <= 5 && !cancelada) out.push({ id: `bitacora-${plan.iso}`, tono: plan.faltan <= 2 ? 'mal' : 'aten', icono: 'fa-clock-rotate-left', titulo: plan.faltan === 1 ? 'Mañana se eliminan los accesos y la actividad' : `El ${plan.texto} se eliminan los accesos y la actividad`, detalle: 'Puedes cancelarlo o descargarlos antes en la Bitácora.', ruta: '/bitacora' });
  }
  return out;
}
