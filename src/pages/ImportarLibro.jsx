import { useEffect, useMemo, useRef, useState } from 'react';
import TextoAgua from '../components/TextoAgua';
import PageHeader from '../components/PageHeader';
import { Confirmar } from '../components/Dialogo';
import { avisar } from '../lib/toast';
import { getIndicadores, getProcesos, getRegistrosAnioCompletos, mesReporteActual, traducirError } from '../lib/indicadores';
import { esLibroOriginal, parsearLibro, planificarImportacion, cargaParaServidor, impactoMetaMensual } from '../lib/libro';
import { importarLibroEnServidor } from '../lib/importarLibro';

const { anio: ANIO_ACTUAL } = mesReporteActual();
const MAX_BYTES = 10 * 1024 * 1024;
const pct = v => (v == null ? '—' : `${(v * 100).toFixed(2).replace(/\.?0+$/, '')} %`);
const NOMBRE_CAMPO = {
  directriz: 'Directriz', estrategia_asg: 'Estrategia ASG', objetivo: 'Objetivo', unidad_medida: 'Unidad', tipo_indicador: 'Tipo', frecuencia: 'Frecuencia',
  responsable_medicion: 'Responsable', procesos_relacionados: 'Procesos relacionados', fuente_informacion: 'Fuente', formula_calculo: 'Fórmula',
  meta_anual: 'Meta anual', meta_mensual: 'Meta mensual', metas_mensuales: 'Metas por mes', referencia_anterior: 'Cierre del año anterior',
};
const ESTADO_REGISTRO = { nuevo: 'nuevos', igual: 'iguales', completar: 'por completar', reemplazar: 'por reemplazar', distinto: 'distintos (no se tocan)' };

