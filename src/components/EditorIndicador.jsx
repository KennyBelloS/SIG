import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Dialogo, { Confirmar } from './Dialogo';
import GraficaMetas from './GraficaMetas';
import BotonEstado from './vida/BotonEstado';
import { menosMovimiento } from '../lib/preferencias';
import { avisar } from '../lib/toast';
import { CALCULOS, etiquetasDe } from '../lib/calculo';
import {
  actualizarIndicador, crearIndicador, desactivarIndicador, traducirError, esPorcentaje, entradaAValor, valorAEntrada,
  cumpleMeta, formatearValor, metaDelMes, mesReporteActual, MESES, MESES_CORTO,
} from '../lib/indicadores';

const CAMPOS = {
  nombre: { etiqueta: 'Nombre del indicador', tipo: 'text' },
  objetivo: { etiqueta: 'Objetivo', tipo: 'textarea' },
  directriz: { etiqueta: 'Directriz de la política', tipo: 'textarea' },
  estrategia_asg: { etiqueta: 'Estrategia ASG', tipo: 'textarea' },
  unidad_medida: { etiqueta: 'Unidad de medida', tipo: 'text' },
  tipo_indicador: { etiqueta: 'Tipo de indicador', tipo: 'select', opciones: ['Cumplimiento', 'Eficacia', 'Eficiencia'] },
  frecuencia: { etiqueta: 'Frecuencia de medición', tipo: 'select', opciones: [['mensual', 'Mensual'], ['trimestral', 'Trimestral'], ['semestral', 'Semestral'], ['anual', 'Anual']] },
  frecuencia_seguimiento: { etiqueta: 'Frecuencia de seguimiento', tipo: 'select', vacio: 'Igual que la frecuencia de medición', opciones: [['mensual', 'Mensual'], ['bimestral', 'Bimestral'], ['trimestral', 'Trimestral'], ['semestral', 'Semestral'], ['anual', 'Anual']] },
  sentido_meta: { etiqueta: 'Sentido de la meta', tipo: 'select', opciones: [['mayor_mejor', 'Mayor es mejor'], ['menor_mejor', 'Menor es mejor']] },
  formula_calculo: { etiqueta: 'Fórmula de cálculo', tipo: 'textarea' },
  meta_anual: { etiqueta: 'Meta anual', tipo: 'number' },
  meta_mensual: { etiqueta: 'Meta mensual (igual todos los meses)', tipo: 'number' },
  meta_maxima: { etiqueta: 'Meta máxima (opcional)', tipo: 'number' },
  tipo_meta: { etiqueta: 'Meta que rige el indicador', tipo: 'select', vacio: 'Automática (según tenga metas por mes)', opciones: [['anual', 'La meta anual'], ['mensual', 'La meta mensual']] },
  responsable_medicion: { etiqueta: 'Responsable de la medición', tipo: 'text' },
  procesos_relacionados: { etiqueta: 'Procesos relacionados', tipo: 'text' },
  fuente_informacion: { etiqueta: 'Fuente de información', tipo: 'text' },
  categoria: { etiqueta: 'Categoría', tipo: 'text' },
  color_categoria: { etiqueta: 'Color de la categoría', tipo: 'color' },
};
const CAMPOS_META = ['meta_anual', 'meta_mensual', 'meta_maxima'];
const PESTANAS = [
  { id: 'datos', texto: 'Datos', icono: 'fa-id-card', campos: ['nombre', 'objetivo', 'directriz', 'estrategia_asg'] },
  { id: 'metas', texto: 'Medición y metas', icono: 'fa-bullseye', campos: ['unidad_medida', 'tipo_indicador', 'frecuencia', 'frecuencia_seguimiento', 'sentido_meta', 'formula_calculo', 'meta_anual', 'meta_mensual', 'meta_maxima', 'tipo_meta'] },
  { id: 'registro', texto: 'Cómo se registra', icono: 'fa-calculator', campos: [] },
  { id: 'quien', texto: 'Responsables', icono: 'fa-people-group', campos: ['responsable_medicion', 'procesos_relacionados', 'fuente_informacion', 'categoria', 'color_categoria'] },
];
const TEXTO_CALCULO = {
  directo: 'La persona escribe el resultado del mes.',
  ejecucion: 'Se escriben dos números (lo planeado y lo ejecutado) y el resultado sale solo: ejecutadas ÷ planeadas.',
  razon: 'Se escriben dos números (numerador y denominador) y el resultado sale solo: numerador ÷ denominador.',
  reduccion: 'Se escriben dos números (el año anterior y el actual) y el resultado sale solo: cuánto bajó. Un resultado positivo es bueno.',
};
const { anio: ANIO } = mesReporteActual();

