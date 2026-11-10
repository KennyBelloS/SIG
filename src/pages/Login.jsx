import { useEffect, useMemo, useRef, useState } from 'react';
import { traducirError } from '../lib/indicadores';
import Escribiendo from '../components/vida/Escribiendo';
import PrevisualizacionApp from '../components/vida/PrevisualizacionApp';
import { useMovil } from '../lib/movil';
import { menosMovimiento } from '../lib/preferencias';
import { iniciarSesion } from '../lib/useSesion';

const CLAVE_CORREO = 'tm:correo-recordado';

/** Un rosal por cada proceso de la finca: crecen, florecen y se mecen. Es decoración pura (aria-hidden). */
export const ROSALES = [
  { x: 36, alto: 118, r: 17, color: '#A91D3A' }, { x: 92, alto: 176, r: 22, color: '#C9932B' }, { x: 148, alto: 140, r: 19, color: '#A91D3A' },
  { x: 204, alto: 206, r: 25, color: '#D4415F' }, { x: 260, alto: 128, r: 18, color: '#C9932B' }, { x: 316, alto: 188, r: 23, color: '#A91D3A' },
  { x: 372, alto: 150, r: 20, color: '#D4415F' }, { x: 428, alto: 198, r: 24, color: '#C9932B' }, { x: 484, alto: 122, r: 17, color: '#A91D3A' },
];

export function Rosal({ x, alto, r, color, i }) {
  const y = 300 - alto;
  return (
    <g className="rosal" style={{ '--i': i, transformOrigin: `${x}px 300px` }}>
      <g className="rosal-tallo" style={{ transformOrigin: `${x}px 300px` }}>
        <line x1={x} y1={300} x2={x} y2={y + r * 0.6} stroke="#3FAE62" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx={x - 12} cy={y + alto * 0.45} rx="12" ry="5" transform={`rotate(-28 ${x - 12} ${y + alto * 0.45})`} fill="#2E8F50" />
        <ellipse cx={x + 12} cy={y + alto * 0.62} rx="12" ry="5" transform={`rotate(28 ${x + 12} ${y + alto * 0.62})`} fill="#2E8F50" />
      </g>
      <g className="rosal-flor" style={{ transformOrigin: `${x}px ${y}px` }}>
        <circle cx={x} cy={y} r={r} fill={color} />
        <circle cx={x} cy={y} r={r * 0.72} fill="#fff" fillOpacity=".14" />
        <path d={`M${x - r * 0.55} ${y} a${r * 0.55} ${r * 0.55} 0 1 1 ${r * 0.55} ${r * 0.55}`} fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" />
        <path d={`M${x - r * 0.2} ${y - r * 0.05} a${r * 0.22} ${r * 0.22} 0 1 1 ${r * 0.22} ${r * 0.22}`} fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </g>
  );
}

const saludo = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; };

