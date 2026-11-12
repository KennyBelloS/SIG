import { useRef, useCallback } from 'react';
import { menosMovimiento } from '../lib/preferencias';

/* Una gota de agua recorriendo el título.
   Cada letra se parte en su propio elemento; al pasar el cursor, las letras cercanas se levantan y
   se agrandan según lo lejos que estén del puntero, como si una lente de agua pasara por encima.
   La caída es suave hacia los lados (no es un salto), que es lo que lo hace parecer líquido y no mecánico.

   Solo con puntero fino (ratón): en una pantalla táctil no hay «pasar por encima», y además ahí el
   dedo taparía justo lo que se quiere ver. */

const RADIO = 58;   // hasta dónde alcanza la gota, en píxeles

export default function TextoAgua({ children, className = '', as: Tag = 'span' }) {
  const caja = useRef(null), raf = useRef(0);
  const texto = String(children ?? '');

  const mover = useCallback(e => {
    if (!caja.current || menosMovimiento()) return;
    if (raf.current) return;
    const x = e.clientX;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const letras = caja.current?.querySelectorAll('.ta-l');
      letras?.forEach(l => {
        const r = l.getBoundingClientRect();
        const d = Math.abs(x - (r.left + r.width / 2));
        // curva coseno: el centro sube del todo y los bordes vuelven a cero sin cortes
        const k = d > RADIO ? 0 : (1 + Math.cos((d / RADIO) * Math.PI)) / 2;
        l.style.setProperty('--k', k.toFixed(3));
      });
    });
  }, []);

  const salir = useCallback(() => {
    caja.current?.querySelectorAll('.ta-l').forEach(l => l.style.setProperty('--k', '0'));
  }, []);

  return (
    <Tag ref={caja} className={`texto-agua ${className}`} onPointerMove={mover} onPointerLeave={salir}>
      {texto.split('').map((c, i) => (
        c === ' '
          ? <span key={i} className="ta-esp">{'\u00a0'}</span>
          : <span key={i} className="ta-l" style={{ '--k': 0 }} aria-hidden="true">{c}</span>
      ))}
      <span className="sr-only">{texto}</span>
    </Tag>
  );
}
