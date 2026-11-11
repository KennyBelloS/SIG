import { useEffect, useRef, useState } from 'react';
import { menosMovimiento } from '../../lib/preferencias';

function Colibri() {
  const ala = <path className="m-ala-s" d="M29 23C19 8 3 9 2 19c-1 7 12 12 25 10z" fill="url(#coA)" opacity=".94" />;
  return (
    <svg className="colibri" viewBox="0 0 64 54" width="96" height="81" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="coA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3FAE62" /><stop offset="1" stopColor="#0F3D22" /></linearGradient>
        <linearGradient id="coB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F0C25A" /><stop offset="1" stopColor="#C9932B" /></linearGradient>
      </defs>
      <g className="m-izq">{ala}</g>
      <g className="m-der" transform="translate(64 0) scale(-1 1)">{ala}</g>
      <path d="M32 38L24 51 32 44 40 51z" fill="#0F3D22" />
      <ellipse cx="32" cy="29" rx="6.5" ry="13" fill="url(#coB)" />
      <circle cx="32" cy="15" r="6.2" fill="url(#coA)" />
      <path d="M32 10C33 4 38 1 44 .5 39 4 36 7 33.5 11z" fill="#1C2321" />
      <circle cx="34.6" cy="13.6" r="1.1" fill="#1C2321" />
    </svg>
  );
}

/** Un colibrí cuelga de un hilo (como la araña que va a buscar cada pieza): vuela a una fila de la lista, TOMA su ícono, se lo lleva
 *  hasta el escenario y ahí cambia el resumen; el ícono anterior vuelve a su fila. Cambia sola cada pocos segundos; se puede pausar o tocar una fila. */
