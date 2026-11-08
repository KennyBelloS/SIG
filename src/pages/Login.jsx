import { useEffect, useMemo, useRef, useState } from 'react';
import { traducirError } from '../lib/indicadores';
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
  const [email, setEmail] = useState(recordado);
  const [password, setPassword] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [recordar, setRecordar] = useState(!!recordado);
  const [mayus, setMayus] = useState(false);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [sacudir, setSacudir] = useState(0);
  const claveRef = useRef(null);
  const marcaRef = useRef(null);
  const moverRaton = e => { const r = marcaRef.current; if (!r) return; const b = r.getBoundingClientRect(); r.style.setProperty('--mx', ((e.clientX - b.left) / b.width - 0.5) * 2); r.style.setProperty('--my', ((e.clientY - b.top) / b.height - 0.5) * 2); };
  useEffect(() => { if (recordado) claveRef.current?.focus(); }, [recordado]);

  async function enviar(e) {
    e.preventDefault();
    setCargando(true); setError(null);
    try { sessionStorage.setItem('tm:entrando', '1'); } catch { /* sin almacenamiento: no hay animación */ }
    try {
      await iniciarSesion(email, password);
      try { if (recordar) localStorage.setItem(CLAVE_CORREO, email.trim().toLowerCase()); else localStorage.removeItem(CLAVE_CORREO); } catch { /* sin almacenamiento: no pasa nada */ }
    } catch (err) { try { sessionStorage.removeItem('tm:entrando'); } catch { /* nada */ } setError(traducirError(err)); setSacudir(n => n + 1); setPassword(''); setTimeout(() => claveRef.current?.focus(), 0); }
    finally { setCargando(false); }
  }

  return (
    <div className="entrada">
      <section className="entrada-marca" aria-label="Sobre el sistema" ref={marcaRef} onMouseMove={moverRaton}>
        <div className="entrada-luz" aria-hidden="true" />
        <img src="/logo.png" alt="Falcon Farms, Finca Torremolinos" className="entrada-logo" />
        <h1><span style={{ '--w': 0 }}>Sistema</span> <span style={{ '--w': 1 }}>de</span> <span style={{ '--w': 2 }}>Gestión</span></h1>
        <p className="entrada-lema">Un solo lugar para llevar la gestión de la finca: cada proceso, cada meta, cada mes.</p>
        <ul className="entrada-modulos" aria-label="Módulos del sistema">
          <li className="activo"><i className="fa-solid fa-chart-simple" aria-hidden="true"></i> Indicadores</li>
          <li className="pronto"><i className="fa-solid fa-plus" aria-hidden="true"></i> Más módulos, pronto</li>
        </ul>
        <svg className="entrada-campo" viewBox="0 0 520 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
          <line x1="0" y1="299" x2="520" y2="299" stroke="#3FAE62" strokeOpacity=".5" strokeWidth="2" />
          {ROSALES.map((r, i) => <Rosal key={i} i={i} {...r} />)}
        </svg>
        <div className="entrada-petalos" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
        <span className="entrada-pie">Falcon Farms · Suesca, Cundinamarca</span>
      </section>

      <section className="entrada-acceso">
        <form key={sacudir} className={`entrada-form${sacudir ? ' sacude' : ''}`} onSubmit={enviar} noValidate>
          <header>
            <p className="entrada-saludo">{saludo()}</p>
            <h2>Iniciar sesión</h2>
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
          <p className="entrada-ayuda">¿No puedes entrar? Escribe al Analista de Gestión Integral.</p>
        </form>
      </section>
    </div>
  );
}
