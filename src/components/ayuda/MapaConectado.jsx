import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { COLUMNAS, SERVICIOS, ROL, nodosPara } from './contenido';

const FLUJO_CORREO = [
  ['fa-clock', 'GitHub Actions', 'A las 8:00 a.m. (hora de Colombia) toca la puerta de la función de correos con la clave secreta.'],
  ['fa-bolt', 'Función de correos', 'Comprueba la fecha. Si hoy es 2, 10 o 12, sigue; si no, termina sin hacer nada.'],
  ['fa-database', 'Supabase', 'La función pregunta qué indicadores faltan en cada proceso y a quién hay que avisar.'],
  ['fa-envelope-open-text', 'La función arma el correo', 'Uno por proceso, con su lista de pendientes, el logo y la firma del cargo.'],
  ['fa-paper-plane', 'Brevo', 'Recibe cada correo y lo entrega a las bandejas de entrada.'],
  ['fa-lock', 'El día 12', 'Además de avisar, la función cierra el mes en Supabase. Desde ahí nadie puede modificarlo.'],
];

/** Mapa interactivo: toca un elemento y se iluminan los que se conectan con él. */
export default function MapaConectado({ rol = 'admin' }) {
  const NODOS = useMemo(() => nodosPara(rol), [rol]);
  const [vista, setVista] = useState('funciones');
  const [sel, setSel] = useState('bd');
  const [selS, setSelS] = useState('func');
  const nodo = NODOS.find(x => x.id === sel) || NODOS[0];
  const servicio = SERVICIOS.find(x => x.id === selS);

  const conectados = useMemo(() => {
    const s = new Set([sel]);
    const n = NODOS.find(x => x.id === sel) || NODOS[0];
    n.recibe.forEach(x => s.add(x)); n.alimenta.forEach(x => s.add(x));
    NODOS.forEach(o => { if (o.recibe.includes(sel) || o.alimenta.includes(sel)) s.add(o.id); });
    return s;
  }, [sel, NODOS]);
  const conectadosS = useMemo(() => {
    const s = new Set([selS]); const x = SERVICIOS.find(o => o.id === selS);
    x.habla.forEach(o => s.add(o)); SERVICIOS.forEach(o => { if (o.habla.includes(selS)) s.add(o.id); });
    return s;
  }, [selS]);
  const nombre = id => NODOS.find(x => x.id === id)?.titulo || id;

  return (
    <section className="panel mapa-con" aria-label="Todo conectado">
      <div className="panel-header">
        <div><h2>Todo conectado</h2><p className="sub">Toca un elemento: se iluminan con los que se conecta y abajo se explica para qué sirve.</p></div>
        {rol === 'admin' && <div className="filtros-estado" role="tablist">
          <button role="tab" aria-selected={vista === 'funciones'} className={`filtro-chip ${vista === 'funciones' ? 'filtro-chip-activo' : ''}`} onClick={() => setVista('funciones')}>Las funciones</button>
          <button role="tab" aria-selected={vista === 'servicios'} className={`filtro-chip ${vista === 'servicios' ? 'filtro-chip-activo' : ''}`} onClick={() => setVista('servicios')}>Los servicios técnicos</button>
        </div>}
      </div>

      {vista === 'funciones' || rol !== 'admin' ? (
        <>
          <div className="mc-columnas">
            {COLUMNAS.map((c, ci) => (
              <div key={c.id} className="mc-col">
                <div className="mc-cab"><b>{c.titulo}</b><small>{c.nota}</small>{ci < 2 && <i className="fa-solid fa-arrow-right mc-flecha" aria-hidden="true"></i>}</div>
                {NODOS.filter(x => x.col === c.id).map(x => (
                  <button key={x.id} className={`mc-nodo${sel === x.id ? ' sel' : ''}${conectados.has(x.id) && sel !== x.id ? ' con' : ''}${!conectados.has(x.id) ? ' apagado' : ''}`}
                    onClick={() => setSel(x.id)} aria-pressed={sel === x.id}>
                    <i className={`fa-solid ${x.icono}`} aria-hidden="true"></i><span>{x.titulo}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="mc-detalle" key={sel}>
            <div className="mc-detalle-cab"><i className={`fa-solid ${nodo.icono}`} aria-hidden="true"></i><h3>{nodo.titulo}</h3>
              <span className="mc-roles">{nodo.roles.filter(r => r === rol || rol === 'admin').map(r => <em key={r} style={{ background: `${ROL[r].color}18`, color: ROL[r].color }}>{ROL[r].nombre}</em>)}</span></div>
            <p className="mc-sirve"><b>Para qué sirve.</b> {nodo.sirve}</p>
            <p className="mc-texto">{nodo.detalle}</p>
            <div className="mc-enlaces">
              {nodo.recibe.length > 0 && <div><b>Recibe de</b>{nodo.recibe.map(r => <button key={r} className="mc-chip" onClick={() => setSel(r)}>{nombre(r)}</button>)}</div>}
              {nodo.alimenta.length > 0 && <div><b>Alimenta a</b>{nodo.alimenta.map(r => <button key={r} className="mc-chip" onClick={() => setSel(r)}>{nombre(r)}</button>)}</div>}
            </div>
            {nodo.ruta && <Link className="btn-secondary" to={nodo.ruta}>Abrir {nodo.titulo}</Link>}
          </div>
        </>
      ) : (
        <>
          <div className="mc-servicios">
            {SERVICIOS.map(x => (
              <button key={x.id} className={`mc-serv${selS === x.id ? ' sel' : ''}${conectadosS.has(x.id) && selS !== x.id ? ' con' : ''}${!conectadosS.has(x.id) ? ' apagado' : ''}`} onClick={() => setSelS(x.id)} aria-pressed={selS === x.id}>
                <i className={`fa-solid ${x.icono}`} aria-hidden="true"></i><b>{x.titulo}</b><small>{x.donde}</small>
              </button>
            ))}
          </div>
          <div className="mc-detalle" key={selS}>
            <div className="mc-detalle-cab"><i className={`fa-solid ${servicio.icono}`} aria-hidden="true"></i><h3>{servicio.titulo}</h3><span className="mc-roles"><em>{servicio.donde}</em></span></div>
            <p className="mc-sirve"><b>Qué hace.</b> {servicio.hace}</p>
            <p className="mc-texto">{servicio.nota}</p>
            <div className="mc-enlaces">
              <div><b>Habla con</b>{servicio.habla.map(h => <button key={h} className="mc-chip" onClick={() => setSelS(h)}>{SERVICIOS.find(s => s.id === h).titulo}</button>)}</div>
              <div><b>Variables que usa</b>{servicio.vars.map(v => <code key={v} className="mc-var">{v}</code>)}</div>
            </div>
          </div>
          <div className="mc-flujo">
            <h3>Qué pasa cuando llega el día 2, paso a paso</h3>
            <ol>
              {FLUJO_CORREO.map(([ic, t, d], i) => (
                <li key={t} style={{ '--d': `${i * 0.25}s` }}><span className="n">{i + 1}</span><i className={`fa-solid ${ic}`} aria-hidden="true"></i><div><b>{t}</b><p>{d}</p></div></li>
              ))}
            </ol>
          </div>
        </>
      )}
    </section>
  );
}
