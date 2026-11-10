import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CartaDesplegable from './CartaDesplegable';
import { volar } from './volar';
import { chispas } from './chispas';
import { useAvisos, marcarVistos, agregarAvisos, avisosDeLaSesion, plataforma, origenVuelo } from '../../lib/avisos';
import { menosMovimiento } from '../../lib/preferencias';

/** Cuánto espacio ocupa la zona segura de arriba (la isla y la barra de estado en un iPhone). */
const zonaSegura = () => { const p = document.createElement('div'); p.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;padding-top:env(safe-area-inset-top,0px)'; document.body.appendChild(p); const v = p.offsetHeight; p.remove(); return v; };
const hace = t => { const s = (Date.now() - t) / 1000; if (s < 60) return 'ahora'; return new Date(t).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); };

/** La campana de avisos. Cuando llega uno sale un avión (de la isla en iPhone, de abajo en Android, de la esquina en el computador).
 *  Robusto: los avisos que llegan casi juntos se agrupan en UN vuelo, los vuelos van de uno en uno, el avión sigue a la campana aunque la
 *  pantalla se mueva y el contador solo sube cuando el avión llega. */
export default function Campana({ sesion }) {
  const btn = useRef(null);
  const navegar = useNavigate();
  const { avisos, sinVer } = useAvisos();
  const [abierta, setAbierta] = useState(false);
  const [suena, setSuena] = useState(false);
  const [onda, setOnda] = useState(0);
  const [isla, setIsla] = useState(null);
  const [enCamino, setEnCamino] = useState(0);
  const cola = useRef([]), volando = useRef(false), lote = useRef(null), tIsla = useRef(null), vivo = useRef(true);

  useEffect(() => { vivo.current = true; return () => { vivo.current = false; clearTimeout(tIsla.current); }; }, []);
  useEffect(() => {
    if (!sesion?.id) return undefined;
    const t = setTimeout(() => { avisosDeLaSesion(sesion).then(l => agregarAvisos(l)).catch(() => { /* sin datos: sin avisos */ }); }, 3300);
    return () => clearTimeout(t);
  }, [sesion?.id]); // eslint-disable-line

  const objetivo = () => { const b = btn.current?.getBoundingClientRect(); return b && b.width ? { x: b.left + b.width / 2, y: b.top + b.height / 2 } : null; };
  const llego = n => { if (!vivo.current) return; setEnCamino(c => Math.max(0, c - n)); setSuena(true); setOnda(k => k + 1); setTimeout(() => { if (vivo.current) setSuena(false); }, 1000); };
  const procesar = () => {
    if (volando.current || !cola.current.length) return;
    const d = cola.current.shift(), meta = objetivo(), n = d.cantidad || 1;
    if (!meta || menosMovimiento()) { llego(n); procesar(); return; }          // sin campana a la vista o sin movimiento: el contador sube igual
    volando.current = true;
    const plat = plataforma(), desde = origenVuelo(plat, window.innerWidth, window.innerHeight, zonaSegura());
    const despegar = () => {
      let origen = desde, swoop = false;
      if (plat === 'ios') { const el = document.querySelector('.isla-aviso'); if (el) { const q = el.getBoundingClientRect(); origen = { x: q.right - 22, y: q.top + q.height / 2 }; swoop = true; chispas(origen); el.classList.add('despega'); } }
      volar({ desde: origen, hasta: () => objetivo() || meta, swoop, duracion: swoop ? 1450 : 1150, alLlegar: () => { volando.current = false; llego(n); procesar(); } });
    };
    if (plat === 'ios') { clearTimeout(tIsla.current); setIsla({ ...d, k: Date.now() }); tIsla.current = setTimeout(() => { if (vivo.current) setIsla(null); }, 2700); setTimeout(despegar, 760); }
    else despegar();
  };
  useEffect(() => {
    const alNuevo = e => {
      const d = e.detail || {}, n = d.cantidad || 1;
      setEnCamino(c => c + n);
      if (lote.current) { lote.current.cantidad += n; return; }                // llegó otro casi junto al anterior: va en el mismo vuelo
      lote.current = { ...d, cantidad: n };
      setTimeout(() => { const x = lote.current; lote.current = null; if (x) { cola.current.push(x); procesar(); } }, 350);
    };
    const abrir = () => setAbierta(true);
    window.addEventListener('tm:aviso-nuevo', alNuevo); window.addEventListener('tm:abrir-avisos', abrir);
    return () => { window.removeEventListener('tm:aviso-nuevo', alNuevo); window.removeEventListener('tm:abrir-avisos', abrir); };
  }, []); // eslint-disable-line

  const visible = Math.max(0, sinVer - enCamino);
  return (
    <>
      <button ref={btn} type="button" className={`campana${suena ? ' suena' : ''}`} onClick={() => setAbierta(a => !a)} aria-haspopup="dialog" aria-expanded={abierta}
        aria-label={visible ? `Avisos: ${visible} sin ver` : 'Avisos'}>
        <i className="fa-regular fa-bell" aria-hidden="true"></i>
        {visible > 0 && <b className="campana-punto" key={visible} aria-hidden="true">{visible}</b>}
        {onda > 0 && <span className="campana-onda" key={onda} aria-hidden="true" />}
      </button>
      {isla && <div className="isla-aviso" key={isla.k} role="status" aria-live="polite"><i className={`fa-solid ${isla.icono || 'fa-bell'}`} aria-hidden="true"></i><span><strong>{isla.titulo}</strong></span>{isla.cantidad > 1 && <em>+{isla.cantidad - 1}</em>}</div>}
      {abierta && (
        <CartaDesplegable ancla={btn.current} titulo="Avisos" ancho={410} onCerrar={() => { setAbierta(false); marcarVistos(); }}>
          {({ cerrar }) => ({
            cabecera: <header className="ac-cab"><h2><i className="fa-regular fa-bell" aria-hidden="true"></i> Avisos</h2><span className="ac-n">{avisos.filter(a => !a.visto).length} sin ver</span></header>,
            cuerpo: avisos.length === 0
              ? <div className="avisos-vacio"><i className="fa-solid fa-circle-check" aria-hidden="true"></i><strong>Todo al día</strong><span>Cuando haya algo que atender, te avisaré aquí.</span></div>
              : <div className="avisos-carta"><ul>{avisos.map(a => (
                  <li key={a.id} className={a.visto ? 'visto' : ''}>
                    <button type="button" onClick={() => { cerrar(); if (a.accion === 'actualizar') window.location.reload(); else if (a.ruta) navegar(a.ruta); }}>
                      <span className={`aviso-ico tono-${a.tono}`}><i className={`fa-solid ${a.icono}`} aria-hidden="true"></i>{!a.visto && <u aria-label="sin ver" />}</span>
                      <span className="aviso-texto"><strong>{a.titulo}</strong>{a.detalle && <small>{a.detalle}</small>}</span>
                      <time>{hace(a.hora)}</time>
                    </button>
                  </li>))}</ul></div>,
            pie: <div className="ac-pie"><button type="button" className="btn-texto" onClick={() => marcarVistos()} disabled={!avisos.some(a => !a.visto)}>Marcar como vistos</button><button type="button" className="btn-secondary btn-chico" onClick={cerrar}>Cerrar</button></div>,
          })}
        </CartaDesplegable>
      )}
    </>
  );
}
