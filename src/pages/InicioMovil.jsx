import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CartaDesplegable from '../components/vida/CartaDesplegable';
import TourDispositivo from '../components/vida/TourDispositivo';
import { useSesion } from '../lib/useSesion';
import { useMovil } from '../lib/movil';
import { getResumenMes, mesReporteActual, traducirError, MESES } from '../lib/indicadores';
import Cargando from '../components/Cargando';
import Numero from '../components/Numero';

const saludo = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; };

/** Inicio del celular: una tira de tarjetas con lo urgente y, debajo, una tarjeta por proceso (toca una para ver sus indicadores). */
export default function InicioMovil() {
  const { sesion } = useSesion();
  const movil = useMovil();
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [carta, setCarta] = useState(null);
  const navegar = useNavigate();
  const { anio, mesActual } = mesReporteActual();
  useEffect(() => { getResumenMes(anio, mesActual).then(setD).catch(e => setError(traducirError(e))); }, [anio, mesActual]);

  const hoy = new Date();
  const restan = d ? d.diaCierre - hoy.getDate() : null;
  const t = d?.totales;
  const evaluados = t ? t.cumplen + t.noCumplen : 0;
  const pct = evaluados ? Math.round((t.cumplen / evaluados) * 100) : null;
  const primero = sesion?.nombre ? sesion.nombre.split(/\s+/)[0] : null;

  return (
    <div className="page inicio-movil">
      <header className="im-cab">
        <p className="im-saludo">{saludo()}{primero ? `, ${primero}` : ''}</p>
        <h1>{MESES[mesActual - 1]} <i>{anio}</i></h1>
      </header>
      {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>}
      {!d && !error && <Cargando filas={3} alto={120} />}
      {d && (
        <>
          <section className="im-tira" aria-label="Lo más importante del mes: desliza hacia los lados" tabIndex={0}>
            <article className={`im-carta ${d.cerrado ? 'tono-mal' : restan <= 2 ? 'tono-aten' : 'tono-bien'}`}>
              <small>{d.cerrado ? 'Plazo' : 'Quedan'}</small>
              <strong>{d.cerrado ? <i className="fa-solid fa-lock" aria-hidden="true"></i> : <Numero valor={Math.max(0, restan)} />}</strong>
              <span>{d.cerrado ? `${MESES[mesActual - 1]} está cerrado` : restan === 0 ? 'hoy es el último día' : `${restan === 1 ? 'día' : 'días'} para registrar`}</span>
              <span className="im-viz im-barra" aria-hidden="true"><i style={{ '--p': `${Math.min(100, Math.round((hoy.getDate() / d.diaCierre) * 100))}%` }} /></span>
            </article>
            <article className={`im-carta ${pct == null ? '' : pct >= 85 ? 'tono-bien' : pct >= 60 ? 'tono-aten' : 'tono-mal'}`}>
              <small>Cumplen su meta</small>
              <strong>{pct == null ? '—' : <><Numero valor={pct} /><em>%</em></>}</strong>
              <span>{evaluados ? `${t.cumplen} de ${evaluados} registrados` : 'aún sin resultados'}</span>
              <svg className="im-viz im-anillo" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" className="a-f" /><circle cx="18" cy="18" r="15" className="a-v" pathLength="100" strokeDasharray="100" style={{ '--v': 100 - (pct || 0) }} transform="rotate(-90 18 18)" /></svg>
            </article>
            <article className={`im-carta ${t.pendientes ? 'tono-aten' : 'tono-bien'}`}>
              <small>Por registrar</small>
              <strong><Numero valor={t.pendientes} /></strong>
              <span>{t.pendientes === 1 ? 'indicador' : 'indicadores'} sin dato</span>
              <span className="im-viz im-checks" aria-hidden="true"><i /><i /><i /><i /></span>
            </article>
            <article className={`im-carta ${t.sinPlan ? 'tono-mal' : 'tono-bien'}`}>
              <small>Sin plan</small>
              <strong><Numero valor={t.sinPlan} /></strong>
              <span>no cumplen y no tienen plan</span>
              <i className="fa-solid fa-triangle-exclamation im-viz im-pulso" aria-hidden="true"></i>
            </article>
          </section>

          <section className="inicio-demo" aria-labelledby="im-asi">
            <div className="im-seccion-cab"><h2 className="im-titulo" id="im-asi">Así funciona</h2><button type="button" className="btn-texto" onClick={() => window.dispatchEvent(new Event('indicadores:tour'))}><i className="fa-solid fa-expand" aria-hidden="true"></i> Verlo en pantalla completa</button></div>
            <TourDispositivo rol={sesion?.rol || 'usuario'} compacto />
          </section>

          <h2 className="im-titulo">Tus procesos</h2>
          {d.porProceso.length === 0 && <div className="estado-vacio"><i className="fa-solid fa-seedling" aria-hidden="true"></i><h3>Todavía no hay indicadores</h3><p>Cuando un administrador los cree, aparecerán aquí.</p></div>}
          <div className="im-mosaico">
            {d.porProceso.map((p, i) => {
              const tono = p.noCumplen > 0 ? 'mal' : p.pendientes > 0 ? 'aten' : 'bien';
              const on = abierto === p.id;
              return (
                <article key={p.id} className={`im-proceso tono-${tono}${on ? ' abierta' : ''}`} style={{ '--k': i }}>
                  <button type="button" className="im-proceso-cab" aria-expanded={on} onClick={() => setAbierto(on ? null : p.id)}>
                    <h3>{p.nombre}</h3>
                    <p>{p.registrados} de {p.total} registrados</p>
                    <div className="im-casillas" aria-hidden="true">{p.items.map((it, c) => <i key={it.id} className={`e-${it.estado}`} style={{ '--c': c }} />)}</div>
                    <span className="im-resumen">{p.cumplen > 0 && <b className="ok">{p.cumplen} cumplen</b>}{p.noCumplen > 0 && <b className="mal">{p.noCumplen} no cumplen</b>}{p.pendientes > 0 && <b className="aten">{p.pendientes} faltan</b>}</span>
                  </button>
                  {on && (
                    <ul className="im-lista">
                      {p.items.map(it => <li key={it.id}><button type="button" className="im-item" aria-haspopup="dialog" onClick={e => setCarta({ it, proceso: p.nombre, ancla: e.currentTarget })}><i className={`im-punto e-${it.estado}`} aria-hidden="true" /><span>{it.nombre}</span><small>{{ cumple: 'Cumple', no: 'No cumple', pendiente: 'Por registrar', sinmeta: 'Sin meta' }[it.estado]}</small></button></li>)}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
      {carta && (
        <CartaDesplegable ancla={carta.ancla} alinear="centro" ancho={340} titulo={`Vista previa: ${carta.it.nombre}`} onCerrar={() => setCarta(null)}>
          {({ cerrar }) => {
            const e = carta.it.estado;
            const texto = { cumple: 'Cumple su meta este mes.', no: carta.it.sinPlan ? 'No cumple y todavía no tiene plan de acción.' : 'No cumple su meta: revisa su plan de acción.', pendiente: sesion?.puedeRegistrar ? 'Falta registrarlo este mes. Abre la ficha y toca el mes.' : 'Todavía no tiene dato este mes.', sinmeta: 'Tiene dato, pero no tiene una meta definida.' }[e];
            return {
              cabecera: <div className="carta-prev cp-cab"><small>{carta.proceso}</small><h3>{carta.it.nombre}</h3></div>,
              cuerpo: <div className="carta-prev cp-cuerpo"><span className={`carta-prev-estado e-${e}`}><i className={`im-punto e-${e}`} aria-hidden="true" /> {{ cumple: 'Cumple', no: 'No cumple', pendiente: 'Por registrar', sinmeta: 'Sin meta' }[e]}</span><p>{texto}</p></div>,
              pie: <div className="carta-prev cp-pie"><button type="button" className="btn-primary" onClick={() => { cerrar(); navegar(`/indicadores/${carta.it.id}`); }}>Abrir la ficha <i className="fa-solid fa-arrow-right-long" aria-hidden="true"></i></button></div>,
            };
          }}
        </CartaDesplegable>
      )}
    </div>
  );
}
