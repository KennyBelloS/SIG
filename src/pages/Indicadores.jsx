import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSesion } from '../lib/useSesion';
import PageHeader from '../components/PageHeader';
import Numero from '../components/Numero';
import Anillo from '../components/Anillo';
import { traducirError } from '../lib/indicadores';
import { Confirmar } from '../components/Dialogo';
import {
  getProcesos, getIndicadores, getRegistrosDelMes, getInvolucrados, guardarInvolucrado, eliminarInvolucrado,
  enviarRecordatorioAhora, describirEnvio, mesReporteActual, cumpleMeta, formatearValor, formatearMeta, MESES,
  estadisticasIndicador, supabaseRegistrosAnio, getCierresDelAnio, getConfiguracionNotificaciones, estaCerrado,
} from '../lib/indicadores';

const { anio: ANIO_ACTUAL, mesActual: MES_ACTUAL } = mesReporteActual();

function EstadoChip({ estado }) {
  if (estado === 'cumple') return <span className="chip-ind chip-ind-ok"><i className="fa-solid fa-check"></i> Cumple</span>;
  if (estado === 'no_cumple') return <span className="chip-ind chip-ind-no"><i className="fa-solid fa-xmark"></i> No cumple</span>;
  return <span className="chip-ind chip-ind-pendiente"><i className="fa-solid fa-clock"></i> Pendiente</span>;
}

function Aviso({ tipo, texto }) {
  const estilos = {
    ok:     { icono: 'fa-circle-check', clase: 'aviso-ok' },
    aviso:  { icono: 'fa-triangle-exclamation', clase: 'aviso-alerta' },
    info:   { icono: 'fa-circle-info', clase: 'aviso-info' },
    error:  { icono: 'fa-circle-exclamation', clase: 'aviso-error' },
  }[tipo] || { icono: 'fa-circle-info', clase: 'aviso-info' };
  return (
    <div className={`aviso ${estilos.clase}`} role="status">
      <i className={`fa-solid ${estilos.icono}`}></i>
      <span>{texto}</span>
    </div>
  );
}

function BarraIncumplimiento({ pct }) {
  if (pct == null) return <span className="celda-tenue">—</span>;
  const color = pct === 0 ? 'var(--ok)' : pct <= 25 ? '#6FA32B' : pct <= 50 ? 'var(--alerta)' : 'var(--falla)';
  return (
    <div className="barra-incump" title={`${pct}% de los meses evaluados no alcanzaron la meta`}>
      <div className="barra-incump-pista"><div className="barra-incump-relleno" style={{ width: `${pct}%`, background: color }} /></div>
      <span style={{ color, fontWeight: 700 }}>{pct}%</span>
    </div>
  );
}

/** Cinta de los 12 meses del año: una celda por mes, con su estado.
 *  Al hacer clic se abre la ficha del indicador directamente en ese mes. */
function CintaAnio({ indicador, registrosAnio, onIrAMes, anio, cerradoEn }) {
  const porMes = new Map((registrosAnio || []).map(r => [r.mes, r]));
  return (
    <div className="cinta-anio" role="group" aria-label={`Estado mes a mes de ${indicador.nombre}`}>
      {MESES.map((nombreMes, i) => {
        const mes = i + 1;
        const reg = porMes.get(mes);
        const cumple = reg?.valor != null ? cumpleMeta(indicador, reg.valor, mes) : null;
        const perdido = reg?.valor == null && cerradoEn?.(mes);
        const clase = reg?.valor == null ? (perdido ? 'cinta-perdido' : 'cinta-pendiente') : cumple ? 'cinta-cumple' : 'cinta-incumple';
        const estado = reg?.valor == null ? (perdido ? 'venció sin registrar' : 'sin registrar') : cumple ? 'cumple' : 'no cumple';
        return (
          <button
            key={mes}
            type="button"
            className={`cinta-mes ${clase}${anio === ANIO_ACTUAL && mes === MES_ACTUAL ? ' es-actual' : ''}`}
            title={`${nombreMes}: ${estado}${reg?.valor != null ? ` (${formatearValor(indicador, reg.valor)})` : ''}`}
            onClick={e => { e.stopPropagation(); onIrAMes(indicador.id, mes); }}
          />
        );
      })}
    </div>
  );
}

