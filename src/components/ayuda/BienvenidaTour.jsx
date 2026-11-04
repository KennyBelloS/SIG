import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialogo from '../Dialogo';
import Recorrido from './Recorrido';
import { laminasPara } from './contenido';
import { useSesion } from '../../lib/useSesion';

const CLAVE = 'indicadores:tour-visto';

/** Recorrido de bienvenida: aparece una sola vez la primera vez que alguien entra.
 *  Se puede volver a ver desde "Cómo se usa". */
export default function BienvenidaTour() {
  const [abierto, setAbierto] = useState(false);
  const navegar = useNavigate();
  const { sesion } = useSesion();
  useEffect(() => {
    let visto = true;
    try { visto = localStorage.getItem(CLAVE) === '1'; } catch { /* nada */ }
    if (visto) return undefined;
    const t = setTimeout(() => setAbierto(true), 900);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const abrir = () => setAbierto(true);
    window.addEventListener('indicadores:tour', abrir);
    return () => window.removeEventListener('indicadores:tour', abrir);
  }, []);
  const cerrar = () => { try { localStorage.setItem(CLAVE, '1'); } catch { /* nada */ } setAbierto(false); };
  if (!abierto) return null;
  return (
    <Dialogo titulo="Bienvenida" onCerrar={cerrar} ancho={980} className="tour-modal">
      <div className="tour-cab">
        <h2><i className="fa-solid fa-seedling" aria-hidden="true"></i> Bienvenido a Indicadores de Gestión</h2>
        <button className="btn-secondary" onClick={cerrar}>Saltar</button>
      </div>
      <Recorrido compacto laminas={laminasPara(sesion?.rol || 'usuario')} onFin={cerrar} onIr={ruta => { cerrar(); navegar(ruta); }} />
      <p className="texto-tenue" style={{ textAlign: 'center' }}>Puedes volver a verlo cuando quieras en &ldquo;Cómo se usa&rdquo;.</p>
    </Dialogo>
  );
}
