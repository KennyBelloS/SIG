import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/** Diálogo modal accesible: cierra con Escape o al pulsar fuera, atrapa el foco
 *  mientras está abierto y lo devuelve al elemento que lo abrió. */
export default function Dialogo({ titulo, onCerrar, children, className = '', ancho }) {
  const caja = useRef(null);
  // Se captura durante el render, antes de que React enfoque algo dentro del diálogo
  const abridor = useRef(typeof document !== 'undefined' ? document.activeElement : null);
  useEffect(() => {
    const previo = abridor.current;
    const enfocables = () => [...caja.current.querySelectorAll('button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')];
    const primero = caja.current.querySelector('[autofocus]') || enfocables()[0];
    primero?.focus();
    function teclas(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onCerrar(); return; }
      if (e.key !== 'Tab') return;
      const el = enfocables(); if (!el.length) return;
      const a = el[0], z = el[el.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
    document.addEventListener('keydown', teclas);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', teclas); document.body.style.overflow = overflow; previo?.focus?.(); };
    // eslint-disable-next-line
  }, []);
  return createPortal(
    <div className="ind-modal-fondo" onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div ref={caja} className={`ind-modal ${className}`} role="dialog" aria-modal="true" aria-label={titulo} style={ancho ? { maxWidth: ancho } : undefined}>
        {children}
      </div>
    </div>, document.body);
}

/** Confirmación de acciones con consecuencias (enviar correos, cerrar meses, borrar). */
export function Confirmar({ titulo, texto, textoBoton = 'Confirmar', peligro = false, cargando = false, onConfirmar, onCancelar }) {
  return (
    <Dialogo titulo={titulo} onCerrar={onCancelar} className="dialogo-confirmar">
      <h2>{titulo}</h2>
      <p>{texto}</p>
      <div className="ind-modal-acciones" style={{ justifyContent: 'flex-end' }}>
        <button className="btn-secondary" onClick={onCancelar} disabled={cargando}>Cancelar</button>
        <button className={peligro ? 'btn-danger' : 'btn-primary'} onClick={onConfirmar} disabled={cargando} autoFocus>
          {cargando ? 'Procesando…' : textoBoton}
        </button>
      </div>
    </Dialogo>
  );
}