export default function ImportarLibro({ selectorModo }) {
  const entrada = useRef(null);
  const [base, setBase] = useState(null);
  const [libro, setLibro] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [modo, setModo] = useState('completar');
  const [corregir, setCorregir] = useState(true);
  const [regs, setRegs] = useState(null);
  const [procesoDe, setProcesoDe] = useState({});
  const [filtro, setFiltro] = useState('todos');
  const [error, setError] = useState(null);
  const [leyendo, setLeyendo] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    Promise.all([getIndicadores(), getProcesos()]).then(([indicadores, procesos]) => setBase({ indicadores, procesos })).catch(e => setError(traducirError(e)));
  }, []);
  useEffect(() => {
    if (!libro) return;
    setRegs(null);
    getRegistrosAnioCompletos(anio).then(setRegs).catch(e => setError(traducirError(e)));
  }, [libro, anio]);

  async function elegir(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setError(null); setResultado(null); setLibro(null);
    if (!/\.xlsx$/i.test(archivo.name)) { setError('El archivo debe ser .xlsx. Si es .xls, ábrelo en Excel y guárdalo como .xlsx.'); return; }
    if (archivo.size > MAX_BYTES) { setError('El archivo pesa más de 10 MB.'); return; }
    setLeyendo(true);
    try {
      let hojas;
      try { const { default: leer } = await import('read-excel-file/browser'); hojas = await leer(archivo); }
      catch { throw new Error('No se pudo leer el archivo. Verifica que sea un .xlsx válido y que no esté protegido con contraseña.'); }
      if (!esLibroOriginal(hojas)) throw new Error('Este no parece el libro de Indicadores de Gestión: no encuentro la hoja "Indicadores" con sus columnas. Para cargar los registros de un mes, usa la otra opción de arriba.');
      const l = parsearLibro(hojas);
      // se vuelve a leer lo que hay en la aplicación: si alguien cambió algo mientras esta pantalla estaba abierta, la comparación debe verlo
      const [indicadores, procesos] = await Promise.all([getIndicadores(), getProcesos()]);
      setBase({ indicadores, procesos });
      const delNombre = archivo.name.match(/(20\d{2})/);
      setNombreArchivo(archivo.name); setProcesoDe({}); setFiltro('todos');
      if (delNombre) setAnio(Number(delNombre[1]));
      setLibro(l);
    } catch (err) { setError(err.message); } finally { setLeyendo(false); }
  }

  const app = useMemo(() => (base && regs ? { indicadores: base.indicadores, registros: regs } : null), [base, regs]);
  const plan = useMemo(() => (libro && app ? planificarImportacion(libro, app, { anio, modo, procesos: base.procesos, procesoDe, corregir }) : null), [libro, app, anio, modo, procesoDe, base, corregir]);
  const impacto = useMemo(() => (libro && app ? impactoMetaMensual(libro, app) : []), [libro, app]);
  const carga = useMemo(() => (plan ? cargaParaServidor(plan, libro, procesoDe) : null), [plan, libro, procesoDe]);

  const t = plan?.total;
  const aGuardar = carga ? carga.catalogo.length + carga.registros.length : 0;
  const avisosGlobales = libro?.avisos || [];
  const filasConAviso = plan ? plan.filas.filter(f => f.avisos.length) : [];
  const filas = useMemo(() => {
    if (!plan) return [];
    return plan.filas.filter(f => filtro === 'todos' || (filtro === 'cambios' && (f.cambios.length || f.registros.some(r => ['nuevo', 'completar', 'reemplazar'].includes(r.estado)))) || (filtro === 'nuevos' && f.estado === 'nuevo') || (filtro === 'avisos' && f.avisos.length));
  }, [plan, filtro]);

  async function importar() {
    setConfirmar(false); setAplicando(true); setError(null);
    try {
      const r = await importarLibroEnServidor(carga);
      setResultado(r);
      avisar(r.totalErrores ? 'Importación terminada con avisos.' : 'Libro importado.', { tipo: r.totalErrores ? 'alerta' : 'ok', celebrar: !r.totalErrores });
      const [indicadores, procesos] = await Promise.all([getIndicadores(), getProcesos()]);
      setBase({ indicadores, procesos });
      setRegs(await getRegistrosAnioCompletos(anio));
    } catch (err) { setError(err.message); } finally { setAplicando(false); }
  }

  return (
    <div className="page">
      <PageHeader
        titulo="Importar el libro de indicadores"
        descripcion="Sube el Excel original, completo. Se lee entero, se compara con lo que ya hay y verás qué cambiaría antes de guardar nada."
        cifras={plan ? [
          { titulo: 'Indicadores en el libro', valor: libro.indicadores.length, principal: true, nota: `${t.indicadoresCoinciden} ya están y ${t.indicadoresNuevos} son nuevos` },
          { titulo: 'Meses nuevos', valor: t.regNuevos, tono: t.regNuevos ? 'aten' : '', nota: `${t.regIguales} ya están iguales` },
          { titulo: 'Se guardará', valor: aGuardar, tono: aGuardar ? 'bien' : '', nota: aGuardar ? 'cambios en total' : 'nada que cambiar' },
        ] : null}
      >
        {selectorModo}
        {libro && (
          <>
            <label className="campo-lateral">Año de los datos
              <select value={anio} onChange={e => setAnio(Number(e.target.value))}>{[ANIO_ACTUAL + 1, ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2].map(a => <option key={a} value={a}>{a}</option>)}</select>
            </label>
            <button type="button" className="btn-secondary" onClick={() => entrada.current?.click()}><i className="fa-solid fa-file-arrow-up" aria-hidden="true"></i> Elegir otro libro</button>
          </>
        )}
      </PageHeader>

      {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>}
      <input ref={entrada} type="file" accept=".xlsx" hidden onChange={elegir} aria-label="Elegir el libro de Excel" />

      {!libro && (
        <section className="panel">
          <div className="panel-header"><div><h2><TextoAgua>1. Elige el libro</TextoAgua></h2><p className="sub">El archivo «Indicadores de Gestión» tal como lo tienes: hoja «Indicadores» y una hoja por indicador.</p></div></div>
          <div className="import-subir">
            <button type="button" className="btn-primary" onClick={() => entrada.current?.click()} disabled={leyendo || !base}>
              <i className={`fa-solid ${leyendo ? 'fa-spinner fa-spin' : 'fa-file-excel'}`} aria-hidden="true"></i> {leyendo ? 'Leyendo el libro…' : 'Elegir el libro (.xlsx)'}
            </button>
            <ul className="import-lista">
              <li><strong>Lee:</strong> el catálogo (meta, unidad, responsable, fuente, fórmula), la meta mensual de cada indicador, el valor de cada mes y el análisis y plan de acción escritos.</li>
              <li><strong>No guarda nada todavía:</strong> primero te muestra qué cambiaría, y solo guarda cuando tú confirmas.</li>
              <li><strong>Seguro de repetir:</strong> por defecto solo agrega lo que falta y llena lo que está vacío; no pisa lo que ya tienes.</li>
            </ul>
          </div>
        </section>
      )}

      {libro && !plan && <div className="panel" role="status"><p>Comparando con lo que ya hay en la aplicación…</p></div>}

      {plan && (
        <>
          <section className="panel" aria-labelledby="imp-modo">
            <div className="panel-header"><div><h2 id="imp-modo">Cómo importar</h2><p className="sub">Archivo: {nombreArchivo}</p></div></div>
            <fieldset className="import-modo">
              <legend className="sr-only">Modo de importación</legend>
              <label className={modo === 'completar' ? 'activo' : ''}><input type="radio" name="modo" checked={modo === 'completar'} onChange={() => setModo('completar')} />
                <span><strong>Completar (recomendado)</strong>Agrega los meses que faltan y llena el análisis o plan que estén vacíos. Lo que ya tienes en la aplicación no se toca.</span></label>
              <label className={modo === 'reemplazar' ? 'activo' : ''}><input type="radio" name="modo" checked={modo === 'reemplazar'} onChange={() => setModo('reemplazar')} />
                <span><strong>Reemplazar</strong>El libro manda: los meses que difieran se sobrescriben con lo del libro, y también los campos del catálogo que hayan cambiado.</span></label>
            </fieldset>
            <dl className="import-cifras">
              <div><dt>Meses nuevos</dt><dd>{t.regNuevos}</dd></div>
              <div><dt>Ya están iguales</dt><dd>{t.regIguales}</dd></div>
              <div><dt>{modo === 'completar' ? 'Por completar' : 'Por reemplazar'}</dt><dd>{modo === 'completar' ? t.regCompletar : t.regDistintos}</dd></div>
              {modo === 'completar' && <div><dt>Distintos, sin tocar</dt><dd>{t.regOmitidos}</dd></div>}
              {t.regRecalcular > 0 && <div><dt>Se recalculan</dt><dd>{t.regRecalcular}</dd></div>}
              <div><dt>Ceros de relleno ignorados</dt><dd>{t.cerosIgnorados}</dd></div>
            </dl>
            <p className="ayuda-campo">El libro rellena con 0 los meses que todavía no se reportan. Un 0 sin análisis ni plan escrito se toma como relleno y no se importa; un 0 con texto sí es un dato real.</p>
          </section>

          {libro.indicadores.some(i => i.correccion) && (
            <section className="panel import-impacto" aria-labelledby="imp-formulas">
              <div className="panel-header"><div><h2 id="imp-formulas">Fórmulas del libro que no miden lo que dicen: {libro.indicadores.filter(i => i.correccion).length} indicadores</h2><p className="sub">Léelo antes de importar.</p></div></div>
              <p>El libro trae los resultados ya calculados, y en estos indicadores la fórmula tiene un error: en los de <strong>reducción</strong> el signo está al revés (da negativo justo cuando el consumo baja, que es lo que se busca) y en <strong>planeación de formación</strong> se divide por lo que no corresponde. La aplicación los calcula bien a partir de los dos números de cada mes, que también se importan.</p>
              <label className="import-opcion"><input type="checkbox" checked={corregir} onChange={e => setCorregir(e.target.checked)} /> <span><strong>Corregir las fórmulas y recalcular los resultados</strong> (recomendado). Si lo desmarcas, solo se guardan los dos números de cada mes y los resultados quedan como están.</span></label>
              <div className="tabla-scroll" tabIndex={0} role="region" aria-label="Fórmulas que se corrigen: usa las flechas del teclado para moverte">
                <table>
                  <thead><tr><th>Indicador</th><th>Fórmula en el libro</th><th>Fórmula en la aplicación</th><th>Meses que cambian</th><th>Un ejemplo</th></tr></thead>
                  <tbody>{libro.indicadores.filter(i => i.correccion).map(i => (
                    <tr key={i.orden}><td className="celda-principal">{i.nombre}</td><td>{i.correccion.formulaLibro}</td><td>{i.correccion.formulaApp}</td><td>{i.correccion.cambian} de {i.correccion.total}</td>
                      <td>{i.correccion.ejemplo ? <>Mes {i.correccion.ejemplo.mes}: <s>{pct(i.correccion.ejemplo.libro)}</s> → <strong>{pct(i.correccion.ejemplo.app)}</strong></> : '—'}</td></tr>
                  ))}</tbody>
                </table>
              </div>
              <p className="ayuda-campo">Total: {libro.indicadores.reduce((n, i) => n + (i.correccion?.cambian || 0), 0)} meses cambian de resultado. Los indicadores de reducción pasan a «mayor es mejor», porque aquí un resultado positivo es bueno. Otros {libro.indicadores.filter(i => i.avisos.some(a => /fórmula dudosa/.test(a))).length} indicadores tienen fórmulas dudosas y NO se tocan: aparecen en los avisos.</p>
            </section>
          )}

          {impacto.length > 0 && (
            <section className="panel import-impacto" aria-labelledby="imp-meta">
              <div className="panel-header"><div><h2 id="imp-meta">Meta mensual: cambia cómo se evalúan {impacto.length} indicadores</h2><p className="sub">Léelo antes de importar.</p></div></div>
              <p>El libro mide cada mes contra una <strong>meta mensual</strong> (por ejemplo, la meta anual repartida entre los 12 meses). La aplicación los comparaba contra la meta anual completa, por eso aparecían incumplidos. Al importar, se evalúan como en el libro.</p>
              <div className="tabla-scroll" tabIndex={0} role="region" aria-label="Indicadores que cambian de meta: usa las flechas del teclado para moverte">
                <table>
                  <thead><tr><th>Indicador</th><th>Meta anual</th><th>Meta mensual del libro</th><th>Meses evaluados</th><th>Cumplían</th><th>Cumplirán</th></tr></thead>
                  <tbody>{impacto.map(x => (
                    <tr key={x.orden}><td className="celda-principal">{x.nombre}</td><td>{pct(x.metaAnual)}</td><td>{pct(x.metaMensual)}</td><td>{x.evaluados}</td><td>{x.antes}</td>
                      <td><strong className={x.despues > x.antes ? 'texto-ok' : ''}>{x.despues}</strong>{x.cambian ? <span className="texto-tenue"> ({x.cambian} cambian)</span> : null}</td></tr>
                  ))}</tbody>
                </table>
              </div>
              <p className="ayuda-campo">Total: {impacto.reduce((n, x) => n + x.cambian, 0)} meses cambian de estado entre {impacto.reduce((n, x) => n + x.evaluados, 0)} evaluados. Los valores no cambian, solo la meta contra la que se comparan.</p>
            </section>
          )}

          {(t.sinPlanHistorico > 0 || avisosGlobales.length > 0 || filasConAviso.length > 0 || libro.referencia.filas > 0) && (
            <section className="panel" aria-labelledby="imp-avisos">
              <div className="panel-header"><div><h2 id="imp-avisos">Lo que conviene saber</h2></div></div>
              <ul className="import-avisos">
                {t.sinPlanHistorico > 0 && <li><i className="fa-solid fa-circle-info" aria-hidden="true"></i><span><strong>{t.sinPlanHistorico} {t.sinPlanHistorico === 1 ? 'mes trae' : 'meses traen'} valor pero no plan de acción.</strong> {t.sinPlanHistorico === 1 ? 'Se importa como histórico' : 'Se importan como históricos'} (no se les exige plan) y seguirán apareciendo como «sin plan» en el Dashboard hasta que se complete.</span></li>}
                {avisosGlobales.map(a => <li key={a}><i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span>{a}</span></li>)}
                {filasConAviso.map(f => f.avisos.map(a => <li key={f.orden + a}><i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span><strong>{f.nombre}:</strong> {a}</span></li>))}
                {libro.referencia.filas > 0 && <li><i className="fa-solid fa-circle-info" aria-hidden="true"></i><span><strong>Hoja2 (cierre del año anterior):</strong> {libro.referencia.asociadas} de {libro.referencia.filas} filas se asocian con un indicador sin dudas y quedan como referencia en su ficha. Las otras {libro.referencia.sinAsociar} se omiten: su nombre no coincide o aparece repetido.</span></li>}
              </ul>
            </section>
          )}

          <section className="panel" aria-labelledby="imp-detalle">
            <div className="panel-header">
              <div><h2 id="imp-detalle">Indicador por indicador</h2><p className="sub">{filas.length} de {plan.filas.length} indicadores</p></div>
              <div className="filtros-estado" role="group" aria-label="Filtrar indicadores">
                {[['todos', 'Todos'], ['cambios', 'Con cambios'], ['nuevos', 'Nuevos'], ['avisos', 'Con avisos']].map(([k, n]) => <button key={k} type="button" className={filtro === k ? 'activo' : ''} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{n}</button>)}
              </div>
            </div>
            <div className="tabla-scroll" tabIndex={0} role="region" aria-label="Detalle de la importación por indicador: usa las flechas del teclado para moverte">
              <table className="tabla-import">
                <thead><tr><th>N.º</th><th>Indicador</th><th>Estado</th><th>Catálogo</th><th>Meses del libro</th></tr></thead>
                <tbody>
                  {filas.length === 0 && <tr><td colSpan={5} className="texto-tenue" style={{ textAlign: 'center' }}>Ningún indicador cumple ese filtro.</td></tr>}
                  {filas.map(f => {
                    const cuenta = {}; f.registros.forEach(r => { cuenta[r.estado] = (cuenta[r.estado] || 0) + 1; });
                    return (
                      <tr key={f.orden}>
                        <td>{f.orden}</td>
                        <td className="celda-principal">{f.nombre}<span className="texto-tenue celda-sub">Hoja «{f.hoja || '—'}»</span></td>
                        <td>
                          {f.estado === 'nuevo' ? <span className="chip-ind chip-ind-pendiente">Nuevo</span> : <span className="chip-ind chip-ind-ok">Ya existe</span>}
                          {f.estado === 'nuevo' && (
                            <select className="select-fino" aria-label={`Proceso de ${f.nombre}`} value={procesoDe[f.orden] ?? f.procesoSugerido ?? ''} onChange={e => setProcesoDe(p => ({ ...p, [f.orden]: Number(e.target.value) }))}>
                              {base.procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                          )}
                        </td>
                        <td>{f.cambios.length === 0 ? <span className="texto-tenue">Sin cambios</span> : (
                          <details><summary>{f.cambios.length} cambio{f.cambios.length === 1 ? '' : 's'}</summary>
                            <ul className="import-cambios">{f.cambios.map(c => <li key={c.campo}><strong>{NOMBRE_CAMPO[c.campo] || c.campo}:</strong> {typeof c.antes === 'number' ? pct(c.antes) : (c.antes || 'vacío')} → {typeof c.despues === 'number' ? pct(c.despues) : String(c.despues).slice(0, 80)}</li>)}</ul>
                          </details>)}
                        </td>
                        <td>{f.registros.length === 0 ? <span className="texto-tenue">Sin datos</span> : Object.entries(cuenta).map(([k, n]) => <span key={k} className={`import-conteo e-${k}`}>{n} {ESTADO_REGISTRO[k]}</span>)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="import-barra" role="region" aria-label="Confirmar la importación">
            <p>{aGuardar === 0 ? 'No hay nada que importar: la aplicación ya tiene todo lo del libro.' : <>Se guardarán <strong>{carga.catalogo.filter(c => c.nuevo).length}</strong> indicadores nuevos, <strong>{carga.catalogo.filter(c => !c.nuevo).length}</strong> indicadores actualizados y <strong>{carga.registros.length}</strong> meses.</>}</p>
            <button type="button" className="btn-primary" disabled={aGuardar === 0 || aplicando} onClick={() => setConfirmar(true)}>{aplicando ? 'Importando…' : 'Importar a la aplicación'}</button>
          </div>
        </>
      )}

      {resultado && (
        <section className="panel acceso-creado" role="status" aria-label="Resultado de la importación">
          <div className="acceso-creado-cab"><i className="fa-solid fa-circle-check" aria-hidden="true"></i><strong>{resultado.totalErrores ? 'Importación terminada, con avisos' : 'Importación terminada'}</strong></div>
          <dl>
            <div><dt>Indicadores creados</dt><dd>{resultado.resumen.indicadoresCreados}</dd></div>
            <div><dt>Indicadores actualizados</dt><dd>{resultado.resumen.indicadoresActualizados}</dd></div>
            <div><dt>Meses guardados</dt><dd>{resultado.resumen.registrosGuardados}</dd></div>
            <div><dt>Meses completados</dt><dd>{resultado.resumen.registrosCompletados}</dd></div>
            {resultado.resumen.registrosRecalculados > 0 && <div><dt>Meses recalculados</dt><dd>{resultado.resumen.registrosRecalculados}</dd></div>}
          </dl>
          {resultado.errores?.length > 0 && <ul className="import-avisos">{resultado.errores.map((e, i) => <li key={i}><i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span><strong>{e.ref}:</strong> {e.mensaje}</span></li>)}</ul>}
        </section>
      )}

      {confirmar && (
        <Confirmar titulo="¿Importar el libro?" textoBoton="Importar"
          texto={`Se escribirá en la base de datos: ${carga.catalogo.filter(c => c.nuevo).length} indicadores nuevos, ${carga.catalogo.filter(c => !c.nuevo).length} actualizados y ${carga.registros.length} meses de ${anio}${libro.indicadores.some(i => i.registros.length) ? ', incluidos meses ya cerrados (es un libro histórico)' : ''}.${impacto.length ? ` ${impacto.length} indicadores pasarán a evaluarse contra su meta mensual.` : ''} Después puedes repetir la importación sin riesgo.`}
          onCancelar={() => setConfirmar(false)} onConfirmar={importar} />
      )}
    </div>
  );
}
