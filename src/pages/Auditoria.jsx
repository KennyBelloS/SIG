import { etiquetaDeCorreo } from '../lib/acceso';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Cargando from '../components/Cargando';
import Dialogo from '../components/Dialogo';
import { avisar } from '../lib/toast';
import { supabase } from '../lib/supabaseClient';
import { proximaDepuracion } from '../lib/depuracion';
import { getAuditoria, getPresencia, getAlmacenamiento, guardarLimiteAlmacenamiento, traducirError } from '../lib/indicadores';

const TIPOS = {
  registro: { texto: 'Registros', icono: 'fa-pen-to-square', color: 'var(--f-800)' },
  catalogo: { texto: 'Catálogo', icono: 'fa-list-check', color: '#2E6DA4' },
  cierre: { texto: 'Cierres de mes', icono: 'fa-lock', color: 'var(--gold-ink)' },
  usuario: { texto: 'Usuarios', icono: 'fa-user-gear', color: '#6B4C9A' },
  configuracion: { texto: 'Configuración', icono: 'fa-sliders', color: 'var(--ink-2)' },
  involucrado: { texto: 'Involucrados', icono: 'fa-envelope', color: 'var(--ink-2)' },
  importacion: { texto: 'Importaciones', icono: 'fa-file-import', color: 'var(--wine)' },
  acceso: { texto: 'Accesos', icono: 'fa-door-open', color: 'var(--f-800)' },
};
const VERBO = { crear: 'creó', editar: 'editó', eliminar: 'eliminó', cerrar: 'cerró', reabrir: 'reabrió', importar: 'importó', ingreso: 'entró a la aplicación', salida: 'salió de la aplicación' };
const CAMPO = {
  valor: 'Resultado', analisis: 'Análisis', accion: 'Plan de acción', causa: 'Causa', responsable_accion: 'Responsable del plan', fecha_compromiso: 'Fecha compromiso', componentes: 'Números del cálculo',
  meta_anual: 'Meta anual', meta_mensual: 'Meta mensual', metas_mensuales: 'Metas por mes', tipo_meta: 'Meta que rige', sentido_meta: 'Sentido de la meta', calculo: 'Forma de cálculo', objetivo: 'Objetivo', nombre: 'Nombre', unidad_medida: 'Unidad',
  rol: 'Rol', email: 'Correo', cerrado: 'Cerrado', activo: 'Activo', dia_envio: 'Día del recordatorio', dia_cierre: 'Último día para registrar', almacenamiento_limite_mb: 'Límite de almacenamiento (MB)', notificar: 'Recibe avisos', cargo: 'Cargo', historico: 'Histórico',
};
const PANTALLAS = { '/dashboard': 'Dashboard', '/matriz': 'Matriz', '/indicadores': 'Indicadores', '/informe': 'Informe mensual', '/importar': 'Importar Excel', '/novedades': 'Novedades', '/configuracion': 'Configuración', '/bitacora': 'Bitácora', '/ayuda': 'Cómo se usa' };
const pantalla = p => (p?.startsWith('/indicadores/') ? 'Ficha de un indicador' : PANTALLAS[p] || p || '—');
const NOMBRE_TABLA = { indicadores_registros: 'Registros mensuales', indicadores_auditoria: 'Bitácora', indicadores: 'Catálogo de indicadores', indicadores_notificaciones: 'Correos enviados', indicadores_involucrados: 'Involucrados', indicadores_usuarios: 'Usuarios', indicadores_cierres: 'Cierres de mes', indicadores_configuracion: 'Configuración', indicadores_presencia: 'En línea', indicadores_procesos: 'Procesos' };
const COLORES = ['var(--f-800)', 'var(--gold)', '#2E6DA4', 'var(--wine)', '#6B4C9A', '#5F7A6B', '#C9C5B3'];
const PERIODOS = [['hoy', 'Hoy'], ['7', 'Últimos 7 días'], ['30', 'Últimos 30 días'], ['todo', 'Todo el historial']];

