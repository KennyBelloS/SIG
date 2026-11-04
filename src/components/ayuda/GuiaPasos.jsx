/** Guía paso a paso: cada paso con su número, su título y su explicación. */
export default function GuiaPasos({ titulo, icono, color, pasos, roles = [] }) {
  return (
    <section className="panel guia" style={{ '--color-guia': color }}>
      <div className="guia-cab">
        <span className="guia-ic"><i className={`fa-solid ${icono}`} aria-hidden="true"></i></span>
        <h3>{titulo}</h3>
        <span className="guia-roles">{roles}</span>
      </div>
      <ol>
        {pasos.map(([t, d], i) => (
          <li key={t}><span className="n">{i + 1}</span><div><b>{t}</b><p>{d}</p></div></li>
        ))}
      </ol>
    </section>
  );
}
