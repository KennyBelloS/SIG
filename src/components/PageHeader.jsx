import Numero from './Numero';

/** Cajetín de la página: como el recuadro de título de un plano. Lleva el título, una frase de contexto,
 *  los controles de la pantalla (periodo, exportar…) y, si hay, las cifras que resumen lo que se ve. */
export default function PageHeader({ titulo, descripcion, children, cifras }) {
  return (
    <header className="cajetin">
      <h1 className={String(titulo).length > 16 || String(titulo).split(/\s+/).some(p => p.length >= 12) ? 'largo' : undefined}>{titulo}</h1>
      {descripcion && <p className="cajetin-desc">{descripcion}</p>}
      {children && <div className="cajetin-controles">{children}</div>}
      {cifras && cifras.length > 0 && (
        <dl className="cajetin-cifras">
          {cifras.map(c => (
            <div key={c.titulo} className={`cifra${c.principal ? ' principal' : ''}${c.tono ? ` tono-${c.tono}` : ''}`}>
              <dt>{c.vivo && <i className="cifra-vivo" aria-hidden="true" />}{c.titulo}</dt>
              <dd>
                <span className="cifra-valor">{typeof c.valor === 'number' ? <><Numero valor={c.valor} />{c.sufijo && <small>{c.sufijo}</small>}</> : (c.valor ?? '—')}</span>
                {c.nota && <small className="cifra-nota">{c.nota}</small>}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}
