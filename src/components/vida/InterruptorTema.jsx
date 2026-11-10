import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { aplicarTema, temaActual } from '../../lib/tema';

const TRAZO = 'M 58 34 C 132 28 196 52 214 104';
const VB = { w: 260, h: 130 };
/** El interruptor de modo oscuro: una perilla ancha de vidrio verde que se desliza por una ranura curva hasta la luna. Se arrastra, se toca o se usa con flechas. */
export default function InterruptorTema({ rol = 'switch', etiqueta = false }) {
  const [t, setT] = useState(() => (temaActual() === 'oscuro' ? 1 : 0));
  const [p, setP] = useState({ x: 58, y: 34, a: 0 });
  const trazo = useRef(null), caja = useRef(null), perilla = useRef(null), arrastre = useRef(null);

  const punto = tt => { const el = trazo.current; if (!el) return null; const L = el.getTotalLength(), q = el.getPointAtLength(L * tt), q2 = el.getPointAtLength(L * Math.min(1, tt + 0.02)); return { x: q.x, y: q.y, a: Math.atan2(q2.y - q.y, q2.x - q.x) * 180 / Math.PI }; };
  useLayoutEffect(() => { const q = punto(t); if (q) setP(q); }, [t]);
  useEffect(() => { const f = () => setT(temaActual() === 'oscuro' ? 1 : 0); window.addEventListener('tm:tema', f); return () => window.removeEventListener('tm:tema', f); }, []);

  const centro = () => { const r = perilla.current.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const irA = destino => {
    const origen = centro(), a = t, t0 = performance.now(), dur = 560;
    aplicarTema(destino ? 'oscuro' : 'claro', origen);
    const paso = ahora => { const k = Math.min(1, (ahora - t0) / dur), e = 1 - Math.pow(1 - k, 3); setT(a + (destino - a) * e); if (k < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  };
  const cercano = (cx, cy) => {
    const r = caja.current.getBoundingClientRect(), x = (cx - r.left) / r.width * VB.w, y = (cy - r.top) / r.height * VB.h;
    let mejor = 0, d = 1e9; for (let i = 0; i <= 60; i++) { const q = punto(i / 60), dd = (q.x - x) ** 2 + (q.y - y) ** 2; if (dd < d) { d = dd; mejor = i / 60; } } return mejor;
  };
  const abajo = e => { e.preventDefault(); perilla.current.setPointerCapture?.(e.pointerId); arrastre.current = { movio: false, x: e.clientX, y: e.clientY }; };
  const mueve = e => { const a = arrastre.current; if (!a) return; if (Math.hypot(e.clientX - a.x, e.clientY - a.y) > 4) a.movio = true; if (a.movio) setT(cercano(e.clientX, e.clientY)); };
  const suelta = () => { const a = arrastre.current; arrastre.current = null; if (!a) return; if (!a.movio) irA(t > 0.5 ? 0 : 1); else irA(t > 0.5 ? 1 : 0); };
  const tecla = e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); irA(t > 0.5 ? 0 : 1); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); if (t < 0.5) irA(1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); if (t > 0.5) irA(0); }
  };
  return (
    <div className="tema-bloque">
      {etiqueta && <span className="tema-etq" aria-hidden="true">Modo oscuro</span>}
      <div className="tema-caja" ref={caja}>
        <svg viewBox={`0 0 ${VB.w} ${VB.h}`} aria-hidden="true" focusable="false">
          <path d={TRAZO} className="tema-ranura-sombra" /><path ref={trazo} d={TRAZO} className="tema-ranura" />
          <path d={TRAZO} className="tema-brillo" pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 1 - t }} />
        </svg>
        <i className="fa-solid fa-moon tema-luna" aria-hidden="true"></i>
        <button ref={perilla} type="button" role={rol} aria-checked={t > 0.5} aria-label="Modo oscuro" className="tema-perilla"
          style={{ left: `${p.x / VB.w * 100}%`, top: `${p.y / VB.h * 100}%`, transform: `translate(-50%, -50%) rotate(${p.a * 0.45}deg)` }}
          onPointerDown={abajo} onPointerMove={mueve} onPointerUp={suelta} onPointerCancel={suelta} onKeyDown={tecla}>
          <i className={`fa-solid ${t > 0.5 ? 'fa-moon' : 'fa-sun'}`} aria-hidden="true"></i>
        </button>
      </div>
    </div>
  );
}
