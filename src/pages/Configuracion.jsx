import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useSesion } from '../lib/useSesion';
import PageHeader from '../components/PageHeader';
import { avisar } from '../lib/toast';
import { crearUsuario, cambiarClaveDeUsuario, quitarUsuario, generarClave } from '../lib/usuarios';
import { traducirError } from '../lib/indicadores';
import Dialogo, { Confirmar } from '../components/Dialogo';
import {
  getProcesos, getIndicadores, actualizarIndicador, actualizarProceso, crearIndicador, desactivarIndicador, ROLES, formatearMetaMensual,
  getCierresDelAnio, reabrirMes, cerrarMes, enviarRecordatorioAhora, estaCerrado, mesVencido, verificarLogoCorreo,
  getConfiguracionNotificaciones, guardarConfiguracionNotificaciones, getHistorialNotificaciones, describirEnvio,
  mesReporteActual, MESES, MESES_CORTO, formatearMeta, esPorcentaje, entradaAValor, valorAEntrada,
} from '../lib/indicadores';
import FormularioIndicador from '../components/EditorIndicador';

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


function PestanaIndicadores() {
  const [procesos, setProcesos] = useState([]);
  const [indicadoresPorProceso, setIndicadoresPorProceso] = useState(new Map());
  const [editando, setEditando] = useState(null);
  const [nuevoEn, setNuevoEn] = useState(null);
  const [params, setParams] = useSearchParams();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  // desde el botón «+»: «Crear un indicador» llega aquí con ?nuevo=1 y abre directamente el formulario
  useEffect(() => { if (params.get('nuevo') && procesos.length) { setNuevoEn(procesos[0].id); setParams({}, { replace: true }); } }, [params, procesos.length]); // eslint-disable-line
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
          <div className="tabla-scroll" tabIndex={0} role="region" aria-label="Tabla desplazable: usa las flechas del teclado para moverte"><table>
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

  const [diaCierre, setDiaCierre] = useState(15);
  useEffect(() => { getConfiguracionNotificaciones().then(c => setDiaCierre(c?.dia_cierre ?? 15)).catch(() => {}); }, []);
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
        Los meses se cierran <strong>solos</strong> cada mes se puede registrar hasta el día {diaCierre} de ese mismo mes (inclusive) y desde el día {diaCierre + 1} queda bloqueado,
        y los meses que ya pasaron están cerrados siempre. Solo un administrador puede reabrirlos desde aquí.
      </p>
      {error && <div className="alert danger">{error}</div>}
      {mensaje && <div className="alert-inline"><i className="fa-solid fa-circle-info"></i>{mensaje}</div>}
      {cargando ? <Cargando filas={4} /> : (
        <div className="tabla-scroll" tabIndex={0} role="region" aria-label="Tabla desplazable: usa las flechas del teclado para moverte"><table>
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
  const ultimo = cfg.dia_cierre ?? 15;      // último día para registrar
  const cierre = ultimo + 1;               // el día que el mes queda bloqueado
  const aviso = Math.max(1, ultimo - 2);
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
    ['fa-envelope', 'Recordatorio del mes en curso', cfg.dia_envio, 'A todos los procesos, con el resumen de cómo va el mes'],
    ['fa-hourglass-half', 'Faltan 2 días para el último día', aviso, 'Solo a los procesos que todavía tienen pendientes'],
    ['fa-lock', 'Cierre del mes', cierre, `El mes queda bloqueado (se pudo registrar hasta el ${ultimo}) y se avisa a todos los procesos`],
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
      texto: 'Se enviará un correo real a los involucrados de cada proceso que tenga indicadores pendientes del mes en curso. Solo lo reciben quienes tienen los avisos activados.' },
    dos_dias: { titulo: '¿Enviar el aviso de 2 días ahora?', boton: 'Enviar aviso', peligro: false,
      texto: 'Se enviará un correo real a los involucrados de cada proceso que aún tenga indicadores sin registrar, avisando que el mes está por cerrar.' },
    cierre: { titulo: '¿Cerrar el mes en curso y avisar?', boton: 'Cerrar y avisar', peligro: true,
      texto: 'El mes en curso quedará bloqueado para todos hasta que lo reabras en Cierres mensuales, y se enviará un correo a los involucrados de cada proceso.' },
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
          Se envían solos, en hora de Colombia: el <strong>día {form.dia_envio}</strong> se recuerda diligenciar el mes en curso a
          <strong> todos los procesos</strong>; <strong>dos días antes del último día</strong> se avisa a quienes aún tienen pendientes; y el
          <strong> día {form.dia_cierre + 1}</strong> el mes se cierra y se notifica a <strong>todos</strong>. Se puede registrar hasta el día {form.dia_cierre}, inclusive.
        </p>
        <form className="ind-form-inline" onSubmit={guardar}>
          <label>Día del recordatorio
            <input type="number" min={1} max={28} value={form.dia_envio} onChange={e => setForm(f => ({ ...f, dia_envio: Number(e.target.value) }))} />
          </label>
          <label>Último día para registrar
            <input type="number" min={3} max={28} value={form.dia_cierre} onChange={e => setForm(f => ({ ...f, dia_cierre: Number(e.target.value) }))} />
          </label>
          <label className="ind-check"><input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} /> Envíos activos</label>
          <button className="btn-primary" disabled={guardando} type="submit">{guardando ? 'Guardando…' : 'Guardar'}</button>
        </form>
        {form.dia_envio === form.dia_cierre && (
          <div className="aviso aviso-alerta" style={{ marginTop: 12 }}>
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>El día del recordatorio y el del cierre son el mismo ({form.dia_envio}). Se recomienda el <strong>2</strong> para recordar y el <strong>15</strong> como último día para registrar, así el equipo tiene plazo.</span>
          </div>
        )}
        <div className="ind-proceso-acciones">
          <button className="btn-secondary" disabled={enviando} onClick={() => setPorEnviar('recordatorio')}><i className="fa-solid fa-paper-plane"></i> Enviar recordatorio ahora</button>
          <button className="btn-secondary" disabled={enviando} onClick={() => setPorEnviar('dos_dias')}><i className="fa-solid fa-hourglass-half"></i> Enviar aviso de 2 días</button>
          <button className="btn-secondary" disabled={enviando} onClick={() => setPorEnviar('cierre')}><i className="fa-solid fa-lock"></i> Cerrar mes y avisar</button>
        </div>
        <div className="aviso aviso-info" style={{ marginTop: 12 }}>
          <i className="fa-solid fa-circle-info"></i>
          <span>Los correos automáticos de los días {form.dia_envio} y {form.dia_cierre + 1} llegan a todos los procesos que tengan correos en Involucrados. Los envíos manuales de aquí y el aviso de 2 días solo salen cuando hay algo pendiente que reportar.</span>
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
          <div className="tabla-scroll" tabIndex={0} role="region" aria-label="Tabla desplazable: usa las flechas del teclado para moverte"><table>
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
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'digitador' });
  const [creando, setCreando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);
  const [creado, setCreado] = useState(null);       // datos de acceso que se muestran UNA vez
  const [copiado, setCopiado] = useState(false);
  const [paraClave, setParaClave] = useState(null); // usuario al que se le cambia la contraseña
  const [paraQuitar, setParaQuitar] = useState(null);

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

  async function cambiarNombreDe(u, nombre) {
    setAviso(null); setError(null);
    try {
      const { error } = await supabase.from('indicadores_usuarios').update({ nombre: nombre || null }).eq('user_id', u.user_id);
      if (error) throw error;
      avisar(nombre ? 'Nombre guardado.' : 'Nombre quitado.', { tipo: 'ok' });
      await cargar();
      if (yoMismo(u)) window.dispatchEvent(new Event('tm:sesion-cambio'));
    } catch (err) { setError(traducirError(err)); }
  }
  const yoMismo = u => u.user_id === sesion?.id;

  async function crear(e) {
    e.preventDefault();
    setErrorForm(null); setCreado(null); setCopiado(false);
    const email = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setErrorForm('Escribe un correo válido.'); return; }
    if (form.password.length < 8) { setErrorForm('La contraseña debe tener al menos 8 caracteres. Puedes generar una.'); return; }
    setCreando(true);
    try {
      const r = await crearUsuario({ email, password: form.password, rol: form.rol, nombre: form.nombre });
      setCreado({ email, password: r.adoptado ? null : form.password, rol: form.rol, adoptado: !!r.adoptado });
      setForm({ nombre: '', email: '', password: '', rol: form.rol });
      avisar(r.adoptado ? 'La cuenta ya existía: se agregó con su rol.' : 'Usuario creado.', { tipo: 'ok', celebrar: !r.adoptado });
      await cargar();
    } catch (err) { setErrorForm(err.message); } finally { setCreando(false); }
  }

  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2500); }
    catch { setCopiado(false); }
  }

  const textoAcceso = c => `Sistema de Gestión de Finca Torremolinos\nCorreo: ${c.email}\nContraseña temporal: ${c.password}\nAl entrar, cámbiala desde tu nombre, arriba a la derecha.`;

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

      <section className="panel" aria-labelledby="crear-usuario">
        <div className="panel-header"><div><h2 id="crear-usuario">Crear usuario</h2><p className="sub">La cuenta queda lista para entrar de inmediato, con el rol que elijas.</p></div></div>
        <form className="form-usuario" onSubmit={crear} noValidate>
          <label>Nombre <span className="texto-tenue">(opcional)</span>
            <input type="text" name="nombre-nuevo" autoComplete="off" maxLength={90} placeholder="Nombre y apellido…" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </label>
          <label>Correo
            <input type="email" name="correo-nuevo" autoComplete="off" spellCheck={false} inputMode="email" placeholder="nombre@falconfarms.com.co…" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </label>
          <label>Contraseña temporal
            <span className="campo-clave">
              <input type="text" name="clave-temporal" autoComplete="off" spellCheck={false} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 8 caracteres…" />
              <button type="button" className="btn-secondary" onClick={() => setForm(f => ({ ...f, password: generarClave() }))}><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Generar</button>
            </span>
          </label>
          <label>Rol
            <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
              {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.nombre}</option>)}
            </select>
            <small className="ayuda-campo">{ROLES[form.rol].descripcion}</small>
          </label>
          <div className="form-usuario-accion"><button type="submit" className="btn-primary" disabled={creando}>{creando ? 'Creando…' : 'Crear usuario'}</button></div>
        </form>
        {errorForm && <div className="alert danger" role="alert" style={{ marginTop: 12 }}><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{errorForm}</span></div>}
        {creado && (
          <div className="acceso-creado" role="status">
            <div className="acceso-creado-cab"><i className="fa-solid fa-circle-check" aria-hidden="true"></i><strong>{creado.adoptado ? 'La cuenta ya existía y quedó agregada' : 'Usuario creado'}</strong></div>
            <dl>
              <div><dt>Correo</dt><dd>{creado.email}</dd></div>
              <div><dt>Rol</dt><dd>{ROLES[creado.rol].nombre}</dd></div>
              {creado.password ? <div><dt>Contraseña temporal</dt><dd className="clave-visible">{creado.password}</dd></div> : <div><dt>Contraseña</dt><dd>La misma que ya tenía</dd></div>}
            </dl>
            {creado.password
              ? <p className="ayuda-campo">Esta contraseña solo se muestra ahora. Entrégasela por un medio seguro; al entrar, la persona puede cambiarla desde su nombre, arriba a la derecha.</p>
              : <p className="ayuda-campo">No se tocó su contraseña. Si no la recuerda, usa «Nueva contraseña» en la lista.</p>}
            {creado.password && <button type="button" className="btn-secondary" onClick={() => copiar(textoAcceso(creado))}><i className={`fa-solid ${copiado ? 'fa-check' : 'fa-copy'}`} aria-hidden="true"></i> {copiado ? 'Copiado' : 'Copiar datos de acceso'}</button>}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Usuarios</h2></div>
        {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>}
        {aviso && <div className="aviso aviso-ok" role="status"><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>{aviso}</span></div>}
        {cargando ? <Cargando filas={4} /> : (
          <div className="tabla-scroll" tabIndex={0} role="region" aria-label="Tabla desplazable: usa las flechas del teclado para moverte"><table className="tabla-apilable">
            <thead><tr><th>Persona</th><th>Rol</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {usuarios.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--ink-3)' }}>Todavía no hay usuarios. Crea el primero arriba.</td></tr>}
              {usuarios.map(u => {
                const yo = u.email && u.email === sesion?.email;
                return (
                  <tr key={u.user_id}>
                    <td className="celda-principal">
                      <input className="nombre-en-linea" aria-label={`Nombre de ${u.email || u.user_id}`} defaultValue={u.nombre || ''} maxLength={90} placeholder="Sin nombre" key={`${u.user_id}-${u.nombre || ''}`}
                        onBlur={e => { const v = e.target.value.trim(); if (v !== (u.nombre || '')) cambiarNombreDe(u, v); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                      <small className="texto-tenue" translate="no">{u.email || u.user_id}{yo && ' (tú)'}</small>
                    </td>
                    <td data-label="Rol">
                      <select aria-label={`Rol de ${u.email || u.user_id}`} value={u.rol} disabled={yo} title={yo ? 'No puedes cambiar tu propio rol para no quedarte sin acceso' : undefined} onChange={e => cambiarRol(u, e.target.value)}>
                        {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.nombre}</option>)}
                      </select>
                    </td>
                    <td data-label="Acciones" className="celda-acciones">
                      <button type="button" className="btn-texto" onClick={() => setParaClave(u)} disabled={yo} title={yo ? 'Cambia tu contraseña desde tu nombre, arriba a la derecha' : undefined}><i className="fa-solid fa-key" aria-hidden="true"></i> Nueva contraseña<span className="sr-only"> de {u.email}</span></button>
                      <button type="button" className="btn-texto btn-peligro" onClick={() => setParaQuitar(u)} disabled={yo} title={yo ? 'No puedes quitarte el acceso a ti mismo' : undefined}><i className="fa-solid fa-user-xmark" aria-hidden="true"></i> Quitar acceso<span className="sr-only"> a {u.email}</span></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </section>

      {paraClave && <NuevaClaveDialogo usuario={paraClave} onCerrar={() => setParaClave(null)} />}
      {paraQuitar && (
        <Confirmar titulo={`¿Quitar el acceso a ${paraQuitar.email}?`} peligro textoBoton="Quitar acceso"
          texto="La persona ya no podrá entrar a la aplicación y su cuenta se borra. Los datos que registró se conservan. Esta acción no se puede deshacer."
          onCancelar={() => setParaQuitar(null)}
          onConfirmar={async () => {
            try { await quitarUsuario({ user_id: paraQuitar.user_id }); avisar('Acceso quitado.', { tipo: 'ok' }); setAviso(`Se quitó el acceso a ${paraQuitar.email}.`); await cargar(); }
            catch (err) { setError(err.message); } finally { setParaQuitar(null); }
          }} />
      )}
    </>
  );
}

/** Diálogo para ponerle una contraseña nueva a otra persona (el administrador se la entrega). */
function NuevaClaveDialogo({ usuario, onCerrar }) {
  const [clave, setClave] = useState(() => generarClave());
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [hecho, setHecho] = useState(false);
  const [copiado, setCopiado] = useState(false);
  async function guardar(e) {
    e.preventDefault(); setError(null);
    if (clave.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    setGuardando(true);
    try { await cambiarClaveDeUsuario({ user_id: usuario.user_id, password: clave }); setHecho(true); avisar('Contraseña cambiada.', { tipo: 'ok' }); }
    catch (err) { setError(err.message); } finally { setGuardando(false); }
  }
  async function copiar() { try { await navigator.clipboard.writeText(clave); setCopiado(true); setTimeout(() => setCopiado(false), 2500); } catch { setCopiado(false); } }
  return (
    <Dialogo titulo="Nueva contraseña" onCerrar={onCerrar} ancho={500}>
      <form className="form-dialogo" onSubmit={guardar} noValidate>
        <h2>Nueva contraseña</h2>
        <p style={{ marginTop: -6 }}>Para <strong>{usuario.email}</strong>.</p>
        {!hecho ? (
          <>
            <label>Contraseña temporal
              <span className="campo-clave">
                <input type="text" autoComplete="off" spellCheck={false} name="clave-nueva-usuario" value={clave} onChange={e => setClave(e.target.value)} />
                <button type="button" className="btn-secondary" onClick={() => setClave(generarClave())}><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Generar</button>
              </span>
            </label>
            <p className="ayuda-campo">Se la entregas a la persona; al entrar puede cambiarla desde su nombre, arriba a la derecha.</p>
            {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>}
            <div className="ind-modal-acciones">
              <button type="button" className="btn-secondary" onClick={onCerrar}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Cambiar contraseña'}</button>
            </div>
          </>
        ) : (
          <>
            <div className="aviso aviso-ok" role="status" style={{ marginTop: 0 }}><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Contraseña cambiada. Solo se muestra ahora:</span></div>
            <p className="clave-visible clave-grande">{clave}</p>
            <div className="ind-modal-acciones">
              <button type="button" className="btn-secondary" onClick={copiar}><i className={`fa-solid ${copiado ? 'fa-check' : 'fa-copy'}`} aria-hidden="true"></i> {copiado ? 'Copiada' : 'Copiar'}</button>
              <button type="button" className="btn-primary" onClick={onCerrar}>Listo</button>
            </div>
          </>
        )}
      </form>
    </Dialogo>
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
