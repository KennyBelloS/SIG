import Chart from 'react-apexcharts';
import {
  MESES_CORTO, metaDelMes, tipoMetaEfectivo, formatearValor, esPorcentaje, tendenciaLineal,
} from '../lib/indicadores';

const hayDatos = arr => arr.some(v => v != null);

/** Serie "planeado": lo que se esperaba para cada mes. Puede ser la meta (mensual o anual), el valor del
 *  mes anterior o el del mismo mes del año anterior. */
export function serieplaneada({ indicador, planeado, modoMeta, valoresAnio, valoresAnterior }) {
  const out = [];
  for (let m = 1; m <= 12; m++) {
    if (planeado === 'mes_anterior') out.push(m === 1 ? (valoresAnterior[12] ?? null) : (valoresAnio[m - 1] ?? null));
    else if (planeado === 'anio_anterior') out.push(valoresAnterior[m] ?? null);
    else { const x = metaDelMes(indicador, m, modoMeta || undefined); out.push(x == null ? null : Number(x)); }
  }
  return out;
}

export const NOMBRE_PLANEADO = {
  mes_anterior: 'Mes anterior',
  anio_anterior: 'Mismo mes del año anterior',
};

const mapa = regs => { const o = {}; for (const r of regs) if (r.valor != null) o[r.mes] = Number(r.valor); return o; };

/** Gráfica de seguimiento, como la del Excel: una barra "planeado" (azul) y una barra "Indicador" (roja) por mes.
 *  Se puede ver solo un rango de meses y superponer otro año como línea. */
export default function IndicadorChart({
  indicador, registros = [], registrosAnterior = [], registrosComparacion = [], anioComparacion = '',
  planeado = 'meta', modoMeta = '', desde = 1, hasta = 12, height = 320,
}) {
  const valoresAnio = mapa(registros), valoresAnterior = mapa(registrosAnterior), valoresComp = mapa(registrosComparacion);
  const todos = Array.from({ length: 12 }, (_, i) => valoresAnio[i + 1] ?? null);
  const plan = serieplaneada({ indicador, planeado, modoMeta, valoresAnio, valoresAnterior });
  const comp = Array.from({ length: 12 }, (_, i) => valoresComp[i + 1] ?? null);

  const a = Math.max(1, desde) - 1, b = Math.min(12, hasta);
  const cortar = arr => arr.slice(a, b);
  const ejecutado = cortar(todos);
  if (!hayDatos(ejecutado)) {
    return (
      <div className="estado-vacio">
        <i className="fa-regular fa-chart-bar"></i>
        <strong>No hay resultados en estos meses</strong>
        <p>Registra un mes con la cinta de arriba, o amplía el rango de meses.</p>
      </div>
    );
  }
  const pct = esPorcentaje(indicador);
  const tipo = modoMeta || tipoMetaEfectivo(indicador);
  const nombrePlan = planeado === 'meta' ? `Meta ${tipo}` : NOMBRE_PLANEADO[planeado];
  const series = [
    { name: nombrePlan, type: 'column', data: cortar(plan) },
    { name: 'Indicador', type: 'column', data: ejecutado },
  ];
  const colors = ['#4472C4', '#C0504D'];
  if (anioComparacion) { series.push({ name: `Indicador ${anioComparacion}`, type: 'line', data: cortar(comp) }); colors.push('#C9932B'); }

  return (
    <Chart
      type="line" height={height} series={series}
      options={{
        chart: { toolbar: { show: false }, fontFamily: 'inherit' },
        stroke: { width: [0, 0, 3], curve: 'smooth', dashArray: [0, 0, 6] },
        markers: { size: [0, 0, 4], colors: ['#C9932B'] },
        plotOptions: { bar: { columnWidth: '65%', borderRadius: 3 } },
        colors,
        legend: { position: 'top', horizontalAlign: 'right', fontSize: '12.5px', markers: { size: 6 } },
        dataLabels: {
          enabled: true, enabledOnSeries: [0, 1],
          formatter: v => (v == null ? '' : formatearValor(indicador, v)),
          style: { fontSize: '9.5px', fontWeight: 600, colors: ['#3A3A32'] }, offsetY: -16,
        },
        xaxis: { categories: MESES_CORTO.slice(a, b), labels: { style: { fontSize: '11px', colors: '#6B7280' } }, axisBorder: { color: '#E7E5DD' }, axisTicks: { color: '#E7E5DD' } },
        yaxis: { forceNiceScale: true, labels: { formatter: v => (pct ? `${Math.round(v * 100)}%` : v?.toLocaleString('es-CO', { maximumFractionDigits: 1 })), style: { fontSize: '11px', colors: '#6B7280' } } },
        grid: { borderColor: '#F0EFE9', strokeDashArray: 4, padding: { top: 24 } },
        tooltip: { theme: 'light', y: { formatter: v => (v == null ? 'Sin dato' : formatearValor(indicador, v)) } },
      }}
    />
  );
}

