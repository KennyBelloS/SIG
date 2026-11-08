import { useEffect, useRef, useState } from 'react';
import Dialogo from './Dialogo';
import { VERSION, NOVEDADES } from '../lib/versiones';

const CLAVE_ULTIMA = 'tm:ultima-version';
const espera = () => Number(window.__TM_ACTUALIZAR_SEGUNDOS) || 20;
/** No se interrumpe a quien está escribiendo: mientras haya un cuadro abierto, la cuenta regresiva espera. */
const hayCuadroAbierto = () => !!document.querySelector('[role="dialog"]');

/** Vigila si se publicó una versión nueva. Si la hay: avisa, cuenta hacia atrás y se recarga sola cuando no hay nada en curso.
 *  Después de actualizar, cuenta qué cambió. Funciona con /version.json, que cada compilación genera con su identificador. */
export default function Actualizador({ conSesion }) {
  const [nueva, setNueva] = useState(null);
  const [segundos, setSegundos] = useState(null);
  const [esperando, setEsperando] = useState(false);
  const [novedades, setNovedades] = useState(false);
  const [bloqueada, setBloqueada] = useState(false);
  const detectada = useRef(null);

  // 1) vigilar
  useEffect(() => {
    let vivo = true;
    const revisar = async () => {
      if (detectada.current) return;
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (vivo && j && j.id && j.id !== VERSION) { detectada.current = j.id; setNueva(j.id); setSegundos(espera()); }
      } catch { /* sin conexión o una respuesta que no es JSON (en desarrollo): se ignora */ }
    };
    const alVolver = () => { if (!document.hidden) revisar(); };
    const primera = setTimeout(revisar, 4000);
    const periodica = setInterval(revisar, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('online', revisar);
    return () => { vivo = false; clearTimeout(primera); clearInterval(periodica); document.removeEventListener('visibilitychange', alVolver); window.removeEventListener('online', revisar); };
  }, []);

  // 2) cuenta regresiva (pausada mientras la persona esté en un cuadro o haya pedido esperar)
  useEffect(() => {
    if (!nueva || esperando) return undefined;
    const t = setInterval(() => {
      const ocupada = hayCuadroAbierto();
      setBloqueada(ocupada);
      if (!ocupada) setSegundos(s => (s == null ? s : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [nueva, esperando]);

  const actualizar = () => {
    try { localStorage.setItem(CLAVE_ULTIMA, VERSION); sessionStorage.setItem('tm:actualizado', '1'); } catch { /* no pasa nada */ }
    window.location.reload();
  };
  useEffect(() => { if (segundos != null && segundos <= 0) actualizar(); /* eslint-disable-next-line */ }, [segundos]);

  const esperarUnPoco = () => {
    setEsperando(true); setSegundos(null);
    setTimeout(() => { detectada.current = null; setNueva(null); setEsperando(false); }, 5 * 60 * 1000);   // vuelve a avisar en 5 minutos
  };

  // 3) tras una actualización (o la primera vez que se abre una versión nueva) se cuenta qué cambió
  useEffect(() => {
    if (!conSesion) return;
    try {
      const veniaDeActualizar = sessionStorage.getItem('tm:actualizado') === '1';
      if (VERSION === 'dev' && !veniaDeActualizar) return;
      const previa = localStorage.getItem(CLAVE_ULTIMA);
      if (veniaDeActualizar || (previa && previa !== VERSION)) setNovedades(true);
      localStorage.setItem(CLAVE_ULTIMA, VERSION);
      sessionStorage.removeItem('tm:actualizado');
    } catch { /* sin almacenamiento: no se muestra */ }
  }, [conSesion]);

  return (
    <>
      {nueva && (
        <div className="aviso-version" role="status" aria-live="polite">
          <i className="fa-solid fa-arrows-rotate" aria-hidden="true"></i>
          <div>
            <strong>Hay una versión nueva del sistema.</strong>
            <span>{esperando ? 'Te volveré a avisar en 5 minutos.' : bloqueada ? 'Se actualizará cuando termines lo que estás haciendo.' : `Se actualizará sola en ${Math.max(0, segundos ?? 0)} s.`}</span>
          </div>
          <button type="button" className="btn-primary btn-chico" onClick={actualizar}>Actualizar ahora</button>
          {!esperando && <button type="button" className="btn-texto" onClick={esperarUnPoco}>Esperar un poco</button>}
        </div>
      )}
      {novedades && (
        <Dialogo titulo="Novedades" onCerrar={() => setNovedades(false)} ancho={560}>
          <div className="form-dialogo novedades-version">
            <h2><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> {NOVEDADES.titulo}</h2>
            <ul>{NOVEDADES.items.map(([ic, t, d]) => <li key={t}><i className={`fa-solid ${ic}`} aria-hidden="true"></i><span><strong>{t}</strong> {d}</span></li>)}</ul>
            <div className="ind-modal-acciones"><button type="button" className="btn-primary" onClick={() => setNovedades(false)} autoFocus>Entendido</button></div>
          </div>
        </Dialogo>
      )}
    </>
  );
}
