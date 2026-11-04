import { Link } from 'react-router-dom';

/** Cabecera común de página: ruta de navegación, título, descripción y acciones. */
export default function PageHeader({ migas = [], titulo, descripcion, children }) {
  return (
    <>
      {migas.length > 0 && (
        <nav className="migas" aria-label="Ruta">
          {migas.map((m, i) => (
            <span key={i} style={{ display: 'contents' }}>
              {i > 0 && <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>}
              {m.a ? <Link to={m.a}>{m.texto}</Link> : <span aria-current="page">{m.texto}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="cabecera">
        <div>
          <h1>{titulo}</h1>
          {descripcion && <p>{descripcion}</p>}
        </div>
        {children && <div className="cabecera-acciones">{children}</div>}
      </div>
    </>
  );
}
