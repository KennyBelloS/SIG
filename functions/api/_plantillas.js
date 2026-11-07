/* Plantillas de correo · Falcon Farms, Finca Torremolinos
   ----------------------------------------------------------------------------
   Estructura de cada correo:
     1. Encabezado blanco con el logo oficial.
     2. Franja de color con el mes y el título (verde, dorado o vino según el aviso).
     3. Cuerpo: mensaje, una cifra destacada y la lista de indicadores.
     4. Aviso de seguridad breve (el correo no contiene enlaces).
     5. Firma corporativa: logo, línea vertical, datos con iconos.
   Todo con tablas y estilos en línea: es lo único que Gmail y Outlook
   interpretan igual. Sin enlaces a propósito: nadie puede usar este formato
   para colar un enlace falso. */

const VERDE = '#166534';
const VERDE_OSC = '#0F3D22';
const DORADO = '#C9932B';
const DORADO_OSC = '#8A6410';
const VINO = '#A91D3A';
const CREMA = '#F5F4EF';
const BORDE = '#E7E5DD';
const TINTA = '#1C2321';
const TINTA_MEDIA = '#5C6460';
const FUENTE = "Arial,Helvetica,sans-serif";

const ACENTOS = {
  verde: { banda: VERDE_OSC, fondo: '#EFF5F1', texto: VERDE },
  dorado: { banda: '#7A5A12', fondo: '#FAF3E2', texto: DORADO_OSC },
  vino: { banda: '#8C1730', fondo: '#F9E7EB', texto: VINO },
};

/** Marca en texto: respaldo cuando el cliente de correo bloquea las imágenes. */
function marcaTexto() {
  return `
    <div class="marca-1" style="font-family:Georgia,'Times New Roman',serif;font-size:18px;letter-spacing:2px;color:${TINTA};line-height:1.2;">FALCON FARMS</div>
    <div class="marca-2" style="font-family:${FUENTE};font-size:9px;letter-spacing:2.6px;color:${TINTA_MEDIA};margin-top:3px;">FINCA TORREMOLINOS</div>`;
}

/** Logo oficial. Va dentro de un azulejo blanco para que se lea también en modo oscuro. */
function logo(activos, ancho) {
  const url = activos && activos.logo;
  if (!url) return `<div style="padding:6px 0;">${marcaTexto()}</div>`;
  const alto = Math.round(ancho * 320 / 440);
  return `<table cellpadding="0" cellspacing="0" role="presentation"><tr><td style="background:#FFFFFF;border-radius:10px;">
    <img src="${url}" width="${ancho}" height="${alto}" alt="Falcon Farms, Finca Torremolinos"
      style="display:block;width:${ancho}px;height:${alto}px;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:${TINTA};">
  </td></tr></table>`;
}

/** Encabezado + franja de color con el título. */
function cabecera({ eyebrow, titulo, acento, activos }) {
  const c = ACENTOS[acento] || ACENTOS.verde;
  return `
  <tr><td class="bloque movil-pad" style="padding:22px 32px 20px;background:#FFFFFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
      <td valign="middle">${logo(activos, 104)}</td>
      <td valign="middle" align="right">
        <span class="etiqueta" style="font-family:${FUENTE};font-size:12px;line-height:1.45;color:${TINTA_MEDIA};">Sistema Integrado<br>de Gestión</span>
      </td>
    </tr></table>
  </td></tr>
  <tr><td class="movil-pad" style="padding:26px 32px 28px;background:${c.banda};">
    ${eyebrow ? `<div style="font-family:${FUENTE};font-size:13px;font-weight:bold;color:rgba(255,255,255,.72);margin-bottom:6px;">${eyebrow}</div>` : ''}
    <h1 style="margin:0;font-family:${FUENTE};font-size:26px;line-height:1.25;font-weight:bold;color:#FFFFFF;">${titulo}</h1>
  </td></tr>`;
}

/** Cifra destacada: lo más importante del correo, a la vista antes de leer. */
export function destacado({ numero, etiqueta, nota, acento = 'verde' }) {
  const c = ACENTOS[acento] || ACENTOS.verde;
  return `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:6px 0 22px;">
    <tr><td class="destacado" style="background:${c.fondo};border-radius:10px;padding:18px 22px;">
      <table cellpadding="0" cellspacing="0" role="presentation"><tr>
        <td valign="middle" style="padding-right:18px;">
          <div style="font-family:${FUENTE};font-size:46px;font-weight:bold;color:${c.texto};line-height:1;">${numero}</div>
        </td>
        <td valign="middle">
          <div class="texto" style="font-family:${FUENTE};font-size:15px;font-weight:bold;color:${TINTA};">${etiqueta}</div>
          ${nota ? `<div class="texto-suave" style="font-family:${FUENTE};font-size:13px;color:${TINTA_MEDIA};margin-top:3px;line-height:1.45;">${nota}</div>` : ''}
        </td>
      </tr></table>
    </td></tr>
  </table>`;
}

