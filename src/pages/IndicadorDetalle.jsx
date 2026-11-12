import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { anotarReciente } from '../lib/recientes';
import { useSesion } from '../lib/useSesion';
import IndicadorChart, { TendenciaChart } from '../components/IndicadorChart';
import PageHeader from '../components/PageHeader';
import TablaMeses from '../components/TablaMeses';
import BotonEstado from '../components/vida/BotonEstado';
import { menosMovimiento } from '../lib/preferencias';
import { usaComponentes, tieneApoyo, etiquetasDe, calcularValor, motivoSinCalculo, CALCULOS } from '../lib/calculo';
import { traducirError } from '../lib/indicadores';
import { avisar } from '../lib/toast';
import Dialogo, { Confirmar } from '../components/Dialogo';
import {
  getIndicador, getRegistrosMultiAnio, guardarRegistro, sugerirPlanAccion, cumpleMeta,
  formatearValor, formatearMeta, mesReporteActual, MESES, getProcesos, getCierresDelAnio,
  esPorcentaje, entradaAValor, valorAEntrada, estadisticasIndicador, desviacionVsMeta, exportarExcel, metaDelMes,
  estaCerrado, getConfiguracionNotificaciones, MESES_CORTO, formatearMetaMensual, tipoMetaEfectivo, reabrirMes,
} from '../lib/indicadores';

