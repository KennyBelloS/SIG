/** Esqueleto de carga: ocupa el lugar de lo que viene, para que la pantalla no salte cuando llegan los datos. */
export default function Cargando({ filas = 3, alto = 56 }) {
  return (
    <div className="cargando" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => <div key={i} className="cargando-fila" style={{ height: alto, animationDelay: `${i * 90}ms` }} />)}
    </div>
  );
}
