/* Ilustraciones animadas del recorrido. Son mini-pantallas dibujadas con los mismos colores y
   formas de la aplicación; cada elemento aparece con un retardo (variable --d) para contar
   la historia en orden. */

const d = n => ({ '--d': `${n}s` });
const MESES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function Cinta({ patron, retardo = 0, grande = false }) {
  return (
    <span className={`ilus-cinta${grande ? ' grande' : ''}`}>
      {patron.map((p, i) => <i key={i} className={`a-crece c-${p}`} style={d(retardo + i * 0.12)} />)}
    </span>
  );
}

export function IlusLista() {
  const filas = [
    ['Cumplimiento PER4 rosa color', ['ok', 'no', 'ok', 'ok', 'ok', 'ok', 'perdido', 'pend', 'perdido', 'ok', 'pend', 'pend']],
    ['Nacional Color', ['no', 'no', 'no', 'no', 'no', 'no', 'perdido', 'pend', 'perdido', 'pend', 'pend', 'pend']],
    ['Tasa de ausentismo', ['ok', 'ok', 'no', 'ok', 'no', 'ok', 'perdido', 'pend', 'pend', 'pend', 'pend', 'pend']],
  ];
  return (
    <div className="ilus-lista">
      <div className="ilus-hero a-pop" style={d(0.1)}><strong>2<small> de 42</small></strong><span>indicadores con dato en octubre</span><b className="barra"><u className="a-llena" style={d(0.5)} /></b></div>
      <div className="ilus-panel a-sube" style={d(0.4)}>
        <div className="ilus-proc"><i className="a-pop" style={{ ...d(0.5), background: '#92D050' }} /> Producción <em>6 indicadores</em></div>
        {filas.map(([n, p], i) => (
          <div key={n} className="ilus-fila a-sube" style={d(0.7 + i * 0.35)}>
            <span>{n}</span><Cinta patron={p} retardo={1 + i * 0.35} />
          </div>
        ))}
        <div className="ilus-leyenda a-pop" style={d(2.6)}><i className="c-ok" /> cumple <i className="c-no" /> no cumple <i className="c-perdido" /> venció sin registrar <i className="c-pend" /> por registrar</div>
      </div>
    </div>
  );
}

export function IlusRegistro() {
  return (
    <div className="ilus-dos">
      <div className="ilus-dialogo a-sube" style={d(0.1)}>
        <b>Octubre 2026</b>
        <label>Valor<span className="campo escribe" style={d(0.8)}><span>92</span><u>%</u></span></label>
        <label>Causa<span className="campo"><span className="a-aparece" style={d(1.8)}>Menos pérdidas por frío</span></span></label>
        <label>Plan de acción <em className="a-late" style={d(2.4)}>obligatorio</em>
          <span className="campo plan"><span className="a-aparece" style={d(3)}>Mantener el control diario</span></span></label>
        <span className="boton a-pulsa" style={d(4)}>Guardar</span>
      </div>
      <div className="ilus-resultado">
        <p className="a-aparece" style={d(0.3)}>Así queda la cinta</p>
        <Cinta patron={['ok', 'ok', 'no', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'nuevo', 'pend', 'pend']} retardo={0.5} grande />
        <div className="ilus-mes">{MESES.map((m, i) => <span key={i}>{m}</span>)}</div>
        <div className="ilus-globo a-pop" style={d(4.6)}><i className="fa-solid fa-circle-check" /> Octubre pasa a verde: cumple la meta</div>
      </div>
    </div>
  );
}

export function IlusMetas() {
  return (
    <div className="ilus-dos">
      <div className="ilus-metas">
        <div className="meta-caja a-sube" style={d(0.2)}><span>Meta anual</span><strong>5 %</strong><small>todo el año</small><b className="rige r1">rige</b></div>
        <div className="meta-caja a-sube" style={d(0.6)}><span>Meta mensual</span><strong>0,4 %</strong><small>cada mes</small><b className="rige r2">rige</b></div>
        <p className="a-aparece" style={d(1.2)}>Tú eliges cuál rige, y en la gráfica puedes cambiarla al vuelo.</p>
      </div>
      <div className="ilus-grafica a-sube" style={d(0.5)}>
        {[40, 55, 35, 62, 48, 70].map((h, i) => (
          <span key={i} className="par"><i className="az a-crece-v" style={{ ...d(1 + i * 0.15), height: '58%' }} /><i className="ro a-crece-v" style={{ ...d(1.1 + i * 0.15), height: `${h}%` }} /></span>
        ))}
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="linea-meta"><polyline points="2,32 18,32 34,32 50,32 66,32 82,32 98,32" className="a-dibuja" style={d(2)} /></svg>
      </div>
    </div>
  );
}

