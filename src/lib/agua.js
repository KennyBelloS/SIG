import { menosMovimiento } from './preferencias';

/* La gota de agua, en todos los títulos de la aplicación.
 *
 * En vez de ir archivo por archivo envolviendo cada título, esto recorre la pantalla y parte en
 * letras los encabezados que encuentre. Así cubre también las pantallas que se escriban mañana,
 * sin que nadie tenga que acordarse de nada.
 *
 * Solo encabezados: ponerle esto a CADA letra de la aplicación (párrafos, celdas de tablas, listas)
 * significaría miles de elementos extra en pantalla, la volvería lenta y rompería el poder
 * seleccionar y copiar texto. En los títulos es donde se ve y donde no estorba.
 */

const SELECTOR = 'h1, h2, h3, .cajetin-titulo, .hero-dash h1';
const RADIO = 58;
let raf = 0;

function partir(el) {
  if (el.dataset.agua) return;                       // ya está hecho
  if (el.querySelector('*')) return;                 // tiene otros elementos dentro: no se toca
  const texto = el.textContent;
  if (!texto || texto.length > 70) return;           // títulos muy largos: no vale la pena
  el.dataset.agua = '1';
  el.classList.add('texto-agua');
  el.setAttribute('aria-label', texto);              // los lectores de pantalla siguen leyendo la frase entera
  el.textContent = '';
  for (const c of texto) {
    const s = document.createElement('span');
    s.className = c === ' ' ? 'ta-esp' : 'ta-l';
    s.textContent = c;
    s.setAttribute('aria-hidden', 'true');
    if (c !== ' ') s.style.setProperty('--k', '0');
    el.appendChild(s);
  }
}

function alMover(e) {
  if (raf) return;
  const x = e.clientX, y = e.clientY;
  raf = requestAnimationFrame(() => {
    raf = 0;
    document.querySelectorAll('.texto-agua[data-agua]').forEach(t => {
      const c = t.getBoundingClientRect();
      // solo se calcula si el cursor anda cerca de ese título
      if (y < c.top - 40 || y > c.bottom + 40) {
        if (t.dataset.activo) { t.querySelectorAll('.ta-l').forEach(l => l.style.setProperty('--k', '0')); delete t.dataset.activo; }
        return;
      }
      t.dataset.activo = '1';
      t.querySelectorAll('.ta-l').forEach(l => {
        const r = l.getBoundingClientRect();
        const d = Math.abs(x - (r.left + r.width / 2));
        const k = d > RADIO ? 0 : (1 + Math.cos((d / RADIO) * Math.PI)) / 2;
        l.style.setProperty('--k', k.toFixed(3));
      });
    });
  });
}

/** Se llama una vez al arrancar. Vuelve a repasar la pantalla cuando cambia de sección. */
export function iniciarAgua() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(hover: none)').matches) return;   // pantalla táctil: no hay «pasar por encima»
  if (menosMovimiento()) return;

  const repasar = () => document.querySelectorAll(SELECTOR).forEach(partir);
  repasar();

  // los títulos que aparecen después (al navegar, al abrir una hoja) también entran
  const obs = new MutationObserver(() => { if (!raf) repasar(); });
  obs.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('pointermove', alMover, { passive: true });
}
