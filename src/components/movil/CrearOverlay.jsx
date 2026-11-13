import { useEffect, useRef, useState } from 'react';
import { leerRecientes } from '../../lib/recientes';

/** El botón «+»: una cortina verde a pantalla completa que nace del propio botón y trae tarjetas inclinadas.
 *  Cada tarjeta es una acción DISTINTA que no está ya en otro lado (la búsqueda y las pestañas viven aparte):
 *  seguir con lo último, registrar lo que falta, crear un indicador, importar un Excel, descargar el
 *  informe, ver lo que no cumple. La de «seguir con lo último» va primero a propósito: es la que de
 *  verdad se usa todos los días, antes que crear algo nuevo (que se hace una vez cada tanto). */
export default function CrearOverlay({ origen, sesion, onCerrar, navegar, onHoja }) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef(null);
  const x = origen?.x ?? window.innerWidth - 40, y = origen?.y ?? 40;
  const radio = Math.ceil(Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) * 1.05);
  const cerrar = despues => { setAbierto(false); setTimeout(() => { onCerrar(); if (typeof despues === 'function') despues(); }, 560); };
  const ir = destino => cerrar(() => navegar(destino));

  useEffect(() => {
    const previo = document.activeElement;
    try { navigator.vibrate?.(8); } catch { /* no todos los equipos vibran */ }
    document.body.classList.add('sin-scroll-fondo');
    const a = requestAnimationFrame(() => requestAnimationFrame(() => setAbierto(true)));
    const tecla = e => {
      if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
      if (e.key === 'Tab' && raiz.current) {
        const f = [...raiz.current.querySelectorAll('button')]; if (!f.length) return;
        const p = f[0], u = f[f.length - 1];
        if (e.shiftKey && document.activeElement === p) { e.preventDefault(); u.focus(); } else if (!e.shiftKey && document.activeElement === u) { e.preventDefault(); p.focus(); }
      }
    };
    document.addEventListener('keydown', tecla);
    return () => { cancelAnimationFrame(a); document.removeEventListener('keydown', tecla); document.body.classList.remove('sin-scroll-fondo'); if (previo?.focus) previo.focus(); };
    // eslint-disable-next-line
  }, []);
  useEffect(() => { if (abierto) setTimeout(() => raiz.current?.querySelector('.crear-carta.oscura')?.focus(), 500); }, [abierto]);

  const registra = !!sesion?.puedeRegistrar;
  const ultimo = leerRecientes()[0];
  const seguir = ultimo ? { icono: 'fa-clock-rotate-left', texto: `Seguir con ${ultimo.nombre}`, accion: () => ir(`/indicadores/${ultimo.id}`), oscura: true } : null;
  const informe = { icono: 'fa-file-pdf', texto: 'Descargar el informe del mes', accion: () => ir('/informe') };
  const faltan = { icono: 'fa-list-check', texto: 'Registrar lo que falta', accion: () => cerrar(() => onHoja('pendientes')), oscura: !seguir };
  const importar = { icono: 'fa-file-excel', texto: 'Importar un Excel', accion: () => ir('/importar') };
  const cartas = (sesion?.esAdmin
    ? [seguir, { icono: 'fa-plus', texto: 'Crear un indicador', accion: () => ir('/configuracion?nuevo=1') }, faltan, importar, informe]
    : registra ? [seguir, informe, faltan, importar]
    : [seguir, { icono: 'fa-triangle-exclamation', texto: 'Ver lo que no cumple', accion: () => cerrar(() => onHoja('nocumplen')), oscura: !seguir }, informe])
    .filter(Boolean)
    .map((c, k) => ({ ...c, rot: [-5, 4, -3, 5][k % 4] }));
  return (
    <div ref={raiz} className={`crear${abierto ? ' abierto' : ''}`} style={{ '--x': `${x}px`, '--y': `${y}px`, '--r': `${radio}px` }} role="dialog" aria-modal="true" aria-label="¿Qué quieres hacer hoy?">
      <div className="crear-cab">
        <span className="crear-ident" aria-hidden="true"><span className="logo-ficha"><img src="/logo-icon.png" alt="" /></span><span className="crear-marca"><b>sistema</b> <i>de gestión</i></span></span>
        <button type="button" className="crear-x" onClick={() => cerrar()} aria-label="Cerrar"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </div>
      <h2 className="crear-titulo">¿Qué quieres<br />hacer hoy?</h2>
      <div className="crear-cartas">
        {cartas.map((c, k) => (
          <button key={c.texto} type="button" className={`crear-carta${c.oscura ? ' oscura' : ''}${c.sola ? ' sola' : ''}`} style={{ '--rot': `${c.rot}deg`, '--k': k }} onClick={c.accion}>
            <i className={`fa-solid ${c.icono}`} aria-hidden="true"></i>
            <span>{c.texto}</span>
          </button>
        ))}
      </div>
      <p className="crear-pie">Para encontrar cualquier cosa, usa la lupa.</p>
    </div>
  );
}
