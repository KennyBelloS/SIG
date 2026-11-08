import { MESES, MESES_CORTO, cumpleMeta, formatearValor, metaDelMes, superaMaximo } from '../lib/indicadores';
import { etiquetasDe } from '../lib/calculo';

/** La tabla de cada hoja del Excel, mes por mes: Meta, Máxima, los datos de apoyo (si los hay) e Indicador.
 *  Cada mes es un botón: abre el registro de ese mes (o su vista, si está cerrado). */
export default function TablaMeses({ indicador, registros, anio, mesCerradoEn, onAbrir, puedeRegistrar }) {
  const reg = m => registros.find(r => r.mes === m && (r.anio == null || r.anio === anio));
  const apoyo = indicador.componentes && (indicador.componentes.a || indicador.componentes.b) ? etiquetasDe(indicador) : null;
  const hayApoyoDatos = apoyo && registros.some(r => r.componentes && (r.componentes.a != null || r.componentes.b != null));
  const metaVaria = indicador.metas_mensuales && Object.keys(indicador.metas_mensuales).length > 0;
  const num = v => (v == null ? '' : Number(v).toLocaleString('es-CO', { maximumFractionDigits: 4 }));
  return (
    <section className="panel" aria-labelledby="tabla-excel-t">
      <div className="panel-header"><div><h2 id="tabla-excel-t">La tabla de {anio}, como en el Excel</h2><p className="sub">Meta, datos de apoyo y resultado de cada mes. {puedeRegistrar ? 'Toca un mes para registrarlo.' : 'Toca un mes para verlo.'}</p></div></div>
      <div className="tabla-scroll" tabIndex={0} role="region" aria-label="Tabla de meta y resultados por mes: usa las flechas del teclado para moverte">
        <table className="tabla-excel">
          <thead>
            <tr><th scope="col" className="te-vacio"><span className="sr-only">Concepto</span></th>
              {MESES.map((nombre, i) => {
                const m = i + 1, cerrado = mesCerradoEn(m);
                return <th scope="col" key={m}><button type="button" onClick={() => onAbrir(m)}>{MESES_CORTO[i]}{cerrado && <i className="fa-solid fa-lock" aria-hidden="true"></i>}<span className="sr-only">, {nombre}{cerrado ? ', mes cerrado' : ''}: {puedeRegistrar && !cerrado ? 'registrar' : 'ver'}</span></button></th>;
              })}
            </tr>
          </thead>
          <tbody>
            <tr><th scope="row">{metaVaria ? 'Meta del mes' : 'Meta'}</th>{MESES.map((_, i) => { const mt = metaDelMes(indicador, i + 1); return <td key={i}>{mt == null ? '' : formatearValor(indicador, mt)}</td>; })}</tr>
            {indicador.meta_maxima != null && <tr><th scope="row">Máxima</th>{MESES.map((_, i) => <td key={i}>{formatearValor(indicador, indicador.meta_maxima)}</td>)}</tr>}
            {hayApoyoDatos && (
              <>
                <tr className="te-apoyo"><th scope="row">{apoyo.a}</th>{MESES.map((_, i) => <td key={i}>{num(reg(i + 1)?.componentes?.a)}</td>)}</tr>
                <tr className="te-apoyo"><th scope="row">{apoyo.b}</th>{MESES.map((_, i) => <td key={i}>{num(reg(i + 1)?.componentes?.b)}</td>)}</tr>
              </>
            )}
            <tr className="te-resultado"><th scope="row">Indicador</th>
              {MESES.map((_, i) => {
                const m = i + 1, r = reg(m), v = r?.valor, cerrado = mesCerradoEn(m);
                if (v == null) return <td key={m} className={cerrado ? 'te-perdido' : 'te-pendiente'}>{cerrado ? <span title="Venció sin registrar">—</span> : ''}</td>;
                const ok = cumpleMeta(indicador, v, m), sup = superaMaximo(indicador, v);
                return <td key={m} className={`te-valor ${ok === true ? 'te-ok' : ok === false ? 'te-mal' : ''}`}>{formatearValor(indicador, v)}{sup && <small title={`Supera la meta máxima (${formatearValor(indicador, indicador.meta_maxima)})`}> ▲ máx.</small>}</td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>
      {indicador.meta_maxima != null && <p className="ayuda-campo" style={{ marginTop: 10 }}>«▲ máx.» marca un mes que pasó la meta máxima: sigue contando como cumplido, pero conviene entender por qué se excedió.</p>}
    </section>
  );
}
