import { useEffect, useState } from 'react';

const COLORES = ['#166534', '#2F9E4F', '#C9932B', '#7FE0A4', '#F2C46B', '#A91D3A'];

/** Muestra los avisos que lanza avisar(). Si el aviso es de celebración, suelta confeti. */
export default function Toaster() {
  const [lista, setLista] = useState([]);
  useEffect(() => {
    const alRecibir = e => {
      const a = e.detail;
      setLista(l => [...l.slice(-2), a]);
      setTimeout(() => setLista(l => l.filter(x => x.id !== a.id)), a.celebrar ? 5200 : 4200);
    };
    window.addEventListener('indicadores:aviso', alRecibir);
    return () => window.removeEventListener('indicadores:aviso', alRecibir);
  }, []);
  if (!lista.length) return null;
  return (
    <div className="toaster" role="region" aria-label="Avisos">
      {lista.map(a => (
        <div key={a.id} className={`toast toast-${a.tipo}`} role="status">
          <i className={`fa-solid ${a.tipo === 'ok' ? 'fa-circle-check' : a.tipo === 'alerta' ? 'fa-triangle-exclamation' : 'fa-circle-info'}`} aria-hidden="true" />
          <span>{a.texto}</span>
          {a.accion && (
            <button className="btn-texto toast-accion" onClick={() => { a.accion.hacer(); setLista(l => l.filter(x => x.id !== a.id)); }}>{a.accion.texto}</button>
          )}
          <button className="btn-texto" onClick={() => setLista(l => l.filter(x => x.id !== a.id))} aria-label="Cerrar aviso"><i className="fa-solid fa-xmark" /></button>
          {a.celebrar && (
            <span className="confeti" aria-hidden="true">
              {Array.from({ length: 22 }).map((_, i) => (
                <u key={i} style={{ '--ang': `${(i / 22) * 360 + (i % 3) * 9}deg`, '--dis': `${54 + (i % 5) * 16}px`, '--c': COLORES[i % COLORES.length], '--r': `${(i % 4) * 90}deg`, animationDelay: `${(i % 6) * 0.03}s` }} />
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
