import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CartaTres from './CartaTres';

/** Una carta que se DESDOBLA desde el elemento que la abrió (como la factura que sale del botón «Get Invoice»).
 *  Se cierra con Escape, tocando afuera o con el botón que se le pase; vuelve al mismo sitio al cerrar. */
export default function CartaDesplegable({ ancla, onCerrar, titulo, ancho = 380, alinear = 'derecha', className = '', children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  const [cerrando, setCerrando] = useState(false);
  const cerrar = () => { setCerrando(c => { if (!c) setTimeout(onCerrar, 250); return true; }); };

  useLayoutEffect(() => {
    const a = ancla?.getBoundingClientRect ? ancla.getBoundingClientRect() : ancla, c = ref.current;
    if (!a || !c) return;
    const w = c.offsetWidth, h = c.offsetHeight;
    let left = alinear === 'derecha' ? a.right - w : a.left + (a.width - w) / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - w - 10));
    let top = a.bottom + 10;
    if (top + h > window.innerHeight - 10) top = Math.max(10, a.top - h - 10);
    setPos({ left, top, ox: a.left + a.width / 2 - left, oy: a.top + a.height / 2 - top });
    // eslint-disable-next-line
  }, [ancla]);

  useEffect(() => {
    const previo = document.activeElement;
    const tecla = e => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(); } };
    const fuera = e => { if (ref.current && !ref.current.contains(e.target) && !(ancla?.contains && ancla.contains(e.target))) cerrar(); };
    // si la pantalla se mueve o cambia de tamaño, la carta ya no está donde nació: se pliega
    // pero no por un ajuste mínimo del navegador al abrirla: solo si la pantalla se movió de verdad (más de 60 px) y pasada la apertura
    const t0 = performance.now(), y0 = window.scrollY, w0 = window.innerWidth;
    const mueve = e => {
      if (performance.now() - t0 < 450) return;
      if (e.type === 'scroll') { if (ref.current && ref.current.contains(e.target)) return; if (Math.abs(window.scrollY - y0) < 60) return; }
      if (e.type === 'resize' && Math.abs(window.innerWidth - w0) < 40) return;
      cerrar();
    };
    document.addEventListener('keydown', tecla); document.addEventListener('pointerdown', fuera, true); window.addEventListener('resize', mueve); document.addEventListener('scroll', mueve, true);
    const f = setTimeout(() => ref.current?.focus({ preventScroll: true }), 120);
    return () => { clearTimeout(f); document.removeEventListener('keydown', tecla); document.removeEventListener('pointerdown', fuera, true); window.removeEventListener('resize', mueve); document.removeEventListener('scroll', mueve, true); if (previo?.focus) previo.focus({ preventScroll: true }); };
    // eslint-disable-next-line
  }, []);

  const contenido = typeof children === 'function' ? children({ cerrar }) : children;
  const tres = !!contenido && typeof contenido === 'object' && !contenido.$$typeof && 'cuerpo' in contenido;   // {cabecera, cuerpo, pie} → hoja de tres partes
  return createPortal(
    <div ref={ref} role="dialog" aria-label={titulo} tabIndex={-1} className={`carta-desp${tres ? ' tres' : ''}${cerrando ? ' cerrando' : ''} ${className}`}
      style={{ width: `min(${ancho}px, calc(100vw - 20px))`, ...(pos ? { left: pos.left, top: pos.top, transformOrigin: `${pos.ox}px ${pos.oy}px` } : { visibility: 'hidden', left: 0, top: 0 }) }}>
      {tres ? <CartaTres {...contenido} cerrando={cerrando} /> : contenido}
    </div>, document.body);
}