/** Lista de indicadores como filas con barra de color. */
export function listaIndicadores(items, color = VINO) {
  if (!items.length) return '';
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:8px 0 0;">
    ${items.map(i => `
    <tr><td class="fila-item" style="padding:10px 14px;background:#FAFAF7;border-left:3px solid ${color};">
      <span class="texto" style="font-family:${FUENTE};font-size:14px;color:${TINTA};">${i.nombre}</span>
    </td></tr>
    <tr><td style="height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>`).join('')}
  </table>`;
}

const p = t => `<p class="texto" style="margin:0 0 14px;font-family:${FUENTE};font-size:14.5px;line-height:1.65;color:${TINTA};">${t}</p>`;
const subtitulo = t => `<div class="texto" style="font-family:${FUENTE};font-size:13px;font-weight:bold;color:${TINTA};margin:22px 0 4px;">${t}</div>`;

/** Aviso antifraude: breve, justo antes de la despedida. */
export function avisoSeguridad() {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:22px 0 0;">
    <tr><td class="aviso-seg" style="border:1px solid ${BORDE};border-radius:8px;padding:12px 15px;background:#FBFBF8;">
      <span class="texto-suave" style="font-family:${FUENTE};font-size:12px;color:${TINTA_MEDIA};line-height:1.6;">
        <strong class="texto" style="color:${TINTA};">Seguridad:</strong> este correo es
        <strong class="texto" style="color:${TINTA};">solo informativo y no contiene enlaces</strong>. Para registrar los indicadores
        entra a la aplicación escribiendo tú la dirección en el navegador. El sistema
        <strong class="texto" style="color:${TINTA};">nunca</strong> te pedirá contraseñas ni datos bancarios, ni te enviará
        enlaces para &ldquo;verificar&rdquo; tu cuenta ni archivos para abrir. Si recibes algo así en nombre de Finca Torremolinos,
        no hagas clic y avisa al Analista de Gestión Integral.
      </span>
    </td></tr>
  </table>`;
}

/** Fila de contacto con su icono. Si el icono no carga, el dato se lee igual. */
function filaContacto(clave, texto, activos) {
  if (!texto) return '';
  const url = activos && activos[clave];
  const icono = url
    ? `<img src="${url}" width="22" height="22" alt="" style="display:block;width:22px;height:22px;border:0;">`
    : `<span style="display:inline-block;width:22px;height:22px;">&nbsp;</span>`;
  return `
    <tr><td style="padding:4px 0;">
      <table cellpadding="0" cellspacing="0" role="presentation"><tr>
        <td valign="middle" width="22">${icono}</td>
        <td valign="middle" style="padding-left:12px;"><span class="texto" style="font-family:${FUENTE};font-size:14px;color:${TINTA};">${texto}</span></td>
      </tr></table>
    </td></tr>`;
}

/** Firma corporativa: logo a la izquierda, línea vertical negra y datos con iconos. */
export function firma(f = {}, activos) {
  return `
  <tr><td class="firma" style="padding:26px 32px 10px;background:#FFFFFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
      <td class="movil-apila" valign="middle" width="196" align="center" style="padding-right:22px;">
        ${logo(activos, 168)}
      </td>
      <td class="movil-apila linea" valign="middle" style="border-left:2px solid ${TINTA};padding-left:26px;">
        ${f.cargo ? `<div class="texto" style="font-family:${FUENTE};font-size:17px;font-weight:bold;color:${TINTA};">${f.cargo}</div>` : ''}
        ${f.cargo2 ? `<div class="texto" style="font-family:${FUENTE};font-size:14px;color:${TINTA};margin-top:3px;">${f.cargo2}</div>` : ''}
        <table cellpadding="0" cellspacing="0" role="presentation" style="margin-top:14px;">
          ${filaContacto('cel', f.telefono, activos)}
          ${filaContacto('tel', f.celular, activos)}
          ${filaContacto('mail', f.email, activos)}
          ${filaContacto('ubic', f.ubicacion, activos)}
        </table>
      </td>
    </tr></table>
  </td></tr>`;
}

