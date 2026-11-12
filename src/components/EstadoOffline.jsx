import { useEffect, useState } from 'react';
import { obtenerCola, forzarEnvio, descartarDeCola } from '../lib/offline';

/** Aviso fijo: si no hay internet, si hay cambios por enviar, o si alguno de ellos chocó con algo que guardó
 *  otra persona mientras no había conexión (y hay que decidir cuál de los dos se queda). */
export default function EstadoOffline() {
  const [enLinea, setEnLinea] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [cola, setCola] = useState(() => obtenerCola());
  const [resolviendo, setResolviendo] = useState(null);

  useEffect(() => {
    const refrescar = () => setCola(obtenerCola());
    const onLinea = () => setEnLinea(true); const sinLinea = () => setEnLinea(false);
    refrescar();
    window.addEventListener('tm:cola-cambio', refrescar);
    window.addEventListener('online', onLinea); window.addEventListener('offline', sinLinea);
    return () => { window.removeEventListener('tm:cola-cambio', refrescar); window.removeEventListener('online', onLinea); window.removeEventListener('offline', sinLinea); };
  }, []);

  const conflictos = cola.filter(c => c.estado === 'conflicto');
  const pendientes = cola.filter(c => c.estado !== 'conflicto');

  async function usarElMio(idCola) {
    setResolviendo(idCola);
    try { await forzarEnvio(idCola); setCola(obtenerCola()); } catch { /* sigue sin internet: se vuelve a intentar solo */ }
    setResolviendo(null);
  }
  function descartarElMio(idCola) { descartarDeCola(idCola); setCola(obtenerCola()); }

  if (enLinea && cola.length === 0) return null;

  return (
    <div className="estado-offline" role="status" aria-live="polite">
      {!enLinea && (
        <div className="estado-offline-fila eo-sin-linea">
          <i className="fa-solid fa-plug-circle-xmark" aria-hidden="true"></i>
          <span>Sin conexión: lo que registres se guarda en este equipo y se envía solo cuando vuelva internet.</span>
        </div>
      )}
      {pendientes.length > 0 && (
        <div className="estado-offline-fila eo-pendiente">
          <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i>
          <span>{pendientes.length} {pendientes.length === 1 ? 'registro' : 'registros'} por enviar en cuanto haya internet.</span>
        </div>
      )}
      {conflictos.map(c => (
        <div key={c.idCola} className="estado-offline-fila eo-conflicto">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
          <span>Alguien más ya guardó un valor distinto para ese mismo indicador y mes mientras no tenías internet{c.valorServidor?.actualizado_en ? ` (el ${new Date(c.valorServidor.actualizado_en).toLocaleString('es-CO')})` : ''}. ¿Cuál se queda: el tuyo o el de ellos?</span>
          <div className="eo-conflicto-acc">
            <button type="button" className="btn-texto" disabled={resolviendo === c.idCola} onClick={() => usarElMio(c.idCola)}>Usar el mío</button>
            <button type="button" className="btn-texto btn-peligro" disabled={resolviendo === c.idCola} onClick={() => descartarElMio(c.idCola)}>Descartar el mío</button>
          </div>
        </div>
      ))}
    </div>
  );
}
