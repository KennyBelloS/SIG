import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getIndicadores, getProcesos, getInvolucrados, getConfiguracionNotificaciones, mesReporteActual, MESES } from '../../lib/indicadores';

const CLAVE = 'indicadores:pasos';
const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch { return {}; } };

/** Definición de los pasos por rol. `detectar` mira los datos reales: si devuelve algo, el paso se marca solo.
 *  Los pasos sin `detectar` (cosas que ocurren fuera de la aplicación) los marca la persona. */
const PASOS = {
  admin: [
    { id: 'ind', texto: 'Los indicadores están cargados', ruta: '/configuracion', ayuda: 'Configuración → Indicadores',
      detectar: async () => { const [i, p] = await Promise.all([getIndicadores(), getProcesos()]); return { ok: i.length > 0, detalle: `${i.length} indicadores en ${p.length} procesos` }; } },
    { id: 'proc', texto: 'Cada proceso tiene a quién avisar por correo', ruta: '/indicadores', ayuda: 'Indicadores → despliega un proceso → "Involucrados y notificaciones"',
      detectar: async () => { const [p, v] = await Promise.all([getProcesos(), getInvolucrados()]); const con = new Set(v.filter(x => x.notificar && x.email).map(x => x.proceso_id)); const n = p.filter(x => con.has(x.id)).length; return { ok: n === p.length && p.length > 0, detalle: `${n} de ${p.length} procesos con al menos una persona` }; } },
    { id: 'firma', texto: 'La firma de los correos tiene el cargo y el contacto', ruta: '/configuracion', ayuda: 'Configuración → Notificaciones → Firma',
      detectar: async () => { const c = await getConfiguracionNotificaciones(); return { ok: !!(c?.firma_cargo && (c?.firma_telefono || c?.firma_celular || c?.firma_email)), detalle: c?.firma_cargo || 'Aún sin cargo' }; } },
    { id: 'roles', texto: 'Hay al menos un digitador asignado', ruta: '/configuracion', ayuda: 'Configuración → Usuarios',
      detectar: async () => { const { data, error } = await supabase.from('indicadores_usuarios').select('rol'); if (error) return null; const n = (data || []).filter(u => u.rol === 'digitador').length; return { ok: n > 0, detalle: `${n} digitador${n === 1 ? '' : 'es'}` }; } },
    { id: 'datos', texto: 'El mes anterior ya tiene datos registrados', ruta: '/indicadores', ayuda: 'Indicadores → registra desde la cinta de cada indicador',
      detectar: async () => { const { anioReporte, mesReporte } = mesReporteActual(); const [i, { data }] = await Promise.all([getIndicadores(), supabase.from('indicadores_registros').select('valor').eq('anio', anioReporte).eq('mes', mesReporte)]); const n = (data || []).filter(r => r.valor != null).length; return { ok: n > 0, detalle: `${n} de ${i.length} indicadores de ${MESES[mesReporte - 1]}` }; } },
    { id: 'prueba', texto: 'Se envió un correo de prueba', ruta: '/configuracion', ayuda: 'Configuración → Notificaciones → "Enviar correo de prueba"',
      detectar: async () => { const { data, error } = await supabase.from('indicadores_notificaciones').select('id').eq('modo', 'prueba').eq('resultado', 'enviado').limit(1); if (error) return null; return { ok: (data || []).length > 0, detalle: (data || []).length ? 'Ya enviaste uno' : 'Todavía no' }; } },
    { id: 'logo', texto: 'Comprobé que el logo se ve en los correos', ruta: '/configuracion', ayuda: 'Configuración → Notificaciones → "Publicar y comprobar logo"' },
    { id: 'gh', texto: 'Activé el despertador diario en GitHub', ruta: null, ayuda: 'GitHub → Settings → Secrets: APP_URL y CRON_SECRET' },
  ],
  digitador: [
    { id: 'reg', texto: 'Registré mi primer dato', ruta: '/indicadores', ayuda: 'Indicadores → clic en un mes de la cinta',
      detectar: async ({ email }) => { const { data, error } = await supabase.from('indicadores_registros').select('id').ilike('registrado_por', `${email}%`).limit(1); if (error) return null; return { ok: (data || []).length > 0, detalle: (data || []).length ? 'Ya registraste datos' : 'Todavía no' }; } },
    { id: 'plan', texto: 'Probé guardar sin plan de acción y vi el aviso', ruta: '/indicadores', ayuda: 'Abre un mes abierto, escribe solo el valor y guarda' },
    { id: 'excel', texto: 'Descargué la plantilla e importé un archivo', ruta: '/importar', ayuda: 'Importar Excel' },
    { id: 'matriz', texto: 'Revisé la matriz', ruta: '/matriz', ayuda: 'Matriz' },
    { id: 'informe', texto: 'Descargué un informe mensual en PDF', ruta: '/informe', ayuda: 'Informe mensual → Descargar PDF' },
  ],
  usuario: [
    { id: 'ind', texto: 'Revisé el estado del mes en Indicadores', ruta: '/indicadores', ayuda: 'Inicio' },
    { id: 'matriz', texto: 'Revisé la matriz', ruta: '/matriz', ayuda: 'Matriz' },
    { id: 'informe', texto: 'Descargué un informe mensual en PDF', ruta: '/informe', ayuda: 'Informe mensual → Descargar PDF' },
  ],
};

