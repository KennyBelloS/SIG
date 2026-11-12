import { rolDeAyuda } from '../lib/acceso';
import { useEffect, useMemo, useState } from 'react';
import TextoAgua from '../components/TextoAgua';
import PageHeader from '../components/PageHeader';
import { useSesion } from '../lib/useSesion';
import { ROLES } from '../lib/indicadores';
import Recorrido from '../components/ayuda/Recorrido';
import PrimerosPasos from '../components/ayuda/PrimerosPasos';
import MapaConectado from '../components/ayuda/MapaConectado';
import GuiaPasos from '../components/ayuda/GuiaPasos';
import PruebasGuiadas from '../components/ayuda/PruebasGuiadas';
import { ROL, INTRO, laminasPara, guiasPara, glosarioPara, faqPara } from '../components/ayuda/contenido';

const PERMISOS = [
  ['Consultar indicadores, matriz e informes', ['admin', 'digitador', 'usuario']],
  ['Registrar datos (a mano o con Excel)', ['admin', 'digitador']],
  ['Crear y editar indicadores, metas y frecuencias', ['admin']],
  ['Cerrar y reabrir meses', ['admin']],
  ['Ver Dashboard y Novedades', ['admin']],
  ['Enviar correos, crear usuarios, cambiar roles y contraseñas', ['admin']],
];

/** A qué grupo pertenece una guía según el rol más básico que la usa. */
const GRUPOS = [
  ['usuario', 'Lo que hace cualquier persona', 'Consultar el estado de los indicadores y sacar informes. Aplica a Usuarios, Digitadores y Administradores.'],
  ['digitador', 'Lo que hace un Digitador', 'Registrar datos y cargar archivos. Aplica a Digitadores y Administradores.'],
  ['admin', 'Lo que hace un Administrador', 'Configurar, controlar y vigilar. Solo para Administradores.'],
];
const nivel = g => (g.roles.includes('usuario') ? 'usuario' : g.roles.includes('digitador') ? 'digitador' : 'admin');

