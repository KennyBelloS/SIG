import { cumpleMeta, formatearValor, metaDelMes, MESES, MESES_CORTO } from '../lib/indicadores';

/** La gráfica de la hoja del Excel: barras con el resultado de cada mes, la línea de la meta y, si existe, la banda hasta la meta máxima.
 *  Se dibuja con el indicador que se está editando, así que cambia mientras la persona escribe. */
export default function GraficaMetas({ indicador, resultados, anio }) {
  const W = 560, H = 236, L = 50, R = 12, T = 16, B = 28;
  const metas = MESES.map((_, i) => metaDelMes(indicador, i + 1));
  const vals = MESES.map((_, i) => (resultados[i + 1] == null ? null : Number(resultados[i + 1])));
  const todos = [...vals, ...metas, indicador.meta_maxima].filter(v => v != null && Number.isFinite(Number(v))).map(Number);
  const max = Math.max(...(todos.length ? todos : [1]), 1e-9) * 1.15;
  const min = Math.min(0, ...(todos.length ? todos : [0])) * 1.15;
  const y = v => T + (1 - (v - min) / (max - min || 1)) * (H - T - B);
  const ancho = (W - L - R) / 12, barra = ancho * 0.56;
  const x = i => L + i * ancho + ancho / 2;
  const marcas = [min, min + (max - min) / 2, max];
  const hayMeta = metas.some(m => m != null);
  const trazo = metas.map((m, i) => (m == null ? null : `${x(i).toFixed(1)},${y(m).toFixed(1)}`)).filter(Boolean);
  const descripcion = `Gráfica de ${anio}: ${vals.filter(v => v != null).length} meses con resultado, ${hayMeta ? 'con su meta' : 'sin meta definida'}${indicador.meta_maxima != null ? ' y meta máxima' : ''}.`;
  return (
    <figure className="grafica-metas">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={descripcion}>
        <title>{descripcion}</title>
        {marcas.map((m, i) => (
          <g key={i}><line x1={L} x2={W - R} y1={y(m)} y2={y(m)} stroke="#E4E1D4" strokeWidth="1" /><text x={L - 6} y={y(m) + 4} textAnchor="end" className="gm-eje">{formatearValor(indicador, m)}</text></g>
        ))}
        {indicador.meta_maxima != null && metas.map((m, i) => m != null && (
          <rect key={`b${i}`} x={L + i * ancho + 2} width={ancho - 4} y={y(indicador.meta_maxima)} height={Math.max(0, y(m) - y(indicador.meta_maxima))} className="gm-banda" />
        ))}
        {vals.map((v, i) => {
          if (v == null) return null;
          const ok = cumpleMeta(indicador, v, i + 1);
          const y0 = y(Math.max(0, min)), y1 = y(v);
          return <rect key={i} x={x(i) - barra / 2} y={Math.min(y0, y1)} width={barra} height={Math.max(2, Math.abs(y0 - y1))} className={`gm-barra ${ok === true ? 'ok' : ok === false ? 'mal' : 'sin'}`} style={{ '--i': i }}><title>{`${MESES[i]}: ${formatearValor(indicador, v)}`}</title></rect>;
        })}
        {trazo.length > 1 && <polyline points={trazo.join(' ')} className="gm-meta" fill="none" />}
        {metas.map((m, i) => m != null && <circle key={`m${i}`} cx={x(i)} cy={y(m)} r="3.2" className="gm-punto" />)}
        {indicador.meta_maxima != null && <line x1={L} x2={W - R} y1={y(indicador.meta_maxima)} y2={y(indicador.meta_maxima)} className="gm-maxima" />}
        {MESES_CORTO.map((m, i) => <text key={m} x={x(i)} y={H - 8} textAnchor="middle" className="gm-eje">{m}</text>)}
      </svg>
      <figcaption>
        <span><i className="gm-leyenda ok" /> Cumple</span><span><i className="gm-leyenda mal" /> No cumple</span>
        {hayMeta && <span><i className="gm-leyenda meta" /> Meta</span>}{indicador.meta_maxima != null && <span><i className="gm-leyenda banda" /> Hasta la máxima</span>}
      </figcaption>
    </figure>
  );
}
