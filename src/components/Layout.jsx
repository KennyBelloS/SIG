import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cerrarSesion, useSesion } from '../lib/useSesion';
import { ROLES } from '../lib/indicadores';
import BienvenidaTour from './ayuda/BienvenidaTour';
import Toaster from './Toaster';
import FranjaPlazo from './FranjaPlazo';
import CambiarClave from './CambiarClave';
import CambiarNombre from './CambiarNombre';
import Paleta from './Paleta';
import { registrarIngresoUnaVez, latido } from '../lib/accesos';
import { useMovil } from '../lib/movil';
import { MovilBarra, MovilBuscar, MovilTabs, HojaMas, HojaCuenta } from './movil/Piezas';
import CrearOverlay from './movil/CrearOverlay';
import HojaIndicadores from './movil/HojaIndicadores';
import InstalarSheet from './movil/InstalarSheet';

/* Orden de los módulos: Dashboard, Matriz, Indicadores, Informe mensual; luego los de datos y administración,
   y "Cómo se usa" siempre al final. */
const GRUPOS = (sesion) => [
  {
    titulo: 'Seguimiento',
    items: [
      ...(sesion?.esAdmin ? [{ to: '/dashboard', icono: 'fa-chart-pie', texto: 'Dashboard' }] : []),
      { to: '/matriz', icono: 'fa-table-cells', texto: 'Matriz' },
      { to: '/indicadores', icono: 'fa-chart-simple', texto: 'Indicadores' },
      { to: '/informe', icono: 'fa-file-lines', texto: 'Informe mensual', corto: 'Informe' },
    ],
  },
  ...(sesion?.puedeRegistrar ? [{ titulo: 'Datos', items: [{ to: '/importar', icono: 'fa-file-arrow-up', texto: 'Importar Excel', corto: 'Importar' }] }] : []),
  ...(sesion?.esAdmin ? [{
    titulo: 'Administración',
    items: [
      { to: '/novedades', icono: 'fa-bell', texto: 'Novedades' },
      { to: '/configuracion', icono: 'fa-sliders', texto: 'Configuración', corto: 'Ajustes' },
      { to: '/bitacora', icono: 'fa-book-open', texto: 'Bitácora' },
    ],
  }] : []),
  { titulo: 'Ayuda', items: [{ to: '/ayuda', icono: 'fa-circle-question', texto: 'Cómo se usa', corto: 'Ayuda' }] },
];

function Marca() {
  return (
    <span className="mast-marca">
      <img src="/logo-icon.png" alt="" width="36" height="36" />
      <span><strong>Torremolinos</strong><small>Sistema de gestión</small></span>
    </span>
  );
}

/** Menú de la persona: su correo y rol, y las dos cosas que puede hacer con su cuenta. */
function MenuUsuario({ sesion, onClave, onNombre }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = e => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    const tecla = e => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);
  return (
    <div className="mast-usuario" ref={ref}>
      <button className="mast-usuario-btn" aria-expanded={abierto} aria-haspopup="menu" onClick={() => setAbierto(a => !a)}>
        <span className="mast-usuario-datos" title={sesion?.email}><strong translate="no">{sesion?.nombreVisible || sesion?.email}</strong><small>{ROLES[sesion?.rol]?.nombre || 'Usuario'}</small></span>
        <i className={`fa-solid ${abierto ? 'fa-chevron-up' : 'fa-chevron-down'}`} aria-hidden="true"></i>
      </button>
      {abierto && (
        <div className="mast-menu" role="menu">
          <button role="menuitem" onClick={() => { setAbierto(false); onNombre(); }}><i className="fa-solid fa-id-badge" aria-hidden="true"></i> Cambiar mi nombre</button>
          <button role="menuitem" onClick={() => { setAbierto(false); onClave(); }}><i className="fa-solid fa-key" aria-hidden="true"></i> Cambiar mi contraseña</button>
          <button role="menuitem" onClick={cerrarSesion}><i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i> Cerrar sesión</button>
        </div>
      )}
    </div>
  );
}

const TITULOS = [['/inicio', 'Inicio'], ['/dashboard', 'Dashboard'], ['/matriz', 'Matriz de indicadores'], ['/indicadores/', 'Ficha del indicador'], ['/indicadores', 'Indicadores'], ['/informe', 'Informe mensual'], ['/importar', 'Importar desde Excel'], ['/novedades', 'Novedades'], ['/configuracion', 'Configuración'], ['/bitacora', 'Bitácora'], ['/ayuda', 'Cómo se usa']];

