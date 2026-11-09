import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const menos = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Abeja() {
  return (
    <svg className="abeja" viewBox="0 0 44 36" width="44" height="36" aria-hidden="true" focusable="false">
      <ellipse className="abeja-ala a1" cx="19" cy="9" rx="8" ry="5" /><ellipse className="abeja-ala a2" cx="27" cy="10" rx="8" ry="5" />
      <ellipse cx="22" cy="21" rx="13" ry="9" fill="#F2B21B" />
      <path d="M17 13.5c2 3.4 2 11.6 0 15M24 12.8c2 3.6 2 12.4 0 16" stroke="#1C2321" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <circle cx="9" cy="20" r="5.4" fill="#1C2321" /><circle cx="7.4" cy="19" r="1.3" fill="#fff" />
      <path d="M7 15.5 4.5 11M10.5 15 10 10" stroke="#1C2321" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M35 21l5 1.4-5 1.6z" fill="#1C2321" />
    </svg>
  );
}

/** Un resumen que se mueve solo: una abeja cuelga de un hilo (como la araña que va a buscar cada pieza) y baja a la tarjeta que toca,
 *  que se levanta y se ilumina. Cambia cada pocos segundos; se pausa con el mouse o el teclado; con «reducir movimiento» queda quieto y se elige a mano. */
export default function ResumenVivo({ items, titulo = 'Resumen vivo', intervalo = 4800 }) {
  const reducido = menos();
  const [i, setI] = useState(0);
  const [juega, setJuega] = useState(!reducido);
  const [pausa, setPausa] = useState(false);
  const escena = useRef(null), refs = useRef([]), abeja = useRef(null), hilo = useRef(null), pos = useRef({ x: 0, y: 0, listo: false });
  const n = items.length;

  const objetivo = k => { const c = refs.current[k]; if (!c || !escena.current) return null; return { x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop - 4 }; };
  const pintar = (x, y, giro = 0) => {
    if (!abeja.current || !hilo.current || !escena.current) return;
    const ax = escena.current.clientWidth / 2;
    abeja.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${giro}deg)`;
    hilo.current.setAttribute('d', `M ${ax} -8 Q ${(ax + x) / 2 + (x > ax ? 22 : -22)} ${(y - 8) / 2 - 6} ${x} ${y - 12}`);
  };

  useLayoutEffect(() => {
    const o = objetivo(i); if (!o) return undefined;
    if (menos()) { pos.current = { ...o, listo: true }; pintar(o.x, o.y); return undefined; }
    const d = pos.current.listo ? pos.current : { x: escena.current.clientWidth / 2, y: -34 };
    const t0 = performance.now(), dur = 1000; let raf;
    const paso = ahora => {
      const k = Math.min(1, (ahora - t0) / dur), c1 = 1.5, e = 1 + (c1 + 1) * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
      const x = d.x + (o.x - d.x) * e, y = d.y + (o.y - d.y) * e - Math.sin(k * Math.PI) * 26;
      pos.current = { x, y, listo: true }; pintar(x, y, Math.max(-20, Math.min(20, (o.x - d.x) / 22)) * Math.sin(k * Math.PI));
      if (k < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line
  }, [i, n]);

  useEffect(() => { const f = () => { const o = objetivo(i); if (o) { pos.current = { ...o, listo: true }; pintar(o.x, o.y); } }; window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, [i]); // eslint-disable-line
  useEffect(() => {
    if (!juega || pausa || reducido || n < 2) return undefined;
    const t = setInterval(() => setI(k => (k + 1) % n), intervalo);
    return () => clearInterval(t);
  }, [juega, pausa, reducido, n, intervalo]);
  useEffect(() => { if (i >= n) setI(0); }, [n, i]);

  if (!n) return null;
  return (
    <section className="panel resumen-vivo" aria-label={titulo} onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)} onFocus={() => setPausa(true)} onBlur={() => setPausa(false)}>
      <div className="panel-header">
        <div><h2>{titulo}</h2><p className="sub">Una abeja recorre lo más importante del momento.</p></div>
        {!reducido && <button type="button" className="btn-texto rv-play" onClick={() => setJuega(j => !j)} aria-label={juega ? 'Pausar el resumen' : 'Reproducir el resumen'}><i className={`fa-solid ${juega ? 'fa-pause' : 'fa-play'}`} aria-hidden="true"></i></button>}
      </div>
      <div className="rv-escena" ref={escena}>
        <svg className="rv-hilo" aria-hidden="true" focusable="false"><path ref={hilo} d="M0 0" /></svg>
        <span className="rv-bicho" ref={abeja} aria-hidden="true"><Abeja /></span>
        <div className="rv-cartas">
          {items.map((it, k) => (
            <button key={it.id} type="button" ref={el => { refs.current[k] = el; }} className={`rv-carta tono-${it.tono || 'info'}${k === i ? ' activa' : ''}${String(it.valor).length > 7 ? ' rv-largo' : ''}`} aria-pressed={k === i} onClick={() => { setI(k); }}>
              <span className="rv-ico"><i className={`fa-solid ${it.icono}`} aria-hidden="true"></i></span>
              <small>{it.titulo}</small>
              <strong>{it.valor}</strong>
              <span className="rv-texto">{it.texto}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
