import { useEffect, useRef, useState } from 'react';
import { menosMovimiento } from '../lib/preferencias';

const MESES_INICIAL = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MESES_NOMBRE = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
// un patrón fijo (no al azar, para que no titile distinto cada vez) de qué meses pasados «casi» o «no cumplieron»
const TONO_MES = [0, 0, 1, 0, 0, 2, 0, 1, 0, 0, 0, 0];   // 0 cumple · 1 casi (dorado) · 2 no cumple (vino)
const COLOR_TONO = ['#1F9456', '#C9932B', '#A91D3A'];

/** Un número que cuenta rápido hacia su meta — el mismo truco de la vista previa del login, pero para esta pantalla. */
function useContar(meta, activo) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!activo || menosMovimiento()) { setV(meta); return undefined; }
    let raf; const t0 = performance.now(), dur = 1100;
    const paso = a => { const k = Math.min(1, (a - t0) / dur); setV(Math.round(meta * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(paso); };
    raf = requestAnimationFrame(paso); return () => cancelAnimationFrame(raf);
  }, [meta, activo]);
  return v;
}

/** La entrada al sistema, justo después de iniciar sesión: el logo se rodea de un anillo que se dibuja y, en vez de una
 *  escena decorativa, se enciende mes a mes el año en curso — lo que la aplicación de verdad hace — hasta llegar al
 *  mes de hoy. Luego una cortina circular se abre sobre la aplicación. Dura unos 2 s. Se salta con un clic o Escape. */
export default function EntradaAnimada({ nombre }) {
  const [fase, setFase] = useState(() => {
    try { return sessionStorage.getItem('tm:entrando') === '1' && !menosMovimiento() ? 'entra' : 'fin'; } catch { return 'fin'; }
  });
  const mostro = useRef(fase !== 'fin');
  useEffect(() => { try { sessionStorage.removeItem('tm:entrando'); } catch { /* nada */ } }, []);
  useEffect(() => { if (fase === 'fin' && mostro.current) { mostro.current = false; window.dispatchEvent(new Event('tm:entrada-fin')); } }, [fase]);
  useEffect(() => {
    if (fase === 'fin') return undefined;
    const abre = setTimeout(() => setFase('abre'), 3400), fin = setTimeout(() => setFase('fin'), 4250);
    const salta = e => { if (e.key === 'Escape') setFase(f => (f === 'entra' ? 'abre' : f)); };
    window.addEventListener('keydown', salta);
    return () => { clearTimeout(abre); clearTimeout(fin); window.removeEventListener('keydown', salta); };
  }, [fase]);
  useEffect(() => { if (fase === 'abre') { const t = setTimeout(() => setFase('fin'), 850); return () => clearTimeout(t); } return undefined; }, [fase]);
  const primero = nombre ? String(nombre).split(/\s+/)[0] : null;
  const hoy = new Date(), mesHoy = hoy.getMonth();
  const activo = fase !== 'fin';
  const cumplimiento = useContar(78, activo), indicadoresN = useContar(47, activo), procesosN = useContar(9, activo);
  if (fase === 'fin') return null;
  return (
    <div className={`entrada-anim ${fase}`} role="status" aria-live="polite" onClick={() => setFase(f => (f === 'entra' ? 'abre' : f))}>
      <div className="ea-papel" aria-hidden="true" />
      <div className="ea-escaneo" aria-hidden="true" />
      <header className="ea-encabezado" aria-hidden="true">
        <span>FINCA TORREMOLINOS</span><span>{hoy.getFullYear()} · {procesosN} PROCESOS</span>
      </header>
      <div className="ea-regla ea-regla-izq" aria-hidden="true" />
      <div className="ea-regla ea-regla-der" aria-hidden="true" />
      <div className="ea-dato ea-dato-izq" aria-hidden="true"><b>{indicadoresN}</b><small>indicadores en seguimiento</small></div>
      <div className="ea-dato ea-dato-der" aria-hidden="true"><b>{cumplimiento}<i>%</i></b><small>cumplimiento del año</small></div>
      <div className="ea-dato ea-dato-izq2" aria-hidden="true"><b>3</b><small>avisos activos</small></div>
      <div className="ea-dato ea-dato-der2" aria-hidden="true"><b>{mesHoy + 1}<i>/12</i></b><small>meses del año</small></div>
      <div className="entrada-anim-centro">
        <div className="ea-logo">
          <span className="ea-retic" aria-hidden="true"><i /><i /></span>
          <span className="ea-coord ea-coord-1" aria-hidden="true">LAT 5.10°N</span>
          <span className="ea-coord ea-coord-2" aria-hidden="true">LON 73.78°O</span>
          <svg className="ea-anillo" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" className="ea-pista" /><circle cx="60" cy="60" r="54" className="ea-trazo" pathLength="100" /></svg>
          <img src="/logo.png" alt="" className="entrada-anim-logo" />
        </div>
        <p className="entrada-anim-hola">{primero ? `Bienvenido, ${primero}` : 'Bienvenido'}</p>
        <h2 className="entrada-anim-titulo">Sistema de Gestión</h2>
        <ul className="ea-anio" aria-label={`El año ${hoy.getFullYear()}, mes a mes`}>
          {MESES_INICIAL.map((m, i) => (
            <li key={m + i} className={i > mesHoy ? 'ea-futuro' : 'ea-hecho'} aria-current={i === mesHoy ? 'date' : undefined}
              title={MESES_NOMBRE[i]} data-hoy={i === mesHoy || undefined}
              style={i <= mesHoy ? { '--i': i, background: COLOR_TONO[TONO_MES[i]] } : { '--i': i }}>
              {m}
            </li>
          ))}
        </ul>
        <p className="entrada-anim-sub">{MESES_NOMBRE[mesHoy][0].toUpperCase() + MESES_NOMBRE[mesHoy].slice(1)} {hoy.getFullYear()} · quedan 3 días para registrar</p>
      </div>
      <p className="ea-proximo" aria-hidden="true"><i className="ea-proximo-ico" />Próximamente: Capacitaciones · Auditoría y control</p>
      <footer className="ea-pie-tecnico" aria-hidden="true">
        <span>CUMPLE</span><i style={{ background: COLOR_TONO[0] }} /><span>CASI</span><i style={{ background: COLOR_TONO[1] }} /><span>NO CUMPLE</span><i style={{ background: COLOR_TONO[2] }} /><span>SIN REGISTRAR</span><i />
      </footer>
    </div>
  );
}