export default function Layout() {
  const { sesion } = useSesion();
  const { pathname } = useLocation();
  // cada pantalla pone su nombre en la pestaña del navegador, para distinguirlas y para los lectores de pantalla
  useEffect(() => {
    const t = TITULOS.find(([ruta]) => (ruta.endsWith('/') ? pathname.startsWith(ruta) : pathname === ruta || pathname.startsWith(`${ruta}/`)));
    document.title = `${t ? `${t[1]} · ` : ''}Sistema de Gestión · Torremolinos`;
  }, [pathname]);
  const [cambiandoClave, setCambiandoClave] = useState(false);
  const [cambiandoNombre, setCambiandoNombre] = useState(false);
  const [paleta, setPaleta] = useState(false);
  const navRef = useRef(null);
  const [marcador, setMarcador] = useState(null);
  const [progreso, setProgreso] = useState(0);
  const movil = useMovil();
  const navegar = useNavigate();
  const [hoja, setHoja] = useState(null);          // 'mas' | 'cuenta' | null
  const [crear, setCrear] = useState(null);        // { x, y } del botón rojo, o null
  const fabRef = useRef(null);
  useEffect(() => { document.body.classList.toggle('movil', movil); return () => document.body.classList.remove('movil'); }, [movil]);
  const abrirCrear = () => { const r = fabRef.current?.getBoundingClientRect(); setCrear(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : {}); };

  // quién entra se anota una vez por pestaña; y un latido por minuto marca quién está en línea y en qué pantalla
  useEffect(() => { if (sesion?.id) registrarIngresoUnaVez(); }, [sesion?.id]);
  useEffect(() => {
    if (!sesion?.id) return undefined;
    const enviar = () => { if (!document.hidden) latido(pathname); };
    enviar();
    const t = setInterval(enviar, 60000);
    document.addEventListener('visibilitychange', enviar);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', enviar); };
  }, [sesion?.id, pathname]);

  // el marcador dorado se desliza hasta la sección activa
  useLayoutEffect(() => {
    const medir = () => {
      const activo = navRef.current?.querySelector('.mast-enlace.activo');
      setMarcador(activo ? { x: activo.offsetLeft, w: activo.offsetWidth } : null);
    };
    medir();
    window.addEventListener('resize', medir);
    document.fonts?.ready?.then(medir);
    return () => window.removeEventListener('resize', medir);
  }, [pathname, sesion?.rol]);

  // al cambiar de pantalla, una línea recorre la franja: la persona ve que algo está pasando
  useEffect(() => {
    setProgreso(1);
    const a = setTimeout(() => setProgreso(2), 30), b = setTimeout(() => setProgreso(0), 650);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [pathname]);

  // Ctrl/⌘ + K, o "/" fuera de un campo, abre el buscador
  useEffect(() => {
    const tecla = e => {
      const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setPaleta(p => !p); }
      else if (e.key === '/' && !escribiendo && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setPaleta(true); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  const grupos = GRUPOS(sesion);
  const todos = grupos.flatMap(g => g.items);
  const clase = ({ isActive }) => `mast-enlace${isActive ? ' activo' : ''}`;

  if (movil) {
    const rutasDeMas = !['/inicio', '/indicadores', '/matriz'].some(r => pathname === r || pathname.startsWith(`${r}/`));
    return (
      <div className="app movil-app">
        <a className="saltar" href="#contenido">Saltar al contenido</a>
        <MovilBarra sesion={sesion} fabRef={fabRef} onCuenta={() => setHoja('cuenta')} onCrear={abrirCrear} />
        {sesion?.rolNoLeido && (
          <div className="aviso-rol" role="alert"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><div><strong>No pude leer tu rol, por eso ves solo lo básico.</strong> Tus permisos no se perdieron. Recarga la página; si sigue igual, falta ejecutar la actualización de la base de datos.</div><button type="button" className="btn-secondary btn-chico" onClick={() => window.location.reload()}>Recargar</button></div>
        )}
        <FranjaPlazo />
        <main id="contenido" className="contenido" tabIndex={-1} key={pathname.split('/').slice(0, 2).join('/')}><Outlet /></main>
        <MovilBuscar onBuscar={() => setPaleta(true)} />
        <MovilTabs onMas={() => setHoja('mas')} masActivo={rutasDeMas} />
        <BienvenidaTour />
        <Toaster />
        {hoja === 'mas' && <HojaMas grupos={grupos} navegar={navegar} onCerrar={() => setHoja(null)} />}
        {hoja === 'cuenta' && <HojaCuenta sesion={sesion} onCerrar={() => setHoja(null)} onNombre={() => setCambiandoNombre(true)} onClave={() => setCambiandoClave(true)} onInstalar={() => window.dispatchEvent(new Event('tm:instalar'))} />}
        {crear && <CrearOverlay origen={crear} sesion={sesion} navegar={navegar} onHoja={setHoja} onCerrar={() => setCrear(null)} />}
        {(hoja === 'pendientes' || hoja === 'nocumplen') && <HojaIndicadores modo={hoja} navegar={navegar} onCerrar={() => setHoja(null)} />}
        {cambiandoClave && <CambiarClave onCerrar={() => setCambiandoClave(false)} />}
        {cambiandoNombre && <CambiarNombre actual={sesion?.nombre} email={sesion?.email} onCerrar={() => setCambiandoNombre(false)} />}
        {paleta && <Paleta sesion={sesion} grupos={grupos} onCerrar={() => setPaleta(false)} onClave={() => setCambiandoClave(true)} onNombre={() => setCambiandoNombre(true)} />}
        <InstalarSheet conSesion={!!sesion?.id} movil />
      </div>
    );
  }

  return (
    <div className="app">
      <a className="saltar" href="#contenido">Saltar al contenido</a>
      <header className="mast">
        <div className="mast-fila">
          <Marca />
          <nav className="mast-nav" aria-label="Secciones" ref={navRef}>
            <span className="mast-marcador" aria-hidden="true" style={marcador ? { transform: `translateX(${marcador.x}px)`, width: marcador.w, opacity: 1 } : { opacity: 0 }} />
            {grupos.map((g, gi) => (
              <div className="mast-grupo" key={g.titulo} role="group" aria-label={g.titulo} style={{ '--g': gi }}>
                {g.items.map(i => <NavLink key={i.to} to={i.to} end={i.exacto} className={clase}>{i.texto}</NavLink>)}
              </div>
            ))}
          </nav>
          <button type="button" className="mast-buscar" onClick={() => setPaleta(true)}>
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span>Buscar</span><kbd>Ctrl K</kbd>
          </button>
          <button type="button" className="mast-crear" ref={fabRef} onClick={abrirCrear} aria-label="¿Qué quieres hacer hoy?" aria-haspopup="dialog"><i className="fa-solid fa-plus" aria-hidden="true"></i></button>
          <MenuUsuario sesion={sesion} onClave={() => setCambiandoClave(true)} onNombre={() => setCambiandoNombre(true)} />
        </div>
      </header>
      <div className={`ruta-progreso p${progreso}`} aria-hidden="true"><i /></div>
      {sesion?.rolNoLeido && (
        <div className="aviso-rol" role="alert"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><div><strong>No pude leer tu rol, por eso ves solo lo básico.</strong> Tus permisos no se perdieron. Recarga la página; si sigue igual, es que falta ejecutar la actualización de la base de datos (el SQL de la versión nueva en Supabase → SQL Editor) o hay un problema de conexión.</div><button type="button" className="btn-secondary btn-chico" onClick={() => window.location.reload()}>Recargar</button></div>
      )}
      <FranjaPlazo />

      <main id="contenido" className="contenido" tabIndex={-1} key={pathname.split('/').slice(0, 2).join('/')}><Outlet /></main>
      <BienvenidaTour />
      <Toaster />
      {cambiandoClave && <CambiarClave onCerrar={() => setCambiandoClave(false)} />}
      {cambiandoNombre && <CambiarNombre actual={sesion?.nombre} email={sesion?.email} onCerrar={() => setCambiandoNombre(false)} />}
      {paleta && <Paleta sesion={sesion} grupos={grupos} onCerrar={() => setPaleta(false)} onClave={() => setCambiandoClave(true)} onNombre={() => setCambiandoNombre(true)} />}
      {crear && <CrearOverlay origen={crear} sesion={sesion} navegar={navegar} onHoja={setHoja} onCerrar={() => setCrear(null)} />}
      {(hoja === 'pendientes' || hoja === 'nocumplen') && <HojaIndicadores modo={hoja} navegar={navegar} onCerrar={() => setHoja(null)} />}
      {todos.length > 1 && (
        <nav className="tabbar" aria-label="Secciones">
          {todos.map(i => (
            <NavLink key={i.to} to={i.to} end={i.exacto} className={({ isActive }) => (isActive ? 'activo' : '')}>
              <i className={`fa-solid ${i.icono}`} aria-hidden="true"></i>{i.corto || i.texto}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
