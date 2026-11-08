import { useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ROLES } from '../../lib/indicadores';
import { cerrarSesion } from '../../lib/useSesion';

/* Las piezas del teléfono: barra superior, búsqueda flotante, pestañas de abajo y las hojas que suben desde abajo. */

export function MovilBarra({ sesion, onCuenta, onCrear, fabRef }) {
  const inicial = (sesion?.nombreVisible || sesion?.email || '?').trim()[0]?.toUpperCase();
  return (
    <header className="mv-barra">
      <Link to="/inicio" className="logo-ficha mv-logo" aria-label="Falcon Farms, Finca Torremolinos: ir al inicio"><img src="/logo-icon.png" alt="" /></Link>
      <p className="mv-marca" aria-label="Sistema de gestión"><b>sistema</b> <i>de gestión</i></p>
      <div className="mv-acciones">
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

const DESCRIPCION = {
  '/dashboard': 'El año entero de un vistazo', '/informe': 'El resultado de cada indicador, en PDF', '/importar': 'Carga varios resultados de una vez',
  '/novedades': 'Lo que necesita tu atención', '/configuracion': 'Indicadores, cierres y usuarios', '/bitacora': 'Quién cambió qué y cuánto espacio queda', '/ayuda': 'Guías, preguntas y pruebas',
};

export function HojaMas({ grupos, onCerrar, navegar }) {
  const fuera = new Set(['/inicio', '/indicadores', '/matriz']);
  const items = grupos.flatMap(g => g.items).filter(i => !fuera.has(i.to));
  return (
    <HojaInferior titulo="Más" onCerrar={onCerrar}>
      <ul className="hoja-lista">
        {items.map(i => (
          <li key={i.to}>
            <button type="button" onClick={() => { onCerrar(); navegar(i.to); }}>
              <span className="hoja-ico"><i className={`fa-solid ${i.icono}`} aria-hidden="true"></i></span>
              <span><strong>{i.texto}</strong><small>{DESCRIPCION[i.to] || ''}</small></span>
              <i className="fa-solid fa-chevron-right hoja-flecha" aria-hidden="true"></i>
            </button>
          </li>
        ))}
      </ul>
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
        <li><button type="button" className="peligro" onClick={cerrarSesion}><span className="hoja-ico"><i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i></span><span><strong>Cerrar sesión</strong></span></button></li>
      </ul>
    </HojaInferior>
  );
}
