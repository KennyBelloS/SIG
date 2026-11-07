import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Cargando from '../components/Cargando';
import { getIndicadores, getProcesos, getConfiguracionNotificaciones, formatearMeta, traducirError } from '../lib/indicadores';
import { normalizar } from '../lib/libro';

const EMPRESA = 'FALCON FARMS DE COLOMBIA S.A. - FINCA TORREMOLINOS';
const TITULO = 'MATRIZ PARA LA DEFINICIÓN DE OBJETIVOS, METAS E INDICADORES';
const MESES_ABREV = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2025-12-01" → "dic-25", como lo muestra el Excel. */
export function fechaCorta(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso || ''));
  return m ? `${MESES_ABREV[Number(m[2]) - 1]}-${m[1].slice(2)}` : '';
}
const cap = t => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '—');
/** En el libro, el pilar y el tema vienen pegados ("...IntegridadTema: ..."): se separan en dos renglones para poder leerlos. */
function partirEstrategia(t) {
  const m = /^(.*?)\s*(Tema\s*:.*)$/is.exec(String(t || ''));
  return m ? [m[1].trim(), m[2].trim()] : [String(t || '—'), null];
}

// Las columnas, en el orden y con los títulos del Excel. "Directriz" es la primera columna del libro y viene oculta en la vista del Excel.
const COLUMNAS = [
  { id: 'directriz', titulo: 'DIRECTRIZ DE LA POLÍTICA DE GESTIÓN', ancho: 14, opcional: true, valor: i => i.directriz || '—' },
  { id: 'estrategia', titulo: 'ESTRATEGIA ASG', ancho: 14, valor: i => i.estrategia_asg || '—' },
  { id: 'objetivo', titulo: 'OBJETIVO', ancho: 14, valor: i => i.objetivo || '—' },
  { id: 'nombre', titulo: 'NOMBRE DEL INDICADOR', ancho: 13, valor: i => i.nombre },
  { id: 'unidad', titulo: 'UNIDAD DE MEDIDA', ancho: 9, valor: i => i.unidad_medida || '—' },
  { id: 'tipo', titulo: 'TIPO DE INDICADOR', ancho: 8, valor: i => i.tipo_indicador || '—' },
  { id: 'meta', titulo: 'META', ancho: 6, valor: i => formatearMeta(i) },
  { id: 'frecuencia', titulo: 'FRECUENCIA DE LA MEDICIÓN', ancho: 9, valor: i => cap(i.frecuencia) },
  { id: 'responsable', titulo: 'RESPONSABLE DE LA MEDICIÓN', ancho: 10, valor: i => i.responsable_medicion || '—' },
  { id: 'procesos', titulo: 'PROCESOS RELACIONADOS', ancho: 9, valor: i => i.procesos_relacionados || '—' },
  { id: 'fuente', titulo: 'FUENTE DE INFORMACIÓN', ancho: 8, valor: i => i.fuente_informacion || '—' },
];

