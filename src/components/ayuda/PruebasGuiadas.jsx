import { useState } from 'react';
import { pruebasPara, ROL } from './contenido';

const CLAVE = 'indicadores:pruebas';
const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch { return {}; } };

/** Lista de pruebas para empezar a probar la aplicación, con el resultado esperado de cada una. */
export default function PruebasGuiadas({ rol: miRol = 'usuario' }) {
  const [estado, setEstado] = useState(leer);
  const lista = pruebasPara(miRol);
  const guardar = n => { setEstado(n); try { localStorage.setItem(CLAVE, JSON.stringify(n)); } catch { /* nada */ } };
  const poner = (id, v) => guardar({ ...estado, [id]: estado[id] === v ? undefined : v });
  const ok = lista.filter(p => estado[p.id] === 'ok').length;
  const mal = lista.filter(p => estado[p.id] === 'mal').length;

  return (
    <section className="panel pg" aria-label="Pruebas guiadas">
      <div className="panel-header">
        <div><h2>Pruebas guiadas para empezar</h2><p className="sub">Recórrelas en orden. Marca si el resultado fue el esperado o si algo falló: lo que marques queda guardado en este navegador.</p></div>
        <div className="cabecera-acciones">
          <button className="btn-texto" onClick={() => guardar({})}><i className="fa-solid fa-rotate-left" /> Reiniciar</button>
        </div>
      </div>
      <div className="pg-resumen">
        <span className="chip-ind chip-ind-ok"><i className="fa-solid fa-check" /> {ok} bien</span>
        <span className={`chip-ind ${mal ? 'chip-ind-no' : ''}`} style={mal ? undefined : { background: 'var(--line-soft)', color: 'var(--ink-2)' }}><i className="fa-solid fa-xmark" /> {mal} con falla</span>
        <span className="texto-tenue">{lista.length - ok - mal} por probar</span>
      </div>
      <ol className="pg-lista">
        {lista.map((p, i) => (
          <li key={p.id} className={estado[p.id] || ''}>
            <details>
              <summary>
                <span className="pg-n">{i + 1}</span>
                <b>{p.titulo}</b>
                <span className="pg-roles">{p.roles.map(r => <em key={r} style={{ color: ROL[r].color }}>{ROL[r].nombre}</em>)}</span>
                <i className={`fa-solid ${estado[p.id] === 'ok' ? 'fa-circle-check ok' : estado[p.id] === 'mal' ? 'fa-circle-xmark mal' : 'fa-chevron-down'}`} aria-hidden="true" />
              </summary>
              <div className="pg-cuerpo">
                <b>Qué hacer</b>
                <ol>{p.pasos.map((x, k) => <li key={k}>{x}</li>)}</ol>
                <b>Qué debería pasar</b>
                <p className="pg-esperado">{p.esperado}</p>
                <div className="pg-botones">
                  <button className={`btn-secondary${estado[p.id] === 'ok' ? ' pg-si' : ''}`} onClick={() => poner(p.id, 'ok')} aria-pressed={estado[p.id] === 'ok'}><i className="fa-solid fa-check" /> Salió como se esperaba</button>
                  <button className={`btn-secondary${estado[p.id] === 'mal' ? ' pg-no' : ''}`} onClick={() => poner(p.id, 'mal')} aria-pressed={estado[p.id] === 'mal'}><i className="fa-solid fa-xmark" /> Falló</button>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}
