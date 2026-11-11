import { useEffect, useMemo, useRef, useState } from 'react';
import { traducirError } from '../lib/indicadores';
import Escribiendo from '../components/vida/Escribiendo';
import PrevisualizacionApp from '../components/vida/PrevisualizacionApp';
import { useMovil } from '../lib/movil';
import { menosMovimiento } from '../lib/preferencias';
import { iniciarSesion } from '../lib/useSesion';
import { resolverAcceso } from '../lib/acceso';
import { recuperarClave } from '../lib/usuarios';

const CLAVE_CORREO = 'tm:correo-recordado';
const CLAVE_VIA = 'tm:acceso-via';
const CORREO_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

/** Las seis casillas del PIN: avanzan solas, aceptan pegar el PIN completo y se mueven con las flechas y la tecla de borrar. */
function CajasPin({ valor, onCambio, visible, error }) {
  const refs = useRef([]);
  const enfocar = i => { const el = refs.current[Math.max(0, Math.min(5, i))]; if (el) { el.focus(); el.select?.(); } };
  const cambio = (i, texto) => {
    const d = texto.replace(/\D/g, '');
    if (!d) return;
    const nuevo = (valor.slice(0, Math.min(i, valor.length)) + d + valor.slice(i + 1)).slice(0, 6);
    onCambio(nuevo); enfocar(Math.min(nuevo.length, 5));
  };
  const tecla = (i, e) => {
    if (e.key === 'Backspace') { e.preventDefault(); if (valor[i]) onCambio(valor.slice(0, i) + valor.slice(i + 1)); else if (i > 0) { onCambio(valor.slice(0, i - 1) + valor.slice(i)); enfocar(i - 1); } }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); enfocar(i - 1); } else if (e.key === 'ArrowRight') { e.preventDefault(); enfocar(i + 1); }
  };
  const pegar = e => { const d = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (!d) return; e.preventDefault(); onCambio(d); enfocar(Math.min(d.length, 5)); };
  return (
    <div className={`pin-cajas${error ? ' pin-error' : ''}`} role="group" aria-label="PIN de 6 dígitos" onPaste={pegar}>
      {Array.from({ length: 6 }, (_, i) => (
        <input key={i} ref={el => { refs.current[i] = el; }} className={`pin-caja${valor[i] ? ' llena' : ''}`} type={visible ? 'text' : 'password'} inputMode="numeric" pattern="[0-9]*"
          maxLength={2} autoComplete={i === 0 ? 'current-password' : 'off'} aria-label={`PIN, dígito ${i + 1} de 6`} value={valor[i] || ''}
          onChange={e => cambio(i, e.target.value)} onKeyDown={e => tecla(i, e)} onFocus={e => e.target.select()} />
      ))}
    </div>
  );
}

