import { useEffect, useRef, useState } from 'react';
import { Rosal, ROSALES } from '../pages/Login';
import { menosMovimiento } from '../lib/preferencias';

const PASOS = ['Tus indicadores', 'El plazo del mes', 'Tus avisos'];
/** La entrada al sistema, justo después de iniciar sesión: el logo se rodea de un anillo que se dibuja, tres pasos se van marcando
 *  (lo que se está preparando) mientras crecen los rosales, y una cortina circular se abre sobre la aplicación. Dura unos 2 s. Se salta con un clic o Escape. */
export default function EntradaAnimada({ nombre }) {
  const [fase, setFase] = useState(() => {
    try { return sessionStorage.getItem('tm:entrando') === '1' && !menosMovimiento() ? 'entra' : 'fin'; } catch { return 'fin'; }
  });
  const mostro = useRef(fase !== 'fin');
  useEffect(() => { try { sessionStorage.removeItem('tm:entrando'); } catch { /* nada */ } }, []);
  useEffect(() => { if (fase === 'fin' && mostro.current) { mostro.current = false; window.dispatchEvent(new Event('tm:entrada-fin')); } }, [fase]);
  useEffect(() => {
    if (fase === 'fin') return undefined;
    const abre = setTimeout(() => setFase('abre'), 1900), fin = setTimeout(() => setFase('fin'), 2750);
    const salta = e => { if (e.key === 'Escape') setFase(f => (f === 'entra' ? 'abre' : f)); };
    window.addEventListener('keydown', salta);
    return () => { clearTimeout(abre); clearTimeout(fin); window.removeEventListener('keydown', salta); };
  }, [fase]);
  useEffect(() => { if (fase === 'abre') { const t = setTimeout(() => setFase('fin'), 850); return () => clearTimeout(t); } return undefined; }, [fase]);
  if (fase === 'fin') return null;
  const primero = nombre ? String(nombre).split(/\s+/)[0] : null;
  return (
    <div className={`entrada-anim ${fase}`} role="status" aria-live="polite" onClick={() => setFase(f => (f === 'entra' ? 'abre' : f))}>
      <div className="entrada-anim-centro">
        <div className="ea-logo">
          <svg className="ea-anillo" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" className="ea-pista" /><circle cx="60" cy="60" r="54" className="ea-trazo" pathLength="100" /></svg>
          <img src="/logo.png" alt="" className="entrada-anim-logo" />
        </div>
        <p className="entrada-anim-hola">{primero ? `Bienvenido, ${primero}` : 'Bienvenido'}</p>
        <h2 className="entrada-anim-titulo">Sistema de Gestión</h2>
        <ul className="ea-pasos" aria-label="Preparando tu sistema">{PASOS.map((p, i) => <li key={p} style={{ '--i': i }}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M7 12.5l3.4 3.4L17 9" /></svg>{p}</li>)}</ul>
      </div>
      <svg className="entrada-anim-campo" viewBox="0 0 520 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
        <line x1="0" y1="299" x2="520" y2="299" stroke="#3FAE62" strokeOpacity=".5" strokeWidth="2" />
        {ROSALES.map((r, i) => <Rosal key={i} i={i} {...r} />)}
      </svg>
    </div>
  );
}
