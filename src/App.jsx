import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import RestablecerClave from './pages/RestablecerClave';
import Indicadores from './pages/Indicadores';
import IndicadorDetalle from './pages/IndicadorDetalle';
import Dashboard from './pages/Dashboard';
import Novedades from './pages/Novedades';
import Configuracion from './pages/Configuracion';
import Auditoria from './pages/Auditoria';
import Matriz from './pages/Matriz';
import Informe from './pages/Informe';
import Importar from './pages/Importar';
import Ayuda from './pages/Ayuda';
import InicioMovil from './pages/InicioMovil';
import { useMovil } from './lib/movil';
import { useSesion } from './lib/useSesion';
import Actualizador from './components/Actualizador';
import EntradaAnimada from './components/EntradaAnimada';

function SoloAdmin({ sesion, children }) {
  if (!sesion?.esAdmin) return <Navigate to="/" replace />;
  return children;
}

/** La raíz lleva a cada persona a su primer módulo: el administrador al Dashboard, los demás a la Matriz. */
function Inicio() {
  return <Navigate to="/inicio" replace />;   // la raíz es el Inicio (tarjetas, recorrido animado y resumen), en teléfono y en computador
}

/** Digitadores y administradores: quienes registran datos. */
function SoloRegistro({ sesion, children }) {
  if (!sesion?.puedeRegistrar) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { cargando, sesion, recuperando } = useSesion();

  if (cargando) return <div className="pantalla-carga">Cargando…</div>;
  if (!sesion) return <><Login /><Actualizador conSesion={false} /></>;
  if (recuperando) return <><RestablecerClave /><Actualizador conSesion={false} /></>;   // abrió el enlace de «olvidé mi contraseña»

  return (
    <>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Inicio sesion={sesion} />} />
        <Route path="/inicio" element={<InicioMovil />} />
        <Route path="/indicadores" element={<Indicadores />} />
        <Route path="/indicadores/:id" element={<IndicadorDetalle />} />
        <Route path="/matriz" element={<Matriz />} />
        <Route path="/ayuda" element={<Ayuda />} />
        <Route path="/informe" element={<Informe />} />
        <Route path="/importar" element={<SoloRegistro sesion={sesion}><Importar /></SoloRegistro>} />
        <Route path="/dashboard" element={<SoloAdmin sesion={sesion}><Dashboard /></SoloAdmin>} />
        <Route path="/resumen" element={<Navigate to="/dashboard" replace />} />
        <Route path="/novedades" element={<SoloAdmin sesion={sesion}><Novedades /></SoloAdmin>} />
        <Route path="/configuracion" element={<SoloAdmin sesion={sesion}><Configuracion /></SoloAdmin>} />
        <Route path="/bitacora" element={<SoloAdmin sesion={sesion}><Auditoria /></SoloAdmin>} />
        <Route path="/auditoria" element={<Navigate to="/bitacora" replace />} />
      </Route>
    </Routes>
    <EntradaAnimada nombre={sesion.nombre} />
    <Actualizador conSesion />
    </>
  );
}
