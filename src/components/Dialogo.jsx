import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/** Diálogo modal accesible: cierra con Escape o al pulsar fuera, atrapa el foco
 *  mientras está abierto y lo devuelve al elemento que lo abrió.
 *
 *  variante="cajon": en vez de una tarjeta centrada que tapa todo, es un panel que entra desde la
 *  derecha dejando ver el resto de la pantalla (lo que se estaba mirando antes de abrirlo). Pensado
 *  para cuando hay una lista detrás (los 12 meses de un indicador, una tabla) y tiene sentido
 *  recorrerla sin cerrar y volver a abrir: por eso acepta `onFlecha('arriba'|'abajo')`, que se
 *  dispara con las flechas del teclado para pasar al elemento siguiente o anterior sin salir. */
export default function Dialogo({ titulo, onCerrar, children, className = '', ancho, variante = 'centro', onFlecha }) {
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
      // las flechas solo mueven de elemento si el foco no está escribiendo en un campo de texto
      if (onFlecha && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        const enTexto = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) && document.activeElement?.type !== 'checkbox';
        if (!enTexto) { e.preventDefault(); onFlecha(e.key === 'ArrowDown' ? 'abajo' : 'arriba'); return; }
      }
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
  }, [onFlecha]);
  return createPortal(
    <div className={`ind-modal-fondo${variante === 'cajon' ? ' cajon-fondo' : ''}`} onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div ref={caja} className={`ind-modal ${variante === 'cajon' ? 'cajon' : ''} ${className}`} role="dialog" aria-modal="true" aria-label={titulo} style={ancho ? { maxWidth: ancho } : undefined}>
        {onFlecha && (
          <div className="cajon-nav" aria-hidden="true" title="↑ / ↓ para moverte sin cerrar">
            <button type="button" tabIndex={-1} onClick={() => onFlecha('arriba')}><i className="fa-solid fa-chevron-up" /></button>
            <button type="button" tabIndex={-1} onClick={() => onFlecha('abajo')}><i className="fa-solid fa-chevron-down" /></button>
          </div>
        )}
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
