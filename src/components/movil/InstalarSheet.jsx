import { useEffect, useState } from 'react';
import { esAndroid, esIOS, estaInstalada } from '../../lib/movil';

const CLAVE = 'tm:instalar-visto';

/** «Agrega el sistema a tu pantalla de inicio»: una hoja a pantalla completa con las instrucciones de SU teléfono (iPhone o Android).
 *  Aparece una sola vez, después de la bienvenida, y solo si todavía no está instalada. */
export default function InstalarSheet({ conSesion, movil }) {
  const [abierta, setAbierta] = useState(false);
  const [puedeInstalar, setPuedeInstalar] = useState(!!window.__tmInstalar);
  const ios = esIOS();

  useEffect(() => {
    if (!conSesion || !movil) return undefined;
    const puede = () => { try { return localStorage.getItem('indicadores:tour-visto') === '1' && !localStorage.getItem(CLAVE) && !estaInstalada() && !document.querySelector('[role="dialog"]'); } catch { return false; } };
    const programar = ms => setTimeout(() => { if (puede()) setAbierta(true); }, ms);
    const t = programar(2200);
    const alCerrarTour = () => programar(900);
    const forzar = () => setAbierta(true);
    const alPoderInstalar = () => setPuedeInstalar(true);
    window.addEventListener('tm:tour-cerrado', alCerrarTour); window.addEventListener('tm:instalar', forzar); window.addEventListener('tm:puede-instalar', alPoderInstalar);
    return () => { clearTimeout(t); window.removeEventListener('tm:tour-cerrado', alCerrarTour); window.removeEventListener('tm:instalar', forzar); window.removeEventListener('tm:puede-instalar', alPoderInstalar); };
  }, [conSesion, movil]);

  useEffect(() => {
    if (!abierta) return undefined;
    const tecla = e => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', tecla); document.body.classList.add('sin-scroll-fondo');
    return () => { document.removeEventListener('keydown', tecla); document.body.classList.remove('sin-scroll-fondo'); };
  }, [abierta]);

  const cerrar = () => { try { localStorage.setItem(CLAVE, '1'); } catch { /* nada */ } setAbierta(false); };
  const instalarAhora = async () => {
    const e = window.__tmInstalar; if (!e) return;
    e.prompt(); try { await e.userChoice; } catch { /* la persona cerró el cuadro */ }
    window.__tmInstalar = null; setPuedeInstalar(false); cerrar();
  };
  if (!abierta || !movil) return null;

  const pasos = ios
    ? [['fa-arrow-up-from-bracket', 'Toca «Compartir»', 'El cuadrito con la flecha, abajo en Safari.'], ['fa-square-plus', 'Elige «Añadir a pantalla de inicio»', 'Hay que deslizar un poco el menú hacia arriba.'], ['fa-check', 'Toca «Añadir»', 'Y ya: se abre como una aplicación.']]
    : [['fa-ellipsis-vertical', 'Toca el menú ⋮ del navegador', 'Arriba a la derecha en Chrome.'], ['fa-download', 'Elige «Instalar aplicación»', 'Si no aparece, «Añadir a la pantalla de inicio».'], ['fa-check', 'Confirma', 'Y ya: se abre como una aplicación.']];
  return (
    <div className="instalar" role="dialog" aria-modal="true" aria-labelledby="instalar-t" ref={el => { if (el && !el.dataset.enfocado) { el.dataset.enfocado = '1'; el.querySelector('h2')?.focus({ preventScroll: true }); } }}>
      <span className="logo-ficha instalar-logo" aria-hidden="true"><img src="/logo-icon.png" alt="" /></span>
      <h2 id="instalar-t" tabIndex={-1}>Agrega el sistema a tu pantalla de inicio</h2>
      <div className={`instalar-telefono ${ios ? 'ios' : 'android'}`} aria-hidden="true">
        <div className="it-pagina"><span className="it-logo" /><i /><i /><i className="corta" /></div>
        <div className="it-barra">{ios ? <><u /><u /><u className="resalta" /><u /><u /></> : <><i className="it-url" /><u className="resalta" /></>}</div>
      </div>
      <ol className="instalar-pasos">{pasos.map(([ic, t, d], i) => <li key={t} style={{ '--k': i }}><span className="ip-num">{i + 1}</span><span><strong>{t}</strong><small>{d}</small></span><i className={`fa-solid ${ic}`} aria-hidden="true"></i></li>)}</ol>
      {puedeInstalar && !ios && <button type="button" className="instalar-boton secundario" onClick={instalarAhora}><i className="fa-solid fa-download" aria-hidden="true"></i> Instalar ahora</button>}
      <button type="button" className="instalar-boton" onClick={cerrar}>Entendido</button>
    </div>
  );
}
