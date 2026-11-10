/** El avión (o la flecha) que sale de un punto, dibuja una curva con un rastro de puntitos y llega a su destino.
 *  Funciona sobre toda la pantalla (contenedor = body) o dentro de un marco de dispositivo de prueba. Sin dependencias. */
export function volar({ contenedor = document.body, desde, hasta, icono = 'avion', duracion = 1150, alLlegar, swoop = false }) {
  const capa = document.createElement('div');
  capa.className = `vuelo-capa${contenedor === document.body ? ' fija' : ''}`;
  capa.setAttribute('aria-hidden', 'true');
  const nave = document.createElement('i');
  nave.className = `vuelo-nave fa-solid ${icono === 'flecha' ? 'fa-location-arrow' : 'fa-paper-plane'}`;
  nave.style.transform = `translate(${desde.x}px, ${desde.y}px) translate(-50%, -50%) scale(${swoop ? 0.25 : 1})`;   // ya en su sitio de salida desde el primer cuadro
  capa.appendChild(nave); contenedor.appendChild(capa);

  const punto = (t, a, b, c) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
  const suave = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const t0 = performance.now();
  let ultimo = 0, terminado = false;
  const fin = () => { if (terminado) return; terminado = true; nave.remove(); setTimeout(() => capa.remove(), 900); if (alLlegar) alLlegar(); };
  const paso = ahora => {
    if (terminado) return;
    const H = (typeof hasta === 'function' ? hasta() : hasta) || desde;
    const p = Math.min(1, (ahora - t0) / duracion), t = suave(p);
    let x, y, dx, dy, esc;
    if (swoop) {   // sale de la isla: baja un poco hacia afuera, hace una curva amplia y sube hasta la campana; nace pequeño y crece al salir
      const P1 = { x: desde.x + 36, y: desde.y + 120 }, P2 = { x: H.x - 100, y: H.y + 96 }, u = 1 - t;
      x = u * u * u * desde.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * H.x; y = u * u * u * desde.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * H.y;
      dx = 3 * u * u * (P1.x - desde.x) + 6 * u * t * (P2.x - P1.x) + 3 * t * t * (H.x - P2.x); dy = 3 * u * u * (P1.y - desde.y) + 6 * u * t * (P2.y - P1.y) + 3 * t * t * (H.y - P2.y);
      esc = t < 0.2 ? 0.25 + 0.75 * (t / 0.2) : 1 - 0.38 * ((t - 0.2) / 0.8);
    } else {
      const ctrl = { x: (desde.x + H.x) / 2 + (H.y > desde.y ? 70 : -70) * 0.3, y: Math.min(desde.y, H.y) - Math.max(70, Math.abs(H.x - desde.x) * 0.22) };
      x = punto(t, desde.x, ctrl.x, H.x); y = punto(t, desde.y, ctrl.y, H.y);
      dx = 2 * (1 - t) * (ctrl.x - desde.x) + 2 * t * (H.x - ctrl.x); dy = 2 * (1 - t) * (ctrl.y - desde.y) + 2 * t * (H.y - ctrl.y); esc = 1 - 0.35 * t;
    }
    nave.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg) scale(${esc})`;
    if (ahora - ultimo > 34 && p < 1) {
      ultimo = ahora;
      const d = document.createElement('b'); d.className = 'vuelo-punto'; d.style.left = `${x}px`; d.style.top = `${y}px`;
      capa.appendChild(d); setTimeout(() => d.remove(), 760);
    }
    if (p < 1) requestAnimationFrame(paso); else fin();
  };
  requestAnimationFrame(paso);
  return { cancelar() { terminado = true; capa.remove(); } };
}
