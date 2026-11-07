import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { traducirError } from '../lib/indicadores';
import { getNovedades, mesReporteActual, MESES } from '../lib/indicadores';

const { anio: ANIO_ACTUAL, mesActual: MES_ACTUAL } = mesReporteActual();

const NIVELES = {
  critico: { etiqueta: 'Crítico', icono: 'fa-circle-exclamation', clase: 'nivel-critico' },
  alto: { etiqueta: 'Alto', icono: 'fa-triangle-exclamation', clase: 'nivel-alto' },
  medio: { etiqueta: 'Medio', icono: 'fa-circle-info', clase: 'nivel-medio' },
};

function BarraDoble({ cumplimiento, diligenciado }) {
  return (
    <div className="barra-doble">
      <div className="barra-doble-fila">
        <span className="barra-doble-etiqueta">Cumple</span>
        <div className="barra-doble-pista">
          <div className="barra-doble-relleno" style={{ width: `${cumplimiento ?? 0}%`, background: cumplimiento == null ? 'var(--borde-fuerte)' : cumplimiento >= 80 ? 'var(--ok)' : cumplimiento >= 50 ? 'var(--gold)' : 'var(--falla)' }} />
        </div>
        <span className="barra-doble-valor">{cumplimiento == null ? '—' : `${cumplimiento}%`}</span>
      </div>
      <div className="barra-doble-fila">
        <span className="barra-doble-etiqueta">Diligencia</span>
        <div className="barra-doble-pista">
          <div className="barra-doble-relleno" style={{ width: `${diligenciado ?? 0}%`, background: 'var(--follaje-500)', opacity: .55 }} />
        </div>
        <span className="barra-doble-valor">{diligenciado == null ? '—' : `${diligenciado}%`}</span>
      </div>
    </div>
  );
}

