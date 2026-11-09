/** Modo claro / oscuro. Se guarda la elección; el cambio se revela como un círculo que crece desde el interruptor (View Transitions, si el navegador las tiene). */
const CLAVE = 'tm:tema';
const meta = t => { const m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', t === 'oscuro' ? '#0B1410' : '#F5F4EF'); };
export const temaActual = () => (document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro');

export function inicializarTema() {
  let t = 'claro';
  try { t = localStorage.getItem(CLAVE) === 'oscuro' ? 'oscuro' : 'claro'; } catch { /* nada */ }
  document.documentElement.dataset.tema = t; meta(t);
}

export function aplicarTema(t, origen) {
  const poner = () => { document.documentElement.dataset.tema = t; try { localStorage.setItem(CLAVE, t); } catch { /* nada */ } meta(t); window.dispatchEvent(new Event('tm:tema')); };
  const menos = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || menos) { poner(); return; }
  const x = origen?.x ?? window.innerWidth / 2, y = origen?.y ?? window.innerHeight / 2;
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const vt = document.startViewTransition(poner);
  vt.ready.then(() => document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] }, { duration: 650, easing: 'cubic-bezier(.7,0,.2,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});
}
