import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'react-apexcharts';
import PageHeader from '../components/PageHeader';
import { traducirError } from '../lib/indicadores';
import {
  getDashboard, getProcesos, getConfiguracionNotificaciones, mesReporteActual, exportarExcel, MESES, MESES_CORTO,
} from '../lib/indicadores';

const { anio: ANIO_ACTUAL, mesActual: MES_ACTUAL } = mesReporteActual();

const nivel = pct => (pct == null ? 'nada' : pct >= 85 ? 'alto' : pct >= 60 ? 'medio' : 'bajo');
/** Para TEXTO se usa el dorado oscuro: el dorado de la marca sobre blanco no alcanza el contraste mínimo. */
const colorTexto = { alto: 'var(--ok)', medio: 'var(--gold-ink)', bajo: 'var(--wine)', nada: 'var(--ink-3)' };
const colorNivel = { alto: 'var(--ok)', medio: 'var(--gold)', bajo: 'var(--wine)', nada: 'var(--line-strong)' };
const PALETA_TORTA = ['#A91D3A', '#C9932B', '#166534', '#4472C4', '#8064A2', '#2F9E4F', '#B5651D', '#7F7F7F'];

/** Mapa del año: cada fila es un proceso (o un indicador, si ya se filtró un proceso) y cada columna un mes. */
const TEXTO_ESTADO = { cumple: 'cumple la meta', incumple: 'no alcanzó la meta', nodilig: 'venció sin registrar', sinmeta: 'registrado, sin meta para evaluar', abierto: 'mes abierto' };