export function IlusFicha() {
  return (
    <div className="ilus-ficha">
      <div className="ilus-controles">
        {['Comparar contra: la meta', 'Desde: Marzo', 'Hasta: Mayo', 'Superponer 2025'].map((t, i) => <span key={t} className="a-pop" style={d(0.2 + i * 0.2)}>{t}</span>)}
      </div>
      <div className="ilus-grafica grande a-sube" style={d(0.3)}>
        {[52, 78, 60, 88, 70, 95, 66].map((h, i) => (
          <span key={i} className="par"><i className="az a-crece-v" style={{ ...d(0.8 + i * 0.12), height: '62%' }} /><i className="ro a-crece-v" style={{ ...d(0.9 + i * 0.12), height: `${h}%` }} /></span>
        ))}
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="linea-tend"><polyline points="4,46 96,16" className="a-dibuja" style={d(2.2)} /></svg>
      </div>
      <div className="ilus-globo a-pop" style={d(3.2)}><i className="fa-solid fa-arrow-trend-up" /> Sube 2,3 puntos por mes. Tendencia favorable.</div>
    </div>
  );
}

export function IlusMatriz() {
  const filas = 6, cols = 10;
  const patron = (f, c) => ((f * 7 + c * 3) % 5 === 0 ? 'no' : (f + c) % 7 === 0 ? 'perdido' : c > 7 ? 'pend' : 'ok');
  return (
    <div className="ilus-matriz">
      <div className="cab"><span>Indicador</span>{MESES.slice(0, cols).map((m, i) => <b key={i}>{m}</b>)}</div>
      {Array.from({ length: filas }).map((_, f) => (
        <div key={f} className="fila a-sube" style={d(0.15 + f * 0.18)}>
          <span><i className="a-pop" style={d(0.3 + f * 0.18)} />Indicador {f + 1}</span>
          {Array.from({ length: cols }).map((__, c) => <u key={c} className={`c-${patron(f, c)} a-pop`} style={d(0.4 + f * 0.18 + c * 0.04)} />)}
        </div>
      ))}
      <div className="pie a-pop" style={d(2)}>Cumplimiento del mes <b>66 %</b></div>
    </div>
  );
}

export function IlusDashboard() {
  return (
    <div className="ilus-dos">
      <div className="ilus-hero oscuro a-pop" style={d(0.1)}>
        <span>Cumplimiento de la meta</span><strong>50<small>%</small></strong><em>+7 pts frente a septiembre</em>
      </div>
      <div className="ilus-torta-caja">
        <svg viewBox="0 0 42 42" className="torta a-pop" style={d(0.5)}>
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#EFEDE6" strokeWidth="6" />
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#A91D3A" strokeWidth="6" strokeDasharray="38 62" strokeDashoffset="25" className="a-torta" style={d(0.9)} />
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#C9932B" strokeWidth="6" strokeDasharray="22 78" strokeDashoffset="-13" className="a-torta" style={d(1.4)} />
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#166534" strokeWidth="6" strokeDasharray="18 82" strokeDashoffset="-35" className="a-torta" style={d(1.9)} />
        </svg>
        <div className="apilada-mini"><u className="ok a-llena-x" style={{ ...d(1.4), width: '30%' }} /><u className="no a-llena-x" style={{ ...d(1.7), width: '31%' }} /><u className="dil a-llena-x" style={{ ...d(2), width: '39%' }} /></div>
        <p className="a-aparece" style={d(2.4)}>Dos formas de incumplir: no llegar a la meta (vino) y no diligenciar (rayado).</p>
      </div>
    </div>
  );
}

export function IlusInforme() {
  const filas = [['Cumplimiento PER4 rosa color', 'ok', 'Cumple'], ['Nacional Color', 'no', 'No cumple'], ['Tasa de ausentismo', 'ok', 'Cumple'], ['Rotación', 'perdido', 'No diligenciado']];
  return (
    <div className="ilus-informe">
      <div className="hoja a-sube" style={d(0.1)}>
        <header><i className="fa-solid fa-seedling" /><strong>Informe de indicadores · Marzo 2026</strong></header>
        {filas.map(([n, c, t], i) => (
          <div key={n} className="renglon a-sube" style={d(0.5 + i * 0.4)}><span>{n}</span><em className={`c-${c}`}>{t}</em><u /><u /></div>
        ))}
        <small className="a-aparece" style={d(2.4)}>Cada fila lleva su causa y su plan de acción</small>
      </div>
      <div className="sello a-sello" style={d(2.6)}><i className="fa-solid fa-file-pdf" /> PDF</div>
    </div>
  );
}

export function IlusExcel() {
  return (
    <div className="ilus-excel">
      <div className="archivo a-sube" style={d(0.1)}><i className="fa-solid fa-file-excel" /><b>plantilla.xlsx</b><small>valor · causa · plan</small></div>
      <i className="fa-solid fa-arrow-right flecha a-pop" style={d(1)} />
      <div className="previa a-sube" style={d(1.2)}>
        <b>Vista previa</b>
        {[['Nacional Color', 'ok', 'Lista'], ['Nacional Rojo', 'no', 'Falta el plan de acción'], ['Marzo 2026', 'no', 'El mes está cerrado']].map(([n, c, t], i) => (
          <div key={n} className="renglon a-sube" style={d(1.6 + i * 0.5)}><span>{n}</span><em className={`c-${c}`}><i className={`fa-solid ${c === 'ok' ? 'fa-check' : 'fa-xmark'}`} /> {t}</em></div>
        ))}
        <span className="boton a-pulsa" style={d(3.6)}>Importar 1 fila válida</span>
      </div>
    </div>
  );
}

