import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { traducirError } from '../lib/indicadores';
import {
  getIndicadores, getProcesos, getRegistrosDelMes, getCierresDelAnio, getConfiguracionNotificaciones, estaCerrado,
  cumpleMeta, metaDelMes, formatearValor, mesReporteActual, exportarExcel, MESES,
} from '../lib/indicadores';

const { anio: ANIO_ACTUAL, mesActual: MES_ACTUAL } = mesReporteActual();
const ESTADOS = {
  cumple: { texto: 'Cumple', clase: 'chip-ind-ok' },
  incumple: { texto: 'No cumple', clase: 'chip-ind-no' },
  nodilig: { texto: 'No diligenciado', clase: 'chip-perdido' },
  pendiente: { texto: 'Pendiente', clase: 'chip-ind-pendiente' },
  sinmeta: { texto: 'Sin meta', clase: 'chip-ind-pendiente' },
};

/** Informe mensual: un documento imprimible (se guarda como PDF desde el diálogo de impresión)
 *  con el resultado de cada indicador, si cumplió o no, su causa y su plan de acción. */
export default function Informe() {
  const inicial = MES_ACTUAL === 1 ? { a: ANIO_ACTUAL - 1, m: 12 } : { a: ANIO_ACTUAL, m: MES_ACTUAL - 1 };
  const [anio, setAnio] = useState(inicial.a);
  const [mes, setMes] = useState(inicial.m);
  const [procesoId, setProcesoId] = useState('');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vivo = true;
    setDatos(null); setError(null);
    Promise.all([getIndicadores(), getProcesos(), getRegistrosDelMes({ anio, mes }), getCierresDelAnio(anio),
      getConfiguracionNotificaciones().catch(() => ({ dia_cierre: 15 }))])
      .then(([indicadores, procesos, registros, cierres, cfg]) => vivo && setDatos({ indicadores, procesos, registros, cierres, diaCierre: cfg?.dia_cierre ?? 15 }))
      .catch(e => vivo && setError(traducirError(e)));
    return () => { vivo = false; };
  }, [anio, mes]);

  const filas = useMemo(() => {
    if (!datos) return [];
    const proceso = new Map(datos.procesos.map(p => [p.id, p.nombre]));
    const reg = new Map(datos.registros.map(r => [r.indicador_id, r]));
    const cerrado = estaCerrado(anio, mes, datos.cierres, datos.diaCierre);
    return datos.indicadores.filter(i => !procesoId || i.proceso_id === Number(procesoId)).map(ind => {
      const r = reg.get(ind.id);
      let estado;
      if (r && r.valor != null) { const c = cumpleMeta(ind, r.valor, mes); estado = c === true ? 'cumple' : c === false ? 'incumple' : 'sinmeta'; }
      else estado = cerrado ? 'nodilig' : 'pendiente';
      const meta = metaDelMes(ind, mes);
      return { ind, proceso: proceso.get(ind.proceso_id) || '—', estado, r,
        meta: meta == null ? '—' : formatearValor(ind, meta),
        resultado: r && r.valor != null ? formatearValor(ind, r.valor) : '—',
        causa: (r?.causa || r?.analisis || '').trim(), plan: (r?.accion || '').trim() };
    });
  }, [datos, anio, mes, procesoId]);

  const resumen = useMemo(() => {
    const n = e => filas.filter(f => f.estado === e).length;
    const cumplen = n('cumple'), incumplen = n('incumple'), nodilig = n('nodilig'), pend = n('pendiente');
    const evaluados = cumplen + incumplen;
    const esperados = filas.length - pend;
    return { cumplen, incumplen, nodilig, pend, total: filas.length,
      pct: evaluados ? Math.round((cumplen / evaluados) * 100) : null,
      pctDilig: esperados ? Math.round(((esperados - nodilig) / esperados) * 100) : null,
      sinPlan: filas.filter(f => f.estado !== 'pendiente' && f.estado !== 'nodilig' && !f.plan).length };
  }, [filas]);

  const nombreProceso = procesoId ? datos?.procesos.find(p => p.id === Number(procesoId))?.nombre : 'Todos los procesos';
  const titulo = `Informe de indicadores ${MESES[mes - 1]} ${anio}`;

  function imprimir() {
    const anterior = document.title;
    document.title = titulo; // el navegador lo usa como nombre del PDF
    const restaurar = () => { document.title = anterior; window.removeEventListener('afterprint', restaurar); };
    window.addEventListener('afterprint', restaurar);
    window.print();
  }

  function exportar() {
    exportarExcel({
      nombreArchivo: titulo,
      titulo: `${titulo} · ${nombreProceso}`,
      subtitulo: `Cumplen ${resumen.cumplen}, no cumplen ${resumen.incumplen}, no diligenciados ${resumen.nodilig}, pendientes ${resumen.pend}. Cumplimiento ${resumen.pct ?? '—'}%.`,
      columnas: [
        { titulo: 'Proceso', valor: f => f.proceso, ancho: 150 },
        { titulo: 'Indicador', valor: f => f.ind.nombre, ancho: 300, estilo: () => 'font-weight:bold;' },
        { titulo: 'Meta', valor: f => f.meta, ancho: 80, alinear: 'center' },
        { titulo: 'Resultado', valor: f => f.resultado, ancho: 90, alinear: 'center', estilo: () => 'font-weight:bold;' },
        { titulo: 'Estado', valor: f => ESTADOS[f.estado].texto, ancho: 120, alinear: 'center',
          estilo: f => f.estado === 'cumple' ? 'background:#DDEEE3;color:#166534;font-weight:bold;' : f.estado === 'incumple' ? 'background:#F7D9DF;color:#A91D3A;font-weight:bold;' : f.estado === 'nodilig' ? 'background:#FBE3C8;color:#8A4B0F;font-weight:bold;' : 'background:#FAF0D8;color:#7E5C0F;' },
        { titulo: 'Causa (por qué cumplió o no cumplió)', valor: f => f.causa, ancho: 320 },
        { titulo: 'Plan de acción', valor: f => f.plan || (f.estado === 'nodilig' || f.estado === 'pendiente' ? '' : 'FALTA PLAN DE ACCIÓN'), ancho: 320 },
        { titulo: 'Responsable', valor: f => f.ind.responsable_medicion, ancho: 170 },
      ],
      filas,
    });
  }

  return (
    <div className="page informe">
      <div className="no-imprimir con-cajetin">
        <PageHeader
          migas={[{ texto: 'Seguimiento' }, { texto: 'Informe mensual' }]}
          titulo="Informe mensual"
          descripcion="Resultado de cada indicador del mes, si cumplió o no, su causa y su plan de acción. Se descarga como PDF."
        >
          <button className="btn-secondary" onClick={exportar} disabled={!datos}><i className="fa-solid fa-file-excel"></i> Excel</button>
          <button className="btn-primary" onClick={imprimir} disabled={!datos}><i className="fa-solid fa-file-pdf"></i> Descargar PDF</button>
        </PageHeader>
        <div className="barra-filtros">
          <label className="sr-only" htmlFor="inf-mes">Mes</label>
          <select id="inf-mes" value={mes} onChange={e => setMes(Number(e.target.value))}>{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
          <label className="sr-only" htmlFor="inf-anio">Año</label>
          <select id="inf-anio" value={anio} onChange={e => setAnio(Number(e.target.value))}>{[ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2].map(a => <option key={a} value={a}>{a}</option>)}</select>
          <label className="sr-only" htmlFor="inf-proc">Proceso</label>
          <select id="inf-proc" value={procesoId} onChange={e => setProcesoId(e.target.value)}>
            <option value="">Todos los procesos</option>
            {datos?.procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <span className="texto-tenue">En el diálogo de impresión elige &ldquo;Guardar como PDF&rdquo;.</span>
        </div>
      </div>

      {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation"></i><span>{error}</span></div>}
      {!datos && !error ? <div aria-busy="true"><div className="esqueleto" style={{ height: 380 }} /></div> : datos && (
        <article className="hoja-informe">
          <header className="informe-cab">
            <img src="/logo-correo.png" alt="Falcon Farms, Finca Torremolinos" className="informe-logo" />
            <div>
              <h2>{titulo}</h2>
              <p>{nombreProceso}</p>
            </div>
            <div className="informe-meta">Generado el {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </header>

          <dl className="informe-resumen">
            <div><dt>Cumplimiento</dt><dd style={{ color: resumen.pct == null ? undefined : resumen.pct >= 85 ? 'var(--ok)' : resumen.pct >= 60 ? 'var(--gold-ink)' : 'var(--wine)' }}>{resumen.pct == null ? '—' : `${resumen.pct}%`}<small>de los que tienen dato</small></dd></div>
            <div><dt>Cumplen</dt><dd>{resumen.cumplen}<small>alcanzaron la meta</small></dd></div>
            <div><dt>No cumplen</dt><dd className={resumen.incumplen ? 'mal' : ''}>{resumen.incumplen}<small>por debajo de la meta</small></dd></div>
            <div><dt>No diligenciados</dt><dd className={resumen.nodilig ? 'mal' : ''}>{resumen.nodilig}<small>mes vencido sin dato</small></dd></div>
            <div><dt>Pendientes</dt><dd>{resumen.pend}<small>el mes sigue abierto</small></dd></div>
          </dl>
          {resumen.sinPlan > 0 && <div className="aviso aviso-alerta"><i className="fa-solid fa-triangle-exclamation"></i><span>{resumen.sinPlan} indicador(es) tienen dato pero no plan de acción (registros anteriores a que el plan fuera obligatorio).</span></div>}

          <div className="tabla-scroll" tabIndex={0} role="region" aria-label="Tabla desplazable: usa las flechas del teclado para moverte">
            <table className="tabla-informe">
              <thead><tr><th>Indicador</th><th>Meta</th><th>Resultado</th><th>Estado</th><th>Causa (por qué cumplió o no cumplió)</th><th>Plan de acción</th></tr></thead>
              <tbody>
                {filas.map((f, k) => [
                  (k === 0 || filas[k - 1].proceso !== f.proceso) && <tr key={`g${f.proceso}`} className="inf-grupo"><td colSpan={6}>{f.proceso}</td></tr>,
                  <tr key={f.ind.id}>
                    <td className="inf-nombre">{f.ind.nombre}<small>{f.ind.responsable_medicion || ''}</small></td>
                    <td className="num">{f.meta}</td>
                    <td className="num inf-res">{f.resultado}</td>
                    <td><span className={`chip-ind ${ESTADOS[f.estado].clase}`}>{ESTADOS[f.estado].texto}</span></td>
                    <td>{f.causa || <span className="celda-tenue">{f.estado === 'nodilig' || f.estado === 'pendiente' ? '—' : 'Sin causa registrada'}</span>}</td>
                    <td>{f.plan || <span className="celda-tenue">{f.estado === 'nodilig' || f.estado === 'pendiente' ? '—' : 'Sin plan registrado'}</span>}</td>
                  </tr>,
                ])}
                {filas.length === 0 && <tr><td colSpan={6} className="sin-resultados">No hay indicadores para este filtro.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </div>
  );
}
