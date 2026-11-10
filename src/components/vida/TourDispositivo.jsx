import { useEffect, useState } from 'react';
import { menosMovimiento } from '../../lib/preferencias';
import { Link } from 'react-router-dom';
import { Dispositivo, Escala } from './Dispositivo';
import { laminasPara, ROL } from '../ayuda/contenido';
import { ILUSTRACIONES } from '../ayuda/Ilustraciones';
import { useMovil } from '../../lib/movil';

const DURACION = 10;
const menos = () => menosMovimiento();

/** El recorrido animado de la aplicación, visto dentro de un iPhone (en el celular) o de una MacBook (en el computador).
 *  Avanza solo, se puede pausar, retroceder y saltar de lámina. Es el mismo contenido de «Cómo se usa». */
export default function TourDispositivo({ rol = 'admin', dispositivo = 'auto', onIr, onFin, compacto = false, pantalla = false }) {
  const movil = useMovil();
  const tipo = dispositivo === 'auto' ? (movil ? 'iphone' : 'macbook') : dispositivo;
  const laminas = laminasPara(rol), n = laminas.length;
  const [i, setI] = useState(0);
  const [juega, setJuega] = useState(!menos());
  const l = laminas[Math.min(i, n - 1)], Ilus = ILUSTRACIONES[l.id];
  const siguiente = () => (i < n - 1 ? setI(i + 1) : onFin ? onFin() : setI(0));
  const anterior = () => setI(Math.max(0, i - 1));
  useEffect(() => { setI(0); }, [laminas.map(x => x.id).join()]);
  useEffect(() => {
    const tecla = e => { if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return; if (e.key === 'ArrowRight') siguiente(); if (e.key === 'ArrowLeft') anterior(); };
    window.addEventListener('keydown', tecla); return () => window.removeEventListener('keydown', tecla);
    // eslint-disable-next-line
  }, [i]);

  return (
    <section className={`tour-disp tour-${tipo}${compacto ? ' compacto' : ''}${pantalla ? ' tour-fit' : ''}`} aria-label="Cómo funciona el sistema" aria-roledescription="carrusel">
      <Dispositivo tipo={tipo} etiqueta={`Recorrido de la aplicación en ${tipo === 'iphone' ? 'un iPhone' : tipo === 'android' ? 'un Android' : 'una MacBook'}`}>
        <div className="td-pantalla" key={l.id}>
          <div className="td-barra"><img src="/logo-icon.png" alt="" /><b>sistema <i>de gestión</i></b><em>{i + 1}/{n}</em></div>
          <div className="td-ilus" aria-hidden="true"><Escala ancho={tipo === 'macbook' ? 600 : 400}><div className="rec-escena"><div className="ilus"><Ilus /></div></div></Escala></div>
          <p className="td-titulo"><i className={`fa-solid ${l.icono}`} aria-hidden="true"></i> {l.titulo}</p>
          {tipo !== 'macbook' && <div className="td-cuerpo" tabIndex={0} role="region" aria-label="Detalle de la lámina"><p className="td-resumen">{l.resumen}</p><ol className="td-pasos">{l.pasos.slice(0, 3).map((p, k) => <li key={k}><span>{k + 1}</span>{p}</li>)}</ol></div>}
        </div>
      </Dispositivo>
      <div className="td-texto" aria-live="polite">
        <span className="rec-n">Lámina {i + 1} de {n}{l.roles && <span className="rec-para"> · para {l.roles.map(r => ROL[r].nombre).join(', ')}</span>}</span>
        <h3><i className={`fa-solid ${l.icono}`} aria-hidden="true"></i> {l.titulo}</h3>
        <p className="rec-resumen">{l.resumen}</p>
        {!compacto && <ol className="rec-pasos">{l.pasos.slice(0, 4).map((p, k) => <li key={k}><span>{k + 1}</span>{p}</li>)}</ol>}
        {l.ruta && (onIr ? <button className="btn-secondary td-boton" onClick={() => onIr(l.ruta)}>{l.boton}</button> : <Link className="btn-secondary td-boton" to={l.ruta}>{l.boton}</Link>)}
      </div>
      <div className="td-control">
        <button className="btn-texto" onClick={anterior} disabled={i === 0} aria-label="Lámina anterior"><i className="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
        <button className="btn-texto rec-play" onClick={() => setJuega(j => !j)} aria-label={juega ? 'Pausar' : 'Reproducir'}><i className={`fa-solid ${juega ? 'fa-pause' : 'fa-play'}`} aria-hidden="true"></i></button>
        <div className="rec-segmentos" role="tablist" aria-label="Láminas">
          {laminas.map((x, k) => (
            <button key={x.id} role="tab" aria-selected={k === i} aria-label={x.titulo} title={x.titulo} className={`rec-seg${k < i ? ' hecho' : ''}${k === i ? ' actual' : ''}`} onClick={() => setI(k)}>
              {k === i && <u key={`${i}`} style={{ animationDuration: `${DURACION}s`, animationPlayState: juega ? 'running' : 'paused' }} onAnimationEnd={siguiente} />}
            </button>
          ))}
        </div>
        <button className="btn-texto" onClick={siguiente} aria-label="Lámina siguiente"><i className="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
      </div>
    </section>
  );
}
