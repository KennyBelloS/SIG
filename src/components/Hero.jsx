import Numero from './Numero';
import Anillo from './Anillo';

/** Encabezado heroico de los módulos principales: una cifra grande que cuenta hasta su valor,
 *  una frase de contexto y, a la derecha, las cifras que la acompañan (y opcionalmente un anillo). */
export default function Hero({ etiqueta, valor, sufijo = '', nota, tono, anillo, datos = [], children, vivo = false }) {
  return (
    <section className="hero-dash hero-comun" aria-label={etiqueta}>
      <div className="hero-principal">
        <span className="hero-etiqueta">{vivo && <i className="hero-vivo" aria-hidden="true" />}{etiqueta}</span>
        <strong className={`hero-cifra${tono ? ` tono-${tono}` : ''}`}>{valor == null ? '—' : <><Numero valor={valor} />{sufijo && <small>{sufijo}</small>}</>}</strong>
        {nota && <span className="hero-delta">{nota}</span>}
        {children}
      </div>
      <dl className="hero-datos">
        {anillo && (
          <div className="hero-anillo"><Anillo valor={anillo.valor} tamano={86} grosor={9} etiqueta={anillo.etiqueta} />
            <span><dt>{anillo.etiqueta}</dt><small>{anillo.nota}</small></span></div>
        )}
        {datos.map(d => (
          <div key={d.titulo}><dt>{d.titulo}</dt><dd className={d.tono || ''}>{typeof d.valor === 'number' ? <Numero valor={d.valor} sufijo={d.sufijo || ''} /> : (d.valor ?? '—')}</dd><small>{d.nota}</small></div>
        ))}
      </dl>
    </section>
  );
}
