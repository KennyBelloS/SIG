/** Preferencias de la persona: tamaño de letra, movimiento reducido y (aparte) el tema. Se guardan y se aplican al arrancar. */
const L = 'tm:letra', M = 'tm:movimiento';
const leer = k => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* nada */ } };
export const letraActual = () => document.documentElement.dataset.letra || 'normal';
export const movimientoActual = () => document.documentElement.dataset.movimiento || 'auto';
export function aplicarLetra(n) { document.documentElement.dataset.letra = n; guardar(L, n); window.dispatchEvent(new Event('tm:preferencias')); }
export function aplicarMovimiento(m) { document.documentElement.dataset.movimiento = m; guardar(M, m); window.dispatchEvent(new Event('tm:preferencias')); }
export function iniciarPreferencias() {
  const estrecha = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  document.documentElement.dataset.letra = leer(L) || (estrecha ? 'grande' : 'normal');   // en el celular la letra arranca más grande
  document.documentElement.dataset.movimiento = leer(M) === 'reducido' ? 'reducido' : 'auto';
}
/** ¿Hay que evitar el movimiento? Sí si la persona lo pidió aquí o si su equipo lo pide. */
export const menosMovimiento = () => typeof document !== 'undefined' && (document.documentElement.dataset.movimiento === 'reducido' || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