export default function PrimerosPasos({ sesion, rol: rolProp }) {
  const pedido = rolProp || sesion?.rol;
  const rol = pedido in PASOS ? pedido : 'usuario';
  const pasos = PASOS[rol];
  const [manual, setManual] = useState(leer);
  const [auto, setAuto] = useState({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const salida = {};
      await Promise.all(pasos.filter(p => p.detectar).map(async p => {
        try { const r = await p.detectar({ email: sesion?.email }); if (r) salida[p.id] = r; } catch { /* sin datos: queda manual */ }
      }));
      if (vivo) { setAuto(salida); setCargando(false); }
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line
  }, [rol, sesion?.email]);

  const marcar = id => { const n = { ...manual, [id]: !manual[id] }; setManual(n); try { localStorage.setItem(CLAVE, JSON.stringify(n)); } catch { /* nada */ } };
  const hecho = p => (auto[p.id] ? auto[p.id].ok : !!manual[p.id]);
  const listos = pasos.filter(hecho).length;

  return (
    <section className="panel pp" aria-label="Primeros pasos">
      <div className="panel-header">
        <div><h2>Empieza en {pasos.length} pasos</h2><p className="sub">Se marcan solos cuando la aplicación detecta que ya lo hiciste. Los demás los marcas tú.</p></div>
        <span className="pp-cuenta num">{listos}/{pasos.length}</span>
      </div>
      <div className="pp-barra" role="progressbar" aria-label="Avance de los primeros pasos" aria-valuemin={0} aria-valuemax={pasos.length} aria-valuenow={listos}><u style={{ width: `${(listos / pasos.length) * 100}%` }} /></div>
      <ul className="pp-lista">
        {pasos.map(p => {
          const a = auto[p.id]; const ok = hecho(p);
          return (
            <li key={p.id} className={ok ? 'ok' : ''}>
              {p.detectar && !cargando && a
                ? <span className="pp-marca" role="img" aria-label={ok ? 'Hecho' : 'Pendiente'}><i className={`fa-solid ${ok ? 'fa-circle-check' : 'fa-circle'}`} /></span>
                : <button className="pp-marca" onClick={() => marcar(p.id)} aria-pressed={ok} aria-label={`${ok ? 'Desmarcar' : 'Marcar'}: ${p.texto}`}><i className={`fa-${ok ? 'solid' : 'regular'} ${ok ? 'fa-square-check' : 'fa-square'}`} /></button>}
              <div className="pp-txt"><b>{p.texto}</b><small>{a ? a.detalle : p.ayuda}</small></div>
              {p.ruta && <Link to={p.ruta} className="btn-texto" aria-label={`Ir a ${p.texto}`}><i className="fa-solid fa-arrow-up-right-from-square" /></Link>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
