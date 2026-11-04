import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { getResumenCumplimiento, mesReporteActual } from '../lib/indicadores';

const { anio: ANIO_ACTUAL } = mesReporteActual();

function BarraRanking({ grupos }) {
  if (grupos.length === 0) return <p className="texto-tenue">Sin datos evaluables todavía este año.</p>;
  const categorias = grupos.map(g => g.label);
  const valores = grupos.map(g => g.pct ?? 0);
  const colores = grupos.map(g => (g.pct == null ? '#DDE2DC' : g.pct >= 80 ? '#197A48' : g.pct >= 50 ? '#A96A12' : '#C13A5E'));
  return (
    <Chart
      type="bar"
      height={Math.max(220, grupos.length * 42)}
      series={[{ name: '% Cumplimiento', data: valores }]}
      options={{
        chart: { toolbar: { show: false }, fontFamily: 'inherit' },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true, barHeight: '60%' } },
        colors: colores,
        legend: { show: false },
        dataLabels: { enabled: true, formatter: v => `${v}%`, style: { fontSize: '11.5px', fontWeight: 700, colors: ['#16201A'] }, offsetX: 6 },
        xaxis: { categories: categorias, max: 100, labels: { formatter: v => `${v}%`, style: { fontSize: '11px', colors: '#8A938C' } } },
        yaxis: { labels: { style: { fontSize: '12px', colors: '#16201A' } } },
        grid: { borderColor: '#EDF0ED', strokeDashArray: 4 },
        tooltip: { theme: 'light', y: { formatter: v => `${v}% de cumplimiento` } },
      }}
    />
  );
}

export default function Resumen() {
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    setCargando(true); setError(null);
    getResumenCumplimiento(anio)
      .then(d => { if (activo) setDatos(d); })
      .catch(e => { if (activo) setError(e.message); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [anio]);

  const mejor = datos?.porProceso?.find(g => g.pct != null);
  const peor = [...(datos?.porProceso || [])].reverse().find(g => g.pct != null);

  return (
    <div className="page">
      <div className="page-encabezado">
        <h1>Resumen</h1>
        <p>Cumplimiento general del Sistema Integrado de Gestión por proceso y por categoría.</p>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-header">
          <h2>Año</h2>
          <select value={anio} onChange={e => setAnio(Number(e.target.value))}>
            {[ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="alert danger">{error}</div>}
      {cargando ? <section className="panel"><p>Cargando…</p></section> : datos && (
        <>
          <div className="cards" style={{ marginBottom: 18 }}>
            <div className="card">
              <span className="card-label">Indicadores activos</span>
              <strong className="card-valor">{datos.totalIndicadores}</strong>
            </div>
            <div className="card">
              <span className="card-label">Cumplimiento global {anio}</span>
              <strong className="card-valor" style={{ color: datos.pctGlobal == null ? '#8A938C' : datos.pctGlobal >= 80 ? '#197A48' : datos.pctGlobal >= 50 ? '#A96A12' : '#C13A5E' }}>
                {datos.pctGlobal == null ? '—' : `${datos.pctGlobal}%`}
              </strong>
            </div>
            <div className="card">
              <span className="card-label">Meses sin registrar (todo el año)</span>
              <strong className="card-valor" style={{ color: datos.totalPendientes > 0 ? '#C13A5E' : '#197A48' }}>{datos.totalPendientes}</strong>
            </div>
          </div>

          {mejor && peor && mejor.label !== peor.label && (
            <div className="cards" style={{ marginBottom: 18 }}>
              <div className="card card-destacada card-destacada-ok">
                <span className="card-label"><i className="fa-solid fa-trophy"></i> Mejor desempeño</span>
                <strong className="card-valor">{mejor.label}</strong>
                <span className="card-sub">{mejor.pct}% de cumplimiento</span>
              </div>
              <div className="card card-destacada card-destacada-mal">
                <span className="card-label"><i className="fa-solid fa-triangle-exclamation"></i> Necesita más atención</span>
                <strong className="card-valor">{peor.label}</strong>
                <span className="card-sub">{peor.pct}% de cumplimiento</span>
              </div>
            </div>
          )}

          <section className="panel">
            <div className="panel-header"><h2>Cumplimiento por proceso</h2></div>
            <BarraRanking grupos={datos.porProceso} />
          </section>

          <section className="panel">
            <div className="panel-header"><h2>Cumplimiento por categoría (igual a los colores del Excel)</h2></div>
            <BarraRanking grupos={datos.porCategoria} />
          </section>
        </>
      )}
    </div>
  );
}
