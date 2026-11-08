import { useEffect, useState } from 'react';
import { Rosal, ROSALES } from '../pages/Login';

/** La entrada al sistema: justo después de iniciar sesión, los rosales crecen sobre el verde de la marca y una cortina circular se abre
 *  sobre la aplicación, que llega con su propia animación. Se puede saltar con un clic o con Escape. No aparece si la persona pidió menos movimiento. */
export default function EntradaAnimada({ nombre }) {
  const [fase, setFase] = useState(() => {
    try {
      const pedida = sessionStorage.getItem('tm:entrando') === '1';   // solo se lee; se borra en un efecto (la inicialización puede ejecutarse dos veces)
      const menos = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return pedida && !menos ? 'entra' : 'fin';
    } catch { return 'fin'; }
  });
  useEffect(() => { try { sessionStorage.removeItem('tm:entrando'); } catch { /* nada */ } }, []);
  useEffect(() => {
    if (fase === 'fin') return undefined;
    const abre = setTimeout(() => setFase('abre'), 2100);
    const fin = setTimeout(() => setFase('fin'), 3000);
    const salta = e => { if (e.type === 'click' || e.key === 'Escape') setFase(f => (f === 'entra' ? 'abre' : f)); };
    window.addEventListener('keydown', salta);
    return () => { clearTimeout(abre); clearTimeout(fin); window.removeEventListener('keydown', salta); };
  }, [fase]);
  useEffect(() => { if (fase === 'abre') { const t = setTimeout(() => setFase('fin'), 900); return () => clearTimeout(t); } return undefined; }, [fase]);
  if (fase === 'fin') return null;
  const primero = nombre ? String(nombre).split(/\s+/)[0] : null;
  return (
    <div className={`entrada-anim ${fase}`} role="status" aria-live="polite" onClick={() => setFase(f => (f === 'entra' ? 'abre' : f))}>
      <div className="entrada-anim-centro">
        <img src="/logo.png" alt="" className="entrada-anim-logo" />
        <p className="entrada-anim-hola">{primero ? `Bienvenido, ${primero}` : 'Bienvenido'}</p>
        <h2 className="entrada-anim-titulo">Sistema de Gestión</h2>
        <p className="entrada-anim-sub">Entrando al sistema…</p>
      </div>
      <svg className="entrada-anim-campo" viewBox="0 0 520 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
        <line x1="0" y1="299" x2="520" y2="299" stroke="#3FAE62" strokeOpacity=".5" strokeWidth="2" />
        {ROSALES.map((r, i) => <Rosal key={i} i={i} {...r} />)}
      </svg>
    </div>
  );
}
