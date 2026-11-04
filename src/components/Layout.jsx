import { NavLink, Outlet } from 'react-router-dom';
import { cerrarSesion, useSesion } from '../lib/useSesion';
import { ROLES } from '../lib/indicadores';
import BienvenidaTour from './ayuda/BienvenidaTour';
import Toaster from './Toaster';

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
    ],
  }] : []),
  { titulo: 'Ayuda', items: [{ to: '/ayuda', icono: 'fa-circle-question', texto: 'Cómo se usa', corto: 'Ayuda' }] },
];

function Marca() {
  return (
    <div className="rail-marca">
      <img src="/logo-icon.png" alt="" />
      <div>
        <strong>Torremolinos</strong>
        <span>Indicadores de gestión</span>
      </div>
    </div>
  );
}

export default function Layout() {
  const { sesion } = useSesion();
  const grupos = GRUPOS(sesion);
  const todos = grupos.flatMap(g => g.items);
  const clase = ({ isActive }) => `rail-enlace${isActive ? ' activo' : ''}`;

  return (
    <div className="shell">
      <aside className="rail" aria-label="Navegación principal">
        <Marca />
        {grupos.map(g => (
          <div className="rail-grupo" key={g.titulo}>
            <span>{g.titulo}</span>
            <nav className="rail-nav">
              {g.items.map(i => (
                <NavLink key={i.to} to={i.to} end={i.exacto} className={clase} title={i.texto}>
                  <i className={`fa-solid ${i.icono}`} aria-hidden="true"></i><span>{i.texto}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
        <div className="rail-pie">
          <div className="rail-usuario">
            <strong>{sesion?.email}</strong>
            <span>{ROLES[sesion?.rol]?.nombre || 'Usuario'}</span>
          </div>
          <button className="rail-salir" onClick={cerrarSesion} title="Cerrar sesión" aria-label="Cerrar sesión">
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      </aside>

      <div className="principal">
        <header className="topbar-movil">
          <Marca />
          <button className="rail-salir" onClick={cerrarSesion} aria-label="Cerrar sesión"><i className="fa-solid fa-right-from-bracket"></i></button>
        </header>
        <main className="contenido"><Outlet /></main>
        <BienvenidaTour />
        <Toaster />
        {todos.length > 1 && (
          <nav className="tabbar" aria-label="Navegación principal">
            {todos.map(i => (
              <NavLink key={i.to} to={i.to} end={i.exacto} className={({ isActive }) => (isActive ? 'activo' : '')}>
                <i className={`fa-solid ${i.icono}`} aria-hidden="true"></i>{i.corto || i.texto}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
