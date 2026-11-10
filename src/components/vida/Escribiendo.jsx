import { useEffect, useState } from 'react';
import { menosMovimiento } from '../../lib/preferencias';

/** Un texto que se va escribiendo letra por letra con un cursor que parpadea. Sin movimiento aparece completo. Los lectores de pantalla lo oyen entero. */
export default function Escribiendo({ texto, velocidad = 64, retraso = 380, className = '' }) {
  const [n, setN] = useState(() => (menosMovimiento() ? texto.length : 0));
  useEffect(() => {
    if (menosMovimiento()) { setN(texto.length); return undefined; }
    setN(0); let i = 0, t2;
    const t1 = setTimeout(function paso() { i += 1; setN(i); if (i < texto.length) t2 = setTimeout(paso, velocidad + Math.random() * 45); }, retraso);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [texto, velocidad, retraso]);
  return (
    <>
      <span className={`escribiendo ${className}`} aria-hidden="true">{texto.slice(0, n)}<i className={`caret${n >= texto.length ? ' fin' : ''}`} /></span>
      <span className="sr-only">{texto}</span>
    </>
  );
}