function PanelInvolucrados({ proceso, involucrados, onCambio }) {
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', cargo: '', email: '', notificar: true });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [porQuitar, setPorQuitar] = useState(null);

  function iniciar(inv) {
    setEditando(inv ? inv.id : 'nuevo');
    setForm(inv ? { nombre: inv.nombre, cargo: inv.cargo || '', email: inv.email || '', notificar: inv.notificar } : { nombre: '', cargo: '', email: '', notificar: true });
    setError(null);
  }
  async function guardar(e) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('El correo no es válido.'); return; }
    setGuardando(true); setError(null);
    try {
      await guardarInvolucrado({ id: editando === 'nuevo' ? null : editando, proceso_id: proceso.id, ...form });
      setEditando(null);
      await onCambio();
    } catch (err) { setError(traducirError(err)); } finally { setGuardando(false); }
  }
  async function eliminar(id) {
    try { await eliminarInvolucrado(id); setPorQuitar(null); await onCambio(); } catch (err) { setError(traducirError(err)); setPorQuitar(null); }
  }

  return (
    <div className="ind-involucrados">
      <div className="tabla-scroll"><table>
        <thead><tr><th>Nombre</th><th>Cargo</th><th>Correo</th><th>Avisos</th><th></th></tr></thead>
        <tbody>
          {involucrados.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#8A8A7E' }}>Sin involucrados todavía.</td></tr>}
          {involucrados.map(inv => (
            <tr key={inv.id}>
              <td>{inv.nombre}</td>
              <td>{inv.cargo || '—'}</td>
              <td>{inv.email || <em style={{ opacity: .6 }}>sin correo</em>}</td>
              <td>{inv.notificar ? 'Sí' : 'No'}</td>
              <td>
                <button className="btn-texto" onClick={() => iniciar(inv)} title={`Editar a ${inv.nombre}`} aria-label={`Editar a ${inv.nombre}`}><i className="fa-solid fa-pen"></i></button>
                <button className="btn-texto" onClick={() => setPorQuitar(inv)} title={`Quitar a ${inv.nombre}`} aria-label={`Quitar a ${inv.nombre}`}><i className="fa-solid fa-trash"></i></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>

      {editando ? (
        <form className="ind-form-inline" onSubmit={guardar}>
          <input aria-label="Nombre" placeholder="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
          <input aria-label="Cargo" placeholder="Cargo" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} />
          <input aria-label="Correo" placeholder="Correo" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <label className="ind-check"><input type="checkbox" checked={form.notificar} onChange={e => setForm(f => ({ ...f, notificar: e.target.checked }))} /> Recibe avisos</label>
          <button className="btn-primary" disabled={guardando} type="submit">{guardando ? 'Guardando…' : 'Guardar'}</button>
          <button className="btn-secondary" type="button" onClick={() => setEditando(null)}>Cancelar</button>
        </form>
      ) : (
        <button className="btn-secondary" onClick={() => iniciar(null)}><i className="fa-solid fa-user-plus"></i> Agregar involucrado</button>
      )}
      {error && <div className="alert danger" role="alert" style={{ marginTop: 8 }}>{error}</div>}
      {porQuitar && (
        <Confirmar
          titulo="¿Quitar de los involucrados?"
          texto={`${porQuitar.nombre} dejará de recibir los correos de ${proceso.nombre}. Puedes volver a agregarla o agregarlo cuando quieras.`}
          textoBoton="Quitar" peligro
          onConfirmar={() => eliminar(porQuitar.id)} onCancelar={() => setPorQuitar(null)}
        />
      )}
    </div>
  );
}

function ProcesoPanel({ proceso, indicadores, registros, statsPorIndicador, registrosAnioPorInd, onIrAMes, involucrados, onCambioInvolucrados, esAdmin, abiertoInicial, mes, anio, cerradoEn }) {
  const [abierto, setAbierto] = useState(!!abiertoInicial);
  useEffect(() => { if (abiertoInicial) setAbierto(true); }, [abiertoInicial]);
  const [mostrarInvolucrados, setMostrarInvolucrados] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const filas = indicadores.map(ind => {
    const reg = registros.get(ind.id);
    const valor = reg ? reg.valor : null;
    const cumple = cumpleMeta(ind, valor, mes);
    const estado = valor == null ? 'pendiente' : cumple ? 'cumple' : 'no_cumple';
    return { ind, reg, estado };
  });
  const pendientes = filas.filter(f => f.estado === 'pendiente').length;
  const noCumplen = filas.filter(f => f.estado === 'no_cumple').length;
  const evaluables = filas.filter(f => f.estado !== 'pendiente').length;
  const cumplen = filas.filter(f => f.estado === 'cumple').length;
  const pct = evaluables > 0 ? Math.round((cumplen / evaluables) * 100) : null;

  async function enviar() {
    setEnviando(true); setMensaje(null);
    try {
      const res = await enviarRecordatorioAhora({ procesoId: proceso.id, mes, anio });
      setMensaje(describirEnvio(res, { mesNombre: MESES[mes - 1] }));
    } catch (err) { setMensaje({ tipo: 'error', texto: err.message }); } finally { setEnviando(false); }
  }

  return (
    <section className="panel ind-proceso-panel" style={{ '--rail': indicadores[0]?.color_categoria || 'var(--follaje-500)' }}>
      <button className="ind-proceso-header" onClick={() => setAbierto(a => !a)} aria-expanded={abierto}>
        <div className="ind-proceso-titulo">
          <i className={`fa-solid ${abierto ? 'fa-chevron-down' : 'fa-chevron-right'}`}></i>
          <Anillo valor={indicadores.length ? Math.round(((indicadores.length - pendientes) / indicadores.length) * 100) : null} tamano={42} grosor={5} color={pendientes ? 'var(--gold)' : 'var(--ok)'} pista="var(--line)" centro={indicadores.length - pendientes} etiqueta={`Registrados en ${proceso.nombre}`} />
          <h2>{proceso.nombre}</h2>
          <span className="ind-proceso-conteo">{indicadores.length} indicador{indicadores.length !== 1 ? 'es' : ''}</span>
        </div>
        <div className="ind-proceso-resumen">
          {pendientes > 0 && <span className="chip-ind chip-ind-pendiente">{pendientes} pendiente{pendientes !== 1 ? 's' : ''}</span>}
          {noCumplen > 0 && <span className="chip-ind chip-ind-no">{noCumplen} sin cumplir</span>}
          {pct != null && <span className="chip-ind chip-ind-ok">{pct}% cumplimiento</span>}
        </div>
      </button>

      {abierto && (
        <div className="ind-proceso-body">
          <div className="tabla-scroll"><table className="tabla-apilable">
            <thead><tr><th>Indicador</th><th>Responsable</th><th>Meta</th><th>{MESES[mes - 1]} {anio}</th><th>Estado</th><th>Año {anio}</th><th>% Incumpl.</th><th></th></tr></thead>
            <tbody>
              {filas.map(({ ind, reg, estado }) => (
                <tr key={ind.id}>
                  <td className="celda-principal"><span className="nombre-ind">{ind.categoria && <i className="punto-cat" title={`Categoría: ${ind.categoria}`} style={{ background: ind.color_categoria }} />}{ind.nombre}</span></td>
                  <td data-label="Responsable">{ind.responsable_medicion || '—'}</td>
                  <td data-label="Meta" className="celda-numero">{formatearMeta(ind)}</td>
                  <td data-label={`${MESES[mes - 1]} ${anio}`} className="celda-numero">{formatearValor(ind, reg?.valor)}</td>
                  <td data-label="Estado"><EstadoChip estado={estado} /></td>
                  <td data-label={`Año ${anio}`}><CintaAnio indicador={ind} registrosAnio={registrosAnioPorInd?.get(ind.id)} onIrAMes={onIrAMes} anio={anio} cerradoEn={cerradoEn} /></td>
                  <td data-label="% de incumplimiento"><BarraIncumplimiento pct={statsPorIndicador?.get(ind.id)?.pctIncumplimiento} /></td>
                  <td data-label=""><Link className="btn-texto" to={`/indicadores/${ind.id}`} title={`Abrir ${ind.nombre}`} aria-label={`Abrir ${ind.nombre}`}><i className="fa-solid fa-arrow-up-right-from-square"></i></Link></td>
                </tr>
              ))}
            </tbody>
          </table></div>

          <div className="cinta-leyenda">
            <span><i className="cinta-punto" style={{ background: 'var(--ok)' }} /> Cumple la meta</span>
            <span><i className="cinta-punto" style={{ background: 'var(--wine)' }} /> No cumple</span>
            <span><i className="cinta-punto cinta-perdido" /> Venció sin registrar</span>
            <span><i className="cinta-punto" style={{ background: '#E4E1D6' }} /> Por registrar</span>
            <span><i className="cinta-punto" style={{ background: 'var(--gold)', borderRadius: '50%', width: 6, height: 6 }} /> Mes en curso</span>
            <span className="celda-tenue">Haz clic en un mes para registrarlo.</span>
          </div>

          {esAdmin && (
            <>
              <div className="ind-proceso-acciones">
                <button className="btn-secondary" onClick={enviar} disabled={enviando}>
                  <i className="fa-solid fa-paper-plane"></i> {enviando ? 'Enviando…' : 'Enviar recordatorio ahora'}
                </button>
                <button className="btn-secondary" onClick={() => setMostrarInvolucrados(m => !m)}>
                  <i className="fa-solid fa-users"></i> {mostrarInvolucrados ? 'Ocultar involucrados' : 'Involucrados y notificaciones'}
                </button>
              </div>
              {mensaje && <Aviso {...mensaje} />}
              {mostrarInvolucrados && <PanelInvolucrados proceso={proceso} involucrados={involucrados} onCambio={onCambioInvolucrados} />}
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default function Indicadores() {
  const { sesion } = useSesion();
  const navegar = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [procesos, setProcesos] = useState([]);
  const [indicadoresPorProceso, setIndicadoresPorProceso] = useState(new Map());
  const [registros, setRegistros] = useState(new Map());
  const [involucrados, setInvolucrados] = useState(new Map());
  const [statsPorIndicador, setStatsPorIndicador] = useState(new Map());
  const [registrosAnioPorInd, setRegistrosAnioPorInd] = useState(new Map());
  const [cierres, setCierres] = useState([]);
  const [diaCierre, setDiaCierre] = useState(12);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [mes, setMes] = useState(MES_ACTUAL);
  const [anio, setAnio] = useState(ANIO_ACTUAL);

  async function cargarTodo() {
    setCargando(true); setError(null);
    try {
      const [listaProcesos, cierresAnio, cfg] = await Promise.all([
        getProcesos(), getCierresDelAnio(anio), getConfiguracionNotificaciones().catch(() => ({ dia_cierre: 12 })),
      ]);
      setProcesos(listaProcesos); setCierres(cierresAnio); setDiaCierre(cfg?.dia_cierre ?? 12);

      const indMap = new Map();
      const invMap = new Map();
      await Promise.all(listaProcesos.map(async p => {
        const [inds, invs] = await Promise.all([getIndicadores({ procesoId: p.id }), getInvolucrados(p.id)]);
        indMap.set(p.id, inds);
        invMap.set(p.id, invs);
      }));
      setIndicadoresPorProceso(indMap);
      setInvolucrados(invMap);

      const regs = await getRegistrosDelMes({ anio, mes });
      setRegistros(new Map(regs.map(r => [r.indicador_id, r])));

      // Estadísticas de todo el año, para el % de incumplimiento por indicador
      const regsAnio = await supabaseRegistrosAnio(anio);
      const porIndicador = new Map();
      for (const r of regsAnio) {
        if (!porIndicador.has(r.indicador_id)) porIndicador.set(r.indicador_id, []);
        porIndicador.get(r.indicador_id).push(r);
      }
      const mapaStats = new Map();
      for (const inds of indMap.values()) {
        for (const ind of inds) mapaStats.set(ind.id, estadisticasIndicador(ind, porIndicador.get(ind.id) || []));
      }
      setStatsPorIndicador(mapaStats);
      setRegistrosAnioPorInd(porIndicador);
    } catch (err) { setError(traducirError(err)); } finally { setCargando(false); }
  }
  useEffect(() => { cargarTodo(); /* eslint-disable-next-line */ }, [mes, anio]);

  async function recargarInvolucrados() {
    const invMap = new Map();
    await Promise.all(procesos.map(async p => invMap.set(p.id, await getInvolucrados(p.id))));
    setInvolucrados(invMap);
  }

  const hayFiltro = busqueda.trim() !== '' || filtroEstado !== 'todos';

  function indicadoresFiltrados(lista) {
    const texto = busqueda.trim().toLowerCase();
    return lista.filter(ind => {
      if (texto) {
        const enTexto = `${ind.nombre} ${ind.responsable_medicion || ''} ${ind.categoria || ''}`.toLowerCase();
        if (!enTexto.includes(texto)) return false;
      }
      if (filtroEstado !== 'todos') {
        const reg = registros.get(ind.id);
        const valor = reg ? reg.valor : null;
        const cumple = cumpleMeta(ind, valor, mes);
        const estado = valor == null ? 'pendiente' : cumple ? 'cumple' : 'no_cumple';
        if (estado !== filtroEstado) return false;
      }
      return true;
    });
  }

  const { totalPendientes, totalNoCumplen, totalIndicadores, totalCumplen } = useMemo(() => {
    let pend = 0, noCum = 0, total = 0, cum = 0;
    for (const inds of indicadoresPorProceso.values()) {
      for (const ind of inds) {
        total++;
        const valor = registros.get(ind.id)?.valor;
        if (valor == null) { pend++; continue; }
        const c = cumpleMeta(ind, valor, mes);
        if (c === false) noCum++; else if (c === true) cum++;
      }
    }
    return { totalPendientes: pend, totalNoCumplen: noCum, totalIndicadores: total, totalCumplen: cum };
  }, [indicadoresPorProceso, registros, mes]);

  return (
    <div className="page">
      <PageHeader
        migas={[{ texto: 'Seguimiento' }, { texto: 'Indicadores' }]}
        titulo="Indicadores"
        descripcion="Registra el avance de cada mes y revisa qué indicadores alcanzaron su meta."
      >
        <div className="selector-periodo" role="group" aria-label="Periodo">
          <button className="btn-texto" onClick={() => { const m = mes === 1 ? 12 : mes - 1; setMes(m); if (mes === 1) setAnio(a => a - 1); }} title="Mes anterior" aria-label="Mes anterior">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <div className="selector-periodo-actual" aria-live="polite">
            <strong>{MESES[mes - 1]}</strong>
            <span>{anio}</span>
          </div>
          <button className="btn-texto" onClick={() => { const m = mes === 12 ? 1 : mes + 1; setMes(m); if (mes === 12) setAnio(a => a + 1); }} title="Mes siguiente" aria-label="Mes siguiente">
            <i className="fa-solid fa-chevron-right"></i>
          </button>
          {(mes !== MES_ACTUAL || anio !== ANIO_ACTUAL) && (
            <button className="btn-secondary" onClick={() => { setMes(MES_ACTUAL); setAnio(ANIO_ACTUAL); }}>Ir al mes actual</button>
          )}
        </div>
      </PageHeader>

      {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation"></i><span>{error}</span></div>}

      {!cargando && (
        <>
          <section className="hero-dash hero-compacto" aria-label={`Estado de ${MESES[mes - 1]}`}>
            <div className="hero-principal">
              <span className="hero-etiqueta">Diligenciados en {MESES[mes - 1]}</span>
              <strong className="hero-cifra"><Numero valor={totalIndicadores - totalPendientes} /><small> de {totalIndicadores}</small></strong>
              <div className="hero-progreso" role="progressbar" aria-label="Avance del mes" aria-valuemin={0} aria-valuemax={100}
                aria-valuenow={totalIndicadores ? Math.round(((totalIndicadores - totalPendientes) / totalIndicadores) * 100) : 0}>
                <span style={{ width: `${totalIndicadores ? ((totalIndicadores - totalPendientes) / totalIndicadores) * 100 : 0}%` }} />
              </div>
              <span className="hero-delta">indicadores con dato en {procesos.length} procesos</span>
            </div>
            <dl className="hero-datos">
              <div><dt>Cumplen la meta</dt><dd><Numero valor={totalCumplen} /></dd><small>de los ya registrados</small></div>
              <div><dt>No cumplen</dt><dd className={totalNoCumplen ? 'alerta' : ''}><Numero valor={totalNoCumplen} /></dd><small>{totalNoCumplen ? 'necesitan plan de acción' : 'ninguno por ahora'}</small></div>
              <div><dt>Por registrar</dt><dd className={totalPendientes ? 'aten' : ''}><Numero valor={totalPendientes} /></dd><small>{totalPendientes ? 'esperan su dato del mes' : 'todo al día'}</small></div>
            </dl>
          </section>

          <div className="barra-filtros">
            <div className="campo-busqueda">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input
                type="search"
                placeholder="Buscar indicador o responsable"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
            <div className="filtros-estado">
              {[['todos', 'Todos'], ['pendiente', 'Pendientes'], ['no_cumple', 'No cumplen'], ['cumple', 'Cumplen']].map(([v, t]) => (
                <button key={v} className={`filtro-chip ${filtroEstado === v ? 'filtro-chip-activo' : ''}`} onClick={() => setFiltroEstado(v)}>{t}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {cargando ? (
        <div aria-busy="true" aria-label="Cargando indicadores">
          {[0, 1, 2, 3].map(i => <div key={i} className="esqueleto" style={{ height: 64, marginBottom: 14 }} />)}
        </div>
      ) : procesos.length === 0 ? (
        <section className="panel">
          <div className="estado-vacio">
            <i className="fa-solid fa-gauge-high"></i>
            <strong>Aún no hay procesos configurados</strong>
            <p>Corre la migración supabase/schema.sql para cargar el catálogo de indicadores.</p>
          </div>
        </section>
      ) : (
        (() => {
          const visibles = procesos
            .map(p => ({ p, inds: indicadoresFiltrados(indicadoresPorProceso.get(p.id) || []) }))
            .filter(({ inds }) => !hayFiltro || inds.length > 0);
          if (visibles.length === 0) {
            return (
              <section className="panel">
                <div className="estado-vacio">
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <strong>Ningún indicador coincide con la búsqueda</strong>
                  <p>Prueba con otro texto o quita el filtro de estado.</p>
                </div>
              </section>
            );
          }
          return visibles.map(({ p, inds }) => (
            <ProcesoPanel
              key={p.id}
              proceso={p}
              indicadores={inds}
              registros={registros}
              statsPorIndicador={statsPorIndicador}
              involucrados={involucrados.get(p.id) || []}
              onCambioInvolucrados={recargarInvolucrados}
              esAdmin={sesion?.esAdmin}
              abiertoInicial={hayFiltro}
              registrosAnioPorInd={registrosAnioPorInd}
              onIrAMes={(id, m) => navegar(`/indicadores/${id}?mes=${m}&anio=${anio}`)}
              mes={mes}
              anio={anio}
              cerradoEn={m => estaCerrado(anio, m, cierres, diaCierre)}
            />
          ));
        })()
      )}
    </div>
  );
}
