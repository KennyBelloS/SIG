import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TourDispositivo from '../vida/TourDispositivo';
import { useSesion } from '../../lib/useSesion';

const CLAVE = 'indicadores:tour-visto';

/** Lo que se ve la PRIMERA vez que alguien inicia sesión: el recorrido animado de la aplicación dentro de un iPhone (celular) o una MacBook
 *  (computador). Reemplaza a la antigua bienvenida de texto. Se puede volver a ver desde «Cómo se usa» o desde el Inicio. */
export default function BienvenidaTour() {
  const [abierto, setAbierto] = useState(false);
  const navegar = useNavigate();
  const { sesion } = useSesion();
  const [esperaEntrada] = useState(() => { try { return sessionStorage.getItem('tm:entrando') === '1'; } catch { return false; } });
  useEffect(() => {
    let visto = true;
    try { visto = localStorage.getItem(CLAVE) === '1'; } catch { /* nada */ }
    if (visto) return undefined;
    // enseguida: al terminar la entrada animada (o a los 0,5 s si no hubo entrada) se abre a pantalla completa
    if (!esperaEntrada) { const t = setTimeout(() => setAbierto(true), 500); return () => clearTimeout(t); }
    const abrir = () => setTimeout(() => setAbierto(true), 120);
    window.addEventListener('tm:entrada-fin', abrir);
    const respaldo = setTimeout(() => setAbierto(true), 4800);
    return () => { window.removeEventListener('tm:entrada-fin', abrir); clearTimeout(respaldo); };
  }, [esperaEntrada]);
  useEffect(() => { const abrir = () => setAbierto(true); window.addEventListener('indicadores:tour', abrir); return () => window.removeEventListener('indicadores:tour', abrir); }, []);
  useEffect(() => {
    if (!abierto) return undefined;
    const tecla = e => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', tecla); document.body.classList.add('sin-scroll-fondo');
    return () => { document.removeEventListener('keydown', tecla); document.body.classList.remove('sin-scroll-fondo'); };
    // eslint-disable-next-line
  }, [abierto]);
  const cerrar = () => { try { localStorage.setItem(CLAVE, '1'); } catch { /* nada */ } setAbierto(false); window.dispatchEvent(new Event('tm:tour-cerrado')); };
  if (!abierto) return null;
  const primero = sesion?.nombre ? sesion.nombre.split(/\s+/)[0] : null;
  return (
    <div className="tour-modal" role="dialog" aria-modal="true" aria-labelledby="tour-modal-t">
      <div className="tour-modal-cab">
        <div><p className="tour-modal-hola">{primero ? `Hola, ${primero}` : 'Hola'}</p><h2 id="tour-modal-t">Así funciona el sistema</h2></div>
        <button type="button" className="btn-primary" onClick={cerrar} autoFocus>Entendido</button>
      </div>
      <TourDispositivo rol={sesion?.rol || 'usuario'} compacto pantalla onFin={cerrar} onIr={ruta => { cerrar(); navegar(ruta); }} />
    </div>
  );
}
