import { useEffect, useState } from 'react';
import Numero from './Numero';

/** Anillo de progreso que se dibuja al aparecer. `valor` va de 0 a 100; sin valor queda vacío. */
export default function Anillo({ valor, tamano = 96, grosor = 9, color = '#7FE0A4', pista = 'rgba(255,255,255,.18)', texto = true, centro, etiqueta, className = '' }) {
  const [listo, setListo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setListo(true), 60); return () => clearTimeout(t); }, []);
  const r = (tamano - grosor) / 2, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, valor ?? 0));
  return (
    <div className={`anillo ${className}`} style={{ width: tamano, height: tamano }} role="img" aria-label={`${etiqueta || 'Avance'}: ${valor == null ? 'sin datos' : `${valor} %`}`}>
      <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`}>
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke={pista} strokeWidth={grosor} />
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={listo ? c * (1 - pct / 100) : c} transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`}
          style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      {centro != null ? <span className="anillo-centro anillo-chico">{centro}</span> : texto && <span className="anillo-centro"><Numero valor={valor} sufijo="%" /></span>}
    </div>
  );
}
