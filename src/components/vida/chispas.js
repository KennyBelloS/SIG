/** Un puñado de chispitas que salen de un punto (el despegue del avión desde la isla). */
export function chispas({ x, y, n = 8 }) {
  const capa = document.createElement('div'); capa.className = 'vuelo-capa fija'; capa.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < n; i++) {
    const c = document.createElement('b'), a = (Math.PI * 2 * i) / n + Math.random() * 0.5, d = 26 + Math.random() * 26;
    c.className = 'vuelo-chispa'; c.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`; capa.appendChild(c);
  }
  document.body.appendChild(capa); setTimeout(() => capa.remove(), 900);
}
