import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ROLES, getResumenMes, mesReporteActual, MESES } from '../../lib/indicadores';
import { supabase } from '../../lib/supabaseClient';
import { cerrarSesion } from '../../lib/useSesion';
import InterruptorTema from '../vida/InterruptorTema';
import Preferencias from '../vida/Preferencias';
import CartaDesplegable from '../vida/CartaDesplegable';
import { useAvisos } from '../../lib/avisos';
import { avisar } from '../../lib/toast';

/* Las piezas del teléfono: barra superior, búsqueda flotante, pestañas de abajo y las hojas que suben desde abajo. */

export function MovilBarra({ sesion, onCuenta, onCrear, onBuscar, fabRef, campana, titulo }) {
  const inicial = (sesion?.nombreVisible || sesion?.email || '?').trim()[0]?.toUpperCase();
  return (
    <header className="mv-barra">
      <Link to="/inicio" className="logo-ficha mv-logo" aria-label="Falcon Farms, Finca Torremolinos: ir al inicio"><img src="/logo-icon.png" alt="" /></Link>
      <p className="mv-seccion" aria-live="polite"><span key={titulo}>{titulo || 'Sistema de gestión'}</span></p>
      <div className="mv-acciones">
        <button type="button" className="mv-lupa" onClick={onBuscar} aria-label="Buscar un indicador o una sección" aria-haspopup="dialog"><i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i></button>
        {campana}
        <button type="button" className="mv-avatar" onClick={onCuenta} aria-label={`Mi cuenta: ${sesion?.nombreVisible || sesion?.email || ''}`} aria-haspopup="dialog"><span aria-hidden="true">{inicial}</span></button>
        <button type="button" className="mv-fab" ref={fabRef} onClick={onCrear} aria-label="¿Qué quieres hacer hoy?" aria-haspopup="dialog"><i className="fa-solid fa-plus" aria-hidden="true"></i></button>
      </div>
    </header>
  );
}

export function MovilBuscar({ onBuscar }) {
  return (
    <div className="mv-buscar" role="search">
      <button type="button" className="mv-buscar-texto" onClick={onBuscar} aria-label="Buscar un indicador o una sección"><i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Buscar un indicador…</button>
    </div>
  );
}

/** Cinco pestañas, todas con su nombre a la vista: Inicio, Indicadores, Matriz, la cuarta según el rol (Dashboard o Informe) y «Más». */
export function MovilTabs({ onMas, masActivo, dashboard }) {
  const tab = (to, icono, texto) => (
    <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'activo' : '')}><i className={`fa-solid ${icono}`} aria-hidden="true"></i><span>{texto}</span></NavLink>
  );
  return (
    // Mismo orden que la barra del computador: Inicio, Dashboard (si eres admin), Matriz, Indicadores.
    <nav className="mv-tabs" aria-label="Secciones">
      {tab('/inicio', 'fa-table-cells-large', 'Inicio')}
      {dashboard && tab(dashboard.to, 'fa-chart-pie', dashboard.corto || dashboard.texto)}
      {tab('/matriz', 'fa-table', 'Matriz')}
      {tab('/indicadores', 'fa-chart-simple', 'Indicadores')}
      <button type="button" onClick={onMas} className={masActivo ? 'activo' : ''} aria-haspopup="dialog"><i className="fa-solid fa-ellipsis" aria-hidden="true"></i><span>Más</span></button>
    </nav>
  );
}

/** Hoja que sube desde abajo (se cierra con la X, tocando afuera o con Escape). */
export function HojaInferior({ titulo, onCerrar, children }) {
  useEffect(() => {
    const previo = document.activeElement;
    const tecla = e => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', tecla); document.body.classList.add('sin-scroll-fondo');
    return () => { document.removeEventListener('keydown', tecla); document.body.classList.remove('sin-scroll-fondo'); if (previo?.focus) previo.focus(); };
  }, [onCerrar]);
  return (
    <div className="hoja-fondo" onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <section className="hoja" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="hoja-asa" aria-hidden="true" />
        <div className="hoja-cab"><h2>{titulo}</h2><button type="button" className="hoja-x" onClick={onCerrar} aria-label="Cerrar" autoFocus><i className="fa-solid fa-xmark" aria-hidden="true"></i></button></div>
        {children}
      </section>
    </div>
  );
}

