/** Una hoja de papel plegada en TRES partes: arriba (fija), el medio se desdobla hacia abajo y luego la tercera, como una carta de verdad. */
export default function CartaTres({ cabecera, cuerpo, pie, cerrando = false, className = '' }) {
  return (
    <div className={`carta-tres${cerrando ? ' pliega' : ''} ${className}`}>
      <div className="ct-parte ct-1">{cabecera}</div>
      <div className="ct-parte ct-2"><span className="ct-sombra" aria-hidden="true" />{cuerpo}</div>
      {pie != null && <div className="ct-parte ct-3"><span className="ct-sombra" aria-hidden="true" />{pie}</div>}
    </div>
  );
}
