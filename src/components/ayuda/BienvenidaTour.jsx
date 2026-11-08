import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialogo from '../Dialogo';
import { useSesion } from '../../lib/useSesion';
import { ROLES } from '../../lib/indicadores';

const CLAVE = 'indicadores:tour-visto';

const PUNTOS = {
  admin: [
    ['fa-chart-pie', 'El Dashboard', 'te muestra el año entero de un vistazo: qué cumple, qué no y qué falta.'],
    ['fa-sliders', 'Configuración', 'es donde creas usuarios, cargas el libro de Excel y decides cuándo se cierra cada mes.'],
    ['fa-book-open', 'La Bitácora', 'te dice quién cambió qué, quién entró y cuánto espacio queda.'],
  ],
  digitador: [
    ['fa-chart-simple', 'Indicadores', 'te muestra el mes como un plano: toca una casilla para registrar su resultado.'],
    ['fa-file-arrow-up', 'Importar Excel', 'sirve para cargar varios resultados de una sola vez.'],
    ['fa-lock', 'Los meses cerrados', 'ya no se pueden cambiar: solo un administrador puede reabrirlos.'],
  ],
  usuario: [
    ['fa-table-cells', 'La Matriz', 'reúne todos los indicadores con su meta y sus resultados.'],
    ['fa-chart-simple', 'Indicadores', 'te deja ver cada uno con su historia mes a mes.'],
    ['fa-file-lines', 'El Informe mensual', 'se descarga en PDF para compartirlo.'],
  ],
};

/** Bienvenida: una tarjeta corta que aparece la primera vez. Cabe en cualquier pantalla y a cualquier zoom:
 *  el texto se desplaza si hace falta, pero los botones quedan siempre a la vista. El recorrido largo vive en «Cómo se usa». */
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
  const cerrar = () => { try { localStorage.setItem(CLAVE, '1'); } catch { /* nada */ } setAbierto(false); window.dispatchEvent(new Event('tm:tour-cerrado')); };
  if (!abierto) return null;
  const rol = sesion?.rol || 'usuario';
  const primero = sesion?.nombre ? sesion.nombre.split(/\s+/)[0] : null;
  return (
    <Dialogo titulo="Bienvenida" onCerrar={cerrar} ancho={520} className="tour-compacto">
      <div className="tour-cuerpo" tabIndex={0} role="region" aria-label="Contenido de la bienvenida">
        <h2><i className="fa-solid fa-seedling" aria-hidden="true"></i> Bienvenido{primero ? `, ${primero}` : ' al Sistema de Gestión'}</h2>
        <p className="tour-rol">Entras como <strong>{ROLES[rol]?.nombre || 'Usuario'}</strong>. Tres cosas para empezar:</p>
        <ul className="tour-puntos">{(PUNTOS[rol] || PUNTOS.usuario).map(([ic, t, d]) => <li key={t}><i className={`fa-solid ${ic}`} aria-hidden="true"></i><span><strong>{t}</strong> {d}</span></li>)}</ul>
        <p className="tour-atajo">Para encontrar cualquier cosa, pulsa <kbd>Ctrl</kbd> <kbd>K</kbd>. La franja amarilla de arriba dice hasta qué día se puede registrar.</p>
      </div>
      <div className="tour-pie">
        <button type="button" className="btn-secondary" onClick={() => { cerrar(); navegar('/ayuda'); }}>Ver el recorrido completo</button>
        <button type="button" className="btn-primary" onClick={cerrar} autoFocus>Empezar</button>
      </div>
    </Dialogo>
  );
}
