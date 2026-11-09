import { useEffect, useRef, useState } from 'react';
import { Dispositivo } from './Dispositivo';
import InterruptorTema from './InterruptorTema';
import ResumenVivo from './ResumenVivo';
import { volar } from './volar';
import { agregarAviso, origenVuelo, NOMBRE_PLATAFORMA } from '../../lib/avisos';

const PLAT = { iphone: 'ios', android: 'android', macbook: 'pc' };
const TRANS = [['onda', 'Onda desde el clic'], ['sube', 'Sube con desenfoque'], ['zoom', 'Zoom suave'], ['giro', 'Giro de página']];
const EJEMPLO = [
  { id: 'a', icono: 'fa-bullseye', titulo: 'Cumplimiento', valor: '86%', texto: 'de los indicadores cumple su meta', tono: 'bien' },
  { id: 'b', icono: 'fa-trophy', titulo: 'Mejor proceso', valor: 'MIPE', texto: '100% de cumplimiento', tono: 'bien' },
  { id: 'c', icono: 'fa-triangle-exclamation', titulo: 'Pide atención', valor: 'Seguridad', texto: '20% de cumplimiento', tono: 'mal' },
  { id: 'd', icono: 'fa-hourglass-half', titulo: 'Plazo', valor: '7 días', texto: 'para registrar este mes', tono: 'aten' },
];
const menos = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Un banco de pruebas de todo lo que se mueve: cada efecto se ve dentro de un iPhone, un Android o una MacBook, y se puede lanzar
 *  también «de verdad» en la pantalla real. Es el lugar para probar antes de llevar estas animaciones a otra aplicación. */
