import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CartaDesplegable from './CartaDesplegable';
import { volar } from './volar';
import { useAvisos, marcarVistos, agregarAvisos, avisosDeLaSesion, plataforma, origenVuelo } from '../../lib/avisos';

const reducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
/** Cuánto espacio ocupa la zona segura de arriba (la isla y la barra de estado en un iPhone). */
const zonaSegura = () => { const p = document.createElement('div'); p.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;padding-top:env(safe-area-inset-top,0px)'; document.body.appendChild(p); const v = p.offsetHeight; p.remove(); return v; };
const hace = t => { const s = (Date.now() - t) / 1000; if (s < 60) return 'ahora'; const d = new Date(t); return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); };

/** La campana de avisos: cuando llega uno sale un avión (de la isla en iPhone, de abajo en Android, de la esquina en el computador),
 *  la campana suena, el contador salta y, al tocarla, una carta se desdobla con los avisos. */
export default function Campana({ sesion }) {
  const btn = useRef(null);
  const navegar = useNavigate();
  const { avisos, sinVer } = useAvisos();
  const [abierta, setAbierta] = useState(false);
  const [suena, setSuena] = useState(false);
  const [onda, setOnda] = useState(0);
  const [isla, setIsla] = useState(null);
  const [enCamino, setEnCamino] = useState(0);   // avisos que van volando: el contador sube cuando llegan

  useEffect(() => {
    if (!sesion?.id) return undefined;
    const t = setTimeout(() => { avisosDeLaSesion(sesion).then(l => agregarAvisos(l)).catch(() => { /* sin datos: sin avisos */ }); }, 3300);
    return () => clearTimeout(t);
  }, [sesion?.id]); // eslint-disable-line

  useEffect(() => {
    const alNuevo = e => {
      const d = e.detail || {}, b = btn.current?.getBoundingClientRect();
      if (!b || !b.width) return;
      const llegar = () => { setEnCamino(0); setSuena(true); setOnda(n => n + 1); setTimeout(() => setSuena(false), 1000); };
      if (reducido()) { llegar(); return; }
      setEnCamino(d.cantidad || 1);
      const plat = plataforma();
      const desde = origenVuelo(plat, window.innerWidth, window.innerHeight, zonaSegura());
      const hasta = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      if (plat === 'ios') { setIsla(d); setTimeout(() => volar({ desde, hasta, alLlegar: llegar }), 700); setTimeout(() => setIsla(null), 2700); }
      else volar({ desde, hasta, alLlegar: llegar });
    };
    window.addEventListener('tm:aviso-nuevo', alNuevo);
    return () => window.removeEventListener('tm:aviso-nuevo', alNuevo);
  }, []);

  const visible = Math.max(0, sinVer - enCamino);
  return (
    <>
      <button ref={btn} type="button" className={`campana${suena ? ' suena' : ''}`} onClick={() => setAbierta(a => !a)} aria-haspopup="dialog" aria-expanded={abierta}
        aria-label={visible ? `Avisos: ${visible} sin ver` : 'Avisos'}>
        <i className="fa-regular fa-bell" aria-hidden="true"></i>
        {visible > 0 && <b className="campana-punto" key={visible} aria-hidden="true">{visible}</b>}
        {onda > 0 && <span className="campana-onda" key={onda} aria-hidden="true" />}
      </button>
      {isla && <div className="isla-aviso" role="status" aria-live="polite"><i className={`fa-solid ${isla.icono || 'fa-bell'}`} aria-hidden="true"></i><span><strong>{isla.titulo}</strong>{isla.cantidad > 1 && <small>y {isla.cantidad - 1} más</small>}</span></div>}
      {abierta && (
        <CartaDesplegable ancla={btn.current} titulo="Avisos" ancho={400} onCerrar={() => { setAbierta(false); marcarVistos(); }}>
          {({ cerrar }) => (
            <div className="avisos-carta">
              <header><h2><i className="fa-regular fa-bell" aria-hidden="true"></i> Avisos</h2>{avisos.some(a => !a.visto) && <button type="button" className="btn-texto" onClick={() => { marcarVistos(); }}>Marcar como vistos</button>}</header>
              {avisos.length === 0 ? <div className="avisos-vacio"><i className="fa-solid fa-circle-check" aria-hidden="true"></i><strong>Todo al día</strong><span>Cuando haya algo que atender, te avisaré aquí.</span></div> : (
                <ul>{avisos.map(a => (
                  <li key={a.id} className={a.visto ? 'visto' : ''}>
                    <button type="button" onClick={() => { cerrar(); if (a.accion === 'actualizar') window.location.reload(); else if (a.ruta) navegar(a.ruta); }}>
                      <span className={`aviso-ico tono-${a.tono}`}><i className={`fa-solid ${a.icono}`} aria-hidden="true"></i>{!a.visto && <u aria-label="sin ver" />}</span>
                      <span className="aviso-texto"><strong>{a.titulo}</strong>{a.detalle && <small>{a.detalle}</small>}</span>
                      <time>{hace(a.hora)}</time>
                    </button>
                  </li>))}
                </ul>)}
            </div>
          )}
        </CartaDesplegable>
      )}
    </>
  );
}