/** Nota legal y aviso de mensaje automático, al pie. */
export function pieLegal() {
  return `
  <tr><td class="firma" style="padding:16px 32px 8px;background:#FFFFFF;">
    <div class="legal" style="font-family:${FUENTE};font-size:11px;font-style:italic;color:${TINTA};text-align:center;line-height:1.65;">
      Este mensaje o cualquier archivo adjunto a éste, puede contener información legal, confidencial, privilegiada y/o
      sensible o relacionada con datos personales, la cual no podrá ser copiada ni reproducida de cualquier manera por su
      receptor sin autorización expresa y previa de su emisor. Si usted recibe este mensaje por error favor notificarlo al
      remitente de inmediato y desecharlo de su sistema
    </div>
  </td></tr>
  <tr><td class="firma" style="padding:10px 32px 26px;background:#FFFFFF;">
    <div class="legal" style="font-family:${FUENTE};font-size:11px;color:${TINTA_MEDIA};text-align:center;line-height:1.6;">
      Mensaje generado automáticamente por el Sistema Integrado de Gestión de Finca Torremolinos.<br>
      No respondas a este correo; para cualquier novedad comunícate con el Analista de Gestión Integral.
    </div>
  </td></tr>`;
}

/** Envoltura: estructura común y estilos de modo oscuro. */
export function envolver({ eyebrow, titulo, acento = 'verde', cuerpoHtml, firmaDatos, activos }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${titulo}</title>
<style>
  @media (prefers-color-scheme: dark) {
    .lienzo { background:#12171A !important; }
    .tarjeta, .bloque { background:#1B2220 !important; }
    .divisor { background:#2C3632 !important; }
    .texto, .marca-1, .titulo { color:#F2F4F1 !important; }
    .texto-suave, .marca-2, .etiqueta { color:#A8B2AC !important; }
    .fila-item { background:#222B28 !important; }
    .destacado { background:#1F2A24 !important; }
    .aviso-seg { background:#1F2724 !important; border-color:#2C3632 !important; }
    /* la firma se mantiene clara, como la oficial, para que el logo se lea */
    .firma { background:#FFFFFF !important; }
    .firma .texto, .firma .legal, .firma .marca-1 { color:#1C2321 !important; }
    .linea { border-left-color:#1C2321 !important; }
  }
  @media only screen and (max-width:620px) {
    .movil-pad { padding-left:20px !important; padding-right:20px !important; }
    .movil-apila { display:block !important; width:100% !important; text-align:center !important; padding:0 0 16px !important; border-left:0 !important; }
    .movil-apila table { margin-left:auto !important; margin-right:auto !important; }
  }
</style>
</head>
<body class="lienzo" style="margin:0;padding:0;background:${CREMA};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${titulo}, Finca Torremolinos</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="lienzo" style="background:${CREMA};padding:28px 12px;">
    <tr><td align="center">
      <table class="tarjeta" width="620" cellpadding="0" cellspacing="0" role="presentation"
             style="max-width:620px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid ${BORDE};">
        ${cabecera({ eyebrow, titulo, acento, activos })}
        <tr><td class="bloque movil-pad" style="padding:26px 32px 26px;background:#FFFFFF;">
          ${cuerpoHtml}
          ${avisoSeguridad()}
          <p class="texto" style="margin:24px 0 0;font-family:${FUENTE};font-size:14.5px;color:${TINTA};">Cordialmente,</p>
        </td></tr>
        ${firma(firmaDatos, activos)}
        ${pieLegal()}
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/* 1. Día 2 de cada mes: recordar diligenciar el mes anterior (a todos los procesos) */
/** Franja con cómo cerró el mes en el proceso: cuántos cumplieron, cuántos no y cuántos faltan. */
function franjaResumen(r, mesNombre, proceso) {
  if (!r || !r.total) return '';
  const celda = (n, t, color) => `<td align="center" style="padding:10px 6px;"><div style="font-family:${FUENTE};font-size:26px;font-weight:bold;color:${color};line-height:1;">${n}</div><div class="texto-suave" style="font-family:${FUENTE};font-size:11.5px;color:${TINTA_MEDIA};margin-top:3px;">${t}</div></td>`;
  return `<div class="texto" style="font-family:${FUENTE};font-size:13px;font-weight:bold;color:${TINTA};margin:4px 0 6px;">Así va ${mesNombre} en ${proceso}</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px;border:1px solid ${BORDE};border-radius:10px;"><tr>
    ${celda(r.cumplen, 'cumplieron la meta', VERDE)}${celda(r.incumplen, 'no la alcanzaron', VINO)}${celda(r.pendientes, 'sin registrar', DORADO_OSC)}
  </tr></table>`;
}

export function correoRecordatorio({ proceso, mesNombre, anio, pendientes, sinPlan, resumen, diaCierre, firmaDatos, activos }) {
  const alDia = pendientes.length === 0 && sinPlan.length === 0;
  const cuerpo = alDia
    ? `
    ${p(`Buen día, equipo de <strong>${proceso}</strong>.`)}
    ${p(`Se abrió el registro de los indicadores de <strong>${mesNombre} ${anio}</strong> en el Sistema Integrado de Gestión.`)}
    ${franjaResumen(resumen, mesNombre, proceso)}
    ${destacado({ numero: '0', etiqueta: 'indicadores por registrar', nota: `Todos los indicadores de ${proceso} ya tienen su dato de ${mesNombre}.`, acento: 'verde' })}
    ${p(`Gracias por mantener el registro al día. Si necesitan corregir algo, pueden hacerlo hasta el <strong>día ${diaCierre}</strong>; después el mes se cierra y solo un administrador puede habilitarlo.`)}`
    : `
    ${p(`Buen día, equipo de <strong>${proceso}</strong>.`)}
    ${p(`Se abrió el registro de los indicadores de <strong>${mesNombre} ${anio}</strong> en el Sistema Integrado de Gestión. Por favor diligencien el valor del mes, el análisis de cumplimiento y, cuando no se alcance la meta, la causa y el plan de acción.`)}
    ${franjaResumen(resumen, mesNombre, proceso)}
    ${destacado({
      numero: pendientes.length,
      etiqueta: pendientes.length === 1 ? 'indicador por registrar' : 'indicadores por registrar',
      nota: `Pueden registrar hasta el día ${diaCierre}, inclusive; desde el ${diaCierre + 1} el mes se cierra y no se podrá editar hasta que un administrador lo habilite.`,
      acento: pendientes.length ? 'dorado' : 'verde',
    })}
    ${pendientes.length ? subtitulo('Pendientes por registrar') + listaIndicadores(pendientes, DORADO) : ''}
    ${sinPlan.length ? subtitulo('No cumplieron la meta y falta el plan de acción') + listaIndicadores(sinPlan, VINO) : ''}`;
  return {
    asunto: `Indicadores de ${mesNombre} ${anio}, ${proceso}`,
    html: envolver({ eyebrow: `${mesNombre} ${anio}`, titulo: 'Registro de indicadores', acento: 'verde', cuerpoHtml: cuerpo, firmaDatos, activos }),
  };
}

/* 2. Dos días antes del cierre */
export function correoDosDias({ proceso, mesNombre, anio, pendientes, diaCierre, firmaDatos, activos }) {
  const cuerpo = `
    ${p(`Equipo de <strong>${proceso}</strong>:`)}
    ${destacado({ numero: '2', etiqueta: `días para el último día de ${mesNombre}`, nota: `Pueden registrar hasta el día ${diaCierre}; desde el ${diaCierre + 1} los indicadores quedan bloqueados.`, acento: 'dorado' })}
    ${pendientes.length
      ? p(`Todavía faltan <strong>${pendientes.length}</strong> indicador(es) por registrar. Después del cierre solo un administrador podrá habilitarlos de nuevo.`) + subtitulo('Falta registrar') + listaIndicadores(pendientes, DORADO)
      : p('En este momento no hay indicadores pendientes. Si ya registraron todo, pueden ignorar este mensaje.')}`;
  return {
    asunto: `Quedan 2 días, indicadores de ${mesNombre} ${anio} (${proceso})`,
    html: envolver({ eyebrow: `${mesNombre} ${anio}`, titulo: 'Faltan 2 días para el cierre', acento: 'dorado', cuerpoHtml: cuerpo, firmaDatos, activos }),
  };
}

/* 3. Día de cierre (a todos los procesos) */
export function correoCierre({ proceso, mesNombre, anio, pendientes, firmaDatos, activos }) {
  const cuerpo = `
    ${p(`Equipo de <strong>${proceso}</strong>:`)}
    ${destacado({
      numero: pendientes.length,
      etiqueta: pendientes.length === 1 ? 'indicador quedó sin registrar' : 'indicadores quedaron sin registrar',
      nota: `${mesNombre} ${anio} ya no admite cambios desde la aplicación.`,
      acento: pendientes.length ? 'vino' : 'verde',
    })}
    ${pendientes.length
      ? subtitulo('Sin registrar') + listaIndicadores(pendientes, VINO) + p('Si necesitan completarlos, soliciten a un administrador que reabra el mes desde Configuración.')
      : p('Todos los indicadores del mes quedaron registrados a tiempo. Gracias por la gestión.')}`;
  return {
    asunto: `${mesNombre} ${anio} cerrado, ${proceso}`,
    html: envolver({ eyebrow: `${mesNombre} ${anio}`, titulo: 'El mes quedó cerrado', acento: pendientes.length ? 'vino' : 'verde', cuerpoHtml: cuerpo, firmaDatos, activos }),
  };
}

/* 4. Correo libre redactado por un administrador */
export function correoLibre({ titulo, mensaje, firmaDatos, activos }) {
  const parrafos = String(mensaje || '').split(/\n{2,}/).map(t => p(t.replace(/\n/g, '<br>'))).join('');
  return { asunto: titulo, html: envolver({ eyebrow: 'Comunicado', titulo, cuerpoHtml: parrafos, firmaDatos, activos }) };
}
