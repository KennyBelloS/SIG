import { useEffect, useState } from 'react';
import { HojaInferior } from './Piezas';
import { getResumenMes, mesReporteActual, traducirError, MESES } from '../../lib/indicadores';

/** Una lista corta y accionable: los indicadores que faltan por registrar este mes, o los que no cumplen su meta. Cada uno abre su ficha. */
export default function HojaIndicadores({ modo, navegar, onCerrar }) {
  const { anio, mesActual } = mesReporteActual();
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { getResumenMes(anio, mesActual).then(setD).catch(e => setError(traducirError(e))); }, [anio, mesActual]);
  const falta = modo === 'pendientes';
  const grupos = (d?.porProceso || []).map(p => ({ id: p.id, nombre: p.nombre, items: p.items.filter(i => (falta ? i.estado === 'pendiente' : i.estado === 'no')) })).filter(g => g.items.length);
  const total = grupos.reduce((n, g) => n + g.items.length, 0);
  return (
    <HojaInferior titulo={falta ? 'Lo que falta registrar' : 'Lo que no cumple'} onCerrar={onCerrar}>
      <p className="hi-sub">{MESES[mesActual - 1]} {anio}{d ? ` · ${total} ${total === 1 ? 'indicador' : 'indicadores'}` : ''}</p>
      {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>}
      {!d && !error && <p className="hi-sub">Cargando…</p>}
      {d && total === 0 && <div className="estado-vacio"><i className={`fa-solid ${falta ? 'fa-circle-check' : 'fa-seedling'}`} aria-hidden="true"></i><h3>{falta ? '¡Todo al día!' : 'Ninguno incumple su meta'}</h3><p>{falta ? `Ya se registró todo lo de ${MESES[mesActual - 1].toLowerCase()}.` : 'Todo lo registrado este mes cumple su meta.'}</p></div>}
      {grupos.map(g => (
        <section key={g.id} className="hi-grupo">
          <h3>{g.nombre}</h3>
          <ul className="hoja-lista">
            {g.items.map(i => (
              <li key={i.id}><button type="button" onClick={() => { onCerrar(); navegar(`/indicadores/${i.id}`); }}>
                <span className={`hoja-ico hi-${i.estado}`}><i className={`fa-solid ${falta ? 'fa-pen' : 'fa-triangle-exclamation'}`} aria-hidden="true"></i></span>
                <span><strong>{i.nombre}</strong><small>{falta ? 'Toca para registrar' : i.sinPlan ? 'No cumple y no tiene plan de acción' : 'No cumple: revisa su plan'}</small></span>
                <i className="fa-solid fa-chevron-right hoja-flecha" aria-hidden="true"></i>
              </button></li>
            ))}
          </ul>
        </section>
      ))}
    </HojaInferior>
  );
}
