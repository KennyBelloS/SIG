import { useEffect, useState } from 'react';
import { Dispositivo, Escala } from './Dispositivo';
import { menosMovimiento } from '../../lib/preferencias';

const ESCENAS = ['Tu mes de un vistazo', 'El año, mes a mes', 'Te avisa a tiempo'];
function useContar(meta, dur = 1100) {
  const [v, setV] = useState(() => (menosMovimiento() ? meta : 0));
  useEffect(() => {
    if (menosMovimiento()) { setV(meta); return undefined; }
    let raf; const t0 = performance.now();
    const paso = a => { const k = Math.min(1, (a - t0) / dur); setV(Math.round(meta * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(paso); };
    raf = requestAnimationFrame(paso); return () => cancelAnimationFrame(raf);
  }, [meta, dur]);
  return v;
}
const Barra = () => <div className="pv-barra-sup"><span className="pv-logo"><img src="/logo-icon.png" alt="" /></span><b>sistema <i>de gestión</i></b></div>;

function EscMes() {
  const dias = useContar(7), pct = useContar(86), pend = useContar(12);
  return (
    <div className="pv-esc">
      <Barra />
      <h4>Noviembre <i>2026</i></h4>
      <div className="pv-cards">
        <div className="pv-card"><small>Quedan</small><strong>{dias}</strong><span>días para registrar</span><u className="pv-prog"><i /></u></div>
        <div className="pv-card oscura"><small>Cumplen su meta</small><strong>{pct}<em>%</em></strong><span>de lo registrado</span></div>
        <div className="pv-card"><small>Por registrar</small><strong>{pend}</strong><span>indicadores</span><span className="pv-pts"><i /><i /><i /><i /></span></div>
      </div>
      <div className="pv-procesos">{['Producción', 'Poscosecha', 'MIPE'].map((p, k) => <div key={p} style={{ '--k': k }}><b>{p}</b><span>{Array.from({ length: 6 }, (_, c) => <i key={c} className={['v', 'v', 'm', 'v', 'a', 'v'][(c + k) % 6]} style={{ '--c': c }} />)}</span></div>)}</div>
    </div>
  );
}
function EscAnio() {
  const filas = ['Producción', 'Poscosecha', 'Gestión Humana', 'MIRFE', 'Mantenimiento', 'MIPE'];
  const tipo = (r, c) => { if (c > 10) return 'f'; const x = (r * 7 + c * 5 + r * c) % 11; return x < 6 ? 'v' : x < 8 ? 'a' : x < 10 ? 'm' : 'h'; };
  return (
    <div className="pv-esc">
      <Barra />
      <h4>El año <i>2026</i></h4>
      <div className="pv-mapa">{filas.map((f, r) => <div key={f}><b>{f}</b><span>{Array.from({ length: 12 }, (_, c) => <i key={c} className={tipo(r, c)} style={{ '--c': r * 3 + c }} />)}</span></div>)}</div>
      <p className="pv-leyenda"><i className="v" /> cumple <i className="m" /> no cumple <i className="a" /> casi <i className="h" /> sin registrar</p>
    </div>
  );
}
function EscAvisos() {
  return (
    <div className="pv-esc pv-avisos">
      <div className="pv-barra-sup"><span className="pv-logo"><img src="/logo-icon.png" alt="" /></span><b>sistema <i>de gestión</i></b><span className="pv-campana"><i className="fa-regular fa-bell"></i><u>2</u></span></div>
      <i className="fa-solid fa-paper-plane pv-avion" aria-hidden="true"></i>
      <div className="pv-carta"><div><b>Avisos</b></div><p><i className="fa-solid fa-hourglass-half"></i> Quedan 2 días para registrar noviembre</p><p><i className="fa-solid fa-triangle-exclamation"></i> 2 indicadores no cumplen y no tienen plan</p></div>
    </div>
  );
}

/** Una vista previa muy animada de lo más importante de la aplicación, dentro de un iPhone o una MacBook: el mes de un vistazo,
 *  el año mes a mes y los avisos con su avión. Cambia de escena sola. Todo son datos de ejemplo. */
export default function PrevisualizacionApp({ tipo = 'macbook' }) {
  const [i, setI] = useState(0);
  useEffect(() => { if (menosMovimiento()) return undefined; const t = setInterval(() => setI(k => (k + 1) % ESCENAS.length), 4600); return () => clearInterval(t); }, []);
  return (
    <div className={`pv pv-${tipo}`}>
      <Dispositivo tipo={tipo} etiqueta="Vista previa animada de la aplicación">
        <div className="pv-pantalla">
          <div className={`pv-lienzo ${tipo === 'macbook' ? 'ancha' : 'angosta'}`} key={i}><Escala ancho={tipo === 'macbook' ? 560 : 340}>{i === 0 ? <EscMes /> : i === 1 ? <EscAnio /> : <EscAvisos />}</Escala></div>
          <div className="pv-pie"><span className="pv-etq">{ESCENAS[i]}</span><span className="pv-puntos">{ESCENAS.map((e, k) => <button key={e} type="button" className={k === i ? 'on' : ''} aria-label={e} onClick={() => setI(k)} />)}</span></div>
        </div>
      </Dispositivo>
    </div>
  );
}