export default function ResumenVivo({ items, titulo = 'Resumen vivo', intervalo = 2200 }) {
  const n = items.length;
  const [activo, setActivo] = useState(0);
  const [llevando, setLlevando] = useState(null);
  const [juega, setJuega] = useState(true);
  const pausa = false;   // solo se detiene con el botón de pausa: el colibrí lleva todo automáticamente
  const reducido = menosMovimiento();
  const escena = useRef(null), chips = useRef([]), slot = useRef(null), bicho = useRef(null), hilo = useRef(null);
  const pos = useRef({ x: 0, y: 0, listo: false }), ocupado = useRef(false), vivo = useRef(true);

  const centro = el => { if (!el || !escena.current) return { x: 0, y: 0 };   // la pieza ya no está (se salió del Dashboard mientras volaba)
    const r = el.getBoundingClientRect(), e = escena.current.getBoundingClientRect(); return { x: r.left - e.left + r.width / 2, y: r.top - e.top + r.height / 2 }; };
  const pintar = (x, y, giro = 0) => {
    if (!bicho.current || !hilo.current || !escena.current) return;
    const ax = escena.current.clientWidth / 2;
    bicho.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${giro}deg)`;
    hilo.current.setAttribute('d', `M ${ax} -14 Q ${(ax + x) / 2 + (x > ax ? 26 : -26)} ${(y - 14) / 2 - 8} ${x} ${y - 16}`);
  };
  const mover = (dest, dur) => new Promise(res => {
    const d = { ...pos.current }, t0 = performance.now();
    const paso = ahora => {
      if (!vivo.current) { res(); return; }
      const k = Math.min(1, (ahora - t0) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const x = d.x + (dest.x - d.x) * e + Math.sin(k * Math.PI * 3) * (1 - k) * 12, y = d.y + (dest.y - d.y) * e - Math.sin(k * Math.PI) * 36;
      pos.current = { x, y, listo: true }; pintar(x, y, Math.max(-26, Math.min(26, (dest.x - d.x) / 16)) * Math.sin(k * Math.PI));
      if (k < 1) requestAnimationFrame(paso); else res();
    };
    requestAnimationFrame(paso);
  });
  const esperar = ms => new Promise(res => setTimeout(res, ms));

  const recorrer = async k => {
    if (ocupado.current || k === activo || k < 0 || k >= n) return;
    if (reducido) { setActivo(k); return; }
    const chip = chips.current[k]; if (!chip || !slot.current) return;
    ocupado.current = true;
    await mover(centro(chip), 950); if (!vivo.current) return;
    setLlevando(k); await esperar(260);                                         // el colibrí toma el ícono
    const s = centro(slot.current); await mover({ x: s.x, y: s.y - 4 }, 1050); if (!vivo.current) return;
    setActivo(k); setLlevando(null); await esperar(520);                        // lo deja en el escenario: el resumen cambia
    ocupado.current = false;
  };

  useEffect(() => {
    vivo.current = true;
    const e = escena.current, s = slot.current; if (!e || !s) return undefined;
    const fin = centro(s);
    if (reducido) { pos.current = { x: fin.x, y: fin.y - 4, listo: true }; pintar(fin.x, fin.y - 4); return () => { vivo.current = false; }; }
    pos.current = { x: e.clientWidth / 2, y: -40, listo: true }; pintar(e.clientWidth / 2, -40);
    ocupado.current = true; mover({ x: fin.x, y: fin.y - 4 }, 1200).then(() => { ocupado.current = false; });
    const alRedimensionar = () => { if (ocupado.current || !slot.current) return; const c = centro(slot.current); pos.current = { x: c.x, y: c.y - 4, listo: true }; pintar(c.x, c.y - 4); };
    window.addEventListener('resize', alRedimensionar);
    return () => { vivo.current = false; window.removeEventListener('resize', alRedimensionar); };
    // eslint-disable-next-line
  }, [n]);
  useEffect(() => {
    if (!juega || pausa || reducido || n < 2) return undefined;
    const t = setInterval(() => { if (!ocupado.current) recorrer((activo + 1) % n); }, intervalo);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [juega, pausa, reducido, n, intervalo, activo]);

  if (!n) return null;
  const a = items[Math.min(activo, n - 1)];
  return (
    <section className="panel resumen-vivo" aria-label={titulo}>
      <div className="panel-header">
        <div><h2>{titulo}</h2><p className="sub">El colibrí va llevando, solo y una por una, cada pieza al escenario.</p></div>
        {!reducido && <button type="button" className="btn-texto rv-play" onClick={() => setJuega(j => !j)} aria-label={juega ? 'Pausar el resumen' : 'Reproducir el resumen'}><i className={`fa-solid ${juega ? 'fa-pause' : 'fa-play'}`} aria-hidden="true"></i></button>}
      </div>
      <div className="rv-escena rv2" ref={escena}>
        <svg className="rv-hilo" aria-hidden="true" focusable="false"><path ref={hilo} d="M0 0" /></svg>
        <span className="rv-bicho" ref={bicho} aria-hidden="true"><Colibri />{llevando != null && <span className="rv-llevado"><i className={`fa-solid ${items[llevando].icono}`}></i></span>}</span>
        <ul className="rv-lista">
          {items.map((it, k) => (
            <li key={it.id}>
              <button type="button" className={`rv-fila tono-${it.tono || 'info'}${k === activo ? ' activa' : ''}`} onClick={() => recorrer(k)} aria-pressed={k === activo}>
                <span className={`rv-chip${llevando === k ? ' ausente' : ''}`} ref={el => { chips.current[k] = el; }}><i className={`fa-solid ${it.icono}`} aria-hidden="true"></i></span>
                <span className="rv-fila-txt"><small>{it.titulo}</small><strong>{it.valor}</strong></span>
              </button>
            </li>
          ))}
        </ul>
        <div className="rv-escenario" aria-live="polite">
          <div className={`rv-destacado tono-${a.tono || 'info'}`} key={activo}>
            <span className="rv-slot" ref={slot}>{llevando == null && <i className={`fa-solid ${a.icono}`} aria-hidden="true"></i>}</span>
            <small>{a.titulo}</small><strong>{a.valor}</strong><p>{a.texto}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
