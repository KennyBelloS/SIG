import { useEffect, useRef, useState } from 'react';

const reducido = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Anima un número desde su valor anterior hasta el nuevo (con frenado suave). Con "reducir movimiento" salta directo. */
export function useContar(objetivo, { duracion = 1000 } = {}) {
  const [v, setV] = useState(() => (reducido() && objetivo != null ? objetivo : 0));
  const previo = useRef(reducido() && objetivo != null ? objetivo : 0);
  useEffect(() => {
    if (objetivo == null || Number.isNaN(objetivo)) return undefined;
    if (reducido()) { setV(objetivo); previo.current = objetivo; return undefined; }
    const desde = previo.current, t0 = performance.now(); let raf;
    const paso = t => {
      const p = Math.min(1, (t - t0) / duracion), e = 1 - Math.pow(1 - p, 4);
      setV(desde + (objetivo - desde) * e);
      if (p < 1) raf = requestAnimationFrame(paso); else previo.current = objetivo;
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [objetivo, duracion]);
  return v;
}

/** Número que "cuenta" hasta su valor. Si no hay dato muestra una raya. */
export default function Numero({ valor, sufijo = '', decimales = 0, className }) {
  const v = useContar(valor);
  if (valor == null || Number.isNaN(valor)) return <span className={className}>—</span>;
  const t = Number(v.toFixed(decimales)).toLocaleString('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  return <span className={className} aria-label={`${valor}${sufijo}`}>{t}{sufijo}</span>;
}