export default function Laboratorio() {
  const [tipo, setTipo] = useState('iphone');
  const [plat, setPlat] = useState(() => { try { return localStorage.getItem('tm:plataforma-prueba') || 'auto'; } catch { return 'auto'; } });
  const pant = useRef(null), campana = useRef(null);
  const [badge, setBadge] = useState(0), [suena, setSuena] = useState(false), [isla, setIsla] = useState(false), [ocupado, setOcupado] = useState(false);
  const [carta, setCarta] = useState(false), [cortina, setCortina] = useState(false), [pag, setPag] = useState(0), [trans, setTrans] = useState('');
  useEffect(() => { setBadge(0); setIsla(false); setCarta(false); setCortina(false); }, [tipo]);

  const probarAviso = () => {
    const c = pant.current, b = campana.current; if (!c || !b || ocupado) return;
    const rc = c.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const hasta = { x: rb.left - rc.left + rb.width / 2, y: rb.top - rc.top + rb.height / 2 };
    const desde = origenVuelo(PLAT[tipo], rc.width, rc.height, 0);
    setOcupado(true);
    const llega = () => { setBadge(n => n + 1); setSuena(true); setTimeout(() => { setSuena(false); setOcupado(false); }, 950); };
    if (menos()) { llega(); return; }
    if (tipo === 'iphone') { setIsla(true); setTimeout(() => volar({ contenedor: c, desde, hasta, alLlegar: llega }), 650); setTimeout(() => setIsla(false), 2500); }
    else volar({ contenedor: c, desde, hasta, alLlegar: llega });
  };
  const probarTransicion = t => { setTrans(t); setPag(p => 1 - p); };
  const forzar = v => { setPlat(v); try { if (v === 'auto') localStorage.removeItem('tm:plataforma-prueba'); else localStorage.setItem('tm:plataforma-prueba', v); } catch { /* nada */ } };
  const avisoReal = () => agregarAviso({ id: `lab-${Date.now()}`, tono: 'info', icono: 'fa-flask', titulo: 'Aviso de prueba', detalle: 'Así llega un aviso de verdad a esta pantalla.' });

  return (
    <div className="lab">
      <div className="lab-escenario">
        <div className="lab-selector" role="radiogroup" aria-label="Dispositivo de prueba">
          {[['iphone', 'iPhone', 'fa-mobile-screen'], ['android', 'Android', 'fa-mobile'], ['macbook', 'MacBook', 'fa-laptop']].map(([k, t, ic]) => (
            <button key={k} type="button" role="radio" aria-checked={tipo === k} className={tipo === k ? 'activo' : ''} onClick={() => setTipo(k)}><i className={`fa-solid ${ic}`} aria-hidden="true"></i> {t}</button>
          ))}
        </div>
        <Dispositivo tipo={tipo} pantallaRef={pant}>
          <div className={`mock-app mock-${tipo}`}>
            <div className="mock-barra">
              <span className="logo-ficha mock-logo"><img src="/logo-icon.png" alt="" /></span>
              <b className="mock-marca">sistema <i>de gestión</i></b>
              <button ref={campana} type="button" className={`campana mock-campana${suena ? ' suena' : ''}`} onClick={() => setCarta(c => !c)} aria-label={badge ? `Avisos de prueba: ${badge}` : 'Avisos de prueba'}>
                <i className="fa-regular fa-bell" aria-hidden="true"></i>{badge > 0 && <b className="campana-punto" key={badge} aria-hidden="true">{badge}</b>}
              </button>
              <button type="button" className="mock-fab" onClick={() => setCortina(true)} aria-label="Probar la cortina del botón +"><i className="fa-solid fa-plus" aria-hidden="true"></i></button>
            </div>
            <div className={`mock-pagina${trans ? ` mock-${trans}` : ''}`} key={pag}>
              {pag === 0 ? (<><h4>Noviembre <i>2026</i></h4><div className="mock-cards"><div className="mock-card"><small>Quedan</small><strong>7</strong><span>días</span></div><div className="mock-card oscura"><small>Cumplen</small><strong>86%</strong><span>de la meta</span></div></div><div className="mock-fila" /><div className="mock-fila corta" /></>)
                : (<><h4>Indicadores</h4><div className="mock-lista"><div className="mock-fila" /><div className="mock-fila" /><div className="mock-fila corta" /><div className="mock-fila" /></div></>)}
            </div>
            {isla && <div className="isla-aviso mock-isla" aria-hidden="true"><i className="fa-solid fa-bell"></i><span><strong>Aviso nuevo</strong></span></div>}
            {carta && <div className="carta-desp dentro" role="dialog" aria-label="Avisos de prueba"><div className="avisos-carta"><header><h2><i className="fa-regular fa-bell" aria-hidden="true"></i> Avisos</h2></header><ul><li><button type="button"><span className="aviso-ico tono-aten"><i className="fa-solid fa-hourglass-half" aria-hidden="true"></i></span><span className="aviso-texto"><strong>Quedan 7 días</strong><small>para registrar noviembre</small></span></button></li></ul></div></div>}
            {cortina && <button type="button" className="mock-cortina" onClick={() => setCortina(false)} aria-label="Cerrar la cortina de prueba"><span>¿Qué quieres<br />hacer hoy?</span><em>Toca para cerrar</em></button>}
          </div>
        </Dispositivo>
      </div>

      <div className="lab-controles">
        <section className="lab-grupo">
          <h3>Aviso con avión</h3>
          <p>{NOMBRE_PLATAFORMA[PLAT[tipo]]}. La isla del iPhone es un dibujo dentro de la página: una web no puede usar la isla dinámica real del sistema.</p>
          <div className="lab-botones"><button type="button" className="btn-primary lab-boton" onClick={probarAviso} disabled={ocupado}><i className="fa-solid fa-paper-plane" aria-hidden="true"></i> Probar en {{ iphone: 'el iPhone', android: 'el Android', macbook: 'la MacBook' }[tipo]}</button>
            <button type="button" className="btn-secondary lab-boton" onClick={() => setCarta(c => !c)}><i className="fa-solid fa-envelope-open-text" aria-hidden="true"></i> Carta que se desdobla</button></div>
          <div className="lab-botones"><button type="button" className="btn-secondary lab-boton" onClick={avisoReal}><i className="fa-solid fa-flask" aria-hidden="true"></i> Lanzar un aviso real en esta pantalla</button></div>
          <label className="lab-forzar">Plataforma para el aviso real
            <select value={plat} onChange={e => forzar(e.target.value)}><option value="auto">Detectar la de este equipo</option><option value="ios">iPhone</option><option value="android">Android</option><option value="pc">Computador</option></select></label>
        </section>
        <section className="lab-grupo">
          <h3>Transición entre módulos</h3>
          <p>Rápidas (menos de medio segundo). Cada módulo usa una distinta.</p>
          <div className="lab-botones">{TRANS.map(([k, t]) => <button key={k} type="button" className="btn-secondary lab-boton" onClick={() => probarTransicion(k)}>{t}</button>)}</div>
        </section>
        <section className="lab-grupo">
          <h3>Cortina del botón +</h3>
          <div className="lab-botones"><button type="button" className="btn-secondary lab-boton" onClick={() => setCortina(true)}><i className="fa-solid fa-plus" aria-hidden="true"></i> Abrir la cortina en el dispositivo</button></div>
        </section>
        <section className="lab-grupo">
          <h3>Modo oscuro</h3>
          <p>Arrastra la perilla por la ranura (o tócala). El cambio se revela como un círculo.</p>
          <InterruptorTema />
        </section>
        <section className="lab-grupo">
          <h3>Botones con vida</h3>
          <p>Cada toque lanza una onda y un anillo de choque.</p>
          <div className="lab-botones"><button type="button" className="btn-primary lab-boton">Principal</button><button type="button" className="btn-secondary lab-boton">Secundario</button></div>
        </section>
      </div>

      <div className="lab-ancho"><ResumenVivo titulo="Resumen vivo (ejemplo)" items={EJEMPLO} intervalo={3600} /></div>
    </div>
  );
}
