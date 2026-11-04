import { traducirError } from '../lib/indicadores';
import { useState } from 'react';
import { iniciarSesion } from '../lib/useSesion';

// Ejemplo ilustrativo para explicar la lectura de la cinta (no son datos reales)
const EJEMPLO = ['ok', 'ok', 'no', 'ok', 'ok', 'ok', 'no', 'ok', 'pen', 'pen', 'pen', 'pen'];
const MESES_INI = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setCargando(true); setError(null);
    try { await iniciarSesion(email, password); }
    catch (err) { setError(traducirError(err)); }
    finally { setCargando(false); }
  }

  return (
    <div className="login">
      <section className="login-marca" aria-label="Sobre el sistema">
        <img src="/logo.png" alt="Falcon Farms, Finca Torremolinos" className="login-logo" />
        <h1>Indicadores<br />de gestión</h1>
        <p>Registro mensual, cumplimiento frente a la meta y planes de acción de cada proceso de la finca.</p>

        <div className="login-lectura" aria-label="Ejemplo de cómo se lee un indicador">
          <div className="cinta-anio" aria-hidden="true">
            {EJEMPLO.map((c, i) => <span key={i} className={`cinta-mes cinta-${c === 'ok' ? 'cumple' : c === 'no' ? 'incumple' : 'pendiente'} login-mes`} style={{ '--i': i }} />)}
          </div>
          <div className="login-meses" aria-hidden="true">{MESES_INI.map((m, i) => <span key={i}>{m}</span>)}</div>
          <p>Cada indicador se lee mes a mes: verde cumple la meta, vino no la alcanza y gris espera su registro.</p>
        </div>
        <span className="login-pie">Falcon Farms · Suesca, Cundinamarca</span>
      </section>

      <section className="login-acceso">
        <form className="login-form" onSubmit={enviar} noValidate>
          <img src="/logo-icon.png" alt="" className="login-logo-movil" />
          <header>
            <h2>Iniciar sesión</h2>
            <p>Usa el correo que te asignó el administrador.</p>
          </header>

          <label htmlFor="login-correo">Correo
            <div className="campo-icono">
              <i className="fa-regular fa-envelope" aria-hidden="true"></i>
              <input id="login-correo" type="email" value={email} autoComplete="username" autoFocus required
                placeholder="nombre@falconfarms.com.co" onChange={e => setEmail(e.target.value)} />
            </div>
          </label>

          <label htmlFor="login-clave">Contraseña
            <div className="campo-icono">
              <i className="fa-solid fa-lock" aria-hidden="true"></i>
              <input id="login-clave" type={verClave ? 'text' : 'password'} value={password} autoComplete="current-password" required
                onChange={e => setPassword(e.target.value)} />
              <button type="button" className="ver-clave" onClick={() => setVerClave(v => !v)} aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                <i className={`fa-solid ${verClave ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </label>

          {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation"></i><span>{error}</span></div>}

          <button className="btn-primary login-boton" type="submit" disabled={cargando || !email || !password}>
            {cargando ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Verificando</> : 'Entrar'}
          </button>
          <p className="login-ayuda">¿No puedes entrar? Escribe al Analista de Gestión Integral.</p>
        </form>
      </section>
    </div>
  );
}