function Anillo({ valor, tam = 88 }) {
  const rad = 34, c = 2 * Math.PI * rad, v = valor == null ? 0 : valor / 100;
  return (
    <svg className="anillo" width={tam} height={tam} viewBox="0 0 84 84" role="img" aria-label={valor == null ? 'Sin resultados todavía' : `${valor}% cumple su meta`}>
      <circle cx="42" cy="42" r={rad} className="anillo-fondo" />
      <circle cx="42" cy="42" r={rad} className="anillo-valor" strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform="rotate(-90 42 42)" />
      <text x="42" y="49" textAnchor="middle" className="anillo-txt">{valor == null ? '—' : `${valor}%`}</text>
    </svg>
  );
}

/** «Más»: el centro de control. Tu mes con su anillo, los avisos recientes, los módulos con su estado EN VIVO y las preferencias
 *  (modo oscuro, tamaño de letra, movimiento), además de instalar la app, cambiar tu nombre y tu contraseña y cerrar sesión. */
export function HojaMas({ grupos, cuarto, onCerrar, navegar, sesion, onHoja, onNombre, onClave, onInstalar }) {
  const { anio, mesActual } = mesReporteActual();
  const [r, setR] = useState(null);
  const [cambiosHoy, setCambiosHoy] = useState(null);
  const [q, setQ] = useState('');
  const [actualizando, setActualizando] = useState(false);
  const { avisos } = useAvisos();
  const cargar = () => getResumenMes(anio, mesActual).then(setR);
  useEffect(() => {
    cargar().catch(() => { /* sin datos: se muestran las descripciones fijas */ });
    if (sesion?.esAdmin) {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      supabase.from('indicadores_auditoria').select('id', { count: 'exact', head: true }).gte('creado_en', hoy.toISOString()).then(({ count }) => setCambiosHoy(count)).catch(() => {});
    }
    // eslint-disable-next-line
  }, [anio, mesActual, sesion?.esAdmin]);
  const t = r?.totales, evaluados = t ? t.cumplen + t.noCumplen : 0;
  const pct = evaluados ? Math.round((t.cumplen / evaluados) * 100) : null;
  const restan = r ? r.diaCierre - new Date().getDate() : null;
  const mes = `${MESES[mesActual - 1]} ${anio}`;
  const resumenTexto = () => (r ? `${mes}: ${pct == null ? 'todavía sin resultados' : `${pct}% de lo registrado cumple su meta`} · faltan ${t.pendientes} por registrar · ${t.noCumplen} no cumplen · ${r.cerrado ? 'el mes está cerrado' : `quedan ${restan} ${restan === 1 ? 'día' : 'días'} para registrar`}.` : '');
  const copiar = async () => { const x = resumenTexto(); if (!x) return; try { await navigator.clipboard.writeText(x); avisar('Resumen copiado: ya puedes pegarlo donde quieras.', { tipo: 'ok' }); } catch { avisar('Tu navegador no me dejó copiar.', { tipo: 'error' }); } };
  const compartir = async () => { const x = resumenTexto(); if (!x) return; if (navigator.share) { try { await navigator.share({ title: 'Sistema de Gestión · Finca Torremolinos', text: x }); } catch { /* se canceló */ } } else copiar(); };
  const refrescar = async () => { setActualizando(true); try { await cargar(); avisar('Datos al día.', { tipo: 'ok' }); } catch { avisar('No pude actualizar: revisa tu conexión.', { tipo: 'error' }); } finally { setActualizando(false); } };
  const ir = fn => () => { onCerrar(); setTimeout(fn, 0); };

  const detalle = {
    '/dashboard': evaluados ? `${pct}% de lo registrado cumple su meta` : 'El año entero de un vistazo',
    '/informe': `${mes}: descárgalo en PDF`,
    '/importar': 'Carga varios resultados desde un Excel',
    '/novedades': t ? `${t.sinPlan} sin plan de acción · ${t.pendientes} por registrar` : 'Lo que necesita tu atención',
    '/configuracion': t ? `${t.indicadores} indicadores en ${r.porProceso.length} procesos` : 'Indicadores, cierres y usuarios',
    '/bitacora': cambiosHoy == null ? 'Quién cambió qué y cuánto espacio queda' : `${cambiosHoy} ${cambiosHoy === 1 ? 'cambio' : 'cambios'} hoy`,
    '/ayuda': 'Recorrido animado y preguntas frecuentes',
  };
  const insignia = { '/novedades': t?.sinPlan || 0 };
  const enBarra = new Set(['/inicio', '/indicadores', '/matriz', cuarto?.to].filter(Boolean));
  const qq = q.trim().toLowerCase(), coincide = (...c) => !qq || c.some(x => String(x || '').toLowerCase().includes(qq));
  const lista = grupos.map(g => ({ ...g, items: g.items.filter(i => coincide(i.texto, detalle[i.to])) })).filter(g => g.items.length);
  const nModulos = lista.reduce((n, g) => n + g.items.length, 0);
  const atajos = [
    sesion?.puedeRegistrar && { k: 'falta', icono: 'fa-list-check', texto: 'Lo que falta registrar', n: t?.pendientes, accion: ir(() => onHoja('pendientes')) },
    { k: 'nocumple', icono: 'fa-triangle-exclamation', texto: 'Lo que no cumple', n: t?.noCumplen, tono: 'mal', accion: ir(() => onHoja('nocumplen')) },
    { k: 'pdf', icono: 'fa-file-pdf', texto: 'Informe del mes en PDF', accion: ir(() => navegar('/informe')) },
    { k: 'compartir', icono: 'fa-share-nodes', texto: 'Compartir el resumen', accion: compartir },
    { k: 'copiar', icono: 'fa-copy', texto: 'Copiar el resumen', accion: copiar },
    { k: 'actualizar', icono: 'fa-arrows-rotate', texto: actualizando ? 'Actualizando…' : 'Actualizar los datos', girar: actualizando, accion: refrescar },
    sesion?.esAdmin && { k: 'crear', icono: 'fa-plus', texto: 'Crear un indicador', accion: ir(() => navegar('/configuracion?nuevo=1')) },
  ].filter(Boolean).filter(a => coincide(a.texto));
  const hayPref = coincide('preferencias', 'modo oscuro', 'letra', 'movimiento', 'avisos del navegador', 'instalar', 'nombre', 'contraseña', 'cerrar sesión');
  const nada = qq && !lista.length && !atajos.length && !hayPref;
  return (
    <HojaInferior titulo="Más" onCerrar={onCerrar}>
      <label className="mas-busca"><i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar en «Más»…" aria-label="Buscar en Más" /></label>

      {!qq && (
        <section className="mas-mes" aria-label="Tu mes">
          <Anillo valor={pct} />
          <div className="mas-mes-txt">
            <strong>{mes}</strong>
            <span>{!r ? 'Cargando…' : r.cerrado ? 'El mes está cerrado' : restan <= 0 ? 'Hoy es el último día para registrar' : `Quedan ${restan} ${restan === 1 ? 'día' : 'días'} para registrar`}</span>
          </div>
        </section>
      )}

      {lista.length > 0 && (
        <section className="mas-modulos" aria-labelledby="mas-mod-t">
          <h3 className="mas-banda mas-banda-mod" id="mas-mod-t"><i className="fa-solid fa-grip" aria-hidden="true"></i> Módulos <b>{nModulos}</b></h3>
          <p className="mas-banda-sub">Las pantallas de la aplicación. Las marcadas con <i className="fa-solid fa-thumbtack" aria-hidden="true"></i> también están en la barra de abajo.</p>
          {lista.map(g => (
            <div key={g.titulo} className="hoja-grupo mas-mod-grupo">
              <h4>{g.titulo}</h4>
              <ul className="mas-mod-red">
                {g.items.map(i => (
                  <li key={i.to}>
                    <button type="button" className={`mas-mod${enBarra.has(i.to) ? ' fija' : ''}`} onClick={() => { onCerrar(); navegar(i.to); }}>
                      <span className="mas-mod-ico"><i className={`fa-solid ${i.icono}`} aria-hidden="true"></i></span>
                      <strong>{i.texto}</strong>
                      <small>{detalle[i.to] || (enBarra.has(i.to) ? 'En la barra de abajo' : '')}</small>
                      {insignia[i.to] > 0 && <b className="hoja-insignia" aria-label={`${insignia[i.to]} por atender`}>{insignia[i.to]}</b>}
                      {enBarra.has(i.to) && <i className="fa-solid fa-thumbtack mas-mod-pin" aria-hidden="true"></i>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {(atajos.length > 0 || hayPref || (!qq && avisos.length > 0)) && <h3 className="mas-banda mas-banda-otras"><i className="fa-solid fa-sliders" aria-hidden="true"></i> Otras opciones</h3>}
      {atajos.length > 0 && (
        <section className="hoja-grupo mas-atajos" aria-label="Atajos">
          <h3>Atajos</h3>
          <div className="mas-atajos-red">
            {atajos.map(a => (
              <button key={a.k} type="button" className={`mas-atajo${a.tono ? ` tono-${a.tono}` : ''}`} onClick={a.accion} disabled={a.girar}>
                <span className="mas-atajo-ico"><i className={`fa-solid ${a.icono}${a.girar ? ' fa-spin' : ''}`} aria-hidden="true"></i></span>
                <span>{a.texto}</span>
                {a.n != null && <b>{a.n}</b>}
              </button>
            ))}
          </div>
        </section>
      )}

      {!qq && avisos.length > 0 && (
        <section className="mas-avisos hoja-grupo" aria-label="Avisos recientes">
          <h3>Avisos recientes <button type="button" className="btn-texto" onClick={ir(() => window.dispatchEvent(new Event('tm:abrir-avisos')))}>Ver todos</button></h3>
          <ul className="hoja-lista">{avisos.slice(0, 3).map(a => (
            <li key={a.id}><button type="button" onClick={ir(() => { if (a.accion === 'actualizar') window.location.reload(); else if (a.ruta) navegar(a.ruta); })}>
              <span className={`hoja-ico hi-${a.tono === 'mal' ? 'no' : a.tono === 'aten' ? 'pendiente' : 'ok'}`}><i className={`fa-solid ${a.icono}`} aria-hidden="true"></i></span>
              <span><strong>{a.titulo}</strong>{a.detalle && <small>{a.detalle}</small>}</span>
              {!a.visto && <b className="hoja-insignia" aria-label="sin ver">•</b>}
            </button></li>))}
          </ul>
        </section>
      )}

      {nada && <div className="estado-vacio"><i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i><h3>Nada coincide con «{q}»</h3><p>Prueba con otra palabra.</p></div>}

      {hayPref && (
        <section className="hoja-grupo mas-pref" aria-label="Preferencias">
          <h3>Preferencias</h3>
          <div className="mas-tema"><InterruptorTema etiqueta /></div>
          <Preferencias />
          <ul className="hoja-lista">
            <li><button type="button" onClick={ir(onInstalar)}><span className="hoja-ico"><i className="fa-solid fa-mobile-screen-button" aria-hidden="true"></i></span><span><strong>Instalar en mi celular</strong><small>Ábrelo como una aplicación, desde la pantalla de inicio</small></span></button></li>
            <li><button type="button" onClick={ir(onNombre)}><span className="hoja-ico"><i className="fa-solid fa-id-badge" aria-hidden="true"></i></span><span><strong>Cambiar mi nombre</strong><small>Cómo quieres que te llamen</small></span></button></li>
            <li><button type="button" onClick={ir(onClave)}><span className="hoja-ico"><i className="fa-solid fa-key" aria-hidden="true"></i></span><span><strong>Cambiar mi contraseña</strong><small>Mínimo 8 caracteres</small></span></button></li>
            <li><button type="button" className="peligro" onClick={cerrarSesion}><span className="hoja-ico"><i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i></span><span><strong>Cerrar sesión</strong></span></button></li>
          </ul>
        </section>
      )}
    </HojaInferior>
  );
}

export function HojaCuenta({ sesion, onCerrar, onNombre, onClave }) {
  const inicial = (sesion?.nombreVisible || sesion?.email || '?').trim()[0]?.toUpperCase();
  const accion = (fn) => () => { onCerrar(); setTimeout(fn, 0); };
  return (
    <CartaDesplegable ancla={document.querySelector('.mv-barra .mv-avatar')} titulo="Mi cuenta" ancho={344} onCerrar={onCerrar}>
      {({ cerrar }) => ({
        cabecera: (
          <header className="um-cab hoja-persona">
            <span className="um-avatar" aria-hidden="true">{inicial}</span>
            <div><h2 translate="no">{sesion?.nombreVisible || sesion?.email}</h2>{sesion?.nombre && <small translate="no">{sesion.email}</small>}<span className="um-rol">{ROLES[sesion?.rol]?.nombre || 'Usuario'}</span></div>
          </header>
        ),
        cuerpo: (
          <ul className="um-lista hoja-lista">
            <li><button type="button" onClick={accion(onNombre)}><span className="hoja-ico"><i className="fa-solid fa-id-badge" aria-hidden="true"></i></span><span><strong>Cambiar mi nombre</strong><small>Cómo quieres que te llamen</small></span></button></li>
            <li><button type="button" onClick={accion(onClave)}><span className="hoja-ico"><i className="fa-solid fa-key" aria-hidden="true"></i></span><span><strong>Cambiar mi contraseña</strong><small>Mínimo 8 caracteres</small></span></button></li>
          </ul>
        ),
        pie: <div className="ac-pie"><button type="button" className="btn-secondary btn-chico" onClick={cerrar}>Cerrar</button><button type="button" className="btn-danger btn-chico" onClick={cerrarSesion}><i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i> Cerrar sesión</button></div>,
      })}
    </CartaDesplegable>
  );
}
