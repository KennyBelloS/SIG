import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { laminasPara, ROL } from './contenido';
import { ILUSTRACIONES } from './Ilustraciones';

const DURACION = 12; // segundos por lámina

/** Recorrido animado: una lámina por módulo, con su ilustración, su explicación y un botón para ir.
 *  Avanza solo; se puede pausar, retroceder, saltar a una lámina o usar las flechas del teclado. */
export default function Recorrido({ compacto = false, onFin, onIr, laminas: laminasProp, mostrarRoles = false }) {
  const LAMINAS = laminasProp || laminasPara('admin');
  const reducido = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [i, setI] = useState(0);
  const [juega, setJuega] = useState(!reducido);
  const n = LAMINAS.length;
  const l = LAMINAS[Math.min(i, n - 1)];
  const Ilus = ILUSTRACIONES[l.id];
  useEffect(() => { setI(0); }, [LAMINAS.map(x => x.id).join()]);
  const siguiente = () => (i < n - 1 ? setI(i + 1) : onFin ? onFin() : setI(0));
  const anterior = () => setI(Math.max(0, i - 1));

  useEffect(() => {
    const tecla = e => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight') siguiente();
      if (e.key === 'ArrowLeft') anterior();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
    // eslint-disable-next-line
  }, [i]);

  return (
    <section className={`recorrido${compacto ? ' compacto' : ''}`} aria-label="Recorrido animado por la aplicación" aria-roledescription="carrusel">
      <div className="rec-escena" key={l.id} aria-hidden="true"><div className="ilus"><Ilus /></div></div>
      <div className="rec-texto" aria-live="polite">
        <span className="rec-n">Lámina {i + 1} de {n}{mostrarRoles && l.roles && <span className="rec-para"> · para {l.roles.map(r => ROL[r].nombre).join(', ')}</span>}</span>
        <h3><i className={`fa-solid ${l.icono}`} aria-hidden="true"></i> {l.titulo}</h3>
        <p className="rec-resumen">{l.resumen}</p>
        <ol className="rec-pasos">{l.pasos.map((p, k) => <li key={k}><span>{k + 1}</span>{p}</li>)}</ol>
        {l.ruta && (onIr
          ? <button className="btn-secondary" onClick={() => onIr(l.ruta)}>{l.boton}</button>
          : <Link className="btn-secondary" to={l.ruta}>{l.boton}</Link>)}
      </div>
      <div className="rec-control">
        <button className="btn-texto" onClick={anterior} disabled={i === 0} aria-label="Lámina anterior"><i className="fa-solid fa-chevron-left"></i></button>
        <button className="btn-texto rec-play" onClick={() => setJuega(j => !j)} aria-label={juega ? 'Pausar' : 'Reproducir'}><i className={`fa-solid ${juega ? 'fa-pause' : 'fa-play'}`}></i></button>
        <div className="rec-segmentos" role="tablist" aria-label="Láminas">
          {LAMINAS.map((x, k) => (
            <button key={x.id} role="tab" aria-selected={k === i} aria-label={x.titulo} title={x.titulo} className={`rec-seg${k < i ? ' hecho' : ''}${k === i ? ' actual' : ''}`} onClick={() => setI(k)}>
              {k === i && <u key={`${i}`} style={{ animationDuration: `${DURACION}s`, animationPlayState: juega ? 'running' : 'paused' }} onAnimationEnd={siguiente} />}
            </button>
          ))}
        </div>
        <button className="btn-texto" onClick={siguiente} aria-label="Lámina siguiente"><i className="fa-solid fa-chevron-right"></i></button>
      </div>
    </section>
  );
}
