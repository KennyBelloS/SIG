/** Pantalla para un módulo que todavía NO tiene funcionalidad: solo una idea de cómo se va a ver.
 *  A propósito se ve distinta de un panel normal (borde punteado, franja «Próximamente»), para que
 *  nadie la confunda con algo que ya funciona. */
export default function ModuloProximamente({ icono = 'fa-hammer', ejemplos = [] }) {
  return (
    <section className="panel mod-proximamente">
      <span className="mod-proximamente-franja"><i className="fa-solid fa-hourglass-half" aria-hidden="true"></i> Próximamente · esta pantalla es solo una idea de cómo se va a ver</span>
      <div className="mod-proximamente-centro">
        <i className={`fa-solid ${icono} mod-proximamente-ico`} aria-hidden="true"></i>
        <p>Todavía no tiene información ni botones que funcionen. Se está construyendo.</p>
      </div>
      {ejemplos.length > 0 && (
        <div className="mod-proximamente-ejemplos">
          {ejemplos.map(e => (
            <div key={e.titulo} className="mod-proximamente-ej">
              <i className={`fa-solid ${e.icono}`} aria-hidden="true"></i>
              <b>{e.titulo}</b><span>{e.texto}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