export default function Login() {
  const recordado = useMemo(() => { try { return localStorage.getItem(CLAVE_CORREO) || ''; } catch { return ''; } }, []);
  const viaGuardada = useMemo(() => { try { return localStorage.getItem(CLAVE_VIA) === 'pin' ? 'pin' : 'correo'; } catch { return 'correo'; } }, []);
  const estrecha = useMovil();
  const [via, setVia] = useState(viaGuardada);          // 'correo' (administrador y digitador) | 'pin' (usuario con cédula e ingeniero con usuario)
  const [email, setEmail] = useState(recordado);
  const [password, setPassword] = useState('');
  const [idTexto, setIdTexto] = useState('');
  const [pin, setPin] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [recordar, setRecordar] = useState(!!recordado);
  const [mayus, setMayus] = useState(false);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [sacudir, setSacudir] = useState(0);
  const [modo, setModo] = useState('entrar');           // 'entrar' | 'olvide' | 'ayuda': se cambia con una cuchilla que cruza la tarjeta
  const [cuchilla, setCuchilla] = useState(0);
  const [recEmail, setRecEmail] = useState(recordado);
  const [recEstado, setRecEstado] = useState('idle');   // idle | enviando | enviado
  const [recError, setRecError] = useState(null);
  const [recEspera, setRecEspera] = useState(0);
  const claveRef = useRef(null), idRef = useRef(null);
  useEffect(() => { if (recordado && via === 'correo') claveRef.current?.focus(); }, [recordado]);   // eslint-disable-line
  useEffect(() => { if (recEspera <= 0) return undefined; const t = setTimeout(() => setRecEspera(n => n - 1), 1000); return () => clearTimeout(t); }, [recEspera]);

  const cambiarModo = m => {
    if (m === modo) return;
    setError(null);
    if (menosMovimiento()) { setModo(m); return; }
    setCuchilla(k => k + 1); setTimeout(() => setModo(m), 400);
  };
  const cambiarVia = v => { if (v === via) return; setVia(v); setError(null); try { localStorage.setItem(CLAVE_VIA, v); } catch { /* nada */ } };

  async function entrar(identificador, secreto) {
    setCargando(true); setError(null);
    try { sessionStorage.setItem('tm:entrando', '1'); sessionStorage.setItem('tm:tour-pendiente', '1'); } catch { /* sin almacenamiento: no hay animación */ }
    try {
      await iniciarSesion(identificador, secreto);
      try { if (via === 'correo') { if (recordar) localStorage.setItem(CLAVE_CORREO, identificador.trim().toLowerCase()); else localStorage.removeItem(CLAVE_CORREO); } } catch { /* nada */ }
    } catch (err) {
      try { sessionStorage.removeItem('tm:entrando'); sessionStorage.removeItem('tm:tour-pendiente'); } catch { /* nada */ }
      setError(traducirError(err)); setSacudir(n => n + 1); setPassword(''); setPin('');
      setTimeout(() => (via === 'pin' ? document.querySelector('.pin-caja') : claveRef.current)?.focus(), 60);
    } finally { setCargando(false); }
  }
  const enviar = e => { e.preventDefault(); if (via === 'pin') entrar(idTexto, pin); else entrar(email, password); };
  const idValido = !!resolverAcceso(idTexto) && resolverAcceso(idTexto).tipo !== 'correo';
  // al completar el sexto dígito se entra solo (si ya está escrita la cédula o el usuario)
  useEffect(() => { if (via === 'pin' && pin.length === 6 && idValido && !cargando && modo === 'entrar') entrar(idTexto, pin); }, [pin]);   // eslint-disable-line

  async function pedirEnlace(e) {
    e.preventDefault(); setRecError(null);
    const correo = recEmail.trim().toLowerCase();
    if (!CORREO_OK.test(correo)) { setRecError('Escribe tu correo completo, por ejemplo nombre@falconfarms.com.co.'); return; }
    setRecEstado('enviando');
    try { await recuperarClave(correo); setRecEstado('enviado'); setRecEspera(45); }
    catch (err) { setRecEstado('idle'); setRecError(err.message); }
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
          {modo === 'entrar' && (
            <form key={`f${sacudir}`} className={`entrada-form ent2-form${sacudir ? ' sacude' : ''}`} onSubmit={enviar} noValidate>
              <header>
                <p className="entrada-saludo">{saludo()}</p>
                <h2 aria-label="Inicio de sesión"><Escribiendo texto="Inicio de sesión" className="cursiva" /></h2>
              </header>

              <div className="ent2-modos" role="tablist" aria-label="Cómo entras" style={{ '--pos': via === 'pin' ? 1 : 0 }}>
                <span className="ent2-modos-hilo" aria-hidden="true" />
                <button type="button" role="tab" aria-selected={via === 'correo'} className="ent2-modo" onClick={() => cambiarVia('correo')}>
                  <i className="fa-regular fa-envelope" aria-hidden="true"></i><span><b>Correo</b><small>Administrador · Digitador</small></span>
                </button>
                <button type="button" role="tab" aria-selected={via === 'pin'} className="ent2-modo" onClick={() => cambiarVia('pin')}>
                  <i className="fa-regular fa-id-card" aria-hidden="true"></i><span><b>Cédula o usuario</b><small>Usuario · Ingeniero</small></span>
                </button>
              </div>

              {via === 'correo' ? (
                <div key="v-correo" className="ent2-campos">
                  <p className="ent2-guia">Entra con el correo que te asignó el administrador.</p>
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
                  <div className="ent2-fila">
                    <label className="entrada-recordar"><input type="checkbox" checked={recordar} onChange={e => setRecordar(e.target.checked)} /> Recordar mi correo</label>
                    <button type="button" className="ent2-enlace" onClick={() => { setRecEmail(email); setRecEstado('idle'); setRecError(null); cambiarModo('olvide'); }}>¿Olvidaste tu contraseña?</button>
                  </div>
                </div>
              ) : (
                <div key="v-pin" className="ent2-campos">
                  <p className="ent2-guia">Escribe tu cédula (o tu usuario) y el PIN de 6 dígitos que te dio el administrador.</p>
                  <label htmlFor="login-id">Cédula o usuario
                    <div className="campo-icono">
                      <i className="fa-regular fa-id-card" aria-hidden="true"></i>
                      <input id="login-id" ref={idRef} type="text" value={idTexto} autoComplete="username" required inputMode="text" spellCheck={false} autoCapitalize="none" autoFocus
                        placeholder="Tu cédula o tu usuario" onChange={e => setIdTexto(e.target.value)} />
                    </div>
                  </label>
                  <div className="ent2-pin">
                    <span className="ent2-pin-cab">PIN
                      <button type="button" className="ver-clave" onClick={() => setVerClave(v => !v)} aria-label={verClave ? 'Ocultar PIN' : 'Mostrar PIN'}><i className={`fa-solid ${verClave ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true"></i></button>
                    </span>
                    <CajasPin valor={pin} onCambio={setPin} visible={verClave} error={sacudir > 0 && !!error} />
                  </div>
                  <p className="ent2-nota">¿Olvidaste tu PIN? Pídele uno nuevo a un administrador.</p>
                </div>
              )}

              {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>}
              <button className="btn-primary entrada-boton" type="submit" disabled={cargando || (via === 'pin' ? !(idTexto && pin.length === 6) : !(email && password))}>
                {cargando ? <><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Verificando</> : <>Entrar <i className="fa-solid fa-arrow-right-long" aria-hidden="true"></i></>}
              </button>
              <p className="entrada-ayuda">¿No puedes entrar? <button type="button" className="ent2-enlace" onClick={() => cambiarModo('ayuda')}>Te explico cómo</button></p>
            </form>
          )}

          {modo === 'olvide' && (
            <form className="entrada-form ent2-form ent2-olvide" onSubmit={pedirEnlace} noValidate>
              <header>
                <p className="entrada-saludo">Sin problema</p>
                <h2 aria-label="Recuperar mi contraseña"><Escribiendo texto="Recuperar mi contraseña" className="cursiva" /></h2>
                <p>Es solo para administradores y digitadores. Escribe tu correo y te enviamos un enlace para crear una contraseña nueva.</p>
              </header>
              {recEstado === 'enviado' ? (
                <div className="ent2-envio" role="status">
                  <span className="ent2-avion" aria-hidden="true"><i className="fa-solid fa-paper-plane"></i></span>
                  <strong>Listo, revisa tu correo</strong>
                  <p>Si <b translate="no">{recEmail.trim().toLowerCase()}</b> es de un administrador o un digitador, en unos minutos te llega el enlace. Mira también en «no deseado». Sirve una sola vez y vence en 1 hora.</p>
                  <button type="button" className="btn-secondary" disabled={recEspera > 0} onClick={() => setRecEstado('idle')}>{recEspera > 0 ? `Pedir otro enlace en ${recEspera} s` : 'Pedir otro enlace'}</button>
                </div>
              ) : (
                <>
                  <label htmlFor="rec-correo">Correo
                    <div className="campo-icono">
                      <i className="fa-regular fa-envelope" aria-hidden="true"></i>
                      <input id="rec-correo" type="email" value={recEmail} autoComplete="username" required inputMode="email" spellCheck={false} autoFocus placeholder="nombre@falconfarms.com.co" onChange={e => setRecEmail(e.target.value)} />
                    </div>
                  </label>
                  {recError && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{recError}</span></div>}
                  <button className="btn-primary entrada-boton" type="submit" disabled={recEstado === 'enviando' || !recEmail}>
                    {recEstado === 'enviando' ? <><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Enviando</> : <>Enviarme el enlace <i className="fa-solid fa-paper-plane" aria-hidden="true"></i></>}
                  </button>
                </>
              )}
              <button type="button" className="btn-texto ent2-volver" onClick={() => cambiarModo('entrar')}><i className="fa-solid fa-arrow-left-long" aria-hidden="true"></i> Volver a iniciar sesión</button>
            </form>
          )}

          {modo === 'ayuda' && (
            <div className="entrada-form ent2-form ent2-ayuda">
              <header>
                <p className="entrada-saludo">Sin problema</p>
                <h2 aria-label="¿Necesitas ayuda?"><Escribiendo texto="¿Necesitas ayuda?" className="cursiva" /></h2>
                <p>Los accesos los crea una persona administradora.</p>
              </header>
              <ol className="ent2-pasos">
                <li><span>1</span><div><strong>Pídele tu acceso al Analista de Gestión Integral</strong><small>Es quien crea y administra las cuentas.</small></div></li>
                <li><span>2</span><div><strong>Recibes tus datos</strong><small>Administradores y digitadores: correo y contraseña. Usuarios: cédula y PIN. Ingenieros: usuario y PIN.</small></div></li>
                <li><span>3</span><div><strong>Entra y listo</strong><small>El sistema te muestra cómo funciona cada vez que inicias sesión.</small></div></li>
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
