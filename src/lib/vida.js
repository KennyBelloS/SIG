import { menosMovimiento } from './preferencias';
/** Los botones con vida: cada toque lanza una onda desde el dedo y un «choque» (anillo que se expande); además guarda el último clic
 *  para que las transiciones entre módulos nazcan de ahí. Se instala una sola vez. */
const CON_ONDA = '.btn-primary,.btn-secondary,.btn-danger,.btn-chico,.mv-fab,.mast-crear,.crear-carta,.instalar-boton,.hoja-lista button,.mv-lapiz,.rv-carta,.lab-boton,.aviso-version .btn-primary';
const SOLO_CHOQUE = '.campana,.mast-buscar,.mv-buscar-texto,.tema-perilla,.mast-usuario-btn,.mv-avatar';
export function iniciarVida() {
  if (typeof window === 'undefined' || window.__vida) return;
  window.__vida = true;
  iniciarReveal();
  const menos = () => menosMovimiento();
  document.addEventListener('pointerdown', e => {
    if (menos()) return;
    const el = e.target.closest?.(`${CON_ONDA},${SOLO_CHOQUE}`);
    if (!el || el.disabled) return;
    el.classList.remove('choque'); void el.offsetWidth; el.classList.add('choque'); setTimeout(() => el.classList.remove('choque'), 700);
    if (!el.matches(CON_ONDA)) return;
    const r = el.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.4, o = document.createElement('span');
    o.className = 'onda-boton'; o.setAttribute('aria-hidden', 'true');
    o.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    // la onda necesita que el botón recorte y sea su propia referencia; pero a un botón que ya está posicionado (sticky, fixed, absolute) NO se le cambia la posición
    el.classList.add('con-onda'); if (getComputedStyle(el).position === 'static') el.classList.add('onda-rel');
    el.appendChild(o); setTimeout(() => o.remove(), 700);
  }, { passive: true });
  document.addEventListener('click', e => { if (e.clientX || e.clientY) { document.documentElement.style.setProperty('--nx', `${e.clientX}px`); document.documentElement.style.setProperty('--ny', `${e.clientY}px`); } }, true);
}

/** Aparición animada: los bloques de contenido (paneles, tarjetas, procesos) entran con un movimiento al llegar a la vista, y sus hijos
 *  lo hacen uno tras otro. Los que ya están a la vista entran de inmediato; los de más abajo esperan a que se llegue a ellos. */
const REVELAR = '.contenido .panel, .contenido .im-proceso, .contenido .im-carta, .contenido .lab-grupo, .contenido .estado-vacio, .contenido .cajetin';
export function iniciarReveal() {
  if (typeof window === 'undefined' || window.__reveal || !('IntersectionObserver' in window)) return;
  window.__reveal = true;
  const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { e.target.classList.remove('rev'); e.target.classList.add('rev-in'); io.unobserve(e.target); } }, { rootMargin: '0px', threshold: 0 });
  const preparar = el => {
    if (el.dataset.rev) return; el.dataset.rev = '1';
    if (menosMovimiento()) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.95) el.classList.add('rev-in'); else { el.classList.add('rev'); io.observe(el); }
  };
  // si se salta de golpe (fin de página, ancla, teclado), lo que quedó ARRIBA nunca «entra» a la vista: se muestra sin animación
  let alisando = false;
  document.addEventListener('scroll', () => {
    if (alisando) return; alisando = true;
    requestAnimationFrame(() => { alisando = false; document.querySelectorAll('.rev').forEach(el => { const r = el.getBoundingClientRect(); if (r.bottom < 0) { el.classList.remove('rev'); el.classList.add('rev-hecho'); io.unobserve(el); } }); });
  }, { passive: true, capture: true });
  let pendiente = false;
  const barrer = () => { pendiente = false; document.querySelectorAll(REVELAR).forEach(preparar); };
  new MutationObserver(() => { if (!pendiente) { pendiente = true; requestAnimationFrame(barrer); } }).observe(document.documentElement, { childList: true, subtree: true });
  barrer();
}
