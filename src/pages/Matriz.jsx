import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Hero from '../components/Hero';
import { traducirError } from '../lib/indicadores';
import {
  getIndicadores, getProcesos, supabaseRegistrosAnio, getCierresDelAnio, getConfiguracionNotificaciones,
  estaCerrado, cumpleMeta, formatearValor, formatearMeta, formatearMetaMensual, tipoMetaEfectivo,
  mesReporteActual, exportarExcel, MESES, MESES_CORTO,
} from '../lib/indicadores';

const { anio: ANIO_ACTUAL } = mesReporteActual();

/** Mini-tendencia del año: la línea une los meses con dato y el punto final toma el color del último resultado. */
function Spark({ meses }) {
  const pts = meses.filter(m => m.valor != null && Number.isFinite(m.valor));
  if (pts.length < 2) return <span className="celda-tenue">—</span>;
  const W = 74, H = 26;
  const vs = pts.map(p => p.valor), mn = Math.min(...vs), mx = Math.max(...vs);
  const x = m => 3 + ((m - 1) / 11) * (W - 6);
  const y = v => (mx === mn ? H / 2 : H - 3 - ((v - mn) / (mx - mn)) * (H - 6));
  const u = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Tendencia del año: ${pts.length} meses con dato`}>
      <polyline points={pts.map(p => `${x(p.m).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ')} />
      <circle cx={x(u.m)} cy={y(u.valor)} r="3.2" fill={u.estado === 'cumple' ? 'var(--ok)' : u.estado === 'incumple' ? 'var(--wine)' : 'var(--ink-3)'} />
    </svg>
  );
}

