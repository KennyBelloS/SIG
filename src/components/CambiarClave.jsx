import { useState } from 'react';
import Dialogo from './Dialogo';
import { cambiarMiClave } from '../lib/usuarios';
import { avisar } from '../lib/toast';

/** Diálogo para que cada persona cambie su propia contraseña (por ejemplo, la temporal que le dio un administrador). */
export default function CambiarClave({ onCerrar }) {
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    if (nueva.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (nueva !== repetir) { setError('Las dos contraseñas no coinciden.'); return; }
    setGuardando(true);
    try { await cambiarMiClave(nueva); avisar('Contraseña cambiada.', { tipo: 'ok' }); onCerrar(); }
    catch (err) { setError(err.message); } finally { setGuardando(false); }
  }

  return (
    <Dialogo titulo="Cambiar mi contraseña" onCerrar={onCerrar} ancho={460}>
      <form className="form-dialogo" onSubmit={guardar} noValidate>
        <h2>Cambiar mi contraseña</h2>
        <label>Contraseña nueva
          <input type="password" autoComplete="new-password" name="clave-nueva" value={nueva} onChange={e => setNueva(e.target.value)} spellCheck={false} />
        </label>
        <label>Repite la contraseña nueva
          <input type="password" autoComplete="new-password" name="clave-repetida" value={repetir} onChange={e => setRepetir(e.target.value)} spellCheck={false} />
        </label>
        <p className="ayuda-campo">Mínimo 8 caracteres, con letras y números.</p>
        {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>}
        <div className="ind-modal-acciones">
          <button type="button" className="btn-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar contraseña'}</button>
        </div>
      </form>
    </Dialogo>
  );
}