/** La matriz tal como está en el libro de Excel: mismas columnas, mismo orden, mismo encabezado. */
export default function MatrizExcel({ selectorVista }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [procesoId, setProcesoId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [conDirectriz, setConDirectriz] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([getIndicadores(), getProcesos(), getConfiguracionNotificaciones().catch(() => null)])
      .then(([indicadores, procesos, cfg]) => vivo && setDatos({ indicadores, procesos, cfg }))
      .catch(e => vivo && setError(traducirError(e)));
    return () => { vivo = false; };
  }, []);

  const columnas = useMemo(() => COLUMNAS.filter(c => !c.opcional || conDirectriz), [conDirectriz]);
  const filas = useMemo(() => {
    if (!datos) return [];
    const q = normalizar(busqueda);
    return datos.indicadores.filter(i => (!procesoId || String(i.proceso_id) === String(procesoId)) && (!q || normalizar(COLUMNAS.map(c => c.valor(i)).join(' ')).includes(q)));
  }, [datos, procesoId, busqueda]);
  const version = datos?.cfg?.matriz_version || 'Versión 8';
  const fecha = fechaCorta(datos?.cfg?.matriz_fecha || '2025-12-01');

  async function exportar() {
    const { default: escribir } = await import('write-excel-file/browser');
    const n = columnas.length, b = { borderColor: '#000000', borderStyle: 'thin' };
    const caja = (value, extra = {}) => ({ value, align: 'center', alignVertical: 'center', wrap: true, ...b, ...extra });
    const nulos = k => Array(k).fill(null);
    const datosX = [
      [caja(EMPRESA, { fontWeight: 'bold', fontSize: 13, columnSpan: n - 1, rowSpan: 2, height: 24 }), ...nulos(n - 2), caja(version, { fontWeight: 'bold', fontSize: 12 })],
      [...nulos(n - 1), caja(fecha, { fontWeight: 'bold', fontSize: 12 })],
      [caja(TITULO, { fontWeight: 'bold', fontSize: 13, columnSpan: n - 1, height: 24 }), ...nulos(n - 2), caja('Página 1 de 1', { fontWeight: 'bold', fontSize: 12 })],
      nulos(n),
      columnas.map(c => caja(c.titulo, { fontWeight: 'bold', backgroundColor: '#F2F2F2', height: 34 })),
      ...filas.map(i => columnas.map(c => caja(String(c.valor(i)).replace(/(Tema\s*:)/, '\n$1'), { alignVertical: 'center' }))),
    ];
    await escribir(datosX, { columns: columnas.map(c => ({ width: Math.max(14, c.ancho * 2.2) })), orientation: 'landscape', showGridLines: false })
      .toFile(`Matriz-de-objetivos-metas-e-indicadores-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="page page-ancha">
      <PageHeader titulo="Matriz de indicadores" descripcion="La definición de cada indicador, igual que en el libro de Excel: objetivo, unidad, meta, frecuencia, responsable y fuente."
        cifras={datos ? [{ titulo: 'Indicadores', valor: filas.length, principal: true, nota: filas.length === datos.indicadores.length ? `en ${datos.procesos.length} procesos` : `de ${datos.indicadores.length} en total` }] : null}>
        {selectorVista}
        <button type="button" className="btn-secondary" onClick={exportar} disabled={!datos || !filas.length} aria-label="Descargar en formato Excel"><i className="fa-solid fa-file-excel" aria-hidden="true"></i> Excel</button>
        <button type="button" className="btn-secondary" onClick={() => window.print()} aria-label="Descargar PDF"><i className="fa-solid fa-file-pdf" aria-hidden="true"></i> PDF</button>
      </PageHeader>

      {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>}
      <div className="barra-filtros no-imprimir" role="search" aria-label="Filtrar la matriz">
        <label>Proceso<select value={procesoId} onChange={e => setProcesoId(e.target.value)}><option value="">Todos los procesos</option>{(datos?.procesos || []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>
        <label className="aud-buscar">Buscar<input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Un indicador, un responsable, una fuente…" /></label>
        <label className="ind-check"><input type="checkbox" checked={conDirectriz} onChange={e => setConDirectriz(e.target.checked)} /> Mostrar la directriz de la política</label>
      </div>

      {!datos && !error ? <Cargando filas={6} alto={64} /> : datos && (
        <div className="mx-excel-marco tabla-scroll" tabIndex={0} role="region" aria-label="Matriz de objetivos, metas e indicadores. Se desplaza hacia los lados con las flechas del teclado">
          <table className="mx-excel">
            <caption className="sr-only">{TITULO}</caption>
            <colgroup>{columnas.map(c => <col key={c.id} style={{ width: `${c.ancho}%` }} />)}</colgroup>
            <thead>
              <tr className="mx-x-cab">
                <th colSpan={columnas.length - 1} rowSpan={2} scope="colgroup" className="mx-x-empresa">{EMPRESA}</th>
                <th scope="col" className="mx-x-ver">{version}</th>
              </tr>
              <tr className="mx-x-cab"><th scope="col" className="mx-x-ver">{fecha}</th></tr>
              <tr className="mx-x-cab">
                <th colSpan={columnas.length - 1} scope="colgroup" className="mx-x-titulo">{TITULO}</th>
                <th scope="col" className="mx-x-ver">Página 1 de 1</th>
              </tr>
              <tr className="mx-x-separador" aria-hidden="true"><td colSpan={columnas.length} /></tr>
              <tr className="mx-x-columnas">{columnas.map(c => <th key={c.id} scope="col">{c.titulo}</th>)}</tr>
            </thead>
            <tbody>
              {filas.length === 0 && <tr><td colSpan={columnas.length} className="mx-x-vacio">No hay indicadores con ese filtro. Prueba con otro proceso o borra la búsqueda.</td></tr>}
              {filas.map((i, k) => (
                <tr key={i.id} style={{ '--k': k }}>
                  {columnas.map(c => {
                    if (c.id === 'estrategia') { const [a, t] = partirEstrategia(c.valor(i)); return <td key={c.id}>{a}{t && <><br />{t}</>}</td>; }
                    if (c.id === 'nombre') return <td key={c.id}><Link to={`/indicadores/${i.id}`} className="mx-x-enlace">{i.nombre}</Link></td>;
                    return <td key={c.id}>{c.valor(i)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