/** La hoja del indicador: lo mismo que cuenta el Excel (datos, metas mes a mes, cómo se calcula), con una vista previa que cambia mientras se escribe. */
export default function EditorIndicador({ indicador, procesos, procesoInicial, onGuardado, onCancelar }) {
  const crear = !indicador;
  const base = indicador || { unidad_medida: '', sentido_meta: 'mayor_mejor', frecuencia: 'mensual', calculo: 'directo' };
  const [form, setForm] = useState(() => ({
    ...Object.fromEntries(Object.keys(CAMPOS).map(k => [k, base[k] ?? ''])),
    ...Object.fromEntries(CAMPOS_META.map(k => [k, valorAEntrada(base, base[k])])),
    proceso_id: base.proceso_id || procesoInicial || procesos[0]?.id || '',
    calculo: base.calculo || 'directo',
  }));
  const [porMes, setPorMes] = useState(() => !!(base.metas_mensuales && Object.keys(base.metas_mensuales).length));
  const [metasMes, setMetasMes] = useState(() => Array.from({ length: 12 }, (_, i) => { const v = base.metas_mensuales?.[String(i + 1)]; return v == null ? '' : valorAEntrada(base, v); }));
  const [apoyo, setApoyo] = useState(() => !!(base.calculo === 'directo' && base.componentes));
  const [nomA, setNomA] = useState(() => etiquetasDe(base).a);
  const [nomB, setNomB] = useState(() => etiquetasDe(base).b);
  const [pestana, setPestana] = useState('datos');
  const [resultados, setResultados] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState(null);
  const [daDeBaja, setDaDeBaja] = useState(false);
  const refsPestana = useRef({});
  const porComponentes = form.calculo !== 'directo';
  const enPorcentaje = esPorcentaje({ unidad_medida: form.unidad_medida });
  const cambiar = (campo, v) => setForm(f => ({ ...f, [campo]: v }));

  // los resultados ya registrados este año, para ver qué meses cumplirían con las metas que se están escribiendo
  useEffect(() => {
    if (crear) return undefined;
    let vivo = true;
    supabase.from('indicadores_registros').select('mes, valor').eq('indicador_id', indicador.id).eq('anio', ANIO)
      .then(({ data }) => { if (vivo) setResultados(Object.fromEntries((data || []).filter(r => r.valor != null).map(r => [r.mes, r.valor]))); });
    return () => { vivo = false; };
  }, [crear, indicador?.id]);

  const u = { unidad_medida: form.unidad_medida };
  const aNumero = v => (v === '' || v == null ? null : entradaAValor(u, v));
  const mensuales = useMemo(() => (porMes ? Object.fromEntries(metasMes.map((v, i) => [String(i + 1), v === '' ? null : entradaAValor(u, v)]).filter(([, v]) => v != null)) : {}), [porMes, metasMes, form.unidad_medida]); // eslint-disable-line
  // el indicador tal como quedaría con lo que se está escribiendo
  const borrador = useMemo(() => ({
    ...(indicador || {}), unidad_medida: form.unidad_medida, sentido_meta: form.sentido_meta || 'mayor_mejor', tipo_meta: form.tipo_meta || null,
    meta_anual: aNumero(form.meta_anual), meta_mensual: aNumero(form.meta_mensual), meta_maxima: aNumero(form.meta_maxima),
    metas_mensuales: Object.keys(mensuales).length ? mensuales : null,
  }), [indicador, form, mensuales]); // eslint-disable-line
  const resumen = useMemo(() => {
    let evaluados = 0, ahora = 0, antes = 0, cambian = 0;
    for (const [m, v] of Object.entries(resultados)) {
      const a = cumpleMeta(borrador, v, Number(m)); if (a == null) continue;
      evaluados++; if (a) ahora++;
      if (indicador) { const b = cumpleMeta(indicador, v, Number(m)); if (b) antes++; if (b !== a) cambian++; }
    }
    return { evaluados, ahora, antes, cambian };
  }, [resultados, borrador, indicador]);

  function fallar(mensaje, tab) { setError(mensaje); if (tab) { setPestana(tab); setTimeout(() => refsPestana.current[tab]?.focus(), 0); } }

  async function guardar(e) {
    e?.preventDefault?.();
    setError(null);
    if (!String(form.nombre || '').trim()) return fallar('Escribe el nombre del indicador.', 'datos');
    const hayMensuales = Object.keys(mensuales).length > 0;
    if (crear && aNumero(form.meta_anual) == null && aNumero(form.meta_mensual) == null && !hayMensuales) return fallar('Define al menos una meta: la anual, la mensual o las de cada mes.', 'metas');
    const minimo = aNumero(form.meta_anual) ?? aNumero(form.meta_mensual);
    if (aNumero(form.meta_maxima) != null && minimo != null && aNumero(form.meta_maxima) < minimo) return fallar('La meta máxima debe ser mayor o igual que la mínima.', 'metas');
    if (porMes && !hayMensuales) return fallar('Marcaste que la meta cambia cada mes pero no escribiste ninguna. Escribe al menos un mes o desmarca la casilla.', 'metas');
    if ((porComponentes || apoyo) && (!String(nomA).trim() || !String(nomB).trim())) return fallar('Escribe cómo se llama cada uno de los dos números (por ejemplo «Planeadas» y «Ejecutadas»).', 'registro');
    setGuardando(true);
    try {
      const { proceso_id, ...resto } = form;
      const cambios = Object.fromEntries(Object.entries(resto).map(([k, v]) => [k, v === '' ? null : v]));
      cambios.meta_anual = aNumero(form.meta_anual); cambios.meta_mensual = aNumero(form.meta_mensual); cambios.meta_maxima = aNumero(form.meta_maxima);
      cambios.metas_mensuales = hayMensuales ? mensuales : null;
      cambios.sentido_meta = form.sentido_meta || 'mayor_mejor'; cambios.frecuencia = form.frecuencia || 'mensual';
      cambios.calculo = form.calculo || 'directo';
      cambios.componentes = porComponentes || apoyo ? { a: String(nomA).trim(), b: String(nomB).trim() } : null;
      if (crear) await crearIndicador({ ...cambios, proceso_id: Number(proceso_id) });
      else await actualizarIndicador(indicador.id, cambios);
      avisar(crear ? 'Indicador creado: ya aparece en la matriz.' : 'Cambios guardados.', { tipo: 'ok', celebrar: crear });
      setExito(true); await new Promise(res => setTimeout(res, menosMovimiento() ? 120 : 650));
      await onGuardado();
    } catch (err) { setError(traducirError(err)); } finally { setGuardando(false); setExito(false); }
  }

  async function darDeBaja() {
    setGuardando(true);
    try { await desactivarIndicador(indicador.id); await onGuardado(); }
    catch (err) { setError(traducirError(err)); setDaDeBaja(false); } finally { setGuardando(false); }
  }

  const campo = k => {
    const c = CAMPOS[k];
    return (
      <label key={k} className={c.tipo === 'textarea' || k === 'nombre' ? 'campo-ancho' : undefined}>
        {c.etiqueta}
        {c.tipo === 'textarea' ? <textarea rows={2} value={form[k] || ''} onChange={e => cambiar(k, e.target.value)} />
          : c.tipo === 'select' ? (
            <select value={form[k] || ''} onChange={e => cambiar(k, e.target.value)}>
              <option value="">{c.vacio || '—'}</option>
              {c.opciones.map(op => Array.isArray(op) ? <option key={op[0]} value={op[0]}>{op[1]}</option> : <option key={op} value={op}>{op}</option>)}
            </select>
          ) : c.tipo === 'color' ? <input type="color" value={form[k] || '#999999'} onChange={e => cambiar(k, e.target.value)} />
          : CAMPOS_META.includes(k) ? (
            <>
              <div className="campo-con-sufijo"><input type="number" step="any" value={form[k] ?? ''} onChange={e => cambiar(k, e.target.value)} />{enPorcentaje && <span className="sufijo">%</span>}</div>
              <small className="ayuda-campo">{k === 'meta_maxima' ? 'Si el indicador tiene una banda (por ejemplo 95 % a 110 %), este es el techo. Déjala vacía si no aplica.' : enPorcentaje ? 'Escribe el porcentaje tal cual: 95 significa 95 %.' : 'En la unidad del indicador.'}</small>
            </>
          ) : <input type={c.tipo} value={form[k] || ''} onChange={e => cambiar(k, e.target.value)} />}
      </label>
    );
  };

  const procesoNombre = procesos.find(p => String(p.id) === String(form.proceso_id))?.nombre;
  const alTeclado = e => {
    const i = PESTANAS.findIndex(p => p.id === pestana);
    const ir = { ArrowRight: (i + 1) % 4, ArrowDown: (i + 1) % 4, ArrowLeft: (i + 3) % 4, ArrowUp: (i + 3) % 4, Home: 0, End: 3 }[e.key];
    if (ir == null) return;
    e.preventDefault(); setPestana(PESTANAS[ir].id); setTimeout(() => refsPestana.current[PESTANAS[ir].id]?.focus(), 0);
  };

  return (
    <Dialogo titulo={crear ? 'Nuevo indicador' : `Editar ${indicador.nombre}`} onCerrar={onCancelar} ancho={1180}>
      <form className="form-dialogo editor-hoja" onSubmit={guardar} noValidate>
        <header className="editor-cab">
          <p className="editor-sello">FALCON FARMS DE COLOMBIA S.A. - FINCA TORREMOLINOS</p>
          <h2>{crear ? 'Nuevo indicador' : (form.nombre || indicador.nombre)}</h2>
          <p className="editor-sub">{crear ? 'Apenas lo guardes aparece en la lista, la matriz, el dashboard y los informes.' : <>Hoja del indicador{procesoNombre ? <> · <strong>{procesoNombre}</strong></> : null}. Lo que cambies se refleja abajo, a la derecha, antes de guardar.</>}</p>
          {crear && (
            <label className="editor-proceso">Proceso
              <select value={form.proceso_id} onChange={e => cambiar('proceso_id', e.target.value)}>{procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
            </label>
          )}
        </header>

        <div className="editor-pestanas" role="tablist" aria-label="Partes de la hoja del indicador" onKeyDown={alTeclado}>
          {PESTANAS.map(p => (
            <button key={p.id} type="button" role="tab" id={`ed-${p.id}`} ref={el => { refsPestana.current[p.id] = el; }} aria-selected={pestana === p.id} aria-controls="ed-panel" tabIndex={pestana === p.id ? 0 : -1} onClick={() => setPestana(p.id)}>
              <i className={`fa-solid ${p.icono}`} aria-hidden="true"></i> {p.texto}
            </button>
          ))}
        </div>

        <div className="editor-cuerpo">
          <div className="editor-izq" id="ed-panel" role="tabpanel" aria-labelledby={`ed-${pestana}`}>
            {pestana === 'datos' && <div className="config-grid-form">{PESTANAS[0].campos.map(campo)}</div>}

            {pestana === 'metas' && (
              <>
                <div className="config-grid-form">{PESTANAS[1].campos.map(campo)}</div>
                <div className="metas-mes">
                  <label className="ind-check"><input type="checkbox" checked={porMes} onChange={e => setPorMes(e.target.checked)} /> La meta cambia de un mes a otro</label>
                  <div className="tabla-scroll" tabIndex={0} role="region" aria-label="Tabla de metas y resultados por mes: usa las flechas del teclado para moverte">
                    <table className="tabla-excel tabla-excel-edit">
                      <thead><tr><th className="te-vacio"><span className="sr-only">Concepto</span></th>{MESES_CORTO.map(m => <th scope="col" key={m}>{m}</th>)}</tr></thead>
                      <tbody>
                        <tr><th scope="row">Meta del mes</th>
                          {MESES.map((nombre, i) => (
                            <td key={nombre}>{porMes
                              ? <input type="number" step="any" aria-label={`Meta de ${nombre.toLowerCase()}`} value={metasMes[i]} onChange={e => setMetasMes(v => v.map((x, k) => (k === i ? e.target.value : x)))} />
                              : (() => { const m = metaDelMes(borrador, i + 1); return m == null ? '' : formatearValor(borrador, m); })()}</td>
                          ))}
                        </tr>
                        {borrador.meta_maxima != null && <tr><th scope="row">Máxima</th>{MESES.map((_, i) => <td key={i}>{formatearValor(borrador, borrador.meta_maxima)}</td>)}</tr>}
                        <tr className="te-resultado"><th scope="row">Resultado {ANIO}</th>
                          {MESES.map((_, i) => { const v = resultados[i + 1]; if (v == null) return <td key={i} />; const ok = cumpleMeta(borrador, v, i + 1); return <td key={i} className={`te-valor ${ok === true ? 'te-ok' : ok === false ? 'te-mal' : ''}`}>{formatearValor(borrador, v)}</td>; })}
                        </tr>
                        <tr><th scope="row">¿Cumple?</th>
                          {MESES.map((_, i) => { const v = resultados[i + 1]; const ok = v == null ? null : cumpleMeta(borrador, v, i + 1); return <td key={i} className={ok === true ? 'te-ok' : ok === false ? 'te-mal' : ''}>{ok === true ? '✓' : ok === false ? '✗' : ''}</td>; })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {porMes && (
                    <>
                      <button type="button" className="btn-texto" onClick={() => setMetasMes(Array(12).fill(form.meta_mensual !== '' ? form.meta_mensual : (form.meta_anual ?? '')))}>Llenar los 12 meses con la meta de arriba</button>
                      <small className="ayuda-campo">{enPorcentaje ? 'Escríbelas en %: 95 significa 95 %.' : 'En la unidad del indicador.'} Los meses que dejes vacíos no se evalúan con meta mensual.</small>
                    </>
                  )}
                </div>
              </>
            )}

            {pestana === 'registro' && (
              <div className="config-grid-form">
                <label className="campo-ancho">Forma de cálculo
                  <select value={form.calculo} onChange={e => { cambiar('calculo', e.target.value); const e2 = etiquetasDe({ calculo: e.target.value }); if (e.target.value !== 'directo') { setNomA(e2.a); setNomB(e2.b); } }}>
                    {Object.entries(CALCULOS).map(([k, c]) => <option key={k} value={k}>{c.nombre}</option>)}
                  </select>
                  <small className="ayuda-campo">{TEXTO_CALCULO[form.calculo]}</small>
                </label>
                {porComponentes && <p className="campo-ancho ayuda-campo" style={{ margin: 0 }}>Fórmula: <strong>{CALCULOS[form.calculo].formula}</strong>. {form.calculo === 'reduccion' ? 'En este tipo, mayor es mejor.' : ''}</p>}
                {!porComponentes && (
                  <label className="campo-ancho ind-check"><input type="checkbox" checked={apoyo} onChange={e => { setApoyo(e.target.checked); if (e.target.checked && !String(nomA).trim()) { setNomA('Numerador'); setNomB('Denominador'); } }} /> Pedir también datos de apoyo (opcionales, no cambian el resultado)</label>
                )}
                {(porComponentes || apoyo) && (
                  <>
                    <label>Nombre del primer número<input type="text" value={nomA} onChange={e => setNomA(e.target.value)} maxLength={60} /></label>
                    <label>Nombre del segundo número<input type="text" value={nomB} onChange={e => setNomB(e.target.value)} maxLength={60} /></label>
                  </>
                )}
              </div>
            )}

            {pestana === 'quien' && <div className="config-grid-form">{PESTANAS[3].campos.map(campo)}</div>}
          </div>

          <aside className="editor-der" aria-label="Vista previa con tus cambios">
            <h3>Vista previa con tus cambios</h3>
            {(Object.keys(resultados).length > 0 || borrador.meta_anual != null || borrador.meta_mensual != null || borrador.metas_mensuales) ? <GraficaMetas indicador={borrador} resultados={resultados} anio={ANIO} /> : <div className="editor-vacio"><i className="fa-solid fa-chart-column" aria-hidden="true"></i><strong>Aquí verás la gráfica</strong><span>Escribe una meta en «Medición y metas» y se dibuja al instante.</span></div>}
            <p className={`editor-resumen${resumen.evaluados === 0 ? '' : resumen.ahora === resumen.evaluados ? ' ok' : ''}`} role="status" aria-live="polite">
              {crear ? 'Cuando registres resultados, aquí verás cuántos cumplen con estas metas.'
                : resumen.evaluados === 0 ? 'Todavía no hay resultados de este año para comparar con las metas.'
                : <><strong>{resumen.ahora} de {resumen.evaluados}</strong> meses con resultado cumplen con estas metas.{resumen.cambian > 0 && <> Antes cumplían <strong>{resumen.antes}</strong>: con tus cambios <strong>{resumen.cambian}</strong> {resumen.cambian === 1 ? 'mes cambia' : 'meses cambian'} de estado.</>}</>}
            </p>
            {indicador && (aNumero(form.meta_anual) !== (indicador.meta_anual ?? null) || Object.keys(mensuales).length !== Object.keys(indicador.metas_mensuales || {}).length) && <p className="editor-aviso"><i className="fa-solid fa-circle-info" aria-hidden="true"></i> Esto aún no está guardado.</p>}
          </aside>
        </div>

        {error && <div className="alert danger" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>}
        <div className="ind-modal-acciones editor-pie">
          {!crear ? <button type="button" className="btn-secondary btn-baja" onClick={() => setDaDeBaja(true)}><i className="fa-solid fa-box-archive" aria-hidden="true"></i> Dar de baja</button> : <span />}
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={onCancelar}>Cancelar</button>
            <BotonEstado type="submit" estado={exito ? 'ok' : guardando ? 'cargando' : 'idle'}>{crear ? 'Crear indicador' : 'Guardar cambios'}</BotonEstado>
          </span>
        </div>
      </form>
      {daDeBaja && (
        <Confirmar titulo="¿Dar de baja este indicador?" peligro textoBoton="Dar de baja" cargando={guardando}
          texto="Dejará de verse en la lista, la matriz, el dashboard y los informes. Su historial no se borra." onConfirmar={darDeBaja} onCancelar={() => setDaDeBaja(false)} />
      )}
    </Dialogo>
  );
}
