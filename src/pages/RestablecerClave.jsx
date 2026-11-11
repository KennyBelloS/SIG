import { useState } from 'react';
import { cambiarMiClave } from '../lib/usuarios';
import { traducirError } from '../lib/indicadores';

/** Se muestra cuando alguien abre el enlace de «¿Olvidaste tu contraseña?»: debe crear una nueva antes de entrar. */
export default function RestablecerClave() {
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [hecho, setHecho] = useState(false);
  const reglas = [
    { ok: nueva.length >= 8, texto: 'Al menos 8 caracteres' },
    { ok: /[a-zA-Z]/.test(nueva) && /\d/.test(nueva), texto: 'Con letras y números' },
    { ok: nueva.length > 0 && nueva === repetir, texto: 'Las dos coinciden' },
  ];
  const lista = reglas.every(x => x.ok);
  async function guardar(e) {
    e.preventDefault(); if (!lista) return;
    setGuardando(true); setError(null);
    try { await cambiarMiClave(nueva); setHecho(true); try { sessionStorage.setItem('tm:entrando', '1'); } catch { /* nada */ } setTimeout(() => window.dispatchEvent(new Event('tm:recuperacion-fin')), 1500); }
    catch (err) { setError(traducirError(err)); setGuardando(false); }
  }
  return (
    <div className="ent2 ent2-solo">
      <div className="ent2-aurora" aria-hidden="true" />
      <div className="ent2-tarjeta">
        <section className="ent2-izq" aria-label="Sobre el sistema">
          <img src="/logo.png" alt="Falcon Farms, Finca Torremolinos" className="ent2-logo" />
          <h1>Sistema de Gestión</h1>
          <p className="ent2-lema">Cada proceso, cada meta, cada mes, en un solo lugar.</p>
        </section>
        <section className="ent2-der">
          {!hecho ? (
            <form className="entrada-form ent2-form" onSubmit={guardar} noValidate>
              <header>
                <p className="entrada-saludo">Casi listo</p>
                <h2>Crea tu nueva contraseña</h2>
                <p>Elige una que no uses en otros sitios. Con ella entrarás desde ahora.</p>
              </header>
              <label htmlFor="nueva-clave">Contraseña nueva
                <div className="campo-icono"><i className="fa-solid fa-lock" aria-hidden="true"></i>
                  <input id="nueva-clave" type={ver ? 'text' : 'password'} value={nueva} autoComplete="new-password" autoFocus onChange={e => setNueva(e.target.value)} />
                  <button type="button" className="ver-clave" onClick={() => setVer(v => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}><i className={`fa-solid ${ver ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true"></i></button>
                </div>
              </label>
              <label htmlFor="repetir-clave">Repítela
                <div className="campo-icono"><i className="fa-solid fa-lock" aria-hidden="true"></i>
                  <input id="repetir-clave" type={ver ? 'text' : 'password'} value={repetir} autoComplete="new-password" onChange={e => setRepetir(e.target.value)} />
                </div>
              </label>
              <ul className="ent2-reglas" aria-label="Requisitos">{reglas.map(x => <li key={x.texto} className={x.ok ? 'ok' : ''}><i className={`fa-solid ${x.ok ? 'fa-circle-check' : 'fa-circle'}`} aria-hidden="true"></i> {x.texto}</li>)}</ul>
              {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>}
              <button className="btn-primary entrada-boton" type="submit" disabled={!lista || guardando}>{guardando ? <><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Guardando</> : <>Guardar y entrar <i className="fa-solid fa-arrow-right-long" aria-hidden="true"></i></>}</button>
            </form>
          ) : (
            <div className="entrada-form ent2-form ent2-envio" role="status">
              <span className="ent2-avion ok" aria-hidden="true"><i className="fa-solid fa-circle-check"></i></span>
              <strong>Contraseña cambiada</strong>
              <p>Entrando al sistema…</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
