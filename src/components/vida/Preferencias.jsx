import { useEffect, useState } from 'react';
import { activarAvisosNavegador, avisosNavegadorActivos, avisosNavegadorBloqueados, avisosNavegadorSoportados } from '../../lib/avisos';
import { aplicarLetra, aplicarMovimiento, letraActual, movimientoActual } from '../../lib/preferencias';

const LETRAS = [['normal', 'Normal'], ['grande', 'Grande'], ['enorme', 'Enorme']];
const MOVS = [['auto', 'Automático'], ['reducido', 'Reducido']];
/** Controles de lectura y movimiento: tamaño de letra (escala TODO el texto) y movimiento reducido (apaga las animaciones aunque el equipo no lo pida). */
export default function Preferencias() {
  const [letra, setLetra] = useState(letraActual()), [mov, setMov] = useState(movimientoActual());
  const [nav, setNav] = useState(avisosNavegadorActivos());
  useEffect(() => { const f = () => { setLetra(letraActual()); setMov(movimientoActual()); }; window.addEventListener('tm:preferencias', f); return () => window.removeEventListener('tm:preferencias', f); }, []);
  const grupo = (nombre, opciones, valor, poner, clase = '') => (
    <div className="pref-bloque">
      <span className="pref-etq">{nombre}</span>
      <div className={`pref-seg ${clase}`} role="radiogroup" aria-label={nombre}>
        {opciones.map(([k, t]) => <button key={k} type="button" role="radio" aria-checked={valor === k} className={valor === k ? 'activo' : ''} onClick={() => poner(k)} data-k={k}>{clase === 'letras' ? <span style={{ fontSize: { normal: 15, grande: 18, enorme: 22 }[k] }}>Aa</span> : null}<em>{t}</em></button>)}
      </div>
    </div>
  );
  const alternarNav = async () => setNav(await activarAvisosNavegador(!nav));
  const bloqueado = avisosNavegadorBloqueados(), soportado = avisosNavegadorSoportados();
  return (
    <div className="pref">
      {grupo('Tamaño de letra', LETRAS, letra, aplicarLetra, 'letras')}
      {grupo('Movimiento', MOVS, mov, aplicarMovimiento)}
      <div className="pref-bloque">
        <span className="pref-etq">Avisos del navegador</span>
        <button type="button" role="switch" aria-label="Avisos del navegador" aria-checked={nav} className={`pref-interr${nav ? ' on' : ''}`} onClick={alternarNav} disabled={!soportado || bloqueado}>
          <span className="pref-pastilla" aria-hidden="true"><i /></span><em>{nav ? 'Activados' : 'Desactivados'}</em>
        </button>
        <small className="pref-nota">{!soportado ? 'Tu navegador no permite avisos del sistema.' : bloqueado ? 'Los bloqueaste en el navegador: actívalos en la configuración del sitio.' : 'Si la pestaña está en segundo plano, un aviso nuevo también sale como notificación del sistema. No llegan con la aplicación cerrada.'}</small>
      </div>
    </div>
  );
}
