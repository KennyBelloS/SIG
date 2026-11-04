import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useSesion } from '../lib/useSesion';
import PageHeader from '../components/PageHeader';
import { avisar } from '../lib/toast';
import { traducirError } from '../lib/indicadores';
import Dialogo, { Confirmar } from '../components/Dialogo';
import {
  getProcesos, getIndicadores, actualizarIndicador, actualizarProceso, crearIndicador, desactivarIndicador, ROLES, formatearMetaMensual,
  getCierresDelAnio, reabrirMes, cerrarMes, enviarRecordatorioAhora, estaCerrado, mesVencido, verificarLogoCorreo,
  getConfiguracionNotificaciones, guardarConfiguracionNotificaciones, getHistorialNotificaciones, describirEnvio,
  mesReporteActual, MESES, formatearMeta, esPorcentaje, entradaAValor, valorAEntrada,
} from '../lib/indicadores';

const { anio: ANIO_ACTUAL } = mesReporteActual();

function Cargando({ filas = 3 }) {
  return (
    <div aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }).map((_, i) => <div key={i} className="esqueleto" style={{ height: 52, marginBottom: 10 }} />)}
    </div>
  );
}
const PESTANAS = [
  { id: 'indicadores', label: 'Indicadores', icono: 'fa-pen-to-square' },
  { id: 'cierres', label: 'Cierres mensuales', icono: 'fa-lock' },
  { id: 'notificaciones', label: 'Notificaciones', icono: 'fa-bell' },
  { id: 'usuarios', label: 'Usuarios', icono: 'fa-users-gear' },
];

const CAMPOS_INDICADOR = [
  { campo: 'nombre', etiqueta: 'Nombre del indicador', tipo: 'text' },
  { campo: 'directriz', etiqueta: 'Directriz de la política', tipo: 'textarea' },
  { campo: 'estrategia_asg', etiqueta: 'Estrategia ASG', tipo: 'textarea' },
  { campo: 'objetivo', etiqueta: 'Objetivo', tipo: 'textarea' },
  { campo: 'formula_calculo', etiqueta: 'Fórmula de cálculo', tipo: 'textarea' },
  { campo: 'unidad_medida', etiqueta: 'Unidad de medida', tipo: 'text' },
  { campo: 'tipo_indicador', etiqueta: 'Tipo de indicador', tipo: 'select', opciones: ['Cumplimiento', 'Eficacia', 'Eficiencia'] },
  { campo: 'meta_anual', etiqueta: 'Meta anual', tipo: 'number' },
  { campo: 'meta_mensual', etiqueta: 'Meta mensual', tipo: 'number' },
  { campo: 'tipo_meta', etiqueta: 'Meta que rige el indicador', tipo: 'select', vacio: 'Automática (según tenga metas por mes)', opciones: [['anual', 'La meta anual'], ['mensual', 'La meta mensual']] },
  { campo: 'sentido_meta', etiqueta: 'Sentido de la meta', tipo: 'select', opciones: [['mayor_mejor', 'Mayor es mejor'], ['menor_mejor', 'Menor es mejor']] },
  { campo: 'frecuencia', etiqueta: 'Frecuencia de medición', tipo: 'select', opciones: [['mensual', 'Mensual'], ['trimestral', 'Trimestral'], ['semestral', 'Semestral'], ['anual', 'Anual']] },
  { campo: 'frecuencia_seguimiento', etiqueta: 'Frecuencia de seguimiento', tipo: 'select', vacio: 'Sin definir', opciones: [['mensual', 'Mensual'], ['bimestral', 'Bimestral'], ['trimestral', 'Trimestral'], ['semestral', 'Semestral'], ['anual', 'Anual']] },
  { campo: 'responsable_medicion', etiqueta: 'Responsable de la medición', tipo: 'text' },
  { campo: 'procesos_relacionados', etiqueta: 'Procesos relacionados', tipo: 'text' },
  { campo: 'fuente_informacion', etiqueta: 'Fuente de información', tipo: 'text' },
  { campo: 'categoria', etiqueta: 'Categoría (color)', tipo: 'text' },
  { campo: 'color_categoria', etiqueta: 'Color (hex)', tipo: 'color' },
];

const CAMPOS_META = ['meta_anual', 'meta_mensual'];

/** Crear (indicador = null) o editar un indicador. Las metas se escriben como en el resto de la app:
 *  en % cuando la unidad es un porcentaje (95 = 95 %). */