const rel = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
function hace(iso) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000, a = Math.abs(s);
  if (a < 45) return 'hace unos segundos';
  if (a < 3600) return rel.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rel.format(Math.round(s / 3600), 'hour');
  return rel.format(Math.round(s / 86400), 'day');
}
const exacta = iso => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const desdeISO = clave => { if (clave === 'todo') return null; const d = new Date(); if (clave === 'hoy') d.setHours(0, 0, 0, 0); else d.setDate(d.getDate() - Number(clave)); return d.toISOString(); };
const mb = b => (b / 1048576).toLocaleString('es-CO', { maximumFractionDigits: b < 1048576 * 10 ? 2 : 1 });
const quien = e => e.nombre || etiquetaDeCorreo(e.email) || 'Alguien';
function valorLegible(v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k}: ${x}`).join(', ');
  const t = String(v); return t.length > 180 ? `${t.slice(0, 180)}…` : t;
}

function Evento({ e }) {
  const [abierto, setAbierto] = useState(false);
  const t = TIPOS[e.tipo] || TIPOS.configuracion;
  const campos = useMemo(() => {
    const llaves = new Set([...Object.keys(e.antes || {}), ...Object.keys(e.despues || {})]);
    return [...llaves].filter(k => !['id', 'creado_en', 'registrado_en', 'actualizado_en', 'registrado_por', 'indicador_id', 'plan_sugerido'].includes(k)).map(k => ({ k, antes: e.antes?.[k], despues: e.despues?.[k] }));
  }, [e]);
  return (
    <li className="aud-evento">
      <span className="aud-icono" style={{ '--c': t.color }} aria-hidden="true"><i className={`fa-solid ${t.icono}`}></i></span>
      <div className="aud-cuerpo">
        <p><strong translate="no">{quien(e)}</strong> {VERBO[e.accion] || e.accion}{e.tipo !== 'acceso' && <> <span className="aud-resumen">{e.resumen}</span></>}</p>
        <p className="aud-meta"><time dateTime={e.creado_en} title={exacta(e.creado_en)}>{hace(e.creado_en)}</time> <span className="aud-tipo">{t.texto}</span>{e.nombre && e.email && <span translate="no"> {e.email}</span>}</p>
        {campos.length > 0 && (
          <>
            <button type="button" className="btn-texto aud-ver" aria-expanded={abierto} onClick={() => setAbierto(a => !a)}>{abierto ? 'Ocultar los cambios' : `Ver los cambios (${campos.length})`}</button>
            {abierto && (
              <table className="aud-diff"><caption className="sr-only">Cambios de este evento</caption>
                <thead><tr><th>Campo</th><th>Antes</th><th>Después</th></tr></thead>
                <tbody>{campos.map(c => <tr key={c.k}><th scope="row">{CAMPO[c.k] || c.k}</th><td className={e.accion === 'crear' ? 'aud-vacio' : 'aud-antes'}>{valorLegible(c.antes)}</td><td className="aud-despues">{valorLegible(c.despues)}</td></tr>)}</tbody>
              </table>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function Actividad({ periodo, setPeriodo }) {
  const [tipo, setTipo] = useState('todos');
  const [persona, setPersona] = useState('todas');
  const [texto, setTexto] = useState('');
  const [limite, setLimite] = useState(60);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const cargar = useCallback(async () => {
    setError(null);
    try { setDatos(await getAuditoria({ tipos: tipo === 'todos' ? null : [tipo], desde: desdeISO(periodo), limite })); }
    catch (e) { setError(traducirError(e)); setDatos([]); }
  }, [tipo, periodo, limite]);
  useEffect(() => { setDatos(null); cargar(); }, [cargar]);
  const personas = useMemo(() => [...new Set((datos || []).map(e => e.email).filter(Boolean))].sort(), [datos]);
  const vistos = useMemo(() => (datos || []).filter(e => (persona === 'todas' || e.email === persona) && (!texto.trim() || `${e.resumen} ${e.email} ${e.nombre || ''}`.toLowerCase().includes(texto.trim().toLowerCase()))), [datos, persona, texto]);

  const descargar = () => exportarBitacora(vistos);

  return (
    <>
      <div className="barra-filtros" role="search" aria-label="Filtrar la actividad">
        <label>Clase<select value={tipo} onChange={e => setTipo(e.target.value)}><option value="todos">Todas</option>{Object.entries(TIPOS).filter(([k]) => k !== 'acceso').map(([k, t]) => <option key={k} value={k}>{t.texto}</option>)}</select></label>
        <label>Persona<select value={persona} onChange={e => setPersona(e.target.value)}><option value="todas">Todas</option>{personas.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
        <label>Periodo<select value={periodo} onChange={e => setPeriodo(e.target.value)}>{PERIODOS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
        <label className="aud-buscar">Buscar<input type="search" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Un indicador, una persona…" /></label>
        <button type="button" className="btn-secondary" onClick={descargar} disabled={!vistos.length}><i className="fa-solid fa-file-excel" aria-hidden="true"></i> Descargar Excel</button>
      </div>
      {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>}
      <section className="panel" aria-labelledby="aud-titulo">
        <div className="panel-header"><div><h2 id="aud-titulo">Actividad</h2><p className="sub">{datos ? `${vistos.length} cambio${vistos.length === 1 ? '' : 's'}${vistos.length !== datos.length ? ` de ${datos.length} cargados` : ''}. Lo más reciente primero.` : 'Cargando…'}</p></div></div>
        {datos === null ? <Cargando filas={5} alto={64} /> : vistos.length === 0 ? (
          <div className="estado-vacio"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true"></i><h3>Todavía no hay cambios con ese filtro</h3><p>Cuando alguien registre un dato, cambie un indicador o reabra un mes, aparecerá aquí con su nombre y la hora.</p></div>
        ) : (
          <ol className="aud-lista">{vistos.map(e => <Evento key={e.id} e={e} />)}</ol>
        )}
        {datos && datos.length >= limite && <div className="aud-mas"><button type="button" className="btn-secondary" onClick={() => setLimite(l => l + 60)}>Cargar 60 más</button></div>}
      </section>
    </>
  );
}

function Accesos({ periodo, setPeriodo }) {
  const [presencia, setPresencia] = useState(null);
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState(null);
  const cargar = useCallback(async () => {
    try {
      const [p, e] = await Promise.all([getPresencia(), getAuditoria({ soloAccesos: true, desde: desdeISO(periodo), limite: 120 })]);
      setPresencia(p); setEventos(e); setError(null);
    } catch (err) { setError(traducirError(err)); setPresencia([]); setEventos([]); }
  }, [periodo]);
  useEffect(() => { setEventos(null); cargar(); const t = setInterval(cargar, 30000); return () => clearInterval(t); }, [cargar]);
  const enLinea = (presencia || []).filter(p => Date.now() - new Date(p.ultima_actividad).getTime() < 3 * 60000);
  return (
    <>
      {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>}
      <section className="panel" aria-labelledby="aud-linea">
        <div className="panel-header"><div><h2 id="aud-linea">En línea ahora</h2><p className="sub">Se actualiza solo cada 30 segundos. Cuenta a quien tuvo actividad en los últimos 3 minutos.</p></div><span className="aud-pulso" aria-hidden="true"></span></div>
        {presencia === null ? <Cargando filas={2} /> : enLinea.length === 0 ? (
          <p className="aud-nadie">No hay nadie en línea en este momento.</p>
        ) : (
          <ul className="aud-linea">{enLinea.map(p => (
            <li key={p.user_id}><span className="aud-avatar" aria-hidden="true">{(p.nombre || p.email || '?').trim()[0].toUpperCase()}</span>
              <div><strong translate="no">{p.nombre || etiquetaDeCorreo(p.email)}</strong>{p.nombre && <small translate="no">{etiquetaDeCorreo(p.email)}</small>}<small>Está en <b>{pantalla(p.pantalla)}</b>, activo {hace(p.ultima_actividad)}</small></div></li>
          ))}</ul>
        )}
      </section>
      <section className="panel" aria-labelledby="aud-hist">
        <div className="panel-header"><div><h2 id="aud-hist">Entradas y salidas</h2><p className="sub">La salida se anota cuando alguien pulsa «Cerrar sesión». Si cierra la pestaña sin salir, solo se ve su última actividad.</p></div>
          <label className="aud-periodo">Periodo<select value={periodo} onChange={e => setPeriodo(e.target.value)}>{PERIODOS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label></div>
        {eventos === null ? <Cargando filas={4} /> : eventos.length === 0 ? (
          <div className="estado-vacio"><i className="fa-solid fa-door-open" aria-hidden="true"></i><h3>Sin entradas ni salidas en este periodo</h3><p>Cada vez que alguien inicie o cierre sesión, quedará registrado con su hora.</p></div>
        ) : (
          <div className="tabla-scroll" tabIndex={0} role="region" aria-label="Tabla desplazable: usa las flechas del teclado para moverte"><table className="tabla-apilable">
            <thead><tr><th>Persona</th><th>Qué hizo</th><th>Cuándo</th></tr></thead>
            <tbody>{eventos.map(e => (
              <tr key={e.id}><td className="celda-principal"><span translate="no">{quien(e)}</span>{e.nombre && <small className="texto-tenue" translate="no"> {e.email}</small>}</td>
                <td data-label="Qué hizo"><span className={`chip-ind ${e.accion === 'ingreso' ? 'chip-ind-ok' : ''}`}>{e.accion === 'ingreso' ? 'Entró' : 'Salió'}</span></td>
                <td data-label="Cuándo"><time dateTime={e.creado_en}>{exacta(e.creado_en)}</time> <small className="texto-tenue">{hace(e.creado_en)}</small></td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}

function Espacio({ onDatos }) {
  const [a, setA] = useState(null);
  const [error, setError] = useState(null);
  const [limite, setLimite] = useState('');
  const [guardando, setGuardando] = useState(false);
  const cargar = useCallback(async () => {
    try { const r = await getAlmacenamiento(); setA(r); setLimite(String(r.limite_mb)); onDatos?.(r); setError(null); } catch (e) { setError(traducirError(e)); }
  }, [onDatos]);
  useEffect(() => { cargar(); }, [cargar]);
  if (error) return <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>;
  if (!a) return <Cargando filas={3} alto={110} />;

  const usado = a.base_bytes / 1048576, lim = Number(a.limite_mb), pct = Math.min(100, (usado / lim) * 100), libres = Math.max(0, lim - usado);
  const ritmo = a.nuevo_60d_bytes / 1048576 / 2;                       // MB por mes
  const meses = ritmo > 0.0005 ? libres / ritmo : Infinity;
  let nivel = 'sobra', titulo, detalle;
  if (meses > 120) { titulo = 'No se llenaría en los próximos 10 años'; detalle = 'El crecimiento medido es muy lento.'; }
  else if (meses > 36) { nivel = 'sobra'; titulo = `Se llenaría en cerca de ${Math.round(meses / 12)} años`; detalle = 'Hay espacio de sobra para varios años.'; }
  else if (meses > 12) { nivel = 'revisar'; titulo = `Se llenaría en cerca de ${(meses / 12).toLocaleString('es-CO', { maximumFractionDigits: 1 })} años`; detalle = 'Conviene revisarlo con calma este año.'; }
  else { nivel = 'justo'; titulo = `Se llenaría en cerca de ${Math.max(1, Math.round(meses))} ${Math.round(meses) === 1 ? 'mes' : 'meses'}`; detalle = 'El espacio está justo: libera espacio o pasa a un plan con más capacidad.'; }
  const CHIP = { sobra: 'Hay espacio de sobra', revisar: 'Revísalo pronto', justo: 'Espacio justo' }[nivel];
  const tablas = a.tablas || [], totalApp = tablas.reduce((s, t) => s + t.bytes, 0);
  const principales = tablas.slice(0, 6), resto = tablas.slice(6).reduce((s, t) => s + t.bytes, 0);
  const partes = [...principales.map((t, i) => ({ nombre: NOMBRE_TABLA[t.tabla] || t.tabla, bytes: t.bytes, filas: t.filas, color: COLORES[i] })), ...(resto ? [{ nombre: 'Otras tablas', bytes: resto, color: COLORES[6] }] : [])];
  const aud = tablas.find(t => t.tabla === 'indicadores_auditoria');

  async function guardar() {
    const n = Number(limite.replace(',', '.'));
    if (!Number.isFinite(n) || n < 1 || n > 100000) { avisar('Escribe un límite en MB entre 1 y 100.000.', { tipo: 'alerta' }); return; }
    setGuardando(true);
    try { await guardarLimiteAlmacenamiento(n); avisar('Límite guardado.', { tipo: 'ok' }); await cargar(); } catch (e) { avisar(traducirError(e), { tipo: 'alerta' }); } finally { setGuardando(false); }
  }

  return (
    <>
      <section className="panel" aria-labelledby="esp-uso">
        <div className="panel-header"><div><h2 id="esp-uso">Almacenamiento en Supabase</h2><p className="sub">Espacio real usado por tu base de datos, contra el límite de tu plan.</p></div></div>
        <div className="esp-barra" role="progressbar" aria-label="Espacio usado de la base de datos" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 10) / 10}><u style={{ width: `${Math.max(pct, 1.2)}%` }} className={nivel} /></div>
        <p className="esp-cifras"><span><strong>{mb(a.base_bytes)} MB</strong> usados</span><span>{pct.toLocaleString('es-CO', { maximumFractionDigits: 1 })} % de {lim.toLocaleString('es-CO')} MB</span></p>
        <div className="esp-limite"><label>Límite de tu plan (MB)<input inputMode="decimal" value={limite} onChange={e => setLimite(e.target.value)} aria-describedby="esp-limite-ayuda" /></label>
          <button type="button" className="btn-secondary" onClick={guardar} disabled={guardando || Number(limite.replace(',', '.')) === lim}>{guardando ? 'Guardando…' : 'Guardar límite'}</button>
          <p id="esp-limite-ayuda" className="ayuda-campo">El plan gratuito de Supabase incluye 500 MB. Si cambias de plan, actualiza este número para que la estimación sea correcta.</p></div>
      </section>

      <section className="panel" aria-labelledby="esp-cuando">
        <div className="panel-header"><div><h2 id="esp-cuando">¿Cuándo se llena la base de datos?</h2><p className="sub">Se calcula con el ritmo real de datos nuevos de los últimos 60 días.</p></div></div>
        <div className={`esp-veredicto ${nivel}`}>
          <div><span className="esp-chip">{CHIP}</span><h3>{titulo}</h3><p>{detalle}</p></div>
          <dl><div><dt>Usados</dt><dd>{mb(a.base_bytes)} MB</dd></div><div><dt>Libres</dt><dd>{mb(libres * 1048576)} MB</dd></div><div><dt>Entran cada mes</dt><dd>≈ {ritmo.toLocaleString('es-CO', { maximumFractionDigits: 2 })} MB</dd></div></dl>
        </div>
        <h3 className="esp-sub">Qué la llena</h3>
        <div className="esp-apilada" role="img" aria-label={`Reparto de los datos de la aplicación: ${partes.map(p => `${p.nombre} ${(p.bytes / totalApp * 100).toFixed(0)} %`).join(', ')}`}>{partes.map(p => <i key={p.nombre} style={{ flex: p.bytes, background: p.color }} title={`${p.nombre}: ${mb(p.bytes)} MB`} />)}</div>
        <ul className="esp-leyenda">{partes.map(p => (
          <li key={p.nombre}><i style={{ background: p.color }} aria-hidden="true" /><span>{p.nombre}</span><strong>{mb(p.bytes)} MB</strong><small>{totalApp ? Math.round(p.bytes / totalApp * 100) : 0} %{p.filas != null ? ` · ${p.filas.toLocaleString('es-CO')} filas` : ''}</small></li>
        ))}</ul>
        <p className="ayuda-campo">Las tablas de esta aplicación ocupan {mb(totalApp)} MB. El resto ({mb(Math.max(0, a.base_bytes - totalApp))} MB) es el sistema interno de Supabase, que existe aunque no uses nada.</p>
      </section>

      <section className="panel" aria-labelledby="esp-consejos">
        <div className="panel-header"><h2 id="esp-consejos">Consejos para no quedarse sin espacio</h2></div>
        <ul className="esp-consejos">
          <li><i className="fa-solid fa-clock-rotate-left" aria-hidden="true"></i><div><strong>La bitácora crece con el uso</strong><p>Hoy guarda {aud ? aud.filas.toLocaleString('es-CO') : 0} eventos y ocupa {mb(aud?.bytes || 0)} MB. Cada cambio y cada entrada suman unos pocos cientos de bytes; con varias personas trabajando todo el año sigue siendo poco frente a 500 MB.</p></div></li>
          <li><i className="fa-solid fa-file-arrow-down" aria-hidden="true"></i><div><strong>Descarga una copia cada mes</strong><p>Al cerrar el mes, baja el informe en PDF y la Matriz en Excel. Son una foto legible del cierre y no ocupan espacio de la base.</p></div></li>
          <li><i className="fa-solid fa-sliders" aria-hidden="true"></i><div><strong>Mantén el límite al día</strong><p>La estimación usa el límite que escribiste arriba: debe coincidir con el de tu plan de Supabase.</p></div></li>
        </ul>
      </section>
    </>
  );
}

async function exportarBitacora(eventos, prefijo = 'bitacora') {
  const { default: escribir } = await import('write-excel-file/browser');
  const cab = ['Fecha', 'Persona', 'Correo', 'Clase', 'Acción', 'Detalle'].map(v => ({ value: v, fontWeight: 'bold' }));
  const filas = eventos.map(e => [e.creado_en ? exacta(e.creado_en) : '', e.nombre || '', etiquetaDeCorreo(e.email) || '', (TIPOS[e.tipo] || {}).texto || e.tipo, e.accion, e.resumen].map(v => ({ value: v == null ? '' : String(v), type: String })));
  await escribir([cab, ...filas], { columns: [{ width: 22 }, { width: 24 }, { width: 30 }, { width: 16 }, { width: 12 }, { width: 70 }] })
    .toFile(`${prefijo}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

