/** El avión (o la flecha) que sale de un punto, dibuja una curva con un rastro de puntitos y llega a su destino.
 *  Funciona sobre toda la pantalla (contenedor = body) o dentro de un marco de dispositivo de prueba. Sin dependencias. */
export function volar({ contenedor = document.body, desde, hasta, icono = 'avion', duracion = 1150, alLlegar }) {
  const capa = document.createElement('div');
  capa.className = `vuelo-capa${contenedor === document.body ? ' fija' : ''}`;
  capa.setAttribute('aria-hidden', 'true');
  const nave = document.createElement('i');
  nave.className = `vuelo-nave fa-solid ${icono === 'flecha' ? 'fa-location-arrow' : 'fa-paper-plane'}`;
  nave.style.transform = `translate(${desde.x}px, ${desde.y}px) translate(-50%, -50%)`;   // ya en su sitio de salida desde el primer cuadro
  capa.appendChild(nave); contenedor.appendChild(capa);

  const ctrl = { x: (desde.x + hasta.x) / 2 + (hasta.y > desde.y ? 70 : -70) * 0.3, y: Math.min(desde.y, hasta.y) - Math.max(70, Math.abs(hasta.x - desde.x) * 0.22) };
  const punto = (t, a, b, c) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
  const suave = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const t0 = performance.now();
  let ultimo = 0, terminado = false;
  const fin = () => { if (terminado) return; terminado = true; nave.remove(); setTimeout(() => capa.remove(), 900); if (alLlegar) alLlegar(); };
  const paso = ahora => {
    if (terminado) return;
    const p = Math.min(1, (ahora - t0) / duracion), t = suave(p);
    const x = punto(t, desde.x, ctrl.x, hasta.x), y = punto(t, desde.y, ctrl.y, hasta.y);
    const dx = 2 * (1 - t) * (ctrl.x - desde.x) + 2 * t * (hasta.x - ctrl.x), dy = 2 * (1 - t) * (ctrl.y - desde.y) + 2 * t * (hasta.y - ctrl.y);
    nave.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg) scale(${1 - 0.35 * t})`;
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