function FormularioIndicador({ indicador, procesos, procesoInicial, onGuardado, onCancelar }) {
  const crear = !indicador;
  const base = indicador || { unidad_medida: '', sentido_meta: 'mayor_mejor', frecuencia: 'mensual' };
  const [form, setForm] = useState(() => ({
    ...Object.fromEntries(CAMPOS_INDICADOR.map(c => [c.campo, base[c.campo] ?? ''])),
    ...Object.fromEntries(CAMPOS_META.map(k => [k, valorAEntrada(base, base[k])])),
    proceso_id: base.proceso_id || procesoInicial || procesos[0]?.id || '',
  }));
  const enPorcentaje = esPorcentaje({ unidad_medida: form.unidad_medida });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [daDeBaja, setDaDeBaja] = useState(false);

  async function guardar(e) {
    e?.preventDefault?.();
    setError(null);
    if (!String(form.nombre || '').trim()) { setError('Escribe el nombre del indicador.'); return; }
    const meta = k => (form[k] === '' || form[k] == null ? null : entradaAValor({ unidad_medida: form.unidad_medida }, form[k]));
    if (crear && meta('meta_anual') == null && meta('meta_mensual') == null) { setError('Define al menos una meta: la anual o la mensual.'); return; }
    setGuardando(true);
    try {
      const { proceso_id, ...resto } = form;
      const cambios = Object.fromEntries(Object.entries(resto).map(([k, v]) => [k, v === '' ? null : v]));
      cambios.meta_anual = meta('meta_anual'); cambios.meta_mensual = meta('meta_mensual');
      cambios.sentido_meta = form.sentido_meta || 'mayor_mejor'; cambios.frecuencia = form.frecuencia || 'mensual';
      if (crear) await crearIndicador({ ...cambios, proceso_id: Number(proceso_id) });
      else await actualizarIndicador(indicador.id, cambios);
      avisar(crear ? 'Indicador creado: ya aparece en la matriz.' : 'Cambios guardados.', { tipo: 'ok', celebrar: crear });
      await onGuardado();
    } catch (err) { setError(traducirError(err)); } finally { setGuardando(false); }
  }

  async function darDeBaja() {
    setGuardando(true);
    try { await desactivarIndicador(indicador.id); await onGuardado(); }
    catch (err) { setError(traducirError(err)); setDaDeBaja(false); } finally { setGuardando(false); }
  }

  return (
    <Dialogo titulo={crear ? 'Nuevo indicador' : `Editar ${indicador.nombre}`} onCerrar={onCancelar} ancho={720}>
      <form className="form-dialogo" onSubmit={guardar}>
        <h2>{crear ? 'Nuevo indicador' : 'Editar indicador'}</h2>
        {crear && <p className="texto-tenue" style={{ marginTop: -8 }}>Apenas lo guardes aparece en la lista, la matriz, el dashboard y los informes.</p>}
        <div className="config-grid-form">
          {crear && (
            <label style={{ gridColumn: '1 / -1' }}>Proceso
              <select value={form.proceso_id} onChange={e => setForm(f => ({ ...f, proceso_id: e.target.value }))}>
                {procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
          )}
          {CAMPOS_INDICADOR.map(c => (
            <label key={c.campo} style={c.tipo === 'textarea' || c.campo === 'nombre' ? { gridColumn: '1 / -1' } : undefined}>
              {c.etiqueta}
              {c.tipo === 'textarea' ? (
                <textarea rows={2} value={form[c.campo] || ''} onChange={e => setForm(f => ({ ...f, [c.campo]: e.target.value }))} />
              ) : c.tipo === 'select' ? (
                <select value={form[c.campo] || ''} onChange={e => setForm(f => ({ ...f, [c.campo]: e.target.value }))}>
                  <option value="">{c.vacio || '—'}</option>
                  {c.opciones.map(op => Array.isArray(op)
                    ? <option key={op[0]} value={op[0]}>{op[1]}</option>
                    : <option key={op} value={op}>{op}</option>)}
                </select>
              ) : c.tipo === 'color' ? (
                <input type="color" value={form[c.campo] || '#999999'} onChange={e => setForm(f => ({ ...f, [c.campo]: e.target.value }))} />
              ) : CAMPOS_META.includes(c.campo) ? (
                <>
                  <div className="campo-con-sufijo">
                    <input type="number" step="any" value={form[c.campo] ?? ''} onChange={e => setForm(f => ({ ...f, [c.campo]: e.target.value }))} />
                    {enPorcentaje && <span className="sufijo">%</span>}
                  </div>
                  <small className="ayuda-campo">{enPorcentaje ? 'Escribe el porcentaje tal cual: 95 significa 95 %.' : 'En la unidad del indicador.'}</small>
                </>
              ) : (
                <input type={c.tipo} value={form[c.campo] || ''} onChange={e => setForm(f => ({ ...f, [c.campo]: e.target.value }))} />
              )}
            </label>
          ))}
        </div>
        <p className="ayuda-campo" style={{ marginTop: 0 }}>La meta anual y la mensual son independientes. La que rige se elige arriba y es la que usan el cumplimiento, la matriz y las gráficas (en la gráfica también se puede cambiar al vuelo).</p>
        {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation"></i><span>{error}</span></div>}
        <div className="ind-modal-acciones" style={{ justifyContent: 'space-between' }}>
          {!crear ? <button type="button" className="btn-secondary btn-baja" onClick={() => setDaDeBaja(true)}><i className="fa-solid fa-box-archive"></i> Dar de baja</button> : <span />}
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={onCancelar}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Guardando…' : crear ? 'Crear indicador' : 'Guardar cambios'}</button>
          </span>
        </div>
      </form>
      {daDeBaja && (
        <Confirmar titulo="¿Dar de baja este indicador?" peligro textoBoton="Dar de baja" cargando={guardando}
          texto="Dejará de verse en la lista, la matriz, el dashboard y los informes. Su historial no se borra." onConfirmar={darDeBaja} onCancelar={() => setDaDeBaja(false)} />
      )}
    </Dialogo>
  );
}

function PestanaIndicadores() {
  const [procesos, setProcesos] = useState([]);
  const [indicadoresPorProceso, setIndicadoresPorProceso] = useState(new Map());
  const [editando, setEditando] = useState(null);
  const [nuevoEn, setNuevoEn] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [editandoProceso, setEditandoProceso] = useState(null);
  const [nombreProceso, setNombreProceso] = useState('');

  async function cargar() {
    setCargando(true); setError(null);
    try {
      const lista = await getProcesos();
      setProcesos(lista);
      const mapa = new Map();
      await Promise.all(lista.map(async p => mapa.set(p.id, await getIndicadores({ procesoId: p.id }))));
      setIndicadoresPorProceso(mapa);
    } catch (err) { setError(traducirError(err)); } finally { setCargando(false); }
  }
  useEffect(() => { cargar(); }, []);

  async function guardarNombreProceso(p) {
    try { await actualizarProceso(p.id, { nombre: nombreProceso }); setEditandoProceso(null); await cargar(); }
    catch (err) { setError(traducirError(err)); }
  }

  if (cargando) return <Cargando filas={5} />;
  return (
    <div>
      {error && <div className="alert danger">{error}</div>}
      <div className="barra-indicadores">
        <span className="texto-tenue">{[...indicadoresPorProceso.values()].reduce((n, l) => n + l.length, 0)} indicadores activos en {procesos.length} procesos</span>
        <button className="btn-primary" onClick={() => setNuevoEn(procesos[0]?.id || true)}><i className="fa-solid fa-plus"></i> Nuevo indicador</button>
      </div>
      {procesos.map(p => (
        <section className="panel" key={p.id}>
          <div className="panel-header">
            {editandoProceso === p.id ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={nombreProceso} onChange={e => setNombreProceso(e.target.value)} />
                <button className="btn-primary" onClick={() => guardarNombreProceso(p)}>Guardar</button>
                <button className="btn-secondary" onClick={() => setEditandoProceso(null)}>Cancelar</button>
              </div>
            ) : (
              <h2>{p.nombre} <button className="btn-texto" onClick={() => { setEditandoProceso(p.id); setNombreProceso(p.nombre); }} title="Renombrar proceso"><i className="fa-solid fa-pen"></i></button></h2>
            )}
          </div>
          <div className="tabla-scroll"><table>
            <thead><tr><th>Indicador</th><th>Meta anual</th><th>Meta mensual</th><th>Medición</th><th>Seguimiento</th><th>Responsable</th><th></th></tr></thead>
            <tbody>
              {(indicadoresPorProceso.get(p.id) || []).map(ind => (
                <tr key={ind.id}>
                  <td><span className="nombre-ind">{ind.categoria && <i className="punto-cat" title={ind.categoria} style={{ background: ind.color_categoria }} />}{ind.nombre}</span></td>
                  <td className="celda-numero">{formatearMeta(ind)}</td>
                  <td className="celda-numero">{formatearMetaMensual(ind)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{ind.frecuencia || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{ind.frecuencia_seguimiento || '—'}</td>
                  <td>{ind.responsable_medicion || '—'}</td>
                  <td><button className="btn-texto" onClick={() => setEditando(ind)} title={`Editar ${ind.nombre}`} aria-label={`Editar ${ind.nombre}`}><i className="fa-solid fa-pen"></i></button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>
      ))}
      {editando && <FormularioIndicador indicador={editando} procesos={procesos} onCancelar={() => setEditando(null)} onGuardado={async () => { setEditando(null); await cargar(); }} />}
      {nuevoEn && <FormularioIndicador indicador={null} procesos={procesos} procesoInicial={typeof nuevoEn === 'number' ? nuevoEn : null} onCancelar={() => setNuevoEn(null)} onGuardado={async () => { setNuevoEn(null); await cargar(); }} />}
    </div>
  );
}

function PestanaCierres() {
  const { sesion } = useSesion();
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [cierres, setCierres] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  async function cargar() {
    setCargando(true); setError(null);
    try { setCierres(await getCierresDelAnio(anio)); } catch (err) { setError(traducirError(err)); } finally { setCargando(false); }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [anio]);

  const [diaCierre, setDiaCierre] = useState(12);
  useEffect(() => { getConfiguracionNotificaciones().then(c => setDiaCierre(c?.dia_cierre ?? 12)).catch(() => {}); }, []);
  const porMes = new Map(cierres.map(c => [c.mes, c]));

  const [porCambiar, setPorCambiar] = useState(null);
  const [aplicando, setAplicando] = useState(false);

  async function toggle(mes, cerrado) {
    setMensaje(null); setAplicando(true);
    try {
      if (cerrado) await cerrarMes({ anio, mes });
      else await reabrirMes({ anio, mes, reabierto_por: sesion?.email });
      setMensaje(`${MESES[mes - 1]} ${anio} quedó ${cerrado ? 'cerrado' : 'abierto'}.`);
      await cargar();
    } catch (err) { setError(traducirError(err)); } finally { setAplicando(false); setPorCambiar(null); }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Cierre mensual</h2>
        <select value={anio} onChange={e => setAnio(Number(e.target.value))}>
          {[ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <p style={{ marginTop: 0 }}>
        Los meses se cierran <strong>solos</strong> cuando vencen: el mes anterior queda bloqueado el día {diaCierre},
        y todos los meses más viejos quedan cerrados siempre. Solo un administrador puede reabrirlos desde aquí.
      </p>
      {error && <div className="alert danger">{error}</div>}
      {mensaje && <div className="alert-inline"><i className="fa-solid fa-circle-info"></i>{mensaje}</div>}
      {cargando ? <Cargando filas={4} /> : (
        <div className="tabla-scroll"><table>
          <thead><tr><th>Mes</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {MESES.map((nombreMes, i) => {
              const mes = i + 1;
              const c = porMes.get(mes);
              const cerrado = estaCerrado(anio, mes, cierres, diaCierre);
              const automatico = !c && mesVencido(anio, mes, diaCierre);
              const reabierto = c && c.cerrado === false && mesVencido(anio, mes, diaCierre);
              return (
                <tr key={mes}>
                  <td>{nombreMes}</td>
                  <td>
                    {cerrado
                      ? <span className="chip-ind chip-ind-no"><i className="fa-solid fa-lock"></i> Cerrado</span>
                      : <span className="chip-ind chip-ind-ok"><i className="fa-solid fa-lock-open"></i> Abierto</span>}
                    {automatico && <span className="celda-tenue" style={{ marginLeft: 8, fontSize: 11 }}>vencido automáticamente</span>}
                    {reabierto && <span className="celda-tenue" style={{ marginLeft: 8, fontSize: 11 }}>reabierto por un administrador</span>}
                  </td>
                  <td>
                    {cerrado
                      ? <button className="btn-secondary" onClick={() => setPorCambiar({ mes, cerrar: false })}>Reabrir</button>
                      : <button className="btn-texto" onClick={() => setPorCambiar({ mes, cerrar: true })}>Cerrar ahora</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}
      {porCambiar && (
        <Confirmar
          titulo={porCambiar.cerrar ? `¿Cerrar ${MESES[porCambiar.mes - 1]} ${anio}?` : `¿Reabrir ${MESES[porCambiar.mes - 1]} ${anio}?`}
          texto={porCambiar.cerrar
            ? 'Nadie podrá registrar ni corregir datos de ese mes hasta que lo reabras.'
            : 'Los responsables podrán registrar y corregir datos de ese mes otra vez. Queda anotado que lo reabriste tú.'}
          textoBoton={porCambiar.cerrar ? 'Cerrar mes' : 'Reabrir mes'} peligro={porCambiar.cerrar} cargando={aplicando}
          onConfirmar={() => toggle(porCambiar.mes, porCambiar.cerrar)} onCancelar={() => setPorCambiar(null)}
        />
      )}
    </section>
  );
}


const fechaLarga = d => d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
/** Próxima vez que cae ese día del mes (hoy cuenta). */
function proximaFecha(diaMes, hoy = new Date()) {
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  let d = new Date(hoy.getFullYear(), hoy.getMonth(), diaMes);
  if (d < base) d = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaMes);
  return d;
}

/** Estado del envío automático: ¿el despertador está llamando? ¿cuándo toca enviar? */
function EnvioAutomatico({ cfg }) {
  const hoy = new Date();
  const cierre = cfg.dia_cierre ?? 12;
  const aviso = Math.max(1, cierre - 2);
  const pulso = cfg.ultimo_pulso ? new Date(cfg.ultimo_pulso) : null;
  const horas = pulso ? (hoy - pulso) / 36e5 : null;
  const estado = !cfg.activo ? 'apagado' : !pulso ? 'nunca' : horas <= 36 ? 'ok' : 'atrasado';
  const dias = horas != null ? Math.floor(horas / 24) : 0;
  const mensajes = {
    ok: ['aviso-ok', 'fa-circle-check', `El despertador está funcionando: llamó ${horas < 1 ? 'hace menos de una hora' : horas < 24 ? `hace ${Math.floor(horas)} h` : 'ayer'} (${pulso?.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}).`],
    nunca: ['aviso-alerta', 'fa-triangle-exclamation', 'El despertador todavía no ha llamado nunca. Si ya publicaste la aplicación, falta crear los secretos APP_URL y CRON_SECRET en GitHub (Settings → Secrets → Actions) y probar con "Run workflow" en la pestaña Actions.'],
    atrasado: ['aviso-error', 'fa-circle-exclamation', `El despertador lleva ${dias} día${dias === 1 ? '' : 's'} sin llamar. Revisa en GitHub → Actions si el flujo está fallando o desactivado. Los envíos de este mes no saldrán hasta que vuelva a llamar.`],
    apagado: ['aviso-info', 'fa-circle-pause', 'Los envíos automáticos están desactivados. Activa la casilla "Envíos activos" y guarda.'],
  }[estado];
  const filas = [
    ['fa-envelope', 'Recordatorio del mes anterior', cfg.dia_envio, 'A todos los procesos, con el resumen de cómo cerró el mes'],
    ['fa-hourglass-half', 'Faltan 2 días para el cierre', aviso, 'Solo a los procesos que todavía tienen pendientes'],
    ['fa-lock', 'Cierre del mes', cierre, 'El mes se bloquea y se avisa a todos los procesos'],
  ];
  return (
    <section className="panel envio-auto" aria-label="Envío automático">
      <div className="panel-header"><div><h2>Envío automático</h2><p className="sub">Los correos salen solos; aquí ves si todo está en marcha.</p></div></div>
      <div className={`aviso ${mensajes[0]}`} role="status" style={{ marginTop: 0 }}><i className={`fa-solid ${mensajes[1]}`} /><span>{mensajes[2]}</span></div>
      <ul className="envio-proximos">
        {filas.map(([ic, t, d, quien]) => {
          const f = proximaFecha(d, hoy); const hoyEs = f.toDateString() === hoy.toDateString();
          return (
            <li key={t}><i className={`fa-solid ${ic}`} aria-hidden="true" /><div><b>{t}</b><small>{quien}</small></div>
              <span className={`envio-fecha${hoyEs ? ' hoy' : ''}`}>{hoyEs ? 'Hoy' : fechaLarga(f)}<small>día {d} del mes</small></span></li>
          );
        })}
      </ul>
      <p className="texto-tenue" style={{ fontSize: 12.5 }}>
        Último recordatorio enviado: <strong>{cfg.ultimo_envio_auto ? new Date(`${cfg.ultimo_envio_auto}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : 'todavía ninguno'}</strong>.
        Si el despertador falla un día, la aplicación recupera el envío al día siguiente; un mes que reabras a mano no se vuelve a cerrar solo.
      </p>
    </section>
  );
}

function PestanaNotificaciones() {
  const [form, setForm] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [procesos, setProcesos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [libre, setLibre] = useState({ titulo: '', mensaje: '', procesoId: '' });
  const [correoPrueba, setCorreoPrueba] = useState('');
  const [logo, setLogo] = useState(null);
  const [revisandoLogo, setRevisandoLogo] = useState(false);

  async function cargar() {
    try {
      const [cfg, hist, procs] = await Promise.all([
        getConfiguracionNotificaciones(), getHistorialNotificaciones(30), getProcesos(),
      ]);
      setForm(cfg); setHistorial(hist); setProcesos(procs);
    } catch (err) { setError(traducirError(err)); }
  }
  useEffect(() => { cargar(); }, []);

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true); setMensaje(null); setError(null);
    try { await guardarConfiguracionNotificaciones(form); setMensaje('Configuración guardada.'); await cargar(); }
    catch (err) { setError(traducirError(err)); } finally { setGuardando(false); }
  }

  const [porEnviar, setPorEnviar] = useState(null);
  const TEXTOS_ENVIO = {
    recordatorio: { titulo: '¿Enviar el recordatorio ahora?', boton: 'Enviar recordatorio', peligro: false,
      texto: 'Se enviará un correo real a los involucrados de cada proceso que tenga indicadores pendientes del mes anterior. Solo lo reciben quienes tienen los avisos activados.' },
    dos_dias: { titulo: '¿Enviar el aviso de 2 días ahora?', boton: 'Enviar aviso', peligro: false,
      texto: 'Se enviará un correo real a los involucrados de cada proceso que aún tenga indicadores sin registrar, avisando que el mes está por cerrar.' },
    cierre: { titulo: '¿Cerrar el mes anterior y avisar?', boton: 'Cerrar y avisar', peligro: true,
      texto: 'El mes anterior quedará bloqueado para todos hasta que lo reabras en Cierres mensuales, y se enviará un correo a los involucrados de cada proceso.' },
  };

  async function probar(accion) {
    setEnviando(true); setMensaje(null); setError(null);
    try {
      const res = await enviarRecordatorioAhora({ accion });
      const d = describirEnvio(res);
      if (d.tipo === 'error') setError(d.texto); else setMensaje(d.texto);
      await cargar();
    } catch (err) { setError(traducirError(err)); } finally { setEnviando(false); setPorEnviar(null); }
  }

  async function revisarLogo() {
    setRevisandoLogo(true); setMensaje(null); setError(null);
    try {
      const r = await verificarLogoCorreo();
      setLogo(r);
      setMensaje(r.accesible ? 'El logo quedó publicado y es accesible: los correos lo mostrarán.' : 'El logo se publicó, pero no respondió al comprobarlo. Revisa el enlace de abajo en tu navegador.');
    } catch (err) { setError(traducirError(err)); } finally { setRevisandoLogo(false); }
  }

  async function enviarPrueba() {
    setEnviando(true); setMensaje(null); setError(null);
    try {
      const res = await enviarRecordatorioAhora({ accion: 'prueba', destinatarios: correoPrueba ? [correoPrueba] : undefined });
      setMensaje(`Correo de prueba enviado a ${res.destino}. Revisa la bandeja (y la carpeta de spam).`);
      await cargar();
    } catch (err) { setError(traducirError(err)); } finally { setEnviando(false); }
  }

  async function enviarLibre(e) {
    e.preventDefault();
    if (!libre.titulo.trim() || !libre.mensaje.trim()) { setError('Escribe el asunto y el mensaje.'); return; }
    setEnviando(true); setMensaje(null); setError(null);
    try {
      const res = await enviarRecordatorioAhora({ accion: 'libre', titulo: libre.titulo, mensaje: libre.mensaje, procesoId: libre.procesoId || null });
      setMensaje(res.resultado === 'sin_destinatarios' ? 'No hay correos configurados para ese destino.' : `Correo enviado a ${res.destinatarios} persona(s).`);
      setLibre({ titulo: '', mensaje: '', procesoId: '' });
      await cargar();
    } catch (err) { setError(traducirError(err)); } finally { setEnviando(false); }
  }

  if (!form) return <Cargando filas={4} />;
  const campoFirma = (campo, etiqueta, placeholder) => (
    <label key={campo}>{etiqueta}
      <input value={form[campo] || ''} placeholder={placeholder} onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))} />
    </label>
  );

  return (
    <>
      {error && <div className="alert danger">{error}</div>}
      {mensaje && <div className="aviso aviso-ok" style={{ marginBottom: 14 }}><i className="fa-solid fa-circle-check"></i><span>{mensaje}</span></div>}

      <section className="panel">
        <div className="panel-header"><h2>Calendario de correos automáticos</h2></div>
        <p style={{ marginTop: 0 }}>
          Se envían solos, en hora de Colombia: el <strong>día {form.dia_envio}</strong> se recuerda diligenciar el mes anterior a
          <strong> todos los procesos</strong>; <strong>dos días antes del cierre</strong> se avisa a quienes aún tienen pendientes; y el
          <strong> día {form.dia_cierre}</strong> el mes se cierra y se notifica a <strong>todos</strong>.
        </p>
        <form className="ind-form-inline" onSubmit={guardar}>
          <label>Día del recordatorio
            <input type="number" min={1} max={28} value={form.dia_envio} onChange={e => setForm(f => ({ ...f, dia_envio: Number(e.target.value) }))} />
          </label>
          <label>Día del cierre
            <input type="number" min={3} max={28} value={form.dia_cierre} onChange={e => setForm(f => ({ ...f, dia_cierre: Number(e.target.value) }))} />
          </label>
          <label className="ind-check"><input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} /> Envíos activos</label>
          <button className="btn-primary" disabled={guardando} type="submit">{guardando ? 'Guardando…' : 'Guardar'}</button>
        </form>
        {form.dia_envio === form.dia_cierre && (
          <div className="aviso aviso-alerta" style={{ marginTop: 12 }}>
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>El día del recordatorio y el del cierre son el mismo ({form.dia_envio}). Se recomienda el <strong>2</strong> para recordar y el <strong>12</strong> para cerrar, así el equipo tiene plazo.</span>
          </div>
        )}
        <div className="ind-proceso-acciones">
          <button className="btn-secondary" disabled={enviando} onClick={() => setPorEnviar('recordatorio')}><i className="fa-solid fa-paper-plane"></i> Enviar recordatorio ahora</button>
          <button className="btn-secondary" disabled={enviando} onClick={() => setPorEnviar('dos_dias')}><i className="fa-solid fa-hourglass-half"></i> Enviar aviso de 2 días</button>
          <button className="btn-secondary" disabled={enviando} onClick={() => setPorEnviar('cierre')}><i className="fa-solid fa-lock"></i> Cerrar mes y avisar</button>
        </div>
        <div className="aviso aviso-info" style={{ marginTop: 12 }}>
          <i className="fa-solid fa-circle-info"></i>
          <span>Los correos automáticos de los días {form.dia_envio} y {form.dia_cierre} llegan a todos los procesos que tengan correos en Involucrados. Los envíos manuales de aquí y el aviso de 2 días solo salen cuando hay algo pendiente que reportar.</span>
        </div>
      </section>

      <EnvioAutomatico cfg={form} />

      <section className="panel">
        <div className="panel-header"><h2>Comprobar que el envío funciona</h2></div>
        <p style={{ marginTop: 0 }}>Este correo se envía siempre, sin importar si hay pendientes. Úsalo para confirmar que el proveedor de correo está bien configurado.</p>
        <div className="ind-form-inline">
          <label style={{ minWidth: 260, flex: 1 }}>Enviar prueba a
            <input type="email" placeholder={form.firma_email || 'tu-correo@falconfarms.com.co'} value={correoPrueba} onChange={e => setCorreoPrueba(e.target.value)} />
          </label>
          <button className="btn-primary" disabled={enviando} onClick={enviarPrueba}>
            <i className="fa-solid fa-vial"></i> {enviando ? 'Enviando…' : 'Enviar correo de prueba'}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Logo de los correos</h2></div>
        <p style={{ marginTop: 0 }}>
          El logo se publica automáticamente en tu Supabase la primera vez que se envía un correo.
          Si en Outlook o Gmail no se ve, compruébalo aquí.
        </p>
        <div className="ind-proceso-acciones">
          <button className="btn-secondary" onClick={revisarLogo} disabled={revisandoLogo}>
            <i className="fa-solid fa-image"></i> {revisandoLogo ? 'Comprobando…' : 'Publicar y comprobar logo'}
          </button>
        </div>
        {logo?.logoUrl && (
          <div className="bloque-logo">
            <img src={logo.logoUrl} alt="Logo publicado" />
            <div>
              <span className={`chip-ind ${logo.accesible ? 'chip-ind-ok' : 'chip-ind-no'}`}>
                {logo.accesible ? 'Accesible' : 'No responde'}
              </span>
              <a href={logo.logoUrl} target="_blank" rel="noreferrer" className="enlace-logo">{logo.logoUrl}</a>
              <small>{typeof logo.iconos === 'number' ? `Se publicaron el logo y ${logo.iconos} de 4 iconos de contacto. ` : ''}Si la imagen de arriba se ve, los correos también la mostrarán (en Outlook puede que haya que permitir la descarga de imágenes).</small>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Firma de los correos</h2></div>
        <p style={{ marginTop: 0 }}>Los correos salen firmados solo con el cargo (sin nombre de persona), junto al logo de Falcon Farms y estos datos de contacto.</p>
        <div className="config-grid-form">
          {campoFirma('firma_cargo', 'Cargo (aparece en negrita)', 'Analista Gestión Integral')}
          {campoFirma('firma_cargo2', 'Segundo cargo (opcional)', 'Jefe de Seguridad')}
          {campoFirma('firma_telefono', 'Teléfono fijo', '(426) 8920 Ext. 3222')}
          {campoFirma('firma_celular', 'Celular', '(314) 588-0851')}
          {campoFirma('firma_email', 'Correo', 'edgar.garciaa@falconfarms.com.co')}
          {campoFirma('firma_ubicacion', 'Ubicación', 'Finca Torremolinos, Suesca – Colombia')}
        </div>
        <div className="ind-proceso-acciones">
          <button className="btn-primary" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar firma'}</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Escribir un correo</h2></div>
        <p style={{ marginTop: 0 }}>Redacta un mensaje libre; se envía con el mismo encabezado y la misma firma que los automáticos.</p>
        <form onSubmit={enviarLibre} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
          <div className="ind-form-fila">
            <label style={{ flex: 2 }}>Asunto
              <input value={libre.titulo} placeholder="Ej: Reunión de revisión de indicadores" onChange={e => setLibre(l => ({ ...l, titulo: e.target.value }))} />
            </label>
            <label style={{ flex: 1 }}>Enviar a
              <select value={libre.procesoId} onChange={e => setLibre(l => ({ ...l, procesoId: e.target.value }))}>
                <option value="">Todos los procesos</option>
                {procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--tinta-media)' }}>
            Mensaje
            <textarea rows={7} value={libre.mensaje} placeholder={'Escribe aquí el mensaje.\n\nDeja una línea en blanco para separar párrafos.'}
              onChange={e => setLibre(l => ({ ...l, mensaje: e.target.value }))}
              style={{ padding: '10px 12px', border: '1px solid var(--borde)', borderRadius: 'var(--r-sm)', fontWeight: 400, resize: 'vertical' }} />
          </label>
          <div>
            <button className="btn-primary" type="submit" disabled={enviando}><i className="fa-solid fa-paper-plane"></i> {enviando ? 'Enviando…' : 'Enviar correo'}</button>
          </div>
        </form>
      </section>

      {historial.length > 0 && (
        <section className="panel">
          <div className="panel-header"><h2>Últimos envíos</h2></div>
          <div className="tabla-scroll"><table>
            <thead><tr><th>Fecha</th><th>Proceso</th><th>Tipo</th><th>Resultado</th></tr></thead>
            <tbody>
              {historial.map(h => (
                <tr key={h.id}>
                  <td>{new Date(h.enviado_en).toLocaleString('es-CO')}</td>
                  <td>{h.indicadores_procesos?.nombre || 'Todos'}</td>
                  <td>{h.modo}</td>
                  <td><span className={`chip-ind ${h.resultado === 'enviado' ? 'chip-ind-ok' : h.resultado === 'error' ? 'chip-ind-no' : 'chip-ind-pendiente'}`}>{h.resultado}</span></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>
      )}
      {porEnviar && (
        <Confirmar
          titulo={TEXTOS_ENVIO[porEnviar].titulo} texto={TEXTOS_ENVIO[porEnviar].texto}
          textoBoton={TEXTOS_ENVIO[porEnviar].boton} peligro={TEXTOS_ENVIO[porEnviar].peligro} cargando={enviando}
          onConfirmar={() => probar(porEnviar)} onCancelar={() => setPorEnviar(null)}
        />
      )}
    </>
  );
}

function PestanaUsuarios() {
  const { sesion } = useSesion();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  async function cargar() {
    setCargando(true); setError(null);
    try {
      const { data, error } = await supabase.from('indicadores_usuarios').select('*').order('creado_en');
      if (error) throw error;
      setUsuarios(data || []);
    } catch (err) { setError(traducirError(err)); } finally { setCargando(false); }
  }
  useEffect(() => { cargar(); }, []);

  async function cambiarRol(u, rol) {
    setAviso(null); setError(null);
    try {
      const { error } = await supabase.from('indicadores_usuarios').update({ rol }).eq('user_id', u.user_id);
      if (error) throw error;
      setAviso(`${u.email || 'La cuenta'} ahora es ${ROLES[rol].nombre}.`);
      avisar(`Rol actualizado: ${ROLES[rol].nombre}.`, { tipo: 'ok' });
      await cargar();
    } catch (err) { setError(traducirError(err)); }
  }

  return (
    <>
      <section className="panel">
        <div className="panel-header"><h2>Qué puede hacer cada rol</h2></div>
        <ul className="roles-lista">
          {Object.entries(ROLES).map(([k, r]) => (
            <li key={k}><span className={`chip-ind ${k === 'admin' ? 'chip-ind-ok' : k === 'digitador' ? 'chip-ind-pendiente' : ''}`} style={k === 'usuario' ? { background: 'var(--line-soft)', color: 'var(--ink-2)' } : undefined}>{r.nombre}</span><p>{r.descripcion}</p></li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <div className="panel-header"><h2>Usuarios</h2></div>
        <p style={{ marginTop: 0 }}>Para agregar una persona nueva: créala primero en Supabase → Authentication → Users, y luego agrégala en Supabase → Table Editor → <code>indicadores_usuarios</code> (user_id = el id de esa cuenta). Desde aquí cambias su rol.</p>
        {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation"></i><span>{error}</span></div>}
        {aviso && <div className="aviso aviso-ok" role="status"><i className="fa-solid fa-circle-check"></i><span>{aviso}</span></div>}
        {cargando ? <Cargando filas={4} /> : (
          <div className="tabla-scroll"><table className="tabla-apilable">
            <thead><tr><th>Correo</th><th>Rol</th></tr></thead>
            <tbody>
              {usuarios.length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--ink-3)' }}>Todavía no hay usuarios en esta tabla.</td></tr>}
              {usuarios.map(u => {
                const yo = u.email && u.email === sesion?.email;
                return (
                  <tr key={u.user_id}>
                    <td className="celda-principal">{u.email || u.user_id}{yo && <span className="texto-tenue"> (tú)</span>}</td>
                    <td data-label="Rol">
                      <select aria-label={`Rol de ${u.email || u.user_id}`} value={u.rol} disabled={yo} title={yo ? 'No puedes cambiar tu propio rol para no quedarte sin acceso' : undefined} onChange={e => cambiarRol(u, e.target.value)}>
                        {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.nombre}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </section>
    </>
  );
}

export default function Configuracion() {
  const [tab, setTab] = useState('indicadores');
  return (
    <div className="page">
      <PageHeader
        migas={[{ texto: 'Administración' }, { texto: 'Configuración' }]}
        titulo="Configuración"
        descripcion="Catálogo de indicadores, cierre de meses, correos automáticos y usuarios."
      />
      <div className="config-tabs" role="tablist" aria-label="Secciones de configuración">
        {PESTANAS.map(p => (
          <button key={p.id} role="tab" aria-selected={tab === p.id} className={`config-tab ${tab === p.id ? 'config-tab-activa' : ''}`} onClick={() => setTab(p.id)}>
            <i className={`fa-solid ${p.icono}`} aria-hidden="true"></i> {p.label}
          </button>
        ))}
      </div>
      {tab === 'indicadores' && <PestanaIndicadores />}
      {tab === 'cierres' && <PestanaCierres />}
      {tab === 'notificaciones' && <PestanaNotificaciones />}
      {tab === 'usuarios' && <PestanaUsuarios />}
    </div>
  );
}
