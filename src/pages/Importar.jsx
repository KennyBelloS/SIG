import { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { avisar } from '../lib/toast';
import { traducirError } from '../lib/indicadores';
import { Confirmar } from '../components/Dialogo';
import { useSesion } from '../lib/useSesion';
import { getIndicadores, getProcesos, getCierresDelAnio, getConfiguracionNotificaciones, mesReporteActual, MESES } from '../lib/indicadores';
import { descargarPlantilla, leerLibro, validarRegistros, aplicarRegistros, validarIndicadoresNuevos, aplicarIndicadores } from '../lib/importar';

const { anio: ANIO_ACTUAL, mesActual: MES_ACTUAL } = mesReporteActual();

export default function Importar() {
  const { sesion } = useSesion();
  const entrada = useRef(null);
  const inicial = MES_ACTUAL === 1 ? { a: ANIO_ACTUAL - 1, m: 12 } : { a: ANIO_ACTUAL, m: MES_ACTUAL - 1 };
  const [anio, setAnio] = useState(inicial.a);
  const [mes, setMes] = useState(inicial.m);
  const [base, setBase] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [vista, setVista] = useState(null);       // { registros: [...], nuevos: [...] }
  const [pestana, setPestana] = useState('registros');
  const [error, setError] = useState(null);
  const [leyendo, setLeyendo] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    Promise.all([getIndicadores(), getProcesos(), getConfiguracionNotificaciones().catch(() => ({ dia_cierre: 12 }))])
      .then(([indicadores, procesos, cfg]) => setBase({ indicadores, procesos, diaCierre: cfg?.dia_cierre ?? 12 }))
      .catch(e => setError(traducirError(e)));
  }, []);

  async function plantilla() {
    setError(null);
    try { await descargarPlantilla({ indicadores: base.indicadores, procesos: base.procesos, anio, mes }); }
    catch (e) { setError(traducirError(e)); }
  }

  async function elegir(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null); setResultado(null); setVista(null); setArchivo(f); setLeyendo(true);
    try {
      const libro = await leerLibro(f);
      const anios = [...new Set(libro.registros.map(r => Number(r.ano ?? r.anio)).filter(Number.isInteger))];
      const cierresPorAnio = new Map();
      for (const a of anios) cierresPorAnio.set(a, await getCierresDelAnio(a));
      const registros = validarRegistros(libro.registros, base.indicadores, { cierresPorAnio, diaCierre: base.diaCierre });
      const nuevos = sesion?.esAdmin ? validarIndicadoresNuevos(libro.nuevos, base.procesos, base.indicadores) : [];
      setVista({ registros, nuevos, ignoradosNuevos: !sesion?.esAdmin ? libro.nuevos.length : 0 });
      setPestana(registros.length || !nuevos.length ? 'registros' : 'nuevos');
      if (!registros.length && !nuevos.length) setError('No encontré filas para importar. Revisa que hayas llenado la hoja "Registros" (columnas Valor y Plan de acción).');
    } catch (err) { setError(traducirError(err)); setArchivo(null); }
    finally { setLeyendo(false); e.target.value = ''; }
  }

  const lista = vista ? vista[pestana] : [];
  const validas = lista.filter(x => x.ok).length;
  const conError = lista.length - validas;
  const totalValidas = useMemo(() => (vista ? vista.registros.filter(x => x.ok).length + vista.nuevos.filter(x => x.ok).length : 0), [vista]);

  async function importar() {
    setAplicando(true); setError(null);
    try {
      const r1 = vista.registros.some(x => x.ok) ? await aplicarRegistros(vista.registros, sesion.email) : { guardadas: 0, fallos: [] };
      const r2 = vista.nuevos.some(x => x.ok) ? await aplicarIndicadores(vista.nuevos) : { creados: 0, fallos: [] };
      setResultado({ guardadas: r1.guardadas, creados: r2.creados, fallos: [...r1.fallos, ...r2.fallos] });
      if (r1.guardadas + r2.creados > 0) avisar(`Importación lista: ${r1.guardadas} registro${r1.guardadas === 1 ? '' : 's'}${r2.creados ? ` y ${r2.creados} indicador${r2.creados === 1 ? '' : 'es'} nuevo${r2.creados === 1 ? '' : 's'}` : ''} guardado${r1.guardadas + r2.creados === 1 ? '' : 's'}.`, { tipo: 'ok', celebrar: r1.fallos.length + r2.fallos.length === 0 });
      setVista(null); setArchivo(null);
    } catch (e) { setError(traducirError(e)); }
    finally { setAplicando(false); setConfirmar(false); }
  }

  return (
    <div className="page">
      <PageHeader
        migas={[{ texto: 'Datos' }, { texto: 'Importar Excel' }]}
        titulo="Importar desde Excel"
        descripcion="Carga varios registros de una vez. Lo habitual sigue siendo registrar a mano, indicador por indicador; esto sirve para adelantar trabajo."
      />
      {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation"></i><span>{error}</span></div>}

      <ol className="pasos">
        <li className="paso">
          <span className="paso-n">1</span>
          <div className="paso-cuerpo">
            <h2>Descarga la plantilla</h2>
            <p>Trae los indicadores del mes ya listados; tú solo completas valor, causa y plan de acción.</p>
            <div className="cabecera-acciones">
              <select aria-label="Mes" value={mes} onChange={e => setMes(Number(e.target.value))}>{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
              <select aria-label="Año" value={anio} onChange={e => setAnio(Number(e.target.value))}>{[ANIO_ACTUAL, ANIO_ACTUAL - 1].map(a => <option key={a} value={a}>{a}</option>)}</select>
              <button className="btn-secondary" onClick={plantilla} disabled={!base}><i className="fa-solid fa-file-excel"></i> Descargar plantilla</button>
            </div>
          </div>
        </li>
        <li className="paso">
          <span className="paso-n">2</span>
          <div className="paso-cuerpo">
            <h2>Sube el archivo completado</h2>
            <p>Solo se aceptan archivos <strong>.xlsx</strong> de hasta 5 MB. Antes de guardar nada verás una vista previa.</p>
            <input ref={entrada} id="archivo-excel" type="file" accept=".xlsx" onChange={elegir} className="sr-only" disabled={!base || leyendo} />
            <label htmlFor="archivo-excel" className={`btn-primary${!base || leyendo ? ' desactivado' : ''}`} style={{ cursor: 'pointer' }}>
              <i className={`fa-solid ${leyendo ? 'fa-circle-notch fa-spin' : 'fa-file-arrow-up'}`}></i> {leyendo ? 'Leyendo…' : 'Elegir archivo'}
            </label>
            {archivo && !resultado && <span className="texto-tenue" style={{ marginLeft: 12 }}>{archivo.name}</span>}
          </div>
        </li>
      </ol>

      {resultado && (
        <section className="panel" role="status">
          <div className="panel-header"><h2>Importación terminada</h2></div>
          <div className="aviso aviso-ok"><i className="fa-solid fa-circle-check"></i><span>
            {resultado.guardadas > 0 && <>Se guardaron <strong>{resultado.guardadas}</strong> registros. </>}
            {resultado.creados > 0 && <>Se crearon <strong>{resultado.creados}</strong> indicadores nuevos. </>}
            {resultado.guardadas === 0 && resultado.creados === 0 && 'No se guardó nada.'}
          </span></div>
          {resultado.fallos.length > 0 && (
            <div className="aviso aviso-error" style={{ flexDirection: 'column' }}>
              <strong>{resultado.fallos.length} fila(s) no se pudieron guardar:</strong>
              <ul style={{ paddingLeft: 18 }}>{resultado.fallos.map((f, i) => <li key={i}>Fila {f.fila}, {f.indicador}: {f.mensaje}</li>)}</ul>
            </div>
          )}
        </section>
      )}

      {vista && (
        <section className="panel">
          <div className="panel-header">
            <h2>3. Revisa antes de guardar</h2>
            {vista.nuevos.length > 0 && (
              <div className="filtros-estado" role="tablist">
                <button role="tab" aria-selected={pestana === 'registros'} className={`filtro-chip ${pestana === 'registros' ? 'filtro-chip-activo' : ''}`} onClick={() => setPestana('registros')}>Registros ({vista.registros.length})</button>
                <button role="tab" aria-selected={pestana === 'nuevos'} className={`filtro-chip ${pestana === 'nuevos' ? 'filtro-chip-activo' : ''}`} onClick={() => setPestana('nuevos')}>Indicadores nuevos ({vista.nuevos.length})</button>
              </div>
            )}
          </div>
          {vista.ignoradosNuevos > 0 && <div className="aviso aviso-info"><i className="fa-solid fa-circle-info"></i><span>El archivo trae {vista.ignoradosNuevos} fila(s) de &ldquo;Indicadores nuevos&rdquo;; se ignoran porque solo un administrador puede crear indicadores.</span></div>}
          <div className="resumen-import">
            <span className="chip-ind chip-ind-ok"><i className="fa-solid fa-check"></i> {validas} {validas === 1 ? 'válida' : 'válidas'}</span>
            {conError > 0 && <span className="chip-ind chip-ind-no"><i className="fa-solid fa-xmark"></i> {conError} con error, no se {conError === 1 ? 'guardará' : 'guardarán'}</span>}
          </div>
          <div className="tabla-scroll">
            <table className="tabla-apilable">
              <thead>{pestana === 'registros'
                ? <tr><th>Fila</th><th>Indicador</th><th>Mes</th><th>Valor</th><th>Resultado de la revisión</th></tr>
                : <tr><th>Fila</th><th>Indicador nuevo</th><th>Proceso</th><th>Meta</th><th>Resultado de la revisión</th></tr>}</thead>
              <tbody>
                {lista.map(x => (
                  <tr key={x.fila} className={x.ok ? '' : 'fila-error'}>
                    <td data-label="Fila" className="celda-numero">{x.fila}</td>
                    <td data-label={pestana === 'registros' ? 'Indicador' : 'Nombre'} className="celda-principal">{pestana === 'registros' ? x.indicador : x.nombre}</td>
                    <td data-label={pestana === 'registros' ? 'Mes' : 'Proceso'}>{pestana === 'registros' ? (x.mes ? `${MESES[x.mes - 1]} ${x.anio || ''}` : '—') : x.proceso}</td>
                    <td data-label={pestana === 'registros' ? 'Valor' : 'Meta'} className="celda-numero">{pestana === 'registros' ? x.valorTexto : x.meta}</td>
                    <td data-label="Revisión">
                      {x.ok ? <span className="chip-ind chip-ind-ok"><i className="fa-solid fa-check"></i> {x.nota ? `Lista, ${x.nota}` : 'Lista'}</span>
                        : <ul className="errores-fila">{x.errores.map((er, i) => <li key={i}><i className="fa-solid fa-xmark"></i>{er}</li>)}</ul>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ind-proceso-acciones">
            <button className="btn-primary" disabled={totalValidas === 0} onClick={() => setConfirmar(true)}>Importar {totalValidas} fila{totalValidas !== 1 ? 's' : ''} válida{totalValidas !== 1 ? 's' : ''}</button>
            <button className="btn-secondary" onClick={() => { setVista(null); setArchivo(null); }}>Descartar</button>
          </div>
        </section>
      )}

      {confirmar && (
        <Confirmar
          titulo={`¿Guardar ${totalValidas} filas?`}
          texto="Se guardarán solo las filas marcadas como válidas. Si un registro ya existía, se reemplaza por el del archivo. Las filas con error se ignoran."
          textoBoton="Guardar" cargando={aplicando} onConfirmar={importar} onCancelar={() => setConfirmar(false)}
        />
      )}
    </div>
  );
}
