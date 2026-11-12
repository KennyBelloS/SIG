import { useEffect, useRef } from 'react';
import { t as tr } from '../lib/idioma';

/* Los atajos de teclado existían, pero nadie los veía: estaban escondidos en el código.
   Con la tecla «?» quedan a la vista, que es la diferencia entre una herramienta que se aprende
   sola y una que hay que explicar. Añadir uno nuevo aquí es una línea más en la lista. */

const GRUPOS = [
  {
    titulo: 'Moverse',
    atajos: [
      { teclas: ['Ctrl', 'K'], que: 'Buscar cualquier sección, indicador o acción' },
      { teclas: ['/'], que: 'Lo mismo, más rápido' },
      { teclas: ['↑', '↓'], que: 'Recorrer los resultados' },
      { teclas: ['Enter'], que: 'Abrir el resultado marcado' },
    ],
  },
  {
    titulo: 'En esta pantalla',
    atajos: [
      { teclas: ['?'], que: 'Abrir y cerrar esta ayuda' },
      { teclas: ['Esc'], que: 'Cerrar lo que esté abierto' },
    ],
  },
];

export default function Atajos({ onCerrar }) {
  const caja = useRef(null);
  useEffect(() => {
    const previo = document.activeElement;
    caja.current?.focus();
    document.body.classList.add('sin-scroll-fondo');
    const tecla = e => { if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); onCerrar(); } };
    window.addEventListener('keydown', tecla);
    return () => { window.removeEventListener('keydown', tecla); document.body.classList.remove('sin-scroll-fondo'); if (previo?.focus) previo.focus(); };
  }, [onCerrar]);

  return (
    <div className="atajos-fondo" onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="atajos" role="dialog" aria-modal="true" aria-label={tr('Atajos de teclado')} tabIndex={-1} ref={caja}>
        <header className="atajos-cab">
          <h2>{tr('Atajos de teclado')}</h2>
          <button type="button" className="btn-texto" onClick={onCerrar} aria-label="Cerrar">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </header>
        <div className="atajos-cuerpo">
          {GRUPOS.map(g => (
            <section key={g.titulo}>
              <h3>{tr(g.titulo)}</h3>
              <ul>
                {g.atajos.map(a => (
                  <li key={a.que}>
                    <span className="atajos-teclas">{a.teclas.map(k => <kbd key={k}>{k}</kbd>)}</span>
                    <span>{tr(a.que)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <footer className="atajos-pie">Pulsa <kbd>?</kbd> en cualquier momento para volver a ver esto.</footer>
      </div>
    </div>
  );
}
