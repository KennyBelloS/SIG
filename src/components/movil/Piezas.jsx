import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ROLES, getResumenMes, mesReporteActual, MESES } from '../../lib/indicadores';
import { supabase } from '../../lib/supabaseClient';
import { cerrarSesion } from '../../lib/useSesion';
import InterruptorTema from '../vida/InterruptorTema';

/* Las piezas del teléfono: barra superior, búsqueda flotante, pestañas de abajo y las hojas que suben desde abajo. */

export function MovilBarra({ sesion, onCuenta, onCrear, fabRef, campana }) {
  const inicial = (sesion?.nombreVisible || sesion?.email || '?').trim()[0]?.toUpperCase();
  return (
    <header className="mv-barra">
      <Link to="/inicio" className="logo-ficha mv-logo" aria-label="Falcon Farms, Finca Torremolinos: ir al inicio"><img src="/logo-icon.png" alt="" /></Link>
      <p className="mv-marca" aria-label="Sistema de gestión"><b>sistema</b> <i>de gestión</i></p>
      <div className="mv-acciones">
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

/** Cuatro pestañas, como en la app de referencia: lo demás vive en «Más». */
export function MovilTabs({ onMas, masActivo }) {
  const tab = (to, icono, texto) => (
    <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'activo' : '')}><i className={`fa-solid ${icono}`} aria-hidden="true"></i><span>{texto}</span></NavLink>
  );
  return (
    <nav className="mv-tabs" aria-label="Secciones">
      {tab('/inicio', 'fa-table-cells-large', 'Inicio')}
      {tab('/indicadores', 'fa-chart-simple', 'Indicadores')}
      {tab('/matriz', 'fa-table', 'Matriz')}
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

/** «Más»: el resto de los módulos, agrupados y con su estado EN VIVO (no una lista muda): cumplimiento, pendientes, cambios de hoy... */
export function HojaMas({ grupos, onCerrar, navegar, sesion }) {
  const { anio, mesActual } = mesReporteActual();
  const [r, setR] = useState(null);
  const [cambiosHoy, setCambiosHoy] = useState(null);
  useEffect(() => {
    getResumenMes(anio, mesActual).then(setR).catch(() => { /* sin datos: se muestran las descripciones fijas */ });
    if (sesion?.esAdmin) {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      supabase.from('indicadores_auditoria').select('id', { count: 'exact', head: true }).gte('creado_en', hoy.toISOString()).then(({ count }) => setCambiosHoy(count)).catch(() => {});
    }
  }, [anio, mesActual, sesion?.esAdmin]);
  const t = r?.totales, evaluados = t ? t.cumplen + t.noCumplen : 0;
  const detalle = {
    '/dashboard': evaluados ? `${Math.round((t.cumplen / evaluados) * 100)}% de lo registrado cumple su meta` : 'El año entero de un vistazo',
    '/informe': `${MESES[mesActual - 1]} ${anio}: descárgalo en PDF`,
    '/importar': 'Carga varios resultados desde un Excel',
    '/novedades': t ? `${t.sinPlan} sin plan de acción · ${t.pendientes} por registrar` : 'Lo que necesita tu atención',
    '/configuracion': t ? `${t.indicadores} indicadores en ${r.porProceso.length} procesos` : 'Indicadores, cierres y usuarios',
    '/bitacora': cambiosHoy == null ? 'Quién cambió qué y cuánto espacio queda' : `${cambiosHoy} ${cambiosHoy === 1 ? 'cambio' : 'cambios'} hoy`,
    '/ayuda': 'Recorrido animado y preguntas frecuentes',
  };
  const insignia = { '/novedades': t?.sinPlan || 0, '/importar': 0 };
  const fuera = new Set(['/inicio', '/indicadores', '/matriz']);
  const lista = grupos.map(g => ({ ...g, items: g.items.filter(i => !fuera.has(i.to)) })).filter(g => g.items.length);
  return (
    <HojaInferior titulo="Más" onCerrar={onCerrar}>
      {lista.map(g => (
        <section key={g.titulo} className="hoja-grupo">
          <h3>{g.titulo}</h3>
          <ul className="hoja-lista">
            {g.items.map(i => (
              <li key={i.to}>
                <button type="button" onClick={() => { onCerrar(); navegar(i.to); }}>
                  <span className="hoja-ico"><i className={`fa-solid ${i.icono}`} aria-hidden="true"></i></span>
                  <span><strong>{i.texto}</strong><small>{detalle[i.to] || ''}</small></span>
                  {insignia[i.to] > 0 && <b className="hoja-insignia" aria-label={`${insignia[i.to]} por atender`}>{insignia[i.to]}</b>}
                  <i className="fa-solid fa-chevron-right hoja-flecha" aria-hidden="true"></i>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </HojaInferior>
  );
}

export function HojaCuenta({ sesion, onCerrar, onNombre, onClave, onInstalar }) {
  const inicial = (sesion?.nombreVisible || sesion?.email || '?').trim()[0]?.toUpperCase();
  const accion = (fn) => () => { onCerrar(); setTimeout(fn, 0); };
  return (
    <HojaInferior titulo="Mi cuenta" onCerrar={onCerrar}>
      <div className="hoja-persona"><span className="mv-avatar grande" aria-hidden="true">{inicial}</span><div><strong translate="no">{sesion?.nombreVisible || sesion?.email}</strong>{sesion?.nombre && <small translate="no">{sesion.email}</small>}<span className="chip-ind chip-ind-ok">{ROLES[sesion?.rol]?.nombre || 'Usuario'}</span></div></div>
      <ul className="hoja-lista">
        <li><button type="button" onClick={accion(onNombre)}><span className="hoja-ico"><i className="fa-solid fa-id-badge" aria-hidden="true"></i></span><span><strong>Cambiar mi nombre</strong><small>Cómo quieres que te llamen</small></span></button></li>
        <li><button type="button" onClick={accion(onClave)}><span className="hoja-ico"><i className="fa-solid fa-key" aria-hidden="true"></i></span><span><strong>Cambiar mi contraseña</strong><small>Mínimo 8 caracteres</small></span></button></li>
        <li><button type="button" onClick={accion(onInstalar)}><span className="hoja-ico"><i className="fa-solid fa-mobile-screen-button" aria-hidden="true"></i></span><span><strong>Instalar en mi celular</strong><small>Ábrelo como una aplicación, desde la pantalla de inicio</small></span></button></li>
        <li className="hoja-tema"><span><strong>Modo oscuro</strong><small>Desliza la perilla por la ranura</small></span><InterruptorTema /></li>
        <li><button type="button" className="peligro" onClick={cerrarSesion}><span className="hoja-ico"><i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i></span><span><strong>Cerrar sesión</strong></span></button></li>
      </ul>
    </HojaInferior>
  );
}