const FRECUENCIAS = { mensual: 'Mensual', bimestral: 'Bimestral', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' };
const etiquetaFrecuencia = f => FRECUENCIAS[f] || (f ? f : '—');

/** Matriz principal: todos los indicadores activos en una sola tabla, mes a mes. Un indicador nuevo
 *  aparece aquí apenas se crea. */
export default function Matriz() {
  const navegar = useNavigate();
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [procesoId, setProcesoId] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vivo = true;
    setDatos(null); setError(null);
    Promise.all([getIndicadores(), getProcesos(), supabaseRegistrosAnio(anio), getCierresDelAnio(anio),
      getConfiguracionNotificaciones().catch(() => ({ dia_cierre: 12 }))])
      .then(([indicadores, procesos, registros, cierres, cfg]) => vivo && setDatos({ indicadores, procesos, registros, cierres, diaCierre: cfg?.dia_cierre ?? 12 }))
      .catch(e => vivo && setError(traducirError(e)));
    return () => { vivo = false; };
  }, [anio]);

  const filas = useMemo(() => {
    if (!datos) return [];
    const proceso = new Map(datos.procesos.map(p => [p.id, p.nombre]));
    const porInd = new Map();
    for (const r of datos.registros) {
      if (!porInd.has(r.indicador_id)) porInd.set(r.indicador_id, new Map());
      porInd.get(r.indicador_id).set(r.mes, r);
    }
    return datos.indicadores.map(ind => {
      const meses = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1; const r = porInd.get(ind.id)?.get(m);
        if (r && r.valor != null) {
          const c = cumpleMeta(ind, r.valor, m);
          return { m, estado: c === true ? 'cumple' : c === false ? 'incumple' : 'sinmeta', texto: formatearValor(ind, r.valor), valor: Number(r.valor) };
        }
        return { m, estado: estaCerrado(anio, m, datos.cierres, datos.diaCierre) ? 'perdido' : 'vacio', texto: '' };
      });
      const cumplen = meses.filter(x => x.estado === 'cumple').length;
      const incumplen = meses.filter(x => x.estado === 'incumple').length;
      const sinDilig = meses.filter(x => x.estado === 'perdido').length;
      return { ind, proceso: proceso.get(ind.proceso_id) || '—', meses, cumplen, incumplen, sinDilig,
        pct: cumplen + incumplen ? Math.round((cumplen / (cumplen + incumplen)) * 100) : null };
    });
  }, [datos, anio]);

  const visibles = useMemo(() => filas.filter(f => {
    if (procesoId && f.ind.proceso_id !== Number(procesoId)) return false;
    if (estadoFiltro === 'incumplen' && f.incumplen === 0) return false;
    if (estadoFiltro === 'sin_dilig' && f.sinDilig === 0) return false;
    const t = busqueda.trim().toLowerCase();
    if (t && !`${f.ind.nombre} ${f.ind.responsable_medicion || ''} ${f.proceso}`.toLowerCase().includes(t)) return false;
    return true;
  }), [filas, procesoId, estadoFiltro, busqueda]);

  // Resumen por mes (solo sobre las filas visibles)
  const pie = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const c = visibles.filter(f => f.meses[i].estado === 'cumple').length;
    const n = visibles.filter(f => f.meses[i].estado === 'incumple').length;
    return c + n ? Math.round((c / (c + n)) * 100) : null;
  }), [visibles]);

  function exportar() {
    exportarExcel({
      nombreArchivo: `Matriz de indicadores ${anio}`,
      titulo: `Matriz de indicadores · ${anio}`,
      subtitulo: `${visibles.length} indicadores. Verde: cumple la meta. Rojo: no cumple. Naranja: mes vencido sin registrar.`,
      columnas: [
        { titulo: 'Proceso', valor: f => f.proceso, ancho: 150 },
        { titulo: 'Indicador', valor: f => f.ind.nombre, ancho: 300, estilo: () => 'font-weight:bold;' },
        { titulo: 'Responsable', valor: f => f.ind.responsable_medicion, ancho: 170 },
        { titulo: 'Frecuencia de medición', valor: f => etiquetaFrecuencia(f.ind.frecuencia), ancho: 110 },
        { titulo: 'Frecuencia de seguimiento', valor: f => etiquetaFrecuencia(f.ind.frecuencia_seguimiento), ancho: 120 },
        { titulo: 'Meta anual', valor: f => formatearMeta(f.ind), ancho: 85, alinear: 'center' },
        { titulo: 'Meta mensual', valor: f => formatearMetaMensual(f.ind), ancho: 85, alinear: 'center' },
        ...MESES_CORTO.map((m, i) => ({
          titulo: m, ancho: 62, alinear: 'center', valor: f => f.meses[i].texto || (f.meses[i].estado === 'perdido' ? 'Sin registrar' : ''),
          estilo: f => { const e = f.meses[i].estado; return e === 'cumple' ? 'background:#DDEEE3;color:#166534;font-weight:bold;' : e === 'incumple' ? 'background:#F7D9DF;color:#A91D3A;font-weight:bold;' : e === 'perdido' ? 'background:#FBE3C8;color:#8A4B0F;' : ''; },
        })),
        { titulo: '% cumplimiento', valor: f => (f.pct == null ? '' : `${f.pct}%`), ancho: 95, alinear: 'center', estilo: () => 'font-weight:bold;' },
        { titulo: 'Meses que no cumplieron la meta', valor: f => f.incumplen, ancho: 120, alinear: 'center' },
        { titulo: 'Meses sin diligenciar', valor: f => f.sinDilig, ancho: 110, alinear: 'center' },
      ],
      filas: visibles,
    });
  }

  return (
    <div className="page">
      <PageHeader
        migas={[{ texto: 'Seguimiento' }, { texto: 'Matriz' }]}
        titulo="Matriz de indicadores"
        descripcion="Todos los indicadores en una sola vista, mes a mes. Los indicadores nuevos aparecen aquí apenas se crean."
      >
        <label className="sr-only" htmlFor="mx-anio">Año</label>
        <select id="mx-anio" value={anio} onChange={e => setAnio(Number(e.target.value))}>
          {[ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button className="btn-secondary" onClick={exportar} disabled={!datos}><i className="fa-solid fa-file-excel"></i> Exportar a Excel</button>
      </PageHeader>

      {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation"></i><span>{error}</span></div>}

      {datos && (() => {
        const cumplen = visibles.reduce((n, f) => n + f.cumplen, 0), incumplen = visibles.reduce((n, f) => n + f.incumplen, 0), sin = visibles.reduce((n, f) => n + f.sinDilig, 0);
        const pct = cumplen + incumplen ? Math.round((cumplen / (cumplen + incumplen)) * 100) : null;
        return (
          <Hero
            etiqueta={`Cumplimiento ${anio}${procesoId || busqueda || estadoFiltro !== 'todos' ? ' · según tus filtros' : ''}`}
            valor={pct} sufijo="%" tono={pct == null ? undefined : pct >= 85 ? 'bien' : pct >= 60 ? 'aten' : 'mal'}
            nota={`${visibles.length} indicador${visibles.length === 1 ? '' : 'es'} a la vista`}
            datos={[
              { titulo: 'Cumplieron la meta', valor: cumplen, nota: 'meses con dato que cumplen' },
              { titulo: 'No llegaron a la meta', valor: incumplen, tono: incumplen ? 'alerta' : '', nota: 'meses por debajo de la meta' },
              { titulo: 'Sin diligenciar', valor: sin, tono: sin ? 'aten' : '', nota: 'meses vencidos sin dato' },
            ]}
          />
        );
      })()}

      <div className="barra-filtros">
        <div className="campo-busqueda">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input type="search" aria-label="Buscar" placeholder="Buscar indicador o responsable" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <label className="sr-only" htmlFor="mx-proc">Proceso</label>
        <select id="mx-proc" value={procesoId} onChange={e => setProcesoId(e.target.value)}>
          <option value="">Todos los procesos</option>
          {datos?.procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <div className="filtros-estado" role="group" aria-label="Filtrar">
          {[['todos', 'Todos'], ['incumplen', 'No cumplen meta'], ['sin_dilig', 'Sin diligenciar']].map(([v, t]) => (
            <button key={v} className={`filtro-chip ${estadoFiltro === v ? 'filtro-chip-activo' : ''}`} aria-pressed={estadoFiltro === v} onClick={() => setEstadoFiltro(v)}>{t}</button>
          ))}
        </div>
      </div>

      {!datos && !error ? (
        <div aria-busy="true"><div className="esqueleto" style={{ height: 420 }} /></div>
      ) : datos && (
        <section className="panel panel-matriz">
          <div className="tabla-scroll matriz-scroll">
            <table className="matriz">
              <thead>
                <tr>
                  <th className="mx-ind">Indicador</th>
                  <th>Medición</th><th>Seguimiento</th><th>Meta anual</th><th>Meta mensual</th>
                  {MESES_CORTO.map((m, i) => <th key={m} className="mx-mes" title={MESES[i]}>{m}</th>)}
                  <th>Cumple</th><th title="Meses que no alcanzaron la meta">No cumple</th><th title="Meses vencidos sin registrar">Sin dilig.</th><th>Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {visibles.length === 0 && <tr><td colSpan={21} className="sin-resultados">Ningún indicador coincide con los filtros.</td></tr>}
                {visibles.map((f, k) => (
                  <Fragment key={f.ind.id}>
                    {(k === 0 || visibles[k - 1].proceso !== f.proceso) && (
                      <tr key={`g-${f.proceso}`} className="mx-grupo"><td colSpan={21}><span>{f.proceso}</span></td></tr>
                    )}
                    <tr>
                      <td className="mx-ind">
                        <Link to={`/indicadores/${f.ind.id}?anio=${anio}`}>{f.ind.categoria && <i className="punto-cat" title={f.ind.categoria} style={{ background: f.ind.color_categoria }} />}{f.ind.nombre}</Link>
                        <small>{f.ind.responsable_medicion || ''}</small>
                      </td>
                      <td>{etiquetaFrecuencia(f.ind.frecuencia)}</td>
                      <td>{etiquetaFrecuencia(f.ind.frecuencia_seguimiento)}</td>
                      <td className="num"><span className={tipoMetaEfectivo(f.ind) === 'anual' ? 'meta-activa' : ''}>{formatearMeta(f.ind)}</span></td>
                      <td className="num"><span className={tipoMetaEfectivo(f.ind) === 'mensual' ? 'meta-activa' : ''}>{formatearMetaMensual(f.ind)}</span></td>
                      {f.meses.map(c => (
                        <td key={c.m} className={`mx-celda mx-${c.estado} num`}>
                          <button type="button" onClick={() => navegar(`/indicadores/${f.ind.id}?anio=${anio}&mes=${c.m}`)}
                            aria-label={`${f.ind.nombre}, ${MESES[c.m - 1]}: ${c.texto || (c.estado === 'perdido' ? 'venció sin registrar' : 'sin dato')}`}>
                            {c.texto || (c.estado === 'perdido' ? '—' : '')}
                          </button>
                        </td>
                      ))}
                      <td className="num mx-res" style={{ color: f.pct == null ? undefined : f.pct >= 85 ? 'var(--ok)' : f.pct >= 60 ? 'var(--gold-ink)' : 'var(--wine)' }}>{f.pct == null ? '—' : `${f.pct}%`}</td>
                      <td className="num mx-res">{f.incumplen || <span className="celda-tenue">0</span>}</td>
                      <td className="num mx-res">{f.sinDilig || <span className="celda-tenue">0</span>}</td>
                      <td className="mx-spark"><Spark meses={f.meses} /></td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="mx-ind">Cumplimiento del mes</td><td colSpan={4}></td>
                  {pie.map((p, i) => <td key={i} className="num mx-pie" style={{ color: p == null ? 'var(--ink-3)' : p >= 85 ? 'var(--ok)' : p >= 60 ? 'var(--gold-ink)' : 'var(--wine)' }}>{p == null ? '' : `${p}%`}</td>)}
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="cinta-leyenda">
            <span><i className="cinta-punto" style={{ background: '#DDEEE3', boxShadow: 'inset 0 0 0 1px #166534' }} /> Cumple</span>
            <span><i className="cinta-punto" style={{ background: '#F7D9DF', boxShadow: 'inset 0 0 0 1px #A91D3A' }} /> No cumple la meta</span>
            <span><i className="cinta-punto cinta-perdido" /> Venció sin registrar</span>
            <span className="celda-tenue">Subrayada: la meta que rige el indicador. Haz clic en un mes para abrirlo.</span>
          </div>
        </section>
      )}
    </div>
  );
}
