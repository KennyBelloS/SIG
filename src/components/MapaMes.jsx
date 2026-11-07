import { cumpleMeta, formatearValor, MESES } from '../lib/indicadores';

const TEXTO = { cumple: 'cumple la meta', incumple: 'no alcanzó la meta', pendiente: 'por registrar', perdido: 'venció sin registrar', sinmeta: 'registrado, sin meta para evaluar' };

/** El mes dibujado como un plano de la finca: un lote por proceso y una casilla por indicador.
 *  De un vistazo se ve qué proceso va al día, cuál no cumple y cuál no ha registrado. */
export default function MapaMes({ procesos, indicadoresPorProceso, registros, mes, anio, cerrado, onAbrir }) {
  const estadoDe = ind => {
    const v = registros.get(ind.id)?.valor;
    if (v == null) return cerrado ? 'perdido' : 'pendiente';
    const c = cumpleMeta(ind, v, mes);
    return c === true ? 'cumple' : c === false ? 'incumple' : 'sinmeta';
  };
  let n = 0;
  return (
    <section className="panel mapa-mes" aria-label={`Mapa de ${MESES[mes - 1]} ${anio}`}>
      <div className="panel-header">
        <div><h2>{MESES[mes - 1]} {anio} en el plano</h2><p className="sub">Un lote por proceso y una casilla por indicador. Toca una casilla para abrirla.</p></div>
        <ul className="mm-leyenda" aria-label="Cómo leer los colores">
          {['cumple', 'incumple', 'pendiente', 'perdido'].map(e => <li key={e}><i className={`mm-cama e-${e}`} aria-hidden="true" />{TEXTO[e]}</li>)}
        </ul>
      </div>
      <div className="mm-lotes">
        {procesos.map(p => {
          const inds = indicadoresPorProceso.get(p.id) || [];
          const hechos = inds.filter(i => registros.get(i.id)?.valor != null).length;
          return (
            <div className="mm-lote" key={p.id}>
              <div className="mm-lote-cab"><h3 title={p.nombre}>{p.nombre}</h3><span className="mm-cuenta">{hechos}<small> de {inds.length}</small></span></div>
              <ul className="mm-camas">
                {inds.map(ind => {
                  const e = estadoDe(ind), v = registros.get(ind.id)?.valor;
                  return (
                    <li key={ind.id}>
                      <button type="button" className={`mm-cama e-${e}`} style={{ '--i': n++ }} onClick={() => onAbrir(ind.id)}
                        title={`${ind.nombre}: ${v != null ? `${formatearValor(ind, v)}, ` : ''}${TEXTO[e]}`}
                        aria-label={`${ind.nombre}, ${TEXTO[e]}`} />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
