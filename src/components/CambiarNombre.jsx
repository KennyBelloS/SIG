import { useState } from 'react';
import Dialogo from './Dialogo';
import { cambiarMiNombre } from '../lib/usuarios';
import { avisar } from '../lib/toast';

/** Cada persona elige cómo quiere que la llamen en la aplicación (se ve en el menú y en la bitácora). */
export default function CambiarNombre({ actual, email, onCerrar }) {
  const [nombre, setNombre] = useState(actual || '');
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    if (nombre.trim().length > 80) { setError('El nombre es muy largo: usa 80 letras o menos.'); return; }
    setGuardando(true);
    try { await cambiarMiNombre(nombre); avisar(nombre.trim() ? 'Nombre actualizado.' : 'Volverá a mostrarse tu correo.', { tipo: 'ok' }); onCerrar(); }
    catch (err) { setError(err.message); } finally { setGuardando(false); }
  }

  return (
    <Dialogo titulo="Cambiar mi nombre" onCerrar={onCerrar} ancho={460}>
      <form className="form-dialogo" onSubmit={guardar} noValidate>
        <h2>Cambiar mi nombre</h2>
        <label>Cómo quieres que te llamen
          <input type="text" name="mi-nombre" autoComplete="name" maxLength={90} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre y apellido…" />
        </label>
        <p className="ayuda-campo">Se muestra en el menú y en el registro de actividad. Tu correo de acceso ({email}) no cambia. Déjalo vacío para volver a mostrar el correo.</p>
        {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>}
        <div className="ind-modal-acciones">
          <button type="button" className="btn-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar nombre'}</button>
        </div>
      </form>
    </Dialogo>
  );
}