/** Tendencia: el resultado mes a mes y la recta de mínimos cuadrados. Solo se afirma una tendencia
 *  con tres meses de datos o más. */
export function TendenciaChart({ indicador, registros = [], desde = 1, hasta = 12, height = 260 }) {
  const valores = mapa(registros);
  const a = Math.max(1, desde), b = Math.min(12, hasta);
  const puntos = []; for (let m = a; m <= b; m++) puntos.push({ x: m, y: valores[m] ?? null });
  const t = tendenciaLineal(puntos);
  const pct = esPorcentaje(indicador);
  const conDato = puntos.filter(p => p.y != null);
  if (conDato.length < 3 || !t) {
    return (
      <div className="estado-vacio" style={{ padding: 'var(--s-5) 0' }}>
        <i className="fa-solid fa-chart-line"></i>
        <strong>Aún no hay suficientes meses para una tendencia</strong>
        <p>Con tres meses con dato o más aparece aquí la línea de tendencia.</p>
      </div>
    );
  }
  const x0 = conDato[0].x, x1 = conDato[conDato.length - 1].x;
  const recta = puntos.map(p => (p.x >= x0 && p.x <= x1 ? t.intercepto + t.pendiente * p.x : null));
  const porMes = pct ? t.pendiente * 100 : t.pendiente;
  const unidad = pct ? 'puntos porcentuales' : (indicador.unidad_medida || 'unidades');
  const sube = t.pendiente > 0;
  const plano = Math.abs(porMes) < (pct ? 0.05 : 1e-9);
  const favorable = plano ? null : indicador.sentido_meta === 'menor_mejor' ? !sube : sube;
  const fmt = n => Math.abs(n).toLocaleString('es-CO', { maximumFractionDigits: 2 });
  return (
    <>
      <div className={`tendencia-resumen ${favorable == null ? '' : favorable ? 'fav' : 'desfav'}`}>
        <i className={`fa-solid ${plano ? 'fa-minus' : sube ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} aria-hidden="true"></i>
        <div>
          <strong>{plano ? 'Tendencia estable' : `${sube ? 'Sube' : 'Baja'} ${fmt(porMes)} ${unidad} por mes`}</strong>
          <span>{favorable == null ? 'Sin cambio apreciable.' : favorable ? 'Es una tendencia favorable para la meta.' : 'Es una tendencia desfavorable para la meta.'} Calculada con {t.n} meses con dato.</span>
        </div>
      </div>
      <Chart
        type="line" height={height}
        series={[{ name: 'Indicador', data: puntos.map(p => p.y) }, { name: 'Tendencia', data: recta }]}
        options={{
          chart: { toolbar: { show: false }, fontFamily: 'inherit' },
          colors: ['#166534', '#C9932B'], stroke: { width: [3, 2.5], curve: 'straight', dashArray: [0, 6] },
          markers: { size: [5, 0], strokeWidth: 2, strokeColors: '#fff' },
          legend: { position: 'top', horizontalAlign: 'right', markers: { size: 6 } },
          dataLabels: { enabled: false },
          xaxis: { categories: puntos.map(p => MESES_CORTO[p.x - 1]), labels: { style: { fontSize: '11px', colors: '#6B7280' } }, axisBorder: { show: false }, axisTicks: { show: false } },
          yaxis: { forceNiceScale: true, labels: { formatter: v => (pct ? `${Math.round(v * 100)}%` : v?.toLocaleString('es-CO', { maximumFractionDigits: 1 })), style: { fontSize: '11px', colors: '#6B7280' } } },
          grid: { borderColor: '#F0EFE9', strokeDashArray: 4 },
          tooltip: { theme: 'light', y: { formatter: v => (v == null ? 'Sin dato' : formatearValor(indicador, v)) } },
        }}
      />
    </>
  );
}