/** Todos los indicadores del filtro actual, con su meta, último dato, cumplimiento y estado de cada mes. */
function TablaIndicadores({ tabla, anio }) {
  const [orden, setOrden] = useState('orden');
  const filas = useMemo(() => {
    const t = [...tabla];
    if (orden === 'menor') t.sort((a, b) => (a.pct ?? 999) - (b.pct ?? 999));
    else if (orden === 'mayor') t.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    else if (orden === 'nombre') t.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    else if (orden === 'proceso') t.sort((a, b) => a.proceso.localeCompare(b.proceso, 'es') || a.orden - b.orden);
    return t;
  }, [tabla, orden]);
  return (
    <section className="panel" aria-labelledby="tabla-todos">
      <div className="panel-header">
        <div><h2 id="tabla-todos">Todos los indicadores</h2><p className="sub">{tabla.length} indicador{tabla.length === 1 ? '' : 'es'} con su meta, último dato y estado mes a mes.</p></div>
        <label className="campo-lateral">Ordenar por
          <select value={orden} onChange={e => setOrden(e.target.value)}>
            <option value="orden">Orden del libro</option><option value="menor">Cumplimiento: menor primero</option><option value="mayor">Cumplimiento: mayor primero</option>
            <option value="proceso">Proceso</option><option value="nombre">Nombre</option>
          </select>
        </label>
      </div>
      <div className="tabla-scroll" tabIndex={0} role="region" aria-label="Tabla de todos los indicadores: usa las flechas del teclado para moverte">
        <table className="tabla-todos">
          <thead><tr><th>Indicador</th><th>Meta</th><th>Último dato</th><th>Cumplimiento</th><th>Meses</th><th>Sin diligenciar</th><th>Sin plan</th></tr></thead>
          <tbody>
            {filas.map(f => (
              <tr key={f.id}>
                <td className="celda-principal">
                  <Link to={`/indicadores/${f.id}?anio=${anio}`}>{f.nombre}</Link>
                  <span className="celda-sub texto-tenue">{f.proceso}</span>
                  <span className="celda-sub"><i className="punto-pilar" style={{ background: f.pilarColor || 'var(--line-strong)' }} aria-hidden="true"></i>{f.pilar} <span className="texto-tenue">({f.tipo})</span></span>
                </td>
                <td>{f.meta}{f.metaMensual && f.metaMensual !== '—' ? <span className="celda-sub texto-tenue">Mensual: {f.metaMensual}</span> : null}</td>
                <td>{f.ultimo ? <>{f.ultimo.texto}<span className="celda-sub texto-tenue">{MESES[f.ultimo.mes - 1]}</span></> : <span className="texto-tenue">Sin datos</span>}</td>
                <td>{f.pct == null ? <span className="texto-tenue">—</span> : <><strong className={`nivel-${nivel(f.pct)}`}>{f.pct} %</strong><span className="celda-sub texto-tenue">{f.cumplen} de {f.evaluados} meses</span></>}</td>
                <td><span className="mini-meses" role="img" aria-label={f.estados.map(e => `${MESES[e.mes - 1]}: ${TEXTO_ESTADO[e.estado]}`).join('; ')}>{f.estados.map(e => <i key={e.mes} className={`e-${e.estado}`} title={`${MESES[e.mes - 1]}: ${TEXTO_ESTADO[e.estado]}`} />)}</span></td>
                <td>{f.noDilig ? <strong className="texto-aten">{f.noDilig}</strong> : <span className="texto-tenue">0</span>}</td>
                <td>{f.sinPlan ? <strong className="texto-mal">{f.sinPlan}</strong> : <span className="texto-tenue">0</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MapaAnio({ matriz, anio, tipo }) {
  return (
    <div className="tabla-scroll" tabIndex={0} role="region" aria-label="Tabla desplazable: usa las flechas del teclado para moverte">
      <div className="mapa" role="table" aria-label={`Cumplimiento por ${tipo === 'indicadores' ? 'indicador' : 'proceso'} y mes, ${anio}`}>
        <div className="mapa-fila mapa-cab" role="row">
          <div role="columnheader" className="mapa-nombre" />
          {MESES_CORTO.map((m, i) => <div key={m} role="columnheader" className={`mapa-mes${anio === ANIO_ACTUAL && i + 1 === MES_ACTUAL ? ' es-actual' : ''}`}>{m}</div>)}
        </div>
        {matriz.map((f, r) => (
          <div className="mapa-fila" role="row" key={f.id}>
            <div role="rowheader" className="mapa-nombre" title={f.label}>{f.label}</div>
            {f.meses.map(c => {
              const n = c.futuro ? 'futuro' : c.fuera ? 'fuera' : c.perdido ? 'perdido' : nivel(c.pct);
              const texto = c.futuro ? 'Mes por venir' : c.fuera ? 'Fuera del rango elegido' : c.perdido ? 'Venció sin registrar' : c.pct == null
                ? (c.registrados ? 'Sin meta para evaluar' : 'Aún sin registros')
                : tipo === 'indicadores' ? (c.pct === 100 ? 'Cumple la meta' : 'No cumple la meta') : `${c.cumplidos} de ${c.evaluados} indicadores cumplen`;
              return (
                <div role="cell" key={c.mes} className={`mapa-celda n-${n}${tipo === 'indicadores' ? ' mapa-celda-valor' : ''}`}
                  style={{ '--i': r * 12 + c.mes, '--f': r, '--c': c.mes }} title={`${f.label}, ${MESES[c.mes - 1]}: ${texto}`}>
                  {!c.futuro && !c.fuera && c.pct != null ? (tipo === 'indicadores' ? (c.valorTexto ?? c.pct) : c.pct) : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Barra apilada: cumple / no llegó a la meta / no se diligenció, sobre los registros esperados. */
function BarraApilada({ a, alto = 12 }) {
  const t = a.esperados || 1;
  const w = n => `${(n / t) * 100}%`;
  return (
    <div className="apilada" style={{ height: alto }} role="img"
      aria-label={`${a.cumplen} cumplen, ${a.incumplenMeta} no llegaron a la meta, ${a.noDilig} sin diligenciar, de ${a.esperados}`}>
      <span className="ap-ok" style={{ width: w(a.cumplen) }} title={`Cumplen: ${a.cumplen}`} />
      <span className="ap-meta" style={{ width: w(a.incumplenMeta) }} title={`No llegaron a la meta: ${a.incumplenMeta}`} />
      <span className="ap-dilig" style={{ width: w(a.noDilig) }} title={`Sin diligenciar: ${a.noDilig}`} />
    </div>
  );
}

function Tasa({ pct, n, titulo, clase }) {
  return (
    <div className={`tasa ${clase}`}>
      <span className="tasa-titulo">{titulo}</span>
      <strong className="tasa-valor num">{pct == null ? '—' : <>{pct}<small>%</small></>}</strong>
      <span className="tasa-nota">{n} registros</span>
    </div>
  );
}

function Acumulado({ d }) {
  const a = d.acumulado;
  return (
    <section className="panel">
      <div className="panel-header">
        <div><h2>Cumplimiento e incumplimiento acumulado</h2>
          <p className="sub">Sobre {a.esperados} registros esperados, de {MESES_CORTO[d.desde - 1]} a {MESES_CORTO[d.hasta - 1]}. Hay dos formas de incumplir.</p></div>
      </div>
      {a.esperados === 0 ? <p className="texto-tenue">Todavía no hay meses vencidos o con datos en este rango.</p> : (
        <>
          <div className="tasas">
            <Tasa clase="t-ok" pct={a.pctCumple} n={a.cumplen} titulo="Cumplen la meta" />
            <Tasa clase="t-meta" pct={a.pctIncumpleMeta} n={a.incumplenMeta} titulo="No llegaron a la meta" />
            <Tasa clase="t-dilig" pct={a.pctNoDilig} n={a.noDilig} titulo="No se diligenciaron" />
          </div>
          <BarraApilada a={a} alto={14} />
          <ul className="lista-areas lista-apilada">
            {d.porProceso.map(p => (
              <li key={p.clave} className="area-fila fila-apilada">
                <div className="area-fila-nombre"><span title={p.label}>{p.label}<small>{p.indicadores} indicador{p.indicadores !== 1 ? 'es' : ''}</small></span></div>
                <BarraApilada a={p} />
                <div className="apilada-cifras num"><b style={{ color: 'var(--ok)' }}>{p.pctCumple ?? '—'}%</b><span style={{ color: 'var(--wine)' }}>{p.pctIncumpleMeta ?? '—'}%</span><span className="c-dilig">{p.pctNoDilig ?? '—'}%</span></div>
              </li>
            ))}
          </ul>
          <div className="cinta-leyenda">
            <span><i className="cinta-punto" style={{ background: 'var(--ok)' }} /> Cumplen</span>
            <span><i className="cinta-punto" style={{ background: 'var(--wine)' }} /> No llegaron a la meta</span>
            <span><i className="cinta-punto cinta-perdido" /> No se diligenciaron</span>
            {d.porProceso.some(p => p.sinMeta > 0) && <span><i className="cinta-punto" style={{ background: 'var(--line-soft)', boxShadow: 'inset 0 0 0 1px var(--line-strong)' }} /> Sin meta definida para evaluar</span>}
          </div>
        </>
      )}
    </section>
  );
}

/** Torta: qué indicadores pesan más en el incumplimiento. */
function Torta({ d, anio }) {
  const [tipo, setTipo] = useState('meta');
  const t = d.torta[tipo];
  const colores = t.partes.map((p, i) => (p.id == null ? '#B8B8B0' : PALETA_TORTA[i % PALETA_TORTA.length]));
  return (
    <section className="panel">
      <div className="panel-header">
        <div><h2>Qué indicadores más nos afectaron</h2>
          <p className="sub">Cuánto aporta cada indicador al total de incumplimientos.</p></div>
        <div className="filtros-estado" role="group" aria-label="Tipo de incumplimiento">
          <button className={`filtro-chip ${tipo === 'meta' ? 'filtro-chip-activo' : ''}`} aria-pressed={tipo === 'meta'} onClick={() => setTipo('meta')}>No llegaron a la meta</button>
          <button className={`filtro-chip ${tipo === 'dilig' ? 'filtro-chip-activo' : ''}`} aria-pressed={tipo === 'dilig'} onClick={() => setTipo('dilig')}>No diligenciados</button>
        </div>
      </div>
      {t.total === 0 ? (
        <div className="estado-vacio" style={{ padding: 'var(--s-5) 0' }}>
          <i className="fa-regular fa-face-smile"></i>
          <strong>{tipo === 'meta' ? 'Ningún indicador quedó por debajo de su meta' : 'No hay meses vencidos sin diligenciar'}</strong>
          <p>En el rango y el proceso elegidos no hay nada que mostrar aquí.</p>
        </div>
      ) : (
        <div className="torta">
          <Chart
            type="donut" height={250} series={t.partes.map(p => p.valor)}
            options={{
              chart: { fontFamily: 'inherit', animations: { speed: 450 } },
              labels: t.partes.map(p => p.label), colors: colores, legend: { show: false },
              stroke: { width: 2, colors: ['#fff'] },
              dataLabels: { enabled: true, formatter: v => `${Math.round(v)}%`, dropShadow: { enabled: false }, style: { fontSize: '11px', fontWeight: 700 } },
              plotOptions: { pie: { donut: { size: '62%', labels: { show: true, name: { show: true, fontSize: '12px', color: '#59615C' },
                value: { show: true, fontSize: '26px', fontWeight: 800, color: '#1C2321' },
                total: { show: true, showAlways: true, label: 'incumplimientos', fontSize: '12px', color: '#59615C', formatter: () => t.total } } } } },
              tooltip: { y: { formatter: v => `${v} registro${v !== 1 ? 's' : ''}` } },
            }}
          />
          <ol className="torta-leyenda">
            {t.partes.map((p, i) => (
              <li key={`${p.id}-${i}`}>
                <i style={{ background: colores[i] }} />
                {p.id != null ? <Link to={`/indicadores/${p.id}?anio=${anio}`} title={p.label}>{p.label}<small>{p.proceso}</small></Link> : <span>{p.label}</span>}
                <b className="num">{p.pct}%</b>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function Delta({ actual, previo, mesNombre }) {
  const dif = actual - previo;
  return <span className="hero-delta"><b className={dif >= 0 ? 'sube' : 'baja'}>{dif > 0 ? '+' : ''}{dif} pts</b> frente a {mesNombre}</span>;
}

function FilaBarra({ a }) {
  return (
    <li className="area-fila">
      <div className="area-fila-nombre">
        {a.color && <i className="punto-cat" style={{ background: a.color }} />}
        <span title={a.label}>{a.label}<small>{a.indicadores} indicador{a.indicadores !== 1 ? 'es' : ''}</small></span>
      </div>
      <div className="area-fila-barras">
        <div className="mini-barra" title={`${a.pct ?? '—'}% de cumplimiento`}><div className="mini-barra-relleno" style={{ width: `${a.pct ?? 0}%`, background: colorNivel[nivel(a.pct)] }} /></div>
        <div className="mini-barra mini-barra-sec" title={`${a.pctDiligencia ?? '—'}% diligenciado`}><div className="mini-barra-relleno" style={{ width: `${a.pctDiligencia ?? 0}%`, background: 'var(--f-500)', opacity: .35 }} /></div>
      </div>
      <div className="area-fila-cifra num" style={{ color: colorTexto[nivel(a.pct)] }}>{a.pct == null ? '—' : `${a.pct}%`}</div>
    </li>
  );
}

function Ranking({ lista, anio, alerta }) {
  if (!lista.length) return <p className="texto-tenue">Todavía no hay indicadores con meta para evaluar.</p>;
  return (
    <ol className="ranking">
      {lista.map((i, n) => (
        <li key={i.id}>
          <span className={`ranking-pos${alerta ? ' ranking-pos-alerta' : ''}`}>{n + 1}</span>
          <Link to={`/indicadores/${i.id}?anio=${anio}`} className="ranking-nombre"><strong title={i.nombre}>{i.nombre}</strong><span>{i.proceso}</span></Link>
          <span className="ranking-pct num" style={{ color: colorTexto[nivel(i.pct)] }}>{i.pct}%</span>
        </li>
      ))}
    </ol>
  );
}

export default function Dashboard() {
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const corte = anio === ANIO_ACTUAL ? MES_ACTUAL : 12;
  const [procesos, setProcesos] = useState([]);
  const [procesoId, setProcesoId] = useState('');
  const [desde, setDesde] = useState(1);
  const [hasta, setHasta] = useState(corte);
  const [diaCierre, setDiaCierre] = useState(15);
  const [d, setD] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { getProcesos().then(setProcesos).catch(() => {}); getConfiguracionNotificaciones().then(c => setDiaCierre(c?.dia_cierre ?? 15)).catch(() => {}); }, []);
  useEffect(() => { setHasta(corte); setDesde(1); }, [anio, corte]);

  useEffect(() => {
    let vivo = true;
    setCargando(true); setError(null);
    getDashboard(anio, corte, { procesoId: procesoId || null, desde, hasta, diaCierre })
      .then(x => vivo && setD(x))
      .catch(e => vivo && setError(traducirError(e)))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [anio, corte, procesoId, desde, hasta, diaCierre]);

  const variacion = useMemo(() => {
    if (!d) return null;
    const con = d.evolucion.filter(e => !e.futuro && !e.fuera && !e.abierto && e.pct != null);
    if (con.length < 2) return null;
    return { actual: con[con.length - 1].pct, previo: con[con.length - 2].pct, mesNombre: MESES[con[con.length - 2].mes - 1] };
  }, [d]);

  const filtrado = procesoId !== '' || desde !== 1 || hasta !== corte;
  const nombreProceso = procesoId ? procesos.find(p => p.id === Number(procesoId))?.nombre || 'Proceso' : 'Todos los procesos';

  function descargar() {
    exportarExcel({
      nombreArchivo: `Dashboard de indicadores ${anio}`,
      titulo: `Dashboard de indicadores ${anio}, ${nombreProceso}`,
      subtitulo: `Meses ${MESES[d.desde - 1]} a ${MESES[d.hasta - 1]}. Cumplimiento ${d.pctGlobal ?? '—'}%, diligenciamiento ${d.pctDiligencia ?? '—'}%. Hay dos tipos de incumplimiento: no llegar a la meta y no diligenciar.`,
      columnas: [
        { titulo: 'Proceso', valor: f => f.label, ancho: 210, estilo: () => 'font-weight:bold;' },
        { titulo: 'Indicadores', valor: f => f.indicadores, ancho: 90, alinear: 'center' },
        { titulo: 'Registros esperados', valor: f => f.esperados, ancho: 110, alinear: 'center' },
        { titulo: 'Cumplen', valor: f => f.cumplen, ancho: 80, alinear: 'center' },
        { titulo: '% cumplen', valor: f => (f.pctCumple == null ? '' : `${f.pctCumple}%`), ancho: 90, alinear: 'center', estilo: () => 'background:#DDEEE3;color:#166534;font-weight:bold;' },
        { titulo: 'No llegaron a la meta', valor: f => f.incumplenMeta, ancho: 120, alinear: 'center' },
        { titulo: '% no llegaron a la meta', valor: f => (f.pctIncumpleMeta == null ? '' : `${f.pctIncumpleMeta}%`), ancho: 130, alinear: 'center', estilo: () => 'background:#F7D9DF;color:#A91D3A;font-weight:bold;' },
        { titulo: 'No diligenciados', valor: f => f.noDilig, ancho: 110, alinear: 'center' },
        { titulo: '% no diligenciados', valor: f => (f.pctNoDilig == null ? '' : `${f.pctNoDilig}%`), ancho: 120, alinear: 'center', estilo: () => 'background:#FBE3C8;color:#8A4B0F;font-weight:bold;' },
        { titulo: 'Incumplen sin plan', valor: f => f.sinPlan, ancho: 110, alinear: 'center' },
      ],
      filas: d.porProceso,
    });
  }

  return (
    <div className="page">
      <div className="membrete-impresion" aria-hidden="true">
        <img src="/logo.png" alt="" height="54" />
        <div><strong>Indicadores de Gestión · Dashboard {anio}</strong><span>{nombreProceso}, de {MESES[(d?.desde ?? desde) - 1].toLowerCase()} a {MESES[(d?.hasta ?? hasta) - 1].toLowerCase()}. Generado el {new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}.</span></div>
      </div>
      <PageHeader
        migas={[{ texto: 'Administración' }, { texto: 'Dashboard' }]}
        titulo="Dashboard"
        descripcion={`${nombreProceso}, de ${MESES[(d?.desde ?? desde) - 1].toLowerCase()} a ${MESES[(d?.hasta ?? hasta) - 1].toLowerCase()} de ${anio}.${d?.actualizadoEn ? ` Datos actualizados el ${new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(d.actualizadoEn))}.` : ''}`}
        cifras={d ? [
          { titulo: 'Cumplimiento de la meta', valor: d.pctGlobal, sufijo: '%', principal: true, tono: d.pctGlobal == null ? '' : d.pctGlobal >= 85 ? 'bien' : d.pctGlobal >= 60 ? 'aten' : 'mal',
            nota: variacion ? `${variacion.actual - variacion.previo > 0 ? '+' : ''}${variacion.actual - variacion.previo} pts frente a ${variacion.mesNombre.toLowerCase()}` : `${d.totalIndicadores} indicadores en ${d.totalProcesos} proceso${d.totalProcesos !== 1 ? 's' : ''}` },
          { titulo: 'Diligenciamiento', valor: d.pctDiligencia, sufijo: '%', nota: 'de los registros esperados' },
          { titulo: 'Meses sin diligenciar', valor: d.faltantes, tono: d.faltantes ? 'aten' : '', nota: 'meses vencidos sin dato' },
          { titulo: 'Incumplen sin plan', valor: d.sinPlan, tono: d.sinPlan ? 'mal' : '', nota: d.sinPlan ? 'falta la acción correctiva' : 'todo con plan definido' },
        ] : null}
      >
        <label className="sr-only" htmlFor="anio-dash">Año</label>
        <select id="anio-dash" value={anio} onChange={e => setAnio(Number(e.target.value))}>
          {[ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="fila-botones">
          <button className="btn-secondary" onClick={descargar} disabled={!d} aria-label="Exportar a Excel"><i className="fa-solid fa-file-excel" aria-hidden="true"></i> Excel</button>
          <button type="button" className="btn-secondary" onClick={() => window.print()} aria-label="Descargar PDF"><i className="fa-solid fa-file-pdf" aria-hidden="true"></i> PDF</button>
        </div>
      </PageHeader>

      <div className="barra-filtros filtros-dash" role="group" aria-label="Filtros del dashboard">
        <label className="filtro-etq">Proceso
          <select value={procesoId} onChange={e => setProcesoId(e.target.value)}>
            <option value="">Todos los procesos</option>
            {procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        <label className="filtro-etq">Desde
          <select value={desde} onChange={e => { const v = Number(e.target.value); setDesde(v); if (v > hasta) setHasta(v); }}>
            {MESES.slice(0, corte).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </label>
        <label className="filtro-etq">Hasta
          <select value={hasta} onChange={e => { const v = Number(e.target.value); setHasta(v); if (v < desde) setDesde(v); }}>
            {MESES.slice(0, corte).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </label>
        {filtrado && <button className="btn-texto btn-limpiar" onClick={() => { setProcesoId(''); setDesde(1); setHasta(corte); }}><i className="fa-solid fa-rotate-left"></i> Quitar filtros</button>}
      </div>

      {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation"></i><span>{error}</span></div>}

      {cargando && !d ? (
        <div aria-busy="true" aria-label="Calculando">
          <div className="esqueleto" style={{ height: 230, marginBottom: 16 }} />
          <div className="esqueleto" style={{ height: 320, marginBottom: 16 }} />
        </div>
      ) : d && (
        <div className={cargando ? 'recalculando' : ''}>
          <section className="panel">
            <div className="panel-header">
              <div><h2>Mapa del año</h2>
                <p className="sub">{d.filasTipo === 'indicadores' ? `Cada fila es un indicador de ${nombreProceso}; verde cumple la meta y vino no la alcanza.` : 'Porcentaje de indicadores de cada proceso que cumplió su meta cada mes.'}</p></div>
            </div>
            <MapaAnio matriz={d.matriz} anio={anio} tipo={d.filasTipo} />
            <div className="cinta-leyenda">
              <span><i className="cinta-punto" style={{ background: 'var(--ok)' }} /> {d.filasTipo === 'indicadores' ? 'Cumple' : '85 % o más'}</span>
              {d.filasTipo !== 'indicadores' && <span><i className="cinta-punto" style={{ background: 'var(--gold)' }} /> 60 a 84 %</span>}
              <span><i className="cinta-punto" style={{ background: 'var(--wine)' }} /> {d.filasTipo === 'indicadores' ? 'No cumple' : 'Menos de 60 %'}</span>
              <span><i className="cinta-punto cinta-perdido" /> Venció sin registrar</span>
              <span><i className="cinta-punto" style={{ background: '#EAE7DC' }} /> Aún sin registros</span>
            </div>
          </section>

          <div className="rejilla-dash rejilla-igual">
            <Acumulado d={d} />
            <Torta d={d} anio={anio} />
          </div>


          <section className="panel">
            <div className="panel-header"><h2>Evolución del cumplimiento</h2><span className="sub">{nombreProceso}</span></div>
            <Chart
              type="area" height={340}
              series={[{ name: 'Cumplimiento', data: d.evolucion.map(e => (e.futuro || e.fuera ? null : e.pct)) }]}
              options={{
                chart: { toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 500 } },
                colors: ['#166534'], stroke: { curve: 'smooth', width: 2.5 },
                fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: .22, opacityTo: 0, stops: [0, 100] } },
                markers: { size: 4, strokeWidth: 2, strokeColors: '#fff', colors: ['#166534'], hover: { size: 6 } },
                dataLabels: { enabled: false },
                xaxis: { categories: MESES_CORTO, labels: { style: { fontSize: '12px', colors: '#59615C' } }, axisBorder: { show: false }, axisTicks: { show: false } },
                yaxis: { min: 0, max: 100, tickAmount: 4, labels: { formatter: v => `${Math.round(v)}%`, style: { fontSize: '12px', colors: '#59615C' } } },
                grid: { borderColor: '#EFEDE6', strokeDashArray: 0, padding: { left: 4, right: 8 } },
                tooltip: { theme: 'light', y: { formatter: v => (v == null ? 'Sin datos' : `${v}% de los indicadores cumplen`) } },
              }}
            />
          </section>
          <div className="rejilla-dos">
            <section className="panel" aria-labelledby="por-pilar">
              <div className="panel-header"><div><h2 id="por-pilar">Por pilar de la estrategia ASG</h2><p className="sub">Cumplimiento de la meta en los indicadores de cada pilar.</p></div></div>
              <ul className="lista-areas">{d.porPilar.map(a => <FilaBarra key={a.clave} a={a} />)}</ul>
            </section>
            <section className="panel" aria-labelledby="por-tipo">
              <div className="panel-header"><div><h2 id="por-tipo">Por tipo de indicador</h2><p className="sub">Cumplimiento, eficiencia y eficacia.</p></div></div>
              <ul className="lista-areas">{d.porTipo.map(a => <FilaBarra key={a.clave} a={a} />)}</ul>
            </section>
          </div>

          <div className="rejilla-dos">
            <section className="panel">
              <div className="panel-header"><h2>Requieren atención</h2><Link className="btn-texto" to="/novedades">Ver novedades</Link></div>
              <Ranking lista={d.peores} anio={anio} alerta />
            </section>
            <section className="panel">
              <div className="panel-header"><h2>Mejor desempeño</h2></div>
              <Ranking lista={d.mejores} anio={anio} />
            </section>
          </div>
          <TablaIndicadores tabla={d.tabla} anio={anio} />
        </div>
      )}
    </div>
  );
}
