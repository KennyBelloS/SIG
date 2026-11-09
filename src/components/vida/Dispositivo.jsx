import { useEffect, useRef, useState } from 'react';

/** Marcos de dispositivo hechos solo con CSS: iPhone (con isla), Android (con cámara en punto) y MacBook (con muesca y base). */
export function Dispositivo({ tipo = 'iphone', etiqueta, pantallaRef, className = '', children }) {
  const nombre = { iphone: 'un iPhone', android: 'un teléfono Android', macbook: 'una MacBook' }[tipo];
  return (
    <div className={`disp disp-${tipo} ${className}`} role="group" aria-label={etiqueta || `Así se ve en ${nombre}`}>
      <div className="disp-marco">
        {tipo === 'iphone' && <span className="disp-isla" aria-hidden="true"><i /></span>}
        {tipo === 'android' && <span className="disp-camara" aria-hidden="true" />}
        {tipo === 'macbook' && <span className="disp-muesca" aria-hidden="true" />}
        <div className="disp-pantalla" ref={pantallaRef}>{children}</div>
        {tipo !== 'macbook' && <span className="disp-barra-inicio" aria-hidden="true" />}
      </div>
      {tipo === 'macbook' && <div className="disp-base" aria-hidden="true"><span /></div>}
    </div>
  );
}

/** Dibuja su contenido a un ancho fijo y lo encoge para que quepa en la pantalla del dispositivo. */
export function Escala({ ancho, children, className = '' }) {
  const caja = useRef(null), interior = useRef(null);
  const [k, setK] = useState(1), [alto, setAlto] = useState(0);
  useEffect(() => {
    const ajustar = () => { if (!caja.current || !interior.current) return; const nk = caja.current.clientWidth / ancho; setK(nk); setAlto(interior.current.offsetHeight * nk); };
    ajustar();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(ajustar) : null;
    if (ro) { ro.observe(caja.current); ro.observe(interior.current); }
    window.addEventListener('resize', ajustar);
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', ajustar); };
  }, [ancho]);
  return (
    <div ref={caja} className={`escala-caja ${className}`} style={{ height: alto || undefined }}>
      <div ref={interior} className="escala-int" style={{ width: ancho, transform: `scale(${k})` }}>{children}</div>
    </div>
  );
}
