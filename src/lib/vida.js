/** Los botones con vida: cada toque lanza una onda desde el dedo y un «choque» (anillo que se expande); además guarda el último clic
 *  para que las transiciones entre módulos nazcan de ahí. Se instala una sola vez. */
const CON_ONDA = '.btn-primary,.btn-secondary,.btn-danger,.btn-chico,.mv-fab,.mast-crear,.crear-carta,.instalar-boton,.hoja-lista button,.mv-lapiz,.rv-carta,.lab-boton,.aviso-version .btn-primary';
const SOLO_CHOQUE = '.campana,.mast-buscar,.mv-buscar-texto,.tema-perilla,.mast-usuario-btn,.mv-avatar';
export function iniciarVida() {
  if (typeof window === 'undefined' || window.__vida) return;
  window.__vida = true;
  const menos = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('pointerdown', e => {
    if (menos()) return;
    const el = e.target.closest?.(`${CON_ONDA},${SOLO_CHOQUE}`);
    if (!el || el.disabled) return;
    el.classList.remove('choque'); void el.offsetWidth; el.classList.add('choque'); setTimeout(() => el.classList.remove('choque'), 700);
    if (!el.matches(CON_ONDA)) return;
    const r = el.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.4, o = document.createElement('span');
    o.className = 'onda-boton'; o.setAttribute('aria-hidden', 'true');
    o.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    el.classList.add('con-onda'); el.appendChild(o); setTimeout(() => o.remove(), 700);
  }, { passive: true });
  document.addEventListener('click', e => { if (e.clientX || e.clientY) { document.documentElement.style.setProperty('--nx', `${e.clientX}px`); document.documentElement.style.setProperty('--ny', `${e.clientY}px`); } }, true);
}
