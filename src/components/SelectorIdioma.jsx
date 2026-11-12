import { useEffect, useRef, useState } from 'react';
import { IDIOMAS, getIdioma, setIdioma, t } from '../lib/idioma';

/* Rueda para elegir idioma.
   Los idiomas se recorren como un dial: el del centro es el elegido, los de arriba y abajo se ven
   más apagados y pequeños, y una fila de marcas a un lado acompaña el giro. Se puede arrastrar,
   girar con la rueda del ratón o moverse con las flechas del teclado.
   Añadir un idioma no pide tocar nada de aquí: basta con que esté en IDIOMAS. */

const ALTO = 56;     // alto de cada renglón, en píxeles

export default function SelectorIdioma({ onCerrar }) {
  const [sel, setSel] = useState(() => Math.max(0, IDIOMAS.findIndex(i => i.codigo === getIdioma())));
  const pista = useRef(null), caja = useRef(null);

  useEffect(() => {
    caja.current?.focus();
    document.body.classList.add('sin-scroll-fondo');
    return () => document.body.classList.remove('sin-scroll-fondo');
  }, []);

  const mover = d => setSel(s => Math.min(IDIOMAS.length - 1, Math.max(0, s + d)));

  function tecla(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); mover(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); aplicar(); }
    else if (e.key === 'Escape') { e.preventDefault(); onCerrar(); }
  }

  function aplicar() { setIdioma(IDIOMAS[sel].codigo); onCerrar(); }

  // girar con la rueda del ratón, con una pausa para que no se pase de largo
  const ultimo = useRef(0);
  function rueda(e) {
    const ahora = Date.now();
    if (ahora - ultimo.current < 220) return;
    ultimo.current = ahora;
    mover(e.deltaY > 0 ? 1 : -1);
  }

  return (
    <div className="idioma-fondo" onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="idioma" role="dialog" aria-modal="true" aria-label={t('Elige el idioma')} tabIndex={-1} ref={caja} onKeyDown={tecla}>
        <h2 className="idioma-titulo">{t('Elige el idioma')}</h2>

        <div className="idioma-rueda" onWheel={rueda}>
          {/* marcas que acompañan el giro, como el dial de la referencia */}
          <span className="idioma-marcas" aria-hidden="true">
            {Array.from({ length: 13 }, (_, i) => <i key={i} style={{ '--m': i - 6 }} />)}
          </span>
          <span className="idioma-cursor" aria-hidden="true" />
          <ul ref={pista} className="idioma-pista" style={{ transform: `translateY(${-sel * ALTO}px)` }}
            role="listbox" aria-activedescendant={`idi-${IDIOMAS[sel].codigo}`}>
            {IDIOMAS.map((idi, i) => {
              const d = Math.abs(i - sel);
              return (
                <li key={idi.codigo} id={`idi-${idi.codigo}`} role="option" aria-selected={i === sel}
                  className={`idioma-op${i === sel ? ' activo' : ''}`}
                  style={{ '--d': d, opacity: Math.max(0, 1 - d * 0.42), transform: `scale(${1 - d * 0.1})` }}
                  onClick={() => (i === sel ? aplicar() : setSel(i))}>
                  <span className="idioma-bandera" aria-hidden="true">{idi.bandera}</span>
                  <span className="idioma-nombre">{idi.nativo}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="idioma-acciones">
          <button type="button" className="btn-secondary" onClick={onCerrar}>{t('Cancelar')}</button>
          <button type="button" className="btn-primary" onClick={aplicar}>{t('Guardar')}</button>
        </div>
      </div>
    </div>
  );
}