export default function Ayuda() {
  const { sesion } = useSesion();
  const real = rolDeAyuda(sesion?.rol);
  const [elegida, setVista] = useState(null);         // solo el administrador puede elegir otra vista
  const vista = elegida || 'admin';                     // por defecto, el administrador lo ve todo
  const rol = real === 'admin' ? vista : real;
  const esAdmin = real === 'admin';

  const laminas = useMemo(() => laminasPara(rol), [rol]);
  const guias = useMemo(() => guiasPara(rol), [rol]);
  const glosario = useMemo(() => glosarioPara(rol), [rol]);
  const faq = useMemo(() => faqPara(rol), [rol]);
  const secciones = [['recorrido', 'Recorrido'], ['pasos', 'Primeros pasos'], ['conectado', 'Todo conectado'], ['guias', 'Guías'], ['glosario', 'Glosario'], ['pruebas', 'Pruebas'], ['faq', 'Preguntas']];

  // Al imprimir, las preguntas frecuentes se despliegan para que salgan completas en el PDF
  useEffect(() => {
    const abrir = () => document.querySelectorAll('.ayuda details').forEach(d => { d.dataset.estaba = d.open ? '1' : '0'; d.open = true; });
    const restaurar = () => document.querySelectorAll('.ayuda details').forEach(d => { d.open = d.dataset.estaba === '1'; });
    window.addEventListener('beforeprint', abrir); window.addEventListener('afterprint', restaurar);
    return () => { window.removeEventListener('beforeprint', abrir); window.removeEventListener('afterprint', restaurar); };
  }, []);
  const ir = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="page ayuda">
      <div className="no-imprimir-ayuda con-cajetin">
        <PageHeader
          migas={[{ texto: 'Ayuda' }, { texto: 'Cómo se usa' }]}
          titulo="Cómo se usa"
          descripcion={INTRO[rol]}
        >
          {esAdmin && (
            <label className="vista-como">Ver la guía como
              <select value={vista} onChange={e => setVista(e.target.value)} aria-label="Ver la guía como">
                <option value="admin">Administrador (todo)</option>
                <option value="digitador">Digitador</option>
                <option value="usuario">Usuario</option>
              </select>
            </label>
          )}
          <button className="btn-secondary" onClick={() => window.dispatchEvent(new Event('indicadores:tour'))}><i className="fa-solid fa-circle-play" /> Ver la bienvenida</button>
          <button className="btn-primary" onClick={() => window.print()}><i className="fa-solid fa-file-pdf" /> Guía en PDF</button>
        </PageHeader>
        {esAdmin && vista !== 'admin' && (
          <div className="aviso aviso-info" role="status"><i className="fa-solid fa-eye" /><span>Estás viendo la guía tal como la ve un <strong>{ROL[vista].nombre}</strong>. Tu cuenta sigue siendo de administrador.</span></div>
        )}
        <nav className="ay-indice" aria-label="Secciones de la ayuda">
          {secciones.map(([id, t]) => <button key={id} onClick={() => ir(id)}>{t}</button>)}
        </nav>
      </div>

      <div id="recorrido" className="ay-seccion no-imprimir-ayuda"><Recorrido laminas={laminas} mostrarRoles={esAdmin && vista === 'admin'} /></div>

      <div id="pasos" className="ay-seccion ay-dos no-imprimir-ayuda">
        <PrimerosPasos sesion={sesion} rol={rol} />
        <section className="panel ay-rol" aria-label="Tu rol">
          <div className="panel-header"><div><h2>{esAdmin && vista !== 'admin' ? 'El rol' : 'Tu rol'}: <span style={{ color: ROL[rol].color }}>{ROLES[rol]?.nombre}</span></h2><p className="sub">{ROLES[rol]?.descripcion}</p></div></div>
          <ul className="ay-permisos">
            {PERMISOS.map(([t, roles]) => {
              const si = roles.includes(rol);
              return <li key={t} className={si ? 'si' : 'no'}><i className={`fa-solid ${si ? 'fa-circle-check' : 'fa-circle-minus'}`} aria-hidden="true" /><span>{t}</span><small>{roles.map(r => ROL[r].nombre).join(', ')}</small></li>;
            })}
          </ul>
        </section>
      </div>

      <div id="conectado" className="ay-seccion no-imprimir-ayuda"><MapaConectado rol={rol} /></div>

      <div id="guias" className="ay-seccion">
        <div className="ay-titulo"><div><h2><TextoAgua>Guías paso a paso</TextoAgua></h2><p>{rol === 'admin' ? 'Todas, ordenadas por quién las hace.' : `Las que corresponden a tu rol (${ROLES[rol]?.nombre}).`}</p></div></div>
        {rol === 'admin'
          ? GRUPOS.map(([nv, titulo, nota]) => {
            const lista = guias.filter(g => nivel(g) === nv);
            if (!lista.length) return null;
            return (
              <div key={nv} className="ay-grupo">
                <div className="ay-grupo-cab"><h3>{titulo}</h3><p>{nota}</p></div>
                <div className="ay-grid">{lista.map(g => <GuiaPasos key={g.id} titulo={g.titulo} icono={g.icono} color={g.color} pasos={g.pasos} roles={g.roles.map(r => <em key={r} style={{ color: ROL[r].color }}>{ROL[r].nombre}</em>)} />)}</div>
              </div>
            );
          })
          : <div className="ay-grid">{guias.map(g => <GuiaPasos key={g.id} titulo={g.titulo} icono={g.icono} color={g.color} pasos={g.pasos} roles={[]} />)}</div>}
      </div>

      <section id="glosario" className="ay-seccion panel">
        <div className="panel-header"><div><h2><TextoAgua>Glosario</TextoAgua></h2><p className="sub">Las palabras que más se usan, en lenguaje sencillo.</p></div></div>
        <dl className="ay-glosario">{glosario.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>
      </section>

      <div id="pruebas" className="ay-seccion no-imprimir-ayuda"><PruebasGuiadas rol={rol} /></div>

      <section id="faq" className="ay-seccion panel">
        <div className="panel-header"><h2><TextoAgua>Preguntas frecuentes</TextoAgua></h2></div>
        <div className="ay-faq">{faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        <p className="texto-tenue" style={{ marginTop: 16 }}>¿Algo no está claro? Pregúntale al Analista de Gestión Integral: el texto de cada regla vive en un solo archivo y se puede ajustar.</p>
      </section>

      <section className="solo-impresion">
        <h2>Recorrido por la aplicación{esAdmin ? '' : ` · ${ROLES[rol]?.nombre}`}</h2>
        {laminas.map((l, i) => (
          <article key={l.id}><h3>{i + 1}. {l.titulo}</h3><p><b>{l.resumen}</b></p><ol>{l.pasos.map((p, k) => <li key={k}>{p}</li>)}</ol></article>
        ))}
      </section>
    </div>
  );
}