export default function Novedades() {
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [procesoSel, setProcesoSel] = useState('');
  const [limite, setLimite] = useState(10);
  const TANDA = 10;

  useEffect(() => {
    let vivo = true;
    setCargando(true); setError(null);
    const corte = anio === ANIO_ACTUAL ? MES_ACTUAL : 12;
    getNovedades(anio, corte)
      .then(d => { if (vivo) setDatos(d); })
      .catch(e => { if (vivo) setError(traducirError(e)); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [anio]);

  const alertas = (datos?.alertas || []).filter(a => (filtro === 'todas' || a.nivel === filtro) && (!procesoSel || a.proceso === procesoSel));
  const peor = datos?.areas?.[0];
  const mejor = datos?.areas?.length ? [...datos.areas].reverse().find(a => a.pctCumplimiento != null) : null;

  return (
    <div className="page">
      <PageHeader
        migas={[{ texto: 'Administración' }, { texto: 'Novedades' }]}
        titulo="Novedades"
        descripcion="Lo que necesita tu atención: indicadores sin registrar, incumplimientos que se repiten y áreas con menos avance."
      
        cifras={datos ? [
          { titulo: 'Alertas críticas', vivo: datos.totales.criticas > 0, valor: datos.totales.criticas, principal: true, tono: datos.totales.criticas ? 'mal' : 'bien', nota: datos.totales.criticas ? 'requieren acción inmediata' : 'nada urgente por ahora' },
          { titulo: 'Altas', valor: datos.totales.altas, tono: datos.totales.altas ? 'aten' : '', nota: 'revisar esta semana' },
          { titulo: 'Meses sin registrar', valor: datos.totales.faltantes, tono: datos.totales.faltantes ? 'aten' : '', nota: 'sumando todos los indicadores' },
          { titulo: 'Incumple sin plan', valor: datos.totales.sinPlan, tono: datos.totales.sinPlan ? 'mal' : '', nota: 'falta definir acción correctiva' },
        ] : null}
      >
        <label className="sr-only" htmlFor="anio-nov">Año</label>
        <select id="anio-nov" value={anio} onChange={e => setAnio(Number(e.target.value))}>
          {[ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </PageHeader>

      {error && <div className="alert danger">{error}</div>}
      {cargando ? (
        <div aria-busy="true" aria-label="Analizando el año">
          <div className="esqueleto" style={{ height: 96, marginBottom: 16 }} />
          <div className="esqueleto" style={{ height: 260, marginBottom: 16 }} />
          <div className="esqueleto" style={{ height: 300 }} />
        </div>
      ) : datos && (
        <>

          {(peor || mejor) && (
            <div className="cards">
              {mejor && (
                <div className="card card-destacada card-destacada-ok">
                  <span className="card-label"><i className="fa-solid fa-trophy"></i> Área con mejor comportamiento</span>
                  <strong className="card-valor" style={{ fontSize: 21 }}>{mejor.proceso}</strong>
                  <span className="card-sub">{mejor.pctCumplimiento}% de cumplimiento · {mejor.faltantes} meses sin registrar</span>
                </div>
              )}
              {peor && peor.proceso !== mejor?.proceso && (
                <div className="card card-destacada card-destacada-mal">
                  <span className="card-label"><i className="fa-solid fa-triangle-exclamation"></i> Área que más atención necesita</span>
                  <strong className="card-valor" style={{ fontSize: 21 }}>{peor.proceso}</strong>
                  <span className="card-sub">{peor.pctCumplimiento ?? '—'}% de cumplimiento · {peor.sinPlan} incumplimientos sin plan</span>
                </div>
              )}
            </div>
          )}

          <section className="panel">
            <div className="panel-header">
              <h2>Comportamiento por área</h2>
              <span className="texto-tenue">Enero a {MESES[(anio === ANIO_ACTUAL ? MES_ACTUAL : 12) - 1]}</span>
            </div>
            <div className="rejilla-areas">
              {datos.areas.map(a => (
                <article key={a.procesoId} className="area-tarjeta">
                  <header>
                    <h3>{a.proceso}</h3>
                    <span className="texto-tenue">{a.indicadores} indicador{a.indicadores !== 1 ? 'es' : ''}</span>
                  </header>
                  <BarraDoble cumplimiento={a.pctCumplimiento} diligenciado={a.pctDiligenciado} />
                  <footer>
                    {a.faltantes > 0 && <span className="chip-ind chip-ind-pendiente">{a.faltantes} sin registrar</span>}
                    {a.incumplidos > 0 && <span className="chip-ind chip-ind-no">{a.incumplidos} incumplidos</span>}
                    {a.sinPlan > 0 && <span className="chip-ind chip-ind-no">{a.sinPlan} sin plan</span>}
                    {a.faltantes === 0 && a.incumplidos === 0 && <span className="chip-ind chip-ind-ok">Al día</span>}
                  </footer>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Alertas <span className="texto-tenue num" style={{ fontWeight: 500 }}>({alertas.length})</span></h2>
              <div className="cabecera-acciones">
                <label className="sr-only" htmlFor="filtro-proceso">Filtrar por proceso</label>
                <select id="filtro-proceso" value={procesoSel} onChange={e => { setProcesoSel(e.target.value); setLimite(TANDA); }}>
                  <option value="">Todos los procesos</option>
                  {datos.areas.map(a => <option key={a.procesoId} value={a.proceso}>{a.proceso}</option>)}
                </select>
                <div className="filtros-estado" role="group" aria-label="Filtrar por nivel">
                  {[['todas', 'Todas'], ['critico', 'Críticas'], ['alto', 'Altas'], ['medio', 'Medias']].map(([v, t]) => (
                    <button key={v} className={`filtro-chip ${filtro === v ? 'filtro-chip-activo' : ''}`} aria-pressed={filtro === v} onClick={() => { setFiltro(v); setLimite(TANDA); }}>{t}</button>
                  ))}
                </div>
              </div>
            </div>

            {alertas.length === 0 ? (
              <div className="estado-vacio">
                <i className="fa-solid fa-circle-check" style={{ color: 'var(--ok)' }}></i>
                <strong>Sin alertas en este filtro</strong>
                <p>Todo lo de esta categoría está al día.</p>
              </div>
            ) : (
              <ul className="lista-alertas">
                {alertas.slice(0, limite).map((a, i) => {
                  const n = NIVELES[a.nivel];
                  return (
                    <li key={`${a.indicadorId}-${a.tipo}-${i}`} className={`alerta-fila ${n.clase}`}>
                      <i className={`fa-solid ${n.icono} alerta-icono`}></i>
                      <div className="alerta-cuerpo">
                        <div className="alerta-titulo">
                          <strong>{a.tipo}</strong>
                          {a.categoria && <span className="chip-categoria" style={{ background: a.color }}>{a.categoria}</span>}
                        </div>
                        <p>{a.detalle}</p>
                        <span className="alerta-origen">{a.indicador}, proceso {a.proceso}</span>
                      </div>
                      <Link className="btn-secondary" to={`/indicadores/${a.indicadorId}?anio=${anio}${a.meses?.length ? `&mes=${a.meses[0]}` : ''}`}>
                        Revisar
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {alertas.length > limite && (
              <div className="paginar">
                <span className="texto-tenue">Mostrando {limite} de {alertas.length}</span>
                <button className="btn-secondary" onClick={() => setLimite(l => l + TANDA)}>Mostrar {Math.min(TANDA, alertas.length - limite)} más</button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
