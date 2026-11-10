/** Un botón que CAMBIA según lo que pasa: reposo → cargando (gira) → listo (se tiñe de verde y dibuja un visto). */
export default function BotonEstado({ estado = 'idle', textoOk = '¡Listo!', className = 'btn-primary', children, ...resto }) {
  return (
    <button {...resto} className={`${className} boton-estado e-${estado}`} disabled={estado !== 'idle' || resto.disabled} aria-busy={estado === 'cargando'}>
      <span className="be-txt">{children}</span>
      <span className="be-cargando" aria-hidden="true"><i className="fa-solid fa-circle-notch fa-spin"></i></span>
      <span className="be-ok" aria-hidden={estado !== 'ok'}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> {textoOk}</span>
    </button>
  );
}
