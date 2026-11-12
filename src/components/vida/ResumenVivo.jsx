import { useEffect, useRef, useState } from 'react';
import { menosMovimiento } from '../../lib/preferencias';

/** Colibrí de verdad (no un insecto con alas en espejo): de perfil, volando hacia la derecha, con el ala
 *  trasera asomando más pequeña y apagada detrás del cuerpo — eso es lo que de verdad da sensación de
 *  volumen, no un contorno más grueso. Contornos marcados y colores planos, como una calcomanía. */
function Colibri() {
  const T = '#16241C';   // trazo (el mismo tono oscuro del resto de la marca, no un negro genérico)
  return (
    <svg className="colibri" viewBox="0 0 70 58" width="104" height="86" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="coCuerpo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3FAE62" /><stop offset=".62" stopColor="#1F9456" /><stop offset="1" stopColor="#F0C25A" /></linearGradient>
        <linearGradient id="coAlaT" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#2F9E4F" /><stop offset="1" stopColor="#7FD9C4" /></linearGradient>
        <linearGradient id="coAlaD" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#1C6B8A" /><stop offset="1" stopColor="#4FA8C9" /></linearGradient>
        <linearGradient id="coCabeza" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4FC078" /><stop offset="1" stopColor="#1F9456" /></linearGradient>
      </defs>
      {/* ala trasera: más chica y apagada, solo asoma — da el volumen */}
      <g className="m-der" style={{ transformOrigin: '34px 26px' }}>
        <path d="M30 26C21 13 8 15 7 23c-1 6 9 11 23 7z" fill="url(#coAlaD)" opacity=".55" stroke={T} strokeWidth="1.4" strokeLinejoin="round" />
      </g>
      {/* cola en abanico, bien separada de las patas */}
      <path d="M19 39 L3 29 L21 42Z M19 41.5 L1 41 L21.5 44Z M19.5 44 L4 53 L22.5 45.5Z" fill="#2F8FBF" stroke={T} strokeWidth="1.6" strokeLinejoin="round" />
      {/* patitas */}
      <path d="M27 44 L25.5 51 M33 44.5 L33.5 51.5" stroke={T} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="25" cy="51.6" r="1.3" fill={T} /> <circle cx="33.9" cy="52" r="1.3" fill={T} />
      {/* cuerpo */}
      <path d="M46 28c0 10-8.5 17-17.5 17-7 0-11.5-5-11.5-11.5C17 23 25 14 36 14c7 0 10 6 10 14z" fill="url(#coCuerpo)" stroke={T} strokeWidth="1.8" strokeLinejoin="round" />
      {/* pechera clara */}
      <path d="M22 30c2 6 7 10 12.5 10.5-4 2.3-10 1-13-3.5-2-3-1.8-5 .5-7z" fill="#FBE7B8" opacity=".85" />
      {/* cabeza: color propio, NO el mismo degradado del cuerpo (por eso antes se veía amarilla en la barbilla) */}
      <circle cx="42" cy="17" r="9" fill="url(#coCabeza)" stroke={T} strokeWidth="1.8" />
      {/* pico */}
      <path d="M50 16.5 L67 13.5 L50.5 19.5Z" fill="#E8742C" stroke={T} strokeWidth="1.5" strokeLinejoin="round" />
      {/* ojo, con su pestaña — el gesto que lo hace ver tierno y no genérico */}
      <circle cx="45.2" cy="14.8" r="2.7" fill="#fff" stroke={T} strokeWidth="1.3" />
      <circle cx="46" cy="15.1" r="1.4" fill={T} />
      <circle cx="46.4" cy="14.6" r=".45" fill="#fff" />
      <path d="M43.6 10.6c1.6-1.6 3.6-2 5.2-1.1" stroke={T} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      {/* ala delantera: la grande, con sus líneas de pluma */}
      <g className="m-izq" style={{ transformOrigin: '36px 24px' }}>
        <path d="M34 24C22 4 2 7 1 18c-1 9 15 15 33 11z" fill="url(#coAlaT)" stroke={T} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M30 20C20 9 8 10 5 16M31 23C21 15 10 15 6 19" stroke={T} strokeOpacity=".4" strokeWidth="1.1" strokeLinecap="round" fill="none" />
      </g>
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
  const escena = useRef(null), chips = useRef([]), slot = useRef(null), bicho = useRef(null), hilo = useRef(null), cuerpo = useRef(null);
  const pos = useRef({ x: 0, y: 0, listo: false }), ocupado = useRef(false), vivo = useRef(true);

  const centro = el => { if (!el || !escena.current) return { x: 0, y: 0 };   // la pieza ya no está (se salió del Dashboard mientras volaba)
    const r = el.getBoundingClientRect(), e = escena.current.getBoundingClientRect(); return { x: r.left - e.left + r.width / 2, y: r.top - e.top + r.height / 2 }; };
  // elevacion: qué tan arriba va en el salto (0 abajo/cerca, hasta 36 en lo más alto/lejos). Con eso se ladea en 3D,
  // se achica un poco (como si se alejara) y la sombra se aclara — no es solo un giro plano.
  const pintar = (x, y, giro = 0, elevacion = 0) => {
    if (!bicho.current || !hilo.current || !escena.current) return;
    const ax = escena.current.clientWidth / 2;
    const lejos = Math.max(0, Math.min(1, elevacion / 36));
    bicho.current.style.setProperty('--profundidad', (.4 - lejos * .22).toFixed(2));
    bicho.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) perspective(420px) rotateY(${Math.max(-20, Math.min(20, giro * .8))}deg) rotateZ(${giro}deg) scale(${(1 - lejos * .1).toFixed(3)})`;
    hilo.current.setAttribute('d', `M ${ax} -14 Q ${(ax + x) / 2 + (x > ax ? 26 : -26)} ${(y - 14) / 2 - 8} ${x} ${y - 16}`);
  };
  const mover = (dest, dur) => new Promise(res => {
    const d = { ...pos.current }, t0 = performance.now();
    const paso = ahora => {
      if (!vivo.current) { res(); return; }
      const k = Math.min(1, (ahora - t0) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const elevacion = Math.sin(k * Math.PI) * 36;
      const x = d.x + (dest.x - d.x) * e + Math.sin(k * Math.PI * 3) * (1 - k) * 12, y = d.y + (dest.y - d.y) * e - elevacion;
      pos.current = { x, y, listo: true }; pintar(x, y, Math.max(-26, Math.min(26, (dest.x - d.x) / 16)) * Math.sin(k * Math.PI), elevacion);
      if (k < 1) requestAnimationFrame(paso); else res();
    };
    requestAnimationFrame(paso);
  });
  const esperar = ms => new Promise(res => setTimeout(res, ms));
  // el bracito de resorte al aterrizar: va en el cuerpo (hijo), nunca en el .rv-bicho que ya controla el vuelo
  const rebotar = () => { if (!cuerpo.current) return; cuerpo.current.classList.remove('posa'); void cuerpo.current.offsetWidth; cuerpo.current.classList.add('posa'); };

  const recorrer = async k => {
    if (ocupado.current || k === activo || k < 0 || k >= n) return;
    if (reducido) { setActivo(k); return; }
    const chip = chips.current[k]; if (!chip || !slot.current) return;
    ocupado.current = true;
    await mover(centro(chip), 950); if (!vivo.current) return;
    setLlevando(k); rebotar(); await esperar(260);                              // el colibrí toma el ícono
    const s = centro(slot.current); await mover({ x: s.x, y: s.y - 4 }, 1050); if (!vivo.current) return;
    setActivo(k); setLlevando(null); rebotar(); await esperar(520);             // lo deja en el escenario: el resumen cambia
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
        <span className="rv-bicho" ref={bicho} aria-hidden="true"><span className="rv-bicho-cuerpo" ref={cuerpo}><Colibri />{llevando != null && <span className="rv-llevado"><i className={`fa-solid ${items[llevando].icono}`}></i></span>}</span></span>
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