const MODOS = {
  accesos: { boton: 'Eliminar accesos', que: 'los accesos (quién entró y salió)', icono: 'fa-door-open' },
  actividad: { boton: 'Eliminar actividad', que: 'la actividad (quién cambió qué)', icono: 'fa-clock-rotate-left' },
  todo: { boton: 'Eliminar todo', que: 'los accesos y la actividad', icono: 'fa-trash-can' },
};

/** Eliminación de la bitácora: la automática (primer martes del mes, con aviso y 2 días para cancelar) y la manual por tipo. */
function PanelLimpieza({ onBorrado }) {
  const plan = useMemo(() => proximaDepuracion(), []);
  const [cfg, setCfg] = useState(null);
  const [dlg, setDlg] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const cargar = useCallback(async () => {
    try { const { data } = await supabase.from('indicadores_configuracion').select('depuracion_objetivo,depuracion_aviso_en,depuracion_cancelada').eq('id', 1).maybeSingle(); setCfg(data || {}); } catch { setCfg({}); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const cancelada = !!cfg?.depuracion_cancelada;
  useEffect(() => { try { localStorage.setItem(`tm:dep-cancelada:${plan.iso}`, cancelada ? '1' : '0'); } catch { /* nada */ } }, [cancelada, plan.iso]);
  const enPlazo = plan.faltan >= 0 && plan.faltan <= 5;

  async function alternar() {
    setTrabajando(true);
    try { const { error } = await supabase.rpc('indicadores_depuracion_cancelar', { p_cancelar: !cancelada }); if (error) throw error; await cargar(); avisar(cancelada ? 'La eliminación automática quedó activa otra vez.' : 'Listo: este mes no se eliminará nada.', { tipo: 'ok' }); }
    catch (e) { avisar(traducirError(e), { tipo: 'error' }); } finally { setTrabajando(false); }
  }
  async function abrir(modo) {
    try {
      let q = supabase.from('indicadores_auditoria').select('id', { count: 'exact', head: true }).neq('accion', 'depurar');
      if (modo === 'accesos') q = q.eq('tipo', 'acceso'); else if (modo === 'actividad') q = q.neq('tipo', 'acceso');
      const { count } = await q; setDlg({ modo, cuantos: count ?? 0 });
    } catch { setDlg({ modo, cuantos: null }); }
  }
  async function descargarAntes() {
    try { const filas = await getAuditoria({ soloAccesos: dlg.modo === 'accesos', limite: 20000 }); await exportarBitacora(dlg.modo === 'accesos' ? filas : dlg.modo === 'actividad' ? filas : [...filas, ...(await getAuditoria({ soloAccesos: true, limite: 20000 }))], `bitacora-${dlg.modo}`); }
    catch (e) { avisar(traducirError(e), { tipo: 'error' }); }
  }
  async function confirmar() {
    setTrabajando(true);
    try {
      const { data, error } = await supabase.rpc('indicadores_depurar_bitacora', { p_modo: dlg.modo }); if (error) throw error;
      avisar(`Se eliminaron ${data?.eliminados ?? 0} registros de ${MODOS[dlg.modo].que}.`, { tipo: 'ok' }); setDlg(null); onBorrado();
    } catch (e) { avisar(traducirError(e), { tipo: 'error' }); } finally { setTrabajando(false); }
  }

  const estado = cancelada ? 'cancelada' : enPlazo ? 'plazo' : 'lejos';
  return (
    <section className={`aud-limpieza ${estado}`} aria-label="Eliminación de la bitácora">
      <div className="aud-limpieza-cab">
        <i className={`fa-solid ${estado === 'cancelada' ? 'fa-ban' : 'fa-clock-rotate-left'}`} aria-hidden="true"></i>
        <div>
          {estado === 'cancelada' && <><strong>Cancelaste la eliminación del {plan.texto}.</strong> <span>El mes siguiente se vuelve a programar sola.</span></>}
          {estado === 'plazo' && <><strong>{plan.faltan === 0 ? 'Hoy' : `El ${plan.texto}`} se eliminan los accesos y la actividad.</strong> <span>{plan.faltan >= 2 ? `Tienes ${plan.faltan - 1} ${plan.faltan - 1 === 1 ? 'día' : 'días'} para cancelarlo.` : 'Cancélalo ahora si no quieres que se borre.'} Si el aviso llega con menos de 2 días, ese mes no se borra nada.</span></>}
          {estado === 'lejos' && <><strong>Cada primer martes del mes se eliminan los accesos y la actividad.</strong> <span>La próxima vez será el {plan.texto}. Te aviso 5 días antes y tienes 2 días para cancelarla.</span></>}
        </div>
        {(estado === 'plazo' || estado === 'cancelada') && <button type="button" className={estado === 'plazo' ? 'btn-primary' : 'btn-secondary'} onClick={alternar} disabled={trabajando}>{estado === 'plazo' ? 'Cancelar la eliminación' : 'Volver a activarla'}</button>}
      </div>
      <div className="aud-limpieza-acc" role="group" aria-label="Eliminar a mano">
        <span>Eliminar a mano:</span>
        {Object.entries(MODOS).map(([k, m]) => <button key={k} type="button" className="btn-secondary btn-chico" onClick={() => abrir(k)}><i className={`fa-solid ${m.icono}`} aria-hidden="true"></i> {m.boton}</button>)}
      </div>
      {dlg && (
        <Dialogo titulo={MODOS[dlg.modo].boton} onCerrar={() => setDlg(null)} ancho={480}>
          <div className="form-dialogo">
            <h2>{MODOS[dlg.modo].boton}</h2>
            <p>Vas a eliminar {dlg.cuantos == null ? '' : <strong>{dlg.cuantos.toLocaleString('es-CO')} registros de </strong>}{MODOS[dlg.modo].que}. <strong>No se puede deshacer.</strong> Queda anotado quién lo hizo.</p>
            <p className="sub">Si quieres conservarlos, descárgalos en Excel antes.</p>
            <div className="acciones-dialogo">
              <button type="button" className="btn-secondary" onClick={descargarAntes}><i className="fa-solid fa-file-excel" aria-hidden="true"></i> Descargar antes</button>
              <button type="button" className="btn-secondary" onClick={() => setDlg(null)}>No, volver</button>
              <button type="button" className="btn-danger" onClick={confirmar} disabled={trabajando || dlg.cuantos === 0}>{trabajando ? 'Eliminando…' : 'Sí, eliminar'}</button>
            </div>
          </div>
        </Dialogo>
      )}
    </section>
  );
}

export default function Auditoria() {
  const [pestana, setPestana] = useState('actividad');
  const [periodo, setPeriodo] = useState('7');
  const [esp, setEsp] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [version, setVersion] = useState(0);
  useEffect(() => { getAuditoria({ desde: desdeISO('hoy'), limite: 500 }).then(d => setResumen({ hoy: d.length })).catch(() => setResumen({ hoy: null })); }, []);
  const pct = esp ? Math.min(100, esp.base_bytes / 1048576 / Number(esp.limite_mb) * 100) : null;
  const cifras = pestana === 'espacio' && esp
    ? [{ titulo: 'Espacio usado', valor: `${pct.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`, principal: true, tono: pct > 80 ? 'mal' : pct > 60 ? 'aten' : 'bien', nota: `${mb(esp.base_bytes)} MB de ${Number(esp.limite_mb).toLocaleString('es-CO')} MB` }]
    : pestana === 'actividad' && resumen?.hoy != null ? [{ titulo: 'Cambios hoy', valor: resumen.hoy, principal: true, nota: 'registros, catálogo, cierres y usuarios' }] : null;
  return (
    <div className="page">
      <PageHeader titulo="Bitácora" descripcion="Quién cambió qué, quién entró y quién salió, y cuánto espacio queda en la base de datos." cifras={cifras}>
        <div className="modo-importar" role="tablist" aria-label="Qué quieres revisar" aria-orientation="vertical" onKeyDown={e => {
          const ids = ['actividad', 'accesos', 'espacio'], i = ids.indexOf(pestana);
          const ir = { ArrowDown: (i + 1) % 3, ArrowRight: (i + 1) % 3, ArrowUp: (i + 2) % 3, ArrowLeft: (i + 2) % 3, Home: 0, End: 2 }[e.key];
          if (ir == null) return;
          e.preventDefault(); setPestana(ids[ir]); setTimeout(() => document.getElementById(`tab-${ids[ir]}`)?.focus(), 0);
        }}>
          {[['actividad', 'Actividad', 'Quién cambió qué'], ['accesos', 'Accesos', 'Quién entra y sale'], ['espacio', 'Espacio', 'Cuánto queda']].map(([k, t, s]) => (
            <button key={k} type="button" role="tab" id={`tab-${k}`} aria-selected={pestana === k} aria-controls="aud-panel" tabIndex={pestana === k ? 0 : -1} onClick={() => setPestana(k)}><strong>{t}</strong><small>{s}</small></button>
          ))}
        </div>
      </PageHeader>
      <div id="aud-panel" role="tabpanel" aria-labelledby={`tab-${pestana}`}>
        {pestana !== 'espacio' && <PanelLimpieza onBorrado={() => setVersion(v => v + 1)} />}
        {pestana === 'actividad' && <Actividad key={version} periodo={periodo} setPeriodo={setPeriodo} />}
        {pestana === 'accesos' && <Accesos key={version} periodo={periodo} setPeriodo={setPeriodo} />}
        {pestana === 'espacio' && <Espacio onDatos={setEsp} />}
      </div>
    </div>
  );
}
