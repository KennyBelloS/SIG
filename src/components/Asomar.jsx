import { useEffect, useRef, useState, useCallback } from 'react';
import { getIndicador, getRegistros, cumpleMeta } from '../lib/indicadores';
import { menosMovimiento } from '../lib/preferencias';

/* «Asomarse» a un indicador sin abrirlo.
   Dejando el dedo (o el ratón) presionado medio segundo sobre cualquier indicador de una lista,
   sale una tarjeta con lo que uno iba a mirar de todos modos: cómo va el año, el último dato y si
   cumple la meta. Se suelta y desaparece. Sirve para recorrer una lista entera sin entrar y volver
   doce veces, que es lo que hoy toca hacer.

   Uso:  <Asomar id={indicador.id}> ...lo que ya tenías... </Asomar>
*/

const ESPERA = 480;          // cuánto hay que sostener para que asome
const MESES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const cache = new Map();     // no se vuelve a pedir lo mismo mientras dure la sesión

export default function Asomar({ id, children, className = '' }) {
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const temporizador = useRef(0), envoltura = useRef(null);

  const cerrar = useCallback(() => { clearTimeout(temporizador.current); setAbierto(false); }, []);

  const empezar = useCallback(e => {
    if (menosMovimiento() || !id) return;
    const x = e.clientX, y = e.clientY;
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(async () => {
      setPos({ x, y }); setAbierto(true);
      if (cache.has(id)) { setDatos(cache.get(id)); return; }
      setDatos(null);
      try {
        const anio = new Date().getFullYear();
        const [ind, regs] = await Promise.all([getIndicador(id), getRegistros(id, anio)]);
        const conDato = regs.filter(r => r.valor != null).sort((a, b) => a.mes - b.mes);
        const ultimo = conDato[conDato.length - 1] || null;
        const d = {
          nombre: ind?.nombre || '', unidad: ind?.unidad || '',
          meses: Array.from({ length: 12 }, (_, m) => {
            const r = regs.find(x => x.mes === m + 1);
            if (!r || r.valor == null) return null;
            return cumpleMeta(ind, r.valor, m + 1);
          }),
          ultimo: ultimo ? { mes: ultimo.mes, valor: ultimo.valor, cumple: cumpleMeta(ind, ultimo.valor, ultimo.mes) } : null,
          registrados: conDato.length,
        };
        cache.set(id, d); setDatos(d);
      } catch { setDatos({ error: true }); }
    }, ESPERA);
  }, [id]);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  // la tarjeta se coloca donde quepa, sin salirse de la pantalla
  const ancho = 268, alto = 212;
  const x = Math.min(Math.max(12, pos.x - ancho / 2), (typeof window !== 'undefined' ? window.innerWidth : 1000) - ancho - 12);
  const arriba = pos.y > alto + 40;
  const y = arriba ? pos.y - alto - 14 : pos.y + 18;

  return (
    <span ref={envoltura} className={`asomar ${className}`}
      onPointerDown={empezar} onPointerUp={cerrar} onPointerLeave={cerrar} onPointerCancel={cerrar}
      onContextMenu={e => { if (abierto) e.preventDefault(); }}>
      {children}
      {abierto && (
        <div className="asomo" role="dialog" aria-label="Vista rápida del indicador" style={{ left: x, top: y }}>
          {!datos && <div className="asomo-cargando"><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" /> Mirando…</div>}
          {datos?.error && <div className="asomo-cargando">No se pudo leer este indicador.</div>}
          {datos && !datos.error && (
            <>
              <b className="asomo-nombre">{datos.nombre}</b>
              <div className="asomo-anio" aria-hidden="true">
                {datos.meses.map((c, i) => (
                  <span key={i} className={c === true ? 'ok' : c === false ? 'no' : 'sin'} title={MESES[i]}>{MESES[i]}</span>
                ))}
              </div>
              {datos.ultimo ? (
                <div className={`asomo-ultimo ${datos.ultimo.cumple === true ? 'ok' : datos.ultimo.cumple === false ? 'no' : ''}`}>
                  <span>Último dato</span>
                  <b>{datos.ultimo.valor}{datos.unidad ? ` ${datos.unidad}` : ''}</b>
                  <small>{['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][datos.ultimo.mes - 1]}</small>
                </div>
              ) : <div className="asomo-ultimo"><span>Todavía no tiene datos este año</span></div>}
              <small className="asomo-pie">{datos.registrados} de 12 meses registrados · suelta para cerrar</small>
            </>
          )}
        </div>
      )}
    </span>
  );
}