export function IlusCierre() {
  const marca = [[2, 'fa-envelope', 'Recordatorio', 'a todos'], [10, 'fa-hourglass-half', 'Faltan 2 días', 'a quien tiene pendientes'], [12, 'fa-lock', 'Cierre', 'el mes se bloquea']];
  return (
    <div className="ilus-cierre">
      <p className="a-aparece" style={d(0.1)}>Septiembre se gestiona en octubre</p>
      <div className="linea-dias">
        <u className="avance a-llena-x" style={{ ...d(0.4), width: '100%', animationDuration: '4.2s' }} />
        {marca.map(([dia, ic, t, s], i) => (
          <div key={dia} className={`hito a-pop h${i}`} style={d(0.9 + i * 1.2)}>
            <i className={`fa-solid ${ic}`} /><b>Día {dia}</b><span>{t}</span><small>{s}</small>
          </div>
        ))}
      </div>
      <div className="ilus-globo a-pop" style={d(4.4)}><i className="fa-solid fa-lock" /> Desde el día 12 solo un administrador puede reabrirlo</div>
    </div>
  );
}

export function IlusCorreos() {
  const procs = ['Producción', 'Poscosecha', 'Gestión Humana', 'MIRFE'];
  return (
    <div className="ilus-dos">
      <div className="ilus-correo a-sube" style={d(0.1)}>
        <div className="banda">Registro de indicadores</div>
        <div className="cuerpo">
          <b className="num a-pop" style={d(0.7)}>4</b><span>indicadores por registrar</span>
          <u /><u /><u className="corto" />
        </div>
        <div className="firma a-aparece" style={d(1.4)}><i className="fa-solid fa-seedling" /><span><b>Analista Gestión Integral</b>Jefe de Seguridad</span></div>
        <small className="a-aparece" style={d(1.8)}>Sin botones ni enlaces</small>
      </div>
      <div className="ilus-destinos">
        {procs.map((p, i) => (
          <div key={p} className="destino a-sube" style={d(1.6 + i * 0.5)}><i className="fa-solid fa-envelope-circle-check" />{p}</div>
        ))}
        <p className="a-aparece" style={d(3.8)}>Cada proceso recibe el correo con su propia lista.</p>
      </div>
    </div>
  );
}

export function IlusNovedades() {
  const alertas = [['critico', 'Sin registrar en mes cerrado', 'Nacional Color · Julio'], ['critico', 'Incumple de forma sostenida', '3 meses seguidos'], ['alto', 'Incumple sin plan de acción', 'Rotación · Marzo'], ['medio', 'Mes sin registrar', 'Tasa de ausentismo · Agosto']];
  return (
    <div className="ilus-alertas">
      {alertas.map(([n, t, s], i) => (
        <div key={t} className={`ilus-alerta n-${n} a-slide`} style={d(0.2 + i * 0.5)}>
          <i className={`fa-solid ${n === 'critico' ? 'fa-circle-exclamation' : n === 'alto' ? 'fa-triangle-exclamation' : 'fa-circle-info'}`} />
          <span><b>{t}</b><small>{s}</small></span><em>Revisar</em>
        </div>
      ))}
      <p className="a-aparece" style={d(2.6)}>"Revisar" abre el indicador en el mes exacto del problema.</p>
    </div>
  );
}

export function IlusRoles() {
  const roles = [
    ['Administrador', '#166534', [1, 1, 1, 1]],
    ['Digitador', '#8A6410', [1, 1, 0, 0]],
    ['Usuario', '#5C6460', [1, 0, 0, 0]],
  ];
  const filas = ['Consultar', 'Registrar datos', 'Configurar', 'Cerrar meses y roles'];
  return (
    <div className="ilus-roles">
      {roles.map(([r, c, p], i) => (
        <div key={r} className="rol a-sube" style={{ ...d(0.2 + i * 0.4), borderTopColor: c }}>
          <b style={{ color: c }}>{r}</b>
          {filas.map((f, k) => (
            <span key={f} className={p[k] ? 'si' : 'no'}><i className={`fa-solid ${p[k] ? 'fa-check a-pop' : 'fa-minus'}`} style={d(0.8 + i * 0.4 + k * 0.15)} />{f}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

export const ILUSTRACIONES = {
  lista: IlusLista, registro: IlusRegistro, metas: IlusMetas, ficha: IlusFicha, matriz: IlusMatriz, dashboard: IlusDashboard,
  informe: IlusInforme, excel: IlusExcel, cierre: IlusCierre, correos: IlusCorreos, novedades: IlusNovedades, roles: IlusRoles,
};