export default function IndicadorDetalle() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { sesion } = useSesion();
  const { anio: anioActual, mesActual: mesHoy } = mesReporteActual();

  const [indicador, setIndicador] = useState(null);
  const [procesoClave, setProcesoClave] = useState(null);
  const [anio, setAnio] = useState(() => Number(new URLSearchParams(window.location.search).get('anio')) || anioActual);
  const [comparar, setComparar] = useState('');
  const [registros, setRegistros] = useState([]);
  const [registrosComparacion, setRegistrosComparacion] = useState([]);
  const [registrosAnterior, setRegistrosAnterior] = useState([]);
  const [modoMeta, setModoMeta] = useState('');
  const [planeado, setPlaneado] = useState('meta');
  const [desdeG, setDesdeG] = useState(1);
  const [hastaG, setHastaG] = useState(12);
  const [errorForm, setErrorForm] = useState(null);
  const [cierres, setCierres] = useState([]);
  const [reabriendo, setReabriendo] = useState(false);
  const [diaCierre, setDiaCierre] = useState(15);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mesAbierto, setMesAbierto] = useState(null);
  const [form, setForm] = useState({ valor: '', analisis: '', causa: '', accion: '', responsable_accion: '', fecha_compromiso: '' });
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

  async function cargar() {
    setCargando(true); setError(null);
    try {
      const anios = [...new Set([anio, anio - 1, ...(comparar ? [Number(comparar)] : [])])];
      const [ind, regsMulti, procesos, cierresAnio, cfg] = await Promise.all([
        getIndicador(id), getRegistrosMultiAnio(id, anios), getProcesos(), getCierresDelAnio(anio),
        getConfiguracionNotificaciones().catch(() => ({ dia_cierre: 15 })),
      ]);
      setDiaCierre(cfg?.dia_cierre ?? 15);
      setIndicador(ind);
      // queda anotado para ofrecerlo en el buscador como «seguir donde ibas»
      anotarReciente({ id: ind.id, nombre: ind.nombre, proceso: procesos.find(p => p.id === ind.proceso_id)?.nombre || '' });
      setRegistros(regsMulti.filter(r => r.anio === anio));
      setRegistrosComparacion(comparar ? regsMulti.filter(r => r.anio === Number(comparar)) : []);
      setRegistrosAnterior(regsMulti.filter(r => r.anio === anio - 1));
      setProcesoClave(procesos.find(p => p.id === ind.proceso_id)?.clave || null);
      setCierres(cierresAnio);
    } catch (err) {
      const sinFila = err?.code === 'PGRST116' || /rows? returned|no rows/i.test(err?.message || '');
      setError(sinFila ? 'No encontramos este indicador. Puede que se haya desactivado o que el enlace esté incompleto.' : err.message);
    } finally { setCargando(false); }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [id, anio, comparar]);

  const porMes = useMemo(() => new Map(registros.map(r => [r.mes, r])), [registros]);

  // Si se llegó desde la cinta de meses (?mes=5), abre ese mes al cargar.
  const [mesUrlUsado, setMesUrlUsado] = useState(false);
  useEffect(() => {
    const m = Number(params.get('mes'));
    if (!mesUrlUsado && indicador && m >= 1 && m <= 12) {
      setMesUrlUsado(true);
      abrirMes(m);
    }
    // eslint-disable-next-line
  }, [indicador, params, mesUrlUsado]);
  const mesCerradoEn = useMemo(() => (m) => estaCerrado(anio, m, cierres, diaCierre), [anio, cierres, diaCierre]);
  const stats = useMemo(() => (indicador ? estadisticasIndicador(indicador, registros) : null), [indicador, registros]);

  function abrirMes(mes) {
    const reg = porMes.get(mes);
    setMesAbierto(mes);
    setForm({
      valor: valorAEntrada(indicador, reg?.valor),
      a: reg?.componentes?.a ?? '', b: reg?.componentes?.b ?? '',
      analisis: reg?.analisis ?? '',
      causa: reg?.causa ?? '',
      accion: reg?.accion ?? '',
      responsable_accion: reg?.responsable_accion ?? '',
      fecha_compromiso: reg?.fecha_compromiso ?? '',
    });
  }

  /** El resultado del formulario: el que sale de los dos números (si el indicador se calcula y ya están) o el digitado. */
  function valorDelFormulario() {
    const calc = usaComponentes(indicador) ? calcularValor(indicador, { a: form.a, b: form.b }) : null;
    return calc != null ? calc : entradaAValor(indicador, form.valor);
  }

  function sugerir() {
    const valorMesAnterior = porMes.get(mesAbierto - 1)?.valor;
    const sugerencia = sugerirPlanAccion({ indicador, procesoClave, valor: valorDelFormulario(), mes: mesAbierto, valorMesAnterior });
    setForm(f => ({ ...f, analisis: sugerencia.analisis || f.analisis, causa: sugerencia.causa || f.causa, accion: sugerencia.accion || f.accion }));
  }

  async function guardar(e) {
    e.preventDefault();
    setErrorForm(null);
    // Reglas de negocio: el valor y el plan de acción son siempre obligatorios.
    const porComp = usaComponentes(indicador);
    const apoyoOpc = tieneApoyo(indicador) && (String(form.a ?? '') !== '' || String(form.b ?? '') !== '');
    const algunNumero = String(form.a ?? '') !== '' || String(form.b ?? '') !== '';
    const calc = porComp ? calcularValor(indicador, { a: form.a, b: form.b }) : null;
    if (porComp && algunNumero && calc == null) { setErrorForm(motivoSinCalculo(indicador, { a: form.a, b: form.b }) || `Escribe los dos números (${etiquetasDe(indicador).a} y ${etiquetasDe(indicador).b}) o déjalos vacíos y escribe el resultado.`); return; }
    if (calc == null && (form.valor === '' || form.valor == null)) { setErrorForm(porComp ? `Escribe los dos números para calcular el resultado, o escribe el resultado directamente.` : 'Escribe el valor del indicador.'); return; }
    if (!String(form.accion || '').trim()) { setErrorForm('El plan de acción es obligatorio, incluso cuando el indicador cumple.'); return; }
    setGuardando(true); setError(null);
    try {
      const reg = porMes.get(mesAbierto);
      const resultado = await guardarRegistro({
        indicador_id: Number(id), anio, mes: mesAbierto,
        valor: valorDelFormulario(),
        componentes: porComp && algunNumero && calc != null ? { a: Number(form.a), b: Number(form.b) } : apoyoOpc ? { a: form.a === '' ? null : Number(form.a), b: form.b === '' ? null : Number(form.b) } : null,
        analisis: form.analisis, causa: form.causa, accion: form.accion,
        responsable_accion: form.responsable_accion, fecha_compromiso: form.fecha_compromiso || null,
        plan_sugerido: false,
        registrado_por: sesion?.email,
        vistoEn: reg?.actualizado_en ?? null,
      });
      const cumple = cumpleMeta(indicador, valorDelFormulario(), mesAbierto);
      const nombreMes = MESES[mesAbierto - 1];
      setExito(true); await new Promise(res => setTimeout(res, menosMovimiento() ? 120 : 700));   // el botón se tiñe de verde y dibuja un visto antes de cerrar
      setMesAbierto(null);
      await cargar();
      if (resultado?.pendiente) avisar(`${nombreMes}: guardado en este equipo. Se enviará solo en cuanto vuelva internet.`, { tipo: 'alerta' });
      else if (cumple === true) avisar(`${nombreMes} guardado: ¡cumple la meta!`, { tipo: 'ok', celebrar: true });
      else if (cumple === false) avisar(`${nombreMes} guardado: no alcanzó la meta. Quedó su plan de acción.`, { tipo: 'alerta' });
      else avisar(`${nombreMes} guardado.`, { tipo: 'ok' });
    } catch (err) { setErrorForm(traducirError(err)); } finally { setGuardando(false); setExito(false); }
  }

  function descargarCSV() {
    exportarExcel({
      nombreArchivo: `${indicador.nombre.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ-]/g, '')} ${anio}`,
      titulo: indicador.nombre,
      subtitulo: `Año ${anio} · Meta ${formatearMeta(indicador)} · Responsable: ${indicador.responsable_medicion || '—'} · Cumplimiento ${stats?.pctCumplimiento ?? '—'}%`,
      filas: MESES.map((nombreMes, i) => {
        const mes = i + 1;
        const reg = porMes.get(mes);
        const cumple = cumpleMeta(indicador, reg?.valor, mes);
        return {
          mes: nombreMes,
          valor: reg?.valor != null ? formatearValor(indicador, reg.valor) : '',
          meta: formatearValor(indicador, metaDelMes(indicador, mes)),
          estado: reg?.valor == null ? 'Pendiente' : cumple ? 'Cumple' : 'No cumple',
          analisis: reg?.analisis || '',
          causa: reg?.causa || '',
          accion: reg?.accion || '',
          responsable: reg?.responsable_accion || '',
        };
      }),
      columnas: [
        { titulo: 'Mes', valor: f => f.mes, ancho: 90 },
        { titulo: 'Valor', valor: f => f.valor, ancho: 80, alinear: 'center',
          estilo: f => 'font-weight:bold;' },
        { titulo: 'Meta', valor: f => f.meta, ancho: 80, alinear: 'center', estilo: () => 'color:#5C6460;' },
        { titulo: 'Estado', valor: f => f.estado, ancho: 100, alinear: 'center',
          estilo: f => f.estado === 'Cumple' ? 'background:#E0EFE5;color:#166534;font-weight:bold;'
                     : f.estado === 'No cumple' ? 'background:#FAE4E8;color:#A91D3A;font-weight:bold;'
                     : 'background:#FAF0D8;color:#8A6410;' },
        { titulo: 'Análisis de cumplimiento', valor: f => f.analisis, ancho: 340 },
        { titulo: 'Causa', valor: f => f.causa, ancho: 200 },
        { titulo: 'Plan de acción', valor: f => f.accion, ancho: 340 },
        { titulo: 'Responsable de la acción', valor: f => f.responsable, ancho: 180 },
      ],
    });
  }

  if (cargando && !indicador) return (
    <div className="page" aria-busy="true" aria-label="Cargando indicador">
      <div className="esqueleto" style={{ height: 40, width: 320, marginBottom: 24 }} />
      <div className="esqueleto" style={{ height: 110, marginBottom: 16 }} />
      <div className="esqueleto" style={{ height: 320 }} />
    </div>
  );
  if (error && !indicador) return (
    <div className="page">
      <PageHeader migas={[{ texto: 'Indicadores', a: '/indicadores' }, { texto: 'No disponible' }]} titulo="No se pudo abrir el indicador" />
      <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation"></i><span>{error}</span></div>
      <Link className="btn-secondary" to="/indicadores">Volver a indicadores</Link>
    </div>
  );

  const mesCerrado = mesAbierto && mesCerradoEn(mesAbierto);
  const puedeEditarMes = !mesCerrado && !!sesion?.puedeRegistrar;

  return (
    <div className="page">
      <PageHeader
        migas={[{ texto: 'Seguimiento' }, { texto: 'Indicadores', a: '/indicadores' }, { texto: indicador.nombre }]}
        titulo={indicador.nombre}
        descripcion={indicador.objetivo}
      >
        <button className="btn-secondary" onClick={descargarCSV}><i className="fa-solid fa-file-excel"></i> Exportar a Excel</button>
      </PageHeader>
      <div className="linea-etiquetas" style={{ marginTop: 'calc(var(--s-3) * -1)', marginBottom: 'var(--s-5)' }}>
        {indicador.categoria && <span className="chip-categoria" style={{ background: indicador.color_categoria }}>{indicador.categoria}</span>}
        {indicador.responsable_medicion && <span className="chip-ind" style={{ background: 'var(--line-soft)', color: 'var(--ink-2)' }}><i className="fa-regular fa-user"></i> {indicador.responsable_medicion}</span>}
        {stats?.pctIncumplimiento != null && (
          <span className={`chip-ind ${stats.pctIncumplimiento > 50 ? 'chip-ind-no' : stats.pctIncumplimiento > 0 ? 'chip-ind-pendiente' : 'chip-ind-ok'}`}>
            {stats.pctIncumplimiento}% de incumplimiento en {anio}
          </span>
        )}
      </div>

      <section className="panel" aria-label={`El año ${anio} mes a mes`}>
        <div className="panel-header">
          <div><h2>{anio} mes a mes</h2><p className="sub">{sesion?.puedeRegistrar ? 'Haz clic en un mes para registrar o corregir su dato.' : 'Haz clic en un mes para ver su detalle.'}</p></div>
          <div className="cabecera-acciones">
            <label className="sr-only" htmlFor="sel-anio">Año</label>
            <select id="sel-anio" value={anio} onChange={e => setAnio(Number(e.target.value))}>
              {[anioActual, anioActual - 1, anioActual - 2].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div className="cinta-grande" role="group" aria-label="Estado de cada mes">
          {MESES.map((nombreMes, i) => {
            const mes = i + 1;
            const reg = porMes.get(mes);
            const cumple = reg?.valor != null ? cumpleMeta(indicador, reg.valor, mes) : null;
            const cerrado = mesCerradoEn(mes);
            const clase = reg?.valor == null ? (cerrado ? 'perdido' : 'pendiente') : cumple ? 'cumple' : 'incumple';
            return (
              <button key={mes} type="button" onClick={() => abrirMes(mes)}
                className={`mes-gr mes-gr-${clase}${anio === anioActual && mes === mesHoy ? ' es-actual' : ''}`}>
                <span className="sr-only">{`${nombreMes}: ${reg?.valor == null ? (cerrado ? 'venció sin registrar' : 'sin registrar') : (cumple ? 'cumple' : 'no cumple') + ', ' + formatearValor(indicador, reg.valor)}${cerrado ? ', mes cerrado' : ''}`}. </span>
                <span className="mes-gr-valor">{reg?.valor == null ? (cerrado ? '—' : '·') : formatearValor(indicador, reg.valor)}</span>
                <span className="mes-gr-nombre">{MESES_CORTO[i]}{cerrado && <i className="fa-solid fa-lock" aria-hidden="true"></i>}</span>
              </button>
            );
          })}
        </div>
        <div className="cinta-leyenda">
          <span><i className="cinta-punto" style={{ background: 'var(--ok)' }} /> Cumple</span>
          <span><i className="cinta-punto" style={{ background: 'var(--wine)' }} /> No cumple</span>
          <span><i className="cinta-punto cinta-perdido" /> Venció sin registrar</span>
          <span><i className="cinta-punto" style={{ background: '#EAE7DC' }} /> Por registrar</span>
        </div>
      </section>

      {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation"></i><span>{error}</span></div>}

      <TablaMeses indicador={indicador} registros={registros} anio={anio} mesCerradoEn={mesCerradoEn} onAbrir={abrirMes} puedeRegistrar={!!sesion?.puedeRegistrar} />

      {stats && stats.mesesConDato > 0 && (
        <div className="cards cards-compactas">
          <div className="card">
            <span className="card-label">Cumplimiento {anio}</span>
            <strong className="card-valor" style={{ color: stats.pctCumplimiento >= 80 ? 'var(--ok)' : stats.pctCumplimiento >= 50 ? 'var(--alerta)' : 'var(--falla)' }}>
              {stats.pctCumplimiento != null ? `${stats.pctCumplimiento}%` : '—'}
            </strong>
            <span className="card-sub">{stats.cumplidos} de {stats.evaluados} meses evaluados</span>
          </div>
          <div className="card">
            <span className="card-label">Incumplimiento {anio}</span>
            <strong className="card-valor" style={{ color: stats.pctIncumplimiento > 0 ? 'var(--falla)' : 'var(--ok)' }}>
              {stats.pctIncumplimiento != null ? `${stats.pctIncumplimiento}%` : '—'}
            </strong>
            <span className="card-sub">
              {stats.incumplidos === 0 ? 'Sin meses incumplidos' : `Meses: ${stats.mesesIncumplidos.map(m => MESES[m - 1].slice(0, 3)).join(', ')}`}
            </span>
          </div>
          <div className="card">
            <span className="card-label">Promedio del año</span>
            <strong className="card-valor">{formatearValor(indicador, stats.promedio)}</strong>
            <span className="card-sub">Meta: {formatearMeta(indicador)}</span>
          </div>
          <div className="card">
            <span className="card-label">Meses sin registrar</span>
            <strong className="card-valor" style={{ color: stats.mesesPendientes > 0 ? 'var(--alerta)' : 'var(--ok)' }}>{stats.mesesPendientes}</strong>
            <span className="card-sub">{stats.mesesConDato} de 12 diligenciados</span>
          </div>
          {indicador.referencia_anterior && (indicador.referencia_anterior.meta || indicador.referencia_anterior.resultado) && (
            <div className="card">
              <span className="card-label">Cierre del año anterior</span>
              <strong className="card-valor card-valor-texto">{indicador.referencia_anterior.resultado || '—'}</strong>
              <span className="card-sub">Meta: {indicador.referencia_anterior.meta || '—'}</span>
            </div>
          )}
        </div>
      )}

      <details className="panel ficha">
        <summary><span>Ficha del indicador</span><small>Directriz, objetivo, fórmula, meta y fuente</small><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
        <div className="ficha-cuerpo">
        <div className="ind-ficha-grid">
          <div><span className="ind-ficha-label">Directriz de la política</span><p>{indicador.directriz || '—'}</p></div>
          <div><span className="ind-ficha-label">Estrategia ASG</span><p>{indicador.estrategia_asg || '—'}</p></div>
          <div><span className="ind-ficha-label">Objetivo</span><p>{indicador.objetivo || '—'}</p></div>
          <div><span className="ind-ficha-label">Fórmula de cálculo</span><p>{indicador.formula_calculo || <em style={{ opacity: .6 }}>sin definir</em>}</p></div>
          <div><span className="ind-ficha-label">Unidad de medida</span><p>{indicador.unidad_medida || '—'}</p></div>
          <div><span className="ind-ficha-label">Tipo de indicador</span><p>{indicador.tipo_indicador || '—'}</p></div>
          <div><span className="ind-ficha-label">Meta anual</span><p>{formatearMeta(indicador)}</p></div>
          <div><span className="ind-ficha-label">Meta mensual</span><p>{formatearMetaMensual(indicador)}</p></div>
          <div><span className="ind-ficha-label">Meta que rige</span><p style={{ textTransform: 'capitalize' }}>{tipoMetaEfectivo(indicador)}{indicador.tipo_meta ? '' : ' (automática)'}</p></div>
          <div><span className="ind-ficha-label">Frecuencia de medición</span><p style={{ textTransform: 'capitalize' }}>{indicador.frecuencia || '—'}</p></div>
          <div><span className="ind-ficha-label">Frecuencia de seguimiento</span><p style={{ textTransform: 'capitalize' }}>{indicador.frecuencia_seguimiento || '—'}</p></div>
          <div><span className="ind-ficha-label">Responsable de la medición</span><p>{indicador.responsable_medicion || '—'}</p></div>
          <div><span className="ind-ficha-label">Procesos relacionados</span><p>{indicador.procesos_relacionados || '—'}</p></div>
          <div><span className="ind-ficha-label">Fuente de información</span><p>{indicador.fuente_informacion || '—'}</p></div>
        </div>
      </div>
      </details>

      <section className="panel">
        <div className="panel-header">
          <h2>Meta y resultado</h2>
        </div>
        <div className="controles-grafica" role="group" aria-label="Opciones de la gráfica">
          <label className="filtro-etq">Comparar el indicador contra
            <select value={planeado} onChange={e => setPlaneado(e.target.value)}>
              <option value="meta">La meta</option>
              <option value="mes_anterior">El mes anterior</option>
              <option value="anio_anterior">El mismo mes del año anterior</option>
            </select>
          </label>
          {planeado === 'meta' && (
            <label className="filtro-etq">Meta en la gráfica
              <select value={modoMeta} onChange={e => setModoMeta(e.target.value)}>
                <option value="">La configurada ({tipoMetaEfectivo(indicador)})</option>
                <option value="mensual">Meta mensual</option>
                <option value="anual">Meta anual</option>
              </select>
            </label>
          )}
          <label className="filtro-etq">Desde
            <select value={desdeG} onChange={e => { const v = Number(e.target.value); setDesdeG(v); if (v > hastaG) setHastaG(v); }}>{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
          </label>
          <label className="filtro-etq">Hasta
            <select value={hastaG} onChange={e => { const v = Number(e.target.value); setHastaG(v); if (v < desdeG) setDesdeG(v); }}>{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
          </label>
          <label className="filtro-etq">Superponer otro año
            <select id="sel-comparar" value={comparar} onChange={e => setComparar(e.target.value)}>
              <option value="">Ninguno</option>
              {[anio - 1, anio - 2].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        </div>
        <IndicadorChart indicador={indicador} registros={registros} registrosAnterior={registrosAnterior} registrosComparacion={registrosComparacion}
          anioComparacion={comparar} planeado={planeado} modoMeta={modoMeta} desde={desdeG} hasta={hastaG} />
      </section>

      <section className="panel">
        <div className="panel-header"><div><h2>Tendencia</h2><p className="sub">Hacia dónde va el indicador en los meses elegidos.</p></div></div>
        <TendenciaChart indicador={indicador} registros={registros} desde={desdeG} hasta={hastaG} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Análisis y plan de acción</h2>
        </div>
        <div className="tabla-scroll" tabIndex={0} role="region" aria-label="Tabla desplazable: usa las flechas del teclado para moverte"><table className="tabla-apilable">
          <thead><tr><th>Mes</th><th>Valor</th><th>Meta</th><th>Desviación</th><th>Estado</th><th>Análisis</th><th>Plan de acción</th><th></th></tr></thead>
          <tbody>
            {MESES.map((nombreMes, i) => {
              const mes = i + 1;
              const reg = porMes.get(mes);
              const cumple = cumpleMeta(indicador, reg?.valor, mes);
              const estado = reg?.valor == null ? 'Pendiente' : cumple ? 'Cumple' : 'No cumple';
              const cerrado = mesCerradoEn(mes);
              const desv = reg?.valor != null ? desviacionVsMeta(indicador, reg.valor, mes) : null;
              return (
                <tr key={mes}>
                  <td className="celda-principal">{nombreMes} {cerrado && <i className="fa-solid fa-lock" role="img" title="Mes cerrado" aria-label="Mes cerrado" style={{ color: 'var(--ink-3)', marginLeft: 4, fontSize: 11 }}></i>}</td>
                  <td data-label="Valor" className="celda-numero">{formatearValor(indicador, reg?.valor)}</td>
                  <td data-label="Meta" className="celda-numero celda-tenue">{formatearValor(indicador, metaDelMes(indicador, mes))}</td>
                  <td data-label="Desviación" className="celda-numero">
                    {desv ? <span className={desv.favorable ? 'desv-ok' : 'desv-mal'}>{desv.texto}</span> : '—'}
                  </td>
                  <td data-label="Estado"><span className={`chip-ind ${estado === 'Cumple' ? 'chip-ind-ok' : estado === 'No cumple' ? 'chip-ind-no' : 'chip-ind-pendiente'}`}>{estado}</span></td>
                  <td data-label="Análisis" className="celda-texto">{reg?.analisis || '—'}</td>
                  <td data-label="Plan de acción" className="celda-texto">{reg?.accion ? <>{reg.accion}{reg.plan_sugerido && <em className="nota-sugerido">Sugerido por el sistema</em>}</> : '—'}</td>
                  <td data-label="">{(() => { const verSolo = cerrado || !sesion?.puedeRegistrar; const verbo = verSolo ? 'Ver' : reg?.valor == null ? 'Registrar' : 'Editar';
                    return <button className="btn-secondary btn-chico" onClick={() => abrirMes(mes)} aria-label={`${verbo} ${nombreMes}${cerrado ? ' (mes cerrado)' : ''}`}>{cerrado && <i className="fa-solid fa-lock" aria-hidden="true"></i>} {verbo}</button>; })()}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </section>

      {mesAbierto && (
        <Dialogo titulo={`${MESES[mesAbierto - 1]} ${anio}`} onCerrar={() => setMesAbierto(null)}>
          <form className="form-dialogo" onSubmit={puedeEditarMes ? guardar : e => e.preventDefault()}>
            <h2>{MESES[mesAbierto - 1]} {anio}{mesCerrado && <span className="titulo-cerrado"><i className="fa-solid fa-lock" aria-hidden="true"></i> Cerrado</span>}</h2>
            {!sesion?.puedeRegistrar && (
              <div className="aviso aviso-info" style={{ marginTop: 0 }}><i className="fa-solid fa-eye"></i><span>Tu rol es de consulta: puedes ver este mes, pero no registrarlo ni editarlo.</span></div>
            )}
            {mesCerrado && (
              <div className="aviso-cerrado" role="note">
                <i className="fa-solid fa-lock" aria-hidden="true"></i>
                <div>
                  <strong>Este mes está cerrado: solo se puede ver.</strong>
                  <p>Pasó el último día para registrarlo ({diaCierre} de ese mismo mes). Así los resultados que ya se reportaron no cambian por error. {sesion?.esAdmin ? 'Como administrador puedes reabrirlo; quedará anotado quién lo hizo.' : 'Si hace falta corregirlo, pide a un administrador que lo reabra.'}</p>
                  {sesion?.esAdmin && <button type="button" className="btn-secondary btn-chico" onClick={() => setReabriendo(true)}><i className="fa-solid fa-lock-open" aria-hidden="true"></i> Reabrir este mes</button>}
                </div>
              </div>
            )}
            <fieldset disabled={!puedeEditarMes} style={{ border: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {usaComponentes(indicador) ? (() => {
                const e = etiquetasDe(indicador), calc = calcularValor(indicador, { a: form.a, b: form.b }), motivo = motivoSinCalculo(indicador, { a: form.a, b: form.b });
                const cumple = calc != null ? cumpleMeta(indicador, calc, mesAbierto) : null;
                return (
                  <div className="calculo-bloque">
                    <p className="calculo-formula"><i className="fa-solid fa-calculator" aria-hidden="true"></i> Este indicador se calcula: <strong>{CALCULOS[indicador.calculo].formula.replaceAll('Año anterior', e.a).replaceAll('Año actual', e.b).replaceAll('Planeadas', e.a).replaceAll('Ejecutadas', e.b).replaceAll('Numerador', e.a).replaceAll('Denominador', e.b)}</strong></p>
                    <div className="calculo-numeros">
                      <label>{e.a}<input type="number" step="any" inputMode="decimal" autoFocus value={form.a} onChange={ev => setForm(f => ({ ...f, a: ev.target.value }))} /></label>
                      <label>{e.b}<input type="number" step="any" inputMode="decimal" value={form.b} onChange={ev => setForm(f => ({ ...f, b: ev.target.value }))} /></label>
                    </div>
                    <div className={`calculo-resultado${cumple === true ? ' ok' : cumple === false ? ' mal' : ''}`} role="status" aria-live="polite">
                      <span>Resultado</span>
                      <strong>{calc != null ? formatearValor(indicador, calc) : '—'}</strong>
                      <small>{calc != null ? `${cumple === true ? 'Cumple' : cumple === false ? 'No cumple' : 'Sin meta para evaluar'} · Meta ${formatearMeta(indicador)}` : (motivo || `Escribe los dos números y el resultado se calcula solo. Meta: ${formatearMeta(indicador)}.`)}</small>
                    </div>
                    {calc == null && (
                      <label className="calculo-directo">…o escribe el resultado directamente
                        <div className="campo-con-sufijo">
                          <input type="number" step="any" value={form.valor} onChange={ev => setForm(f => ({ ...f, valor: ev.target.value }))} placeholder="Solo si no tienes los dos números" />
                          <span className="sufijo">{esPorcentaje(indicador) ? '%' : (indicador.unidad_medida || '')}</span>
                        </div>
                      </label>
                    )}
                  </div>
                );
              })() : (
              <label>Valor del indicador
                <div className="campo-con-sufijo">
                  <input
                    type="number" step="any" autoFocus
                    value={form.valor}
                    onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                    placeholder={esPorcentaje(indicador) ? 'Ej: 95' : `Valor en ${indicador.unidad_medida || 'unidades'}`}
                  />
                  <span className="sufijo">{esPorcentaje(indicador) ? '%' : (indicador.unidad_medida || '')}</span>
                </div>
                <small className="ayuda-campo">
                  {esPorcentaje(indicador)
                    ? `Escribe el porcentaje tal cual: 95 significa 95%. Meta: ${formatearMeta(indicador)}.`
                    : `Meta: ${formatearMeta(indicador)}.`}
                </small>
              </label>
              )}
              {tieneApoyo(indicador) && (() => { const e = etiquetasDe(indicador); return (
                <div className="calculo-bloque">
                  <p className="calculo-formula"><i className="fa-solid fa-paperclip" aria-hidden="true"></i> Datos de apoyo (opcionales): se guardan junto al resultado y <strong>no lo cambian</strong>.</p>
                  <div className="calculo-numeros">
                    <label>{e.a}<input type="number" step="any" inputMode="decimal" value={form.a} onChange={ev => setForm(f => ({ ...f, a: ev.target.value }))} /></label>
                    <label>{e.b}<input type="number" step="any" inputMode="decimal" value={form.b} onChange={ev => setForm(f => ({ ...f, b: ev.target.value }))} /></label>
                  </div>
                </div>
              ); })()}
              <label>Análisis de cumplimiento
                <textarea rows={3} value={form.analisis} onChange={e => setForm(f => ({ ...f, analisis: e.target.value }))} />
              </label>
              <label>Causa: por qué cumplió o no cumplió
                <input value={form.causa} onChange={e => setForm(f => ({ ...f, causa: e.target.value }))} />
              </label>
              <label>Plan de acción <span className="obligatorio">obligatorio</span>
                <textarea rows={3} aria-required="true" value={form.accion} onChange={e => setForm(f => ({ ...f, accion: e.target.value }))} />
              </label>
              <div className="ind-form-fila">
                <label>Responsable de la acción
                  <input value={form.responsable_accion} onChange={e => setForm(f => ({ ...f, responsable_accion: e.target.value }))} />
                </label>
                <label>Fecha compromiso
                  <input type="date" value={form.fecha_compromiso || ''} onChange={e => setForm(f => ({ ...f, fecha_compromiso: e.target.value }))} />
                </label>
              </div>
            </fieldset>
            {errorForm && <div className="alert danger" role="alert" style={{ marginBottom: 0 }}><i className="fa-solid fa-circle-exclamation"></i><span>{errorForm}</span></div>}
            <div className="ind-modal-acciones">
              {puedeEditarMes && <button type="button" className="btn-secondary" onClick={sugerir}><i className="fa-solid fa-wand-magic-sparkles"></i> Sugerir plan de acción</button>}
              <div style={{ flex: 1 }} />
              <button type="button" className="btn-secondary" onClick={() => setMesAbierto(null)}>{puedeEditarMes ? 'Cancelar' : 'Cerrar'}</button>
              {puedeEditarMes && <BotonEstado type="submit" estado={exito ? 'ok' : guardando ? 'cargando' : 'idle'}>Guardar</BotonEstado>}
            </div>
          </form>
        </Dialogo>
      )}
      {reabriendo && mesAbierto && (
        <Confirmar titulo={`¿Reabrir ${MESES[mesAbierto - 1]} ${anio}?`} textoBoton="Reabrir el mes"
          texto="Se podrá volver a registrar y editar este mes en todos los indicadores hasta que se cierre otra vez. Queda anotado en la bitácora quién lo reabrió."
          onCancelar={() => setReabriendo(false)}
          onConfirmar={async () => {
            try { await reabrirMes({ anio, mes: mesAbierto, reabierto_por: sesion?.email }); avisar(`${MESES[mesAbierto - 1]} reabierto.`, { tipo: 'ok' }); await cargar(); }
            catch (err) { avisar(traducirError(err), { tipo: 'alerta' }); } finally { setReabriendo(false); }
          }} />
      )}
    </div>
  );
}