export default function Login() {
  const recordado = useMemo(() => { try { return localStorage.getItem(CLAVE_CORREO) || ''; } catch { return ''; } }, []);
  const estrecha = useMovil();
  const [email, setEmail] = useState(recordado);
  const [password, setPassword] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [recordar, setRecordar] = useState(!!recordado);
  const [mayus, setMayus] = useState(false);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [sacudir, setSacudir] = useState(0);
  const [modo, setModo] = useState('entrar');       // 'entrar' | 'ayuda': se cambia con una cuchilla que cruza la tarjeta
  const [cuchilla, setCuchilla] = useState(0);
  const claveRef = useRef(null);
  useEffect(() => { if (recordado) claveRef.current?.focus(); }, [recordado]);

  const cambiarModo = m => {
    if (m === modo) return;
    if (menosMovimiento()) { setModo(m); return; }
    setCuchilla(k => k + 1); setTimeout(() => setModo(m), 400);
  };
  async function enviar(e) {
    e.preventDefault();
    setCargando(true); setError(null);
    try { sessionStorage.setItem('tm:entrando', '1'); } catch { /* sin almacenamiento: no hay animación */ }
    try {
      await iniciarSesion(email, password);
      try { if (recordar) localStorage.setItem(CLAVE_CORREO, email.trim().toLowerCase()); else localStorage.removeItem(CLAVE_CORREO); } catch { /* nada */ }
    } catch (err) { try { sessionStorage.removeItem('tm:entrando'); } catch { /* nada */ } setError(traducirError(err)); setSacudir(n => n + 1); setPassword(''); setTimeout(() => claveRef.current?.focus(), 0); }
    finally { setCargando(false); }
  }

  return (
    <div className="ent2">
      <div className="ent2-aurora" aria-hidden="true" />
      <div className="ent2-tarjeta">
        <section className="ent2-izq" aria-label="Sobre el sistema">
          <img src="/logo.png" alt="Falcon Farms, Finca Torremolinos" className="ent2-logo" />
          <h1><span style={{ '--w': 0 }}>Sistema</span> <span style={{ '--w': 1 }}>de</span> <span style={{ '--w': 2 }}>Gestión</span></h1>
          <p className="ent2-lema">Cada proceso, cada meta, cada mes, en un solo lugar.</p>
          <div className="ent2-prev"><PrevisualizacionApp tipo={estrecha ? 'iphone' : 'macbook'} /></div>
          <span className="ent2-pie">Falcon Farms · Suesca, Cundinamarca</span>
        </section>

        <section className="ent2-der">
          {modo === 'entrar' ? (
            <form key={`f${sacudir}`} className={`entrada-form ent2-form${sacudir ? ' sacude' : ''}`} onSubmit={enviar} noValidate>
              <header>
                <p className="entrada-saludo">{saludo()}</p>
                <h2 aria-label="Inicio de sesión"><Escribiendo texto="Inicio de sesión" className="cursiva" /></h2>
                <p>Usa el correo que te asignó el administrador.</p>
              </header>
              <label htmlFor="login-correo">Correo
                <div className="campo-icono">
                  <i className="fa-regular fa-envelope" aria-hidden="true"></i>
                  <input id="login-correo" type="email" value={email} autoComplete="username" autoFocus={!recordado} required inputMode="email" spellCheck={false}
                    placeholder="nombre@falconfarms.com.co" onChange={e => setEmail(e.target.value)} />
                </div>
              </label>
              <label htmlFor="login-clave">Contraseña
                <div className="campo-icono">
                  <i className="fa-solid fa-lock" aria-hidden="true"></i>
                  <input id="login-clave" ref={claveRef} type={verClave ? 'text' : 'password'} value={password} autoComplete="current-password" required
                    onChange={e => setPassword(e.target.value)} onKeyUp={e => setMayus(!!e.getModifierState && e.getModifierState('CapsLock'))} onBlur={() => setMayus(false)} />
                  <button type="button" className="ver-clave" onClick={() => setVerClave(v => !v)} aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    <i className={`fa-solid ${verClave ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true"></i>
                  </button>
                </div>
                <span className="entrada-mayus" role="status" aria-live="polite">{mayus ? 'Tienes las mayúsculas activadas.' : ''}</span>
              </label>
              <label className="entrada-recordar"><input type="checkbox" checked={recordar} onChange={e => setRecordar(e.target.checked)} /> Recordar mi correo en este equipo</label>
              {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>}
              <button className="btn-primary entrada-boton" type="submit" disabled={cargando || !email || !password}>
                {cargando ? <><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Verificando</> : <>Entrar <i className="fa-solid fa-arrow-right-long" aria-hidden="true"></i></>}
              </button>
              <p className="entrada-ayuda">¿No puedes entrar? <button type="button" className="ent2-enlace" onClick={() => cambiarModo('ayuda')}>Te explico cómo</button></p>
            </form>
          ) : (
            <div className="entrada-form ent2-form ent2-ayuda">
              <header>
                <p className="entrada-saludo">Sin problema</p>
                <h2 aria-label="¿Necesitas ayuda?"><Escribiendo texto="¿Necesitas ayuda?" className="cursiva" /></h2>
                <p>Las cuentas las crea una persona administradora.</p>
              </header>
              <ol className="ent2-pasos">
                <li><span>1</span><div><strong>Escribe al Analista de Gestión Integral</strong><small>Es quien crea y administra las cuentas.</small></div></li>
                <li><span>2</span><div><strong>Te llegarán tu correo y una clave</strong><small>Podrás cambiarla en «Preferencias» al entrar.</small></div></li>
                <li><span>3</span><div><strong>Entra y listo</strong><small>El sistema te muestra cómo funciona la primera vez.</small></div></li>
              </ol>
              <button type="button" className="btn-secondary entrada-boton" onClick={() => cambiarModo('entrar')}><i className="fa-solid fa-arrow-left-long" aria-hidden="true"></i> Volver a iniciar sesión</button>
            </div>
          )}
        </section>
        {cuchilla > 0 && <div className="ent2-cuchilla" key={cuchilla} aria-hidden="true" onAnimationEnd={() => setCuchilla(0)} />}
      </div>
    </div>
  );
}
