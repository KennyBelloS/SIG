import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIndicadores, getProcesos } from '../lib/indicadores';
import { normalizar } from '../lib/libro';
import { cerrarSesion } from '../lib/useSesion';
import { leerRecientes, anotarReciente } from '../lib/recientes';

/** Buscador de toda la aplicación (Ctrl/⌘ + K o «/»): salta a una sección, a cualquiera de los indicadores o a una acción de la cuenta.
 *  Patrón de accesibilidad: combobox con lista de opciones; el foco se queda en el campo y la opción activa se anuncia. */
let cache = null;   // los indicadores no cambian mientras se navega: se piden una sola vez

export default function Paleta({ grupos, onCerrar, onClave, onNombre }) {
  const navegar = useNavigate();
  const [q, setQ] = useState('');
  const [indicadores, setIndicadores] = useState(cache?.indicadores || []);
  const [activo, setActivo] = useState(0);
  const entrada = useRef(null);
  const lista = useRef(null);

  useEffect(() => {
    entrada.current?.focus();
    const previo = document.activeElement;
    document.body.classList.add('sin-scroll-fondo');
    if (!cache) {
      Promise.all([getIndicadores(), getProcesos()]).then(([inds, procs]) => {
        const nombres = new Map(procs.map(p => [p.id, p.nombre]));
        cache = { indicadores: inds.map(i => ({ id: i.id, nombre: i.nombre, proceso: nombres.get(i.proceso_id) || '', texto: normalizar(`${i.nombre} ${nombres.get(i.proceso_id) || ''} ${i.responsable_medicion || ''}`) })) };
        setIndicadores(cache.indicadores);
      }).catch(() => { /* sin indicadores: igual sirven las secciones */ });
    }
    return () => { document.body.classList.remove('sin-scroll-fondo'); if (previo && previo.focus) previo.focus(); };
  }, []);

  const opciones = useMemo(() => {
    const t = normalizar(q);
    const puntaje = texto => { const n = normalizar(texto); if (!t) return 1; const i = n.indexOf(t); return i === 0 ? 3 : i > 0 ? (n[i - 1] === ' ' ? 2 : 1) : 0; };
    const paginas = grupos.flatMap(g => g.items).map(i => ({ clave: `p-${i.to}`, grupo: 'Ir a', icono: i.icono, texto: i.texto, sub: '', accion: () => navegar(i.to), p: puntaje(i.texto) })).filter(o => o.p);
    const acciones = [
      { clave: 'a-nombre', grupo: 'Mi cuenta', icono: 'fa-id-badge', texto: 'Cambiar mi nombre', sub: '', accion: onNombre },
      { clave: 'a-clave', grupo: 'Mi cuenta', icono: 'fa-key', texto: 'Cambiar mi contraseña', sub: '', accion: onClave },
      { clave: 'a-salir', grupo: 'Mi cuenta', icono: 'fa-right-from-bracket', texto: 'Cerrar sesión', sub: '', accion: cerrarSesion },
    ].map(o => ({ ...o, p: puntaje(o.texto) })).filter(o => o.p);
    const abrir = i => { anotarReciente({ id: i.id, nombre: i.nombre, proceso: i.proceso }); navegar(`/indicadores/${i.id}`); };
    const inds = t.length >= 1
      ? indicadores.map(i => ({ clave: `i-${i.id}`, grupo: 'Indicadores', icono: 'fa-chart-simple', texto: i.nombre, sub: i.proceso, accion: () => abrir(i), p: i.texto.includes(t) ? (i.texto.startsWith(t) ? 3 : 2) : 0 })).filter(o => o.p).sort((a, b) => b.p - a.p).slice(0, 8)
      : [];
    // sin nada escrito, lo primero que se ofrece es dónde venías trabajando
    const recientes = t ? [] : leerRecientes().slice(0, 5).map(r => ({
      clave: `r-${r.id}`, grupo: 'Seguir donde ibas', icono: 'fa-clock-rotate-left', texto: r.nombre, sub: r.proceso,
      accion: () => abrir({ id: r.id, nombre: r.nombre, proceso: r.proceso }), p: 1,
    }));
    return [...recientes, ...paginas.sort((a, b) => b.p - a.p), ...inds, ...acciones.sort((a, b) => b.p - a.p)];
  }, [q, grupos, indicadores, navegar, onClave, onNombre]);

  useEffect(() => { setActivo(0); }, [q]);
  useEffect(() => { lista.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [activo]);

  const elegir = o => { if (!o) return; onCerrar(); setTimeout(() => o.accion(), 0); };
  function tecla(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo(a => Math.min(opciones.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo(a => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActivo(0); }
    else if (e.key === 'End') { e.preventDefault(); setActivo(opciones.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); elegir(opciones[activo]); }
    else if (e.key === 'Escape') { e.preventDefault(); onCerrar(); }
    else if (e.key === 'Tab') { e.preventDefault(); }   // el foco se queda en el campo: es una sola cosa que operar
  }

  let ultimoGrupo = null;
  return (
    <div className="paleta-fondo" onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="paleta" role="dialog" aria-modal="true" aria-label="Buscar en la aplicación">
        <div className="paleta-campo">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input ref={entrada} value={q} onChange={e => setQ(e.target.value)} onKeyDown={tecla} type="text" role="combobox" aria-expanded="true" aria-controls="paleta-lista" aria-autocomplete="list"
            aria-activedescendant={opciones[activo] ? `paleta-${opciones[activo].clave}` : undefined} placeholder="Busca una sección, un indicador o una acción…" autoComplete="off" spellCheck={false} aria-label="Buscar" />
          <kbd>Esc</kbd>
        </div>
        <ul id="paleta-lista" role="listbox" ref={lista} className="paleta-lista" aria-label="Resultados">
          {opciones.map((o, i) => {
            const cabecera = o.grupo !== ultimoGrupo;
            ultimoGrupo = o.grupo;
            return (
              <Fragment key={o.clave}>
                {cabecera && <li role="presentation" className="paleta-grupo">{o.grupo}</li>}
                <li role="presentation">
                  <div id={`paleta-${o.clave}`} role="option" aria-selected={i === activo} className={`paleta-item${i === activo ? ' activo' : ''}`} onMouseMove={() => setActivo(i)} onMouseDown={e => e.preventDefault()} onClick={() => elegir(o)}>
                    <i className={`fa-solid ${o.icono}`} aria-hidden="true"></i>
                    <span><strong>{o.texto}</strong>{o.sub && <small>{o.sub}</small>}</span>
                  </div>
                </li>
              </Fragment>
            );
          })}
        </ul>
        {opciones.length === 0 && <p className="paleta-vacio" role="status">No encontré nada para «{q}». Prueba con parte del nombre de un indicador o de una sección.</p>}
        <p className="paleta-ayuda"><kbd>↑</kbd><kbd>↓</kbd> para moverte <kbd>Enter</kbd> para abrir <kbd>Esc</kbd> para cerrar</p>
      </div>
    </div>
  );
}
