import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { aplicarTema, temaActual } from '../../lib/tema';

const TRAZO = 'M 34 38 Q 150 4 176 104';
/** Interruptor de modo oscuro: una perilla de vidrio que se desliza por una ranura curva (se arrastra, se toca o se usa con flechas). */
export default function InterruptorTema() {
  const [t, setT] = useState(() => (temaActual() === 'oscuro' ? 1 : 0));
  const [p, setP] = useState({ x: 34, y: 38 });
  const trazo = useRef(null), caja = useRef(null), perilla = useRef(null), arrastre = useRef(null);

  const punto = tt => { const el = trazo.current; if (!el) return null; const L = el.getTotalLength(); const q = el.getPointAtLength(L * tt); return { x: q.x, y: q.y }; };
  useLayoutEffect(() => { const q = punto(t); if (q) setP(q); }, [t]);
  useEffect(() => { const f = () => setT(temaActual() === 'oscuro' ? 1 : 0); window.addEventListener('tm:tema', f); return () => window.removeEventListener('tm:tema', f); }, []);

  const centro = () => { const r = perilla.current.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const irA = destino => {
    const origen = centro(); const a = t, t0 = performance.now(), dur = 520;
    aplicarTema(destino ? 'oscuro' : 'claro', origen);
    const paso = ahora => { const k = Math.min(1, (ahora - t0) / dur), e = 1 - Math.pow(1 - k, 3); setT(a + (destino - a) * e); if (k < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  };
  const cercano = (cx, cy) => { const r = caja.current.getBoundingClientRect(); const x = cx - r.left, y = cy - r.top; let mejor = 0, d = 1e9; for (let i = 0; i <= 60; i++) { const q = punto(i / 60); const dd = (q.x - x) ** 2 + (q.y - y) ** 2; if (dd < d) { d = dd; mejor = i / 60; } } return mejor; };

  const abajo = e => { e.preventDefault(); perilla.current.setPointerCapture?.(e.pointerId); arrastre.current = { movio: false, x: e.clientX, y: e.clientY }; };
  const mueve = e => { const a = arrastre.current; if (!a) return; if (Math.hypot(e.clientX - a.x, e.clientY - a.y) > 4) a.movio = true; if (a.movio) setT(cercano(e.clientX, e.clientY)); };
  const suelta = () => { const a = arrastre.current; arrastre.current = null; if (!a) return; if (!a.movio) irA(t > 0.5 ? 0 : 1); else irA(t > 0.5 ? 1 : 0); };
  const tecla = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); irA(t > 0.5 ? 0 : 1); } if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); if (t < 0.5) irA(1); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); if (t > 0.5) irA(0); } };

  return (
    <div className="tema-caja" ref={caja}>
      <svg width="210" height="130" viewBox="0 0 210 130" aria-hidden="true" focusable="false">
        <path d={TRAZO} className="tema-ranura-sombra" /><path ref={trazo} d={TRAZO} className="tema-ranura" />
        <path d={TRAZO} className="tema-brillo" style={{ strokeDasharray: 400, strokeDashoffset: 400 - 400 * t }} />
      </svg>
      <i className="fa-solid fa-sun tema-sol" aria-hidden="true"></i><i className="fa-solid fa-moon tema-luna" aria-hidden="true"></i>
      <button ref={perilla} type="button" role="switch" aria-checked={t > 0.5} aria-label="Modo oscuro" className="tema-perilla" style={{ transform: `translate(${p.x - 24}px, ${p.y - 30}px)` }}
        onPointerDown={abajo} onPointerMove={mueve} onPointerUp={suelta} onPointerCancel={suelta} onKeyDown={tecla}>
        <i className={`fa-solid ${t > 0.5 ? 'fa-moon' : 'fa-sun'}`} aria-hidden="true"></i>
      </button>
    </div>
  );
}
