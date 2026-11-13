/* Contenido de "Cómo se usa" y, a través de LAMINAS, también de "Así funciona" (el recorrido animado).
   Todo lo que aquí se afirma describe lo que la aplicación hace de verdad.
   REGLA FIJA: toda función nueva que se agregue a la aplicación —por pequeña que sea— se documenta
   aquí también, en el FAQ o en los «pasos» de la lámina que corresponda, antes de darla por
   terminada. Nada queda solo en el código: si no está aquí, para la persona que usa la aplicación
   no existe. Si cambias una regla ya existente, actualiza también el texto que la explica. */

export const ROL = {
  admin: { nombre: 'Administrador', color: '#166534' },
  digitador: { nombre: 'Digitador', color: '#8A6410' },
  usuario: { nombre: 'Usuario', color: '#5C6460' },
};

/* ---------------------------------------------------------------------------
   Láminas del recorrido animado
--------------------------------------------------------------------------- */
export const LAMINAS = [
  { id: 'lista', icono: 'fa-chart-simple', titulo: 'Indicadores: el estado del mes de un vistazo', ruta: '/indicadores', boton: 'Ir a Indicadores',
    resumen: 'La pantalla de inicio. Muestra los 9 procesos, cuántos indicadores ya tienen dato este mes y cuáles faltan.',
    pasos: [
      'A la izquierda ves el avance del mes (cuántos indicadores ya se diligenciaron, cuántos cumplen, cuántos no y cuántos faltan) y, al lado, el mes dibujado como un plano: un lote por proceso y una casilla por indicador.',
      'Cada proceso es una franja que se despliega. Su color lateral es el de su categoría en el Excel.',
      'Cada indicador tiene su "cinta del año": 12 casillas, una por mes. Verde cumple, vino no cumple, rayado rosa venció sin registrar, gris está por registrar.',
      'Haz clic en una casilla de la cinta y se abre ese mes del indicador, listo para registrar.',
      'Con las flechas del recuadro de la izquierda cambias de mes; con el buscador y los filtros encuentras un indicador o solo los pendientes.',
      'El botón verde "+" (Acciones) siempre trae de primero "Seguir con…", el último indicador que abriste: es el camino más corto para continuar donde ibas.',
    ] },
  { id: 'registro', icono: 'fa-pen-to-square', titulo: 'Registrar un mes: valor, causa y plan de acción', ruta: '/indicadores', boton: 'Ir a Indicadores',
    resumen: 'Es la tarea más frecuente. Cada dato lleva su plan de acción, incluso cuando el indicador cumple.',
    pasos: [
      'Abre el indicador y haz clic en el mes. Se abre un formulario.',
      'Escribe el valor. En indicadores de porcentaje escribe el número normal: 95 significa 95 %.',
      'Explica el análisis y la causa: por qué se cumplió o por qué no.',
      'Escribe el plan de acción. Es obligatorio siempre. Si no sabes qué poner, "Sugerir plan de acción" te propone uno.',
      'Guarda. La casilla del mes se pinta sola de verde o vino según el resultado frente a la meta.',
      'Si el mes ya está cerrado, el formulario te lo dice y no deja guardar: solo un administrador puede reabrirlo.',
    ] },
  { id: 'metas', icono: 'fa-bullseye', titulo: 'Metas: anual y mensual, separadas', ruta: '/configuracion', boton: 'Ir a Configuración',
    resumen: 'Cada indicador puede tener una meta para todo el año y otra para cada mes. Tú eliges cuál rige.',
    pasos: [
      'Meta anual: el objetivo del año completo (por ejemplo, 95 %).',
      'Meta mensual: un objetivo para cada mes. Puede ser una sola cifra o variar mes a mes.',
      '"Meta que rige": decide con cuál se mide el cumplimiento. En automática, usa la mensual solo si el indicador trae metas por mes.',
      'En la gráfica del indicador puedes cambiar de meta al vuelo para comparar, sin tocar la configuración.',
      'En la matriz, la meta que rige aparece subrayada en dorado.',
    ] },
  { id: 'ficha', icono: 'fa-chart-line', titulo: 'La ficha: gráfica, comparaciones y tendencia', ruta: '/indicadores', boton: 'Ir a Indicadores',
    resumen: 'Todo lo de un indicador en una sola pantalla: sus 12 meses, la gráfica, la tendencia y el análisis de cada mes.',
    pasos: [
      'La gráfica clásica compara la meta (azul) con el indicador (rojo) mes a mes.',
      '"Comparar el indicador contra" cambia lo planeado: la meta, el mes anterior o el mismo mes del año anterior.',
      '"Desde" y "Hasta" muestran solo los meses que te interesan, en la gráfica y en la tendencia.',
      '"Superponer otro año" dibuja una línea con el resultado de un año anterior.',
      'La tendencia dice si el indicador sube o baja por mes y si eso es favorable para la meta (con tres meses de datos o más).',
    ] },
  { id: 'matriz', icono: 'fa-table-cells', titulo: 'Matriz: todos los indicadores en una tabla', ruta: '/matriz', boton: 'Ir a la Matriz',
    resumen: 'La hoja maestra. Reemplaza al Excel grande: cada fila es un indicador y cada columna un mes.',
    pasos: [
      'Verás las metas, las frecuencias de medición y de seguimiento, y los 12 meses coloreados.',
      'Al final de cada fila: cuántos meses cumplió, cuántos no llegó a la meta y cuántos quedaron sin diligenciar.',
      'La última fila suma el cumplimiento de cada mes.',
      'Filtra por proceso, busca por nombre o ve solo los que no cumplen o los que tienen meses sin diligenciar.',
      'Si un administrador crea un indicador nuevo, aparece aquí solo. "Exportar a Excel" baja la matriz con colores.',
    ] },
  { id: 'dashboard', icono: 'fa-chart-pie', titulo: 'Dashboard: dónde estamos fallando', ruta: '/dashboard', boton: 'Ir al Dashboard',
    resumen: 'Para el administrador. Resume el año y separa las dos formas de incumplir.',
    pasos: [
      'El número grande es el cumplimiento de la meta, con la variación frente al mes anterior ya completo.',
      'Hay DOS tipos de incumplimiento: no llegar a la meta (se registró pero quedó por debajo) y no diligenciar (el mes venció sin dato).',
      'La torta muestra qué indicadores pesan más en cada tipo de incumplimiento.',
      'Filtra por proceso y por rango de meses: todo el tablero se recalcula.',
      'El Mapa del año pinta cada proceso por mes; al filtrar un proceso pasa a mostrar sus indicadores uno por uno.',
      'Más abajo ves el cumplimiento por pilar de la estrategia ASG y por tipo de indicador, y una tabla con TODOS los indicadores: su meta, último dato, cumplimiento y estado de cada mes.',
      'Con «Descargar PDF» sale una hoja limpia, con membrete, lista para llevar a una reunión.',
    ] },
  { id: 'informe', icono: 'fa-file-pdf', titulo: 'Informe mensual en PDF', ruta: '/informe', boton: 'Ir al Informe',
    resumen: 'El documento del mes: resultado de cada indicador, si cumplió o no, su causa y su plan de acción.',
    pasos: [
      'Elige mes, año y proceso. El informe se arma en pantalla.',
      'Cada fila trae meta, resultado, estado (Cumple, No cumple, No diligenciado, Pendiente), causa y plan.',
      'Pulsa "Descargar PDF" y, en el cuadro de impresión, elige "Guardar como PDF".',
      '"Excel" baja el mismo informe en una hoja de cálculo con colores.',
      'Si algún indicador tiene dato pero no plan (registros antiguos), el informe te avisa.',
    ] },
  { id: 'excel', icono: 'fa-file-arrow-up', titulo: 'Importar desde Excel', ruta: '/importar', boton: 'Ir a Importar',
    resumen: 'Carga muchos registros de una vez. Nada se guarda sin que antes veas una vista previa.',
    pasos: [
      'Descarga la plantilla del mes: ya trae los indicadores listados.',
      'Complétala: valor, análisis, causa y plan de acción (obligatorio).',
      'Súbela. La aplicación revisa fila por fila y marca cada una como lista o con su error.',
      'Los errores típicos: falta el plan, el mes está cerrado, el indicador no existe o la fila está repetida.',
      'Confirma, y solo se guardan las filas válidas. Los administradores también pueden crear indicadores nuevos con la hoja "Indicadores nuevos".',
    ] },
  { id: 'cierre', icono: 'fa-lock', titulo: 'Cierre automático de meses', ruta: '/configuracion', boton: 'Ir a Configuración',
    resumen: 'Cada mes se cierra solo en una fecha fija. Después de eso, solo un administrador puede reabrirlo.',
    pasos: [
      'El mes en curso está abierto hasta el día 15.', 'La franja de colores que ves arriba, en todas las pantallas, dice hasta qué día se puede registrar y cuántos días quedan.',
      'Cada mes se puede registrar hasta el día 15 de ese mismo mes (inclusive) y el 16 se cierra solo. Los meses que ya pasaron están cerrados.',
      'Un mes cerrado no se puede modificar ni a mano ni con Excel. El candado aparece en la cinta.',
      'Un administrador puede reabrir un mes concreto desde Configuración → Cierres mensuales.',
      'El bloqueo lo aplica la base de datos, así que no se puede saltar con una pestaña vieja ni con otra herramienta.',
    ] },
  { id: 'correos', icono: 'fa-envelope', titulo: 'Correos automáticos', ruta: '/configuracion', boton: 'Ir a Configuración',
    resumen: 'La aplicación recuerda sola. Los correos salen firmados con el cargo y no llevan enlaces.',
    pasos: [
      'Día 2 de cada mes: recordatorio a todos los procesos para que registren el mes en curso.',
      'Día 13 (dos días antes del último día): aviso solo a quienes todavía tienen pendientes.',
      'Día 16: el mes se cierra y se avisa a todos cómo quedó.',
      'Reciben el correo las personas de "Involucrados" de cada proceso que tengan los avisos activados.',
      'Los correos no tienen botones ni enlaces a propósito: nadie puede suplantarlos con un enlace falso.',
      'En "Últimos envíos" puedes eliminar uno: aparece "Deshacer" unos segundos antes de que se borre de verdad.',
    ] },
  { id: 'novedades', icono: 'fa-bell', titulo: 'Novedades: lo que necesita tu atención', ruta: '/novedades', boton: 'Ir a Novedades',
    resumen: 'Para el administrador. Ordena los problemas del año por gravedad para que sepas por dónde empezar.',
    pasos: [
      'Crítico: un mes cerrado que quedó sin registrar, o tres meses seguidos sin cumplir.',
      'Alto: varios meses sin registrar, dos meses seguidos sin cumplir, o un incumplimiento sin plan de acción.',
      'Medio: un mes sin registrar.',
      'Cada alerta tiene un botón "Revisar" que abre el indicador en el mes exacto.',
      'También ves el comportamiento de cada área: cuánto cumple y cuánto diligencia.',
    ] },
  { id: 'roles', icono: 'fa-user-shield', titulo: 'Tres roles, tres niveles de permiso', ruta: '/configuracion', boton: 'Ir a Configuración',
    resumen: 'Administrador, Digitador y Usuario. Cada quien ve y hace solo lo que le corresponde.',
    pasos: [
      'Administrador: todo. Configura, cierra y reabre meses, crea indicadores, maneja usuarios y correos.',
      'Digitador: registra datos (a mano o con Excel) y consulta matriz e informes. No configura nada.',
      'Usuario: solo consulta indicadores, matriz e informes.',
      'Los permisos los aplica la base de datos, no solo la pantalla: un botón escondido no es la única protección.',
      'Una cuenta sin rol asignado se trata como Usuario, el nivel más restringido.',
    ] },
];

/* ---------------------------------------------------------------------------
   Mapa "todo conectado": funciones
--------------------------------------------------------------------------- */
export const COLUMNAS = [
  { id: 'entrada', titulo: 'Cómo entran los datos', nota: 'Lo que tú haces' },
  { id: 'nucleo', titulo: 'Dónde se guardan y se vigilan', nota: 'Lo que la aplicación cuida sola' },
  { id: 'salida', titulo: 'Dónde se ven y qué se hace con ellos', nota: 'Lo que consultas' },
];

export const NODOS = [
  { id: 'registro', col: 'entrada', icono: 'fa-pen-to-square', titulo: 'Registro a mano', ruta: '/indicadores', roles: ['admin', 'digitador'],
    sirve: 'Guardar el dato de un indicador en un mes: valor, análisis, causa y plan de acción.',
    recibe: ['config', 'roles', 'plan', 'cierre'], alimenta: ['bd'],
    detalle: 'Es la forma principal de trabajar. Lo ve y lo usa quien tenga rol de Administrador o Digitador. Usa las metas que configuró el administrador para pintar el mes de verde o vino.' },
  { id: 'excel', col: 'entrada', icono: 'fa-file-arrow-up', titulo: 'Importar Excel', ruta: '/importar', roles: ['admin', 'digitador'],
    sirve: 'Cargar muchos registros a la vez (y, para administradores, indicadores nuevos) desde una plantilla.',
    recibe: ['roles', 'plan', 'cierre'], alimenta: ['bd'],
    detalle: 'Aplica exactamente las mismas reglas que el registro a mano: plan obligatorio y meses cerrados bloqueados. Antes de guardar muestra una vista previa fila por fila.' },
  { id: 'config', col: 'entrada', icono: 'fa-sliders', titulo: 'Configuración', ruta: '/configuracion', roles: ['admin'],
    sirve: 'Definir el catálogo: indicadores, metas anual y mensual, frecuencias, cierres, correos y usuarios.',
    recibe: ['roles'], alimenta: ['bd', 'cierre', 'correos', 'roles'],
    detalle: 'Es el panel de control del administrador. Lo que se cambia aquí afecta a todas las pantallas: una meta nueva cambia los colores de la cinta, la matriz y el dashboard.' },
  { id: 'plan', col: 'nucleo', icono: 'fa-clipboard-check', titulo: 'Plan de acción obligatorio', ruta: null, roles: ['admin', 'digitador', 'usuario'],
    sirve: 'Regla: ningún dato se guarda sin su plan de acción, incluso si el indicador cumple.',
    recibe: [], alimenta: ['registro', 'excel', 'informe'],
    detalle: 'La exigen la pantalla, la importación y la propia base de datos. Por eso el informe mensual siempre tiene qué mostrar en la columna de plan.' },
  { id: 'cierre', col: 'nucleo', icono: 'fa-lock', titulo: 'Cierre automático', ruta: '/configuracion', roles: ['admin'],
    sirve: 'Regla: un mes sigue abierto hasta el día 15 del mismo mes (es configurable) y el 16 se cierra solo. Solo un administrador lo reabre.',
    recibe: ['config', 'correos'], alimenta: ['registro', 'excel'],
    detalle: 'Si ese día nadie lo cerró a mano, la función de correos lo cierra y avisa. Aunque no lo hiciera, la base de datos bloquea cualquier escritura en un mes vencido.' },
  { id: 'bd', col: 'nucleo', icono: 'fa-database', titulo: 'Base de datos', ruta: null, roles: ['admin', 'digitador', 'usuario'],
    sirve: 'Guarda todo: indicadores, metas, registros de cada mes, cierres, personas a notificar y usuarios con su rol.',
    recibe: ['registro', 'excel', 'config'], alimenta: ['indicadores', 'matriz', 'dashboard', 'novedades', 'informe', 'correos'],
    detalle: 'Está en Supabase. Es la única fuente de verdad: todas las pantallas leen de aquí, por eso nunca se contradicen. También decide, por rol, quién puede leer y quién puede escribir.' },
  { id: 'roles', col: 'nucleo', icono: 'fa-user-shield', titulo: 'Roles y permisos', ruta: '/configuracion', roles: ['admin'],
    sirve: 'Administrador, Digitador o Usuario: define qué pantallas ves y qué puedes modificar.',
    recibe: ['config'], alimenta: ['registro', 'excel', 'config'],
    detalle: 'Se asigna en Configuración → Usuarios. Es lo que decide, por ejemplo, que un Usuario no vea el botón de registrar y que la base rechace su intento si lo forzara.' },
  { id: 'indicadores', col: 'salida', icono: 'fa-chart-simple', titulo: 'Indicadores y ficha', ruta: '/indicadores', roles: ['admin', 'digitador', 'usuario'],
    sirve: 'Ver el estado de cada indicador, su cinta del año, su gráfica, su tendencia y el detalle de cada mes.',
    recibe: ['bd'], alimenta: ['registro'],
    detalle: 'Es también la puerta para registrar: desde la cinta o la tabla de meses se abre el formulario de un mes.' },
  { id: 'matriz', col: 'salida', icono: 'fa-table-cells', titulo: 'Matriz', ruta: '/matriz', roles: ['admin', 'digitador', 'usuario'],
    sirve: 'La tabla maestra: todos los indicadores por mes, con metas, frecuencias y totales.',
    recibe: ['bd'], alimenta: [],
    detalle: 'Se actualiza sola: un indicador nuevo, un dato nuevo o un cambio de meta se reflejan aquí al instante. Se exporta a Excel.' },
  { id: 'dashboard', col: 'salida', icono: 'fa-chart-pie', titulo: 'Dashboard', ruta: '/dashboard', roles: ['admin'],
    sirve: 'Resumir el año: cumplimiento, los dos tipos de incumplimiento, torta, mapa por mes, pilares ASG, tipos y la tabla de todos los indicadores.',
    recibe: ['bd'], alimenta: [],
    detalle: 'Filtrable por proceso y por rango de meses. Solo cuenta como "esperado" lo que ya venció o ya tiene dato, para no castigar al mes que apenas empieza.' },
  { id: 'novedades', col: 'salida', icono: 'fa-bell', titulo: 'Novedades', ruta: '/novedades', roles: ['admin'],
    sirve: 'Alertas ordenadas por gravedad: qué falta, qué incumple y dónde actuar primero.',
    recibe: ['bd'], alimenta: ['indicadores'],
    detalle: 'Cada alerta abre el indicador en el mes exacto para resolverla.' },
  { id: 'informe', col: 'salida', icono: 'fa-file-pdf', titulo: 'Informe mensual (PDF)', ruta: '/informe', roles: ['admin', 'digitador', 'usuario'],
    sirve: 'El documento del mes para entregar o archivar: resultado, causa y plan de cada indicador.',
    recibe: ['bd', 'plan'], alimenta: [],
    detalle: 'Se guarda como PDF desde el cuadro de impresión del navegador y también se exporta a Excel.' },
  { id: 'correos', col: 'salida', icono: 'fa-envelope', titulo: 'Correos automáticos', ruta: '/configuracion', roles: ['admin'],
    sirve: 'Recordar a las personas de cada proceso: día 2, aviso del día 13 y cierre del día 16.',
    recibe: ['bd', 'config'], alimenta: ['cierre'],
    detalle: 'Leen de la base de datos qué indicadores faltan en cada proceso y los listan. El día 16, además de avisar, cierran el mes.' },
];

/* ---------------------------------------------------------------------------
   Mapa de servicios técnicos: qué programa hace qué y con quién habla
--------------------------------------------------------------------------- */
export const SERVICIOS = [
  { id: 'app', icono: 'fa-window-maximize', titulo: 'La aplicación (lo que ves)', donde: 'Cloudflare Pages',
    hace: 'Son las pantallas: Indicadores, Matriz, Dashboard, Informe, Importar, Configuración. Se abre desde el navegador, sin instalar nada.',
    habla: ['supa', 'func'], vars: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
    nota: 'Cada vez que subes un cambio a GitHub, Cloudflare Pages la vuelve a publicar sola.' },
  { id: 'supa', icono: 'fa-database', titulo: 'Supabase', donde: 'supabase.com',
    hace: 'Hace cuatro cosas: guarda los datos (Postgres), controla quién entra (inicio de sesión), decide quién puede leer o escribir cada tabla (permisos por rol) y guarda el logo de los correos (Storage).',
    habla: ['app', 'func'], vars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    nota: 'La llave "service role" es secreta: solo vive en el servidor de Cloudflare, nunca en la pantalla.' },
  { id: 'func', icono: 'fa-bolt', titulo: 'Función de correos', donde: 'Cloudflare Pages Functions',
    hace: 'Un pequeño programa en el servidor. Lee de Supabase qué indicadores faltan, arma los correos, cierra los meses el día 16 y le pide a Brevo que los envíe.',
    habla: ['supa', 'brevo', 'gh'], vars: ['BREVO_API_KEY', 'CORREO_REMITENTE', 'CRON_SECRET', 'URL_PUBLICA', 'PROVEEDOR_CORREO'],
    nota: 'Solo un administrador con sesión, o el despertador diario con la clave secreta, pueden activarla.' },
  { id: 'brevo', icono: 'fa-paper-plane', titulo: 'Brevo', donde: 'brevo.com',
    hace: 'Es el servicio que entrega los correos a las bandejas de entrada. Los envía desde la dirección verificada (torremolinosfinca@gmail.com).',
    habla: ['func'], vars: ['BREVO_API_KEY'],
    nota: 'Gratis hasta 300 correos al día. Activa la verificación en dos pasos en esa cuenta.' },
  { id: 'gh', icono: 'fa-clock', titulo: 'GitHub Actions', donde: 'github.com',
    hace: 'Es el despertador. Todos los días a las 8:00 a.m. (Colombia) toca la puerta de la función de correos. La función decide sola si ese día toca enviar (días 2, 13 o 16).',
    habla: ['func'], vars: ['APP_URL', 'CRON_SECRET'],
    nota: 'Estos dos son "secretos" del repositorio. Sin ellos los correos no salen solos.' },
];

/* ---------------------------------------------------------------------------
   Glosario
--------------------------------------------------------------------------- */
export const GLOSARIO = [
  ['Cumple / No cumple', 'Un mes cumple cuando el resultado alcanza la meta. En indicadores donde menos es mejor (por ejemplo, ausentismo o rotación) cumple cuando el resultado es igual o menor que la meta.'],
  ['Meta anual', 'El objetivo para todo el año. Se usa como referencia general del indicador.'],
  ['Meta mensual', 'El objetivo de cada mes. Puede ser una cifra fija o distinta por mes.'],
  ['Meta que rige', 'Cuál de las dos metas se usa para calcular si el mes cumple. "Automática" usa la mensual solo si el indicador trae metas por mes.'],
  ['Cumplimiento (%)', 'Entre los registros que ya tienen dato y meta: cuántos cumplieron, dividido entre los que se evaluaron.'],
  ['Registros esperados', 'Los que ya deberían existir: cada indicador por cada mes que ya venció o que ya tiene dato. El mes en curso sin dato todavía no cuenta.'],
  ['No llegó a la meta', 'Primer tipo de incumplimiento: se registró el dato, pero quedó por debajo de la meta.'],
  ['No se diligenció', 'Segundo tipo de incumplimiento: el mes venció y no se registró nada. En la cinta aparece rayado en rosa.'],
  ['Mes vencido / cerrado', 'Un mes que ya pasó su último día para registrar (por defecto, el 15 del mismo mes). No se puede modificar hasta que un administrador lo reabra.'],
  ['Mes reabierto', 'Un mes cerrado que un administrador volvió a abrir. Queda anotado quién lo hizo.'],
  ['Plan de acción', 'Lo que se hará para corregir o mantener el resultado. Es obligatorio en cada dato.'],
  ['Frecuencia de medición', 'Cada cuánto se mide el indicador (mensual, trimestral, semestral, anual).'],
  ['Frecuencia de seguimiento', 'Cada cuánto se revisa el indicador en reuniones o comités. Puede ser distinta a la de medición.'],
  ['Planeado vs ejecutado', 'En la gráfica, lo planeado puede ser la meta, el valor del mes anterior o el del mismo mes del año anterior; lo ejecutado es el resultado real.'],
  ['Tendencia', 'La dirección en que se mueve el indicador mes a mes, calculada con una recta sobre los meses con dato (mínimo tres).'],
  ['Involucrados', 'Las personas de cada proceso que reciben los correos. Se administran en cada proceso, con un interruptor de "recibe avisos".'],
];

/* ---------------------------------------------------------------------------
   Guías paso a paso, detalladas
--------------------------------------------------------------------------- */
export const GUIAS = [
  { id: 'g-registro', titulo: 'Registrar un indicador del mes', icono: 'fa-pen-to-square', color: '#166534', roles: ['admin', 'digitador'],
    pasos: [
      ['Entra a Indicadores', 'Es la pantalla de inicio. Arriba verás el mes en curso; usa las flechas si necesitas otro mes.'],
      ['Encuentra el indicador', 'Despliega el proceso (clic en su franja) o escribe parte del nombre en el buscador. El filtro "Pendientes" muestra solo lo que falta.'],
      ['Abre el mes', 'Haz clic en la casilla del mes dentro de la cinta del año, o abre el indicador y pulsa "Registrar" en la fila del mes.'],
      ['Escribe el valor', 'En indicadores de porcentaje escribe el número tal cual: 95 es 95 %. Al lado del campo verás la meta para comparar.'],
      ['Explica el análisis y la causa', 'Escribe por qué el resultado fue el que fue. Sirve tanto si cumplió como si no: es lo que luego aparece en el informe.'],
      ['Escribe el plan de acción', 'Es obligatorio. Si el indicador cumple, basta con "Mantener las acciones actuales" y detallarlas. El botón "Sugerir plan de acción" propone un texto según el resultado.'],
      ['Guarda', 'La casilla del mes se pinta sola. Si falta algo obligatorio, el formulario te lo dice sin perder lo que escribiste.'],
      ['Si algo sale mal', 'Mes cerrado: pide a un administrador que lo reabra. "Tu rol no tiene permiso": tu cuenta es de solo consulta, pide que te cambien el rol.'],
    ] },
  { id: 'g-excel', titulo: 'Cargar varios registros con Excel', icono: 'fa-file-arrow-up', color: '#8A6410', roles: ['admin', 'digitador'],
    pasos: [
      ['Entra a Importar Excel', 'Está en el menú de arriba (en el celular, en la barra de abajo).'],
      ['Elige mes y año y descarga la plantilla', 'La plantilla ya trae los 42 indicadores del mes en la hoja "Registros". No cambies los nombres de los indicadores.'],
      ['Completa las columnas', 'Valor, Análisis, Causa y Plan de acción. En porcentajes puedes escribir 95% o 95. Deja en blanco las filas que no vas a cargar: se ignoran.'],
      ['Sube el archivo', 'Solo .xlsx de hasta 5 MB. La aplicación lo lee y te muestra una vista previa; todavía no guardó nada.'],
      ['Revisa la vista previa', 'Las filas válidas tienen una marca verde. Las demás muestran el motivo: plan faltante, mes cerrado, indicador inexistente o fila repetida.'],
      ['Corrige y vuelve a subir si hace falta', 'Arregla el Excel y súbelo otra vez, o descarta y empieza de nuevo.'],
      ['Confirma', 'Pulsa "Importar" y confirma. Solo se guardan las válidas, y quedan marcadas como cargadas desde Excel.'],
    ] },
  { id: 'g-libro', titulo: 'Importar el libro de indicadores completo', icono: 'fa-book-open', color: '#8064A2', roles: ['admin'],
    pasos: [
      ['Entra a Importar Excel y elige «Libro de indicadores»', 'Solo los administradores ven esta opción, arriba a la izquierda.'],
      ['Elige el libro (.xlsx)', 'El archivo «Indicadores de Gestión» tal como lo tienes, con la hoja «Indicadores» y una hoja por indicador. Todavía no guarda nada.'],
      ['Mira la vista previa', 'Verás cuántos indicadores ya están, cuáles son nuevos, cuántos meses entrarían y los avisos que trae el libro.'],
      ['Lee el cuadro de metas mensuales', 'Si el libro trae una meta mensual que la aplicación no tenía, esos indicadores pasarán a evaluarse contra ella. El cuadro muestra cuántos meses cambian de estado antes de que confirmes.'],
      ['Elige cómo importar', '«Completar» (recomendado) agrega lo que falta y llena lo vacío sin pisar nada. «Reemplazar» deja que el libro mande.'],
      ['Si hay indicadores nuevos, elige su proceso', 'La aplicación sugiere uno; puedes cambiarlo en la tabla.'],
      ['Pulsa «Importar a la aplicación» y confirma', 'También se guardan los meses ya cerrados, porque es un libro histórico. Puedes repetirlo sin riesgo: lo que ya está igual no se toca.'],
    ] },
  { id: 'g-nuevo', titulo: 'Crear un indicador nuevo y fijar sus metas', icono: 'fa-plus', color: '#166534', roles: ['admin'],
    pasos: [
      ['Configuración → Indicadores', 'Pulsa "Nuevo indicador".'],
      ['Elige el proceso y el nombre', 'El nombre debe ser claro y único: es el que se verá en la matriz, el dashboard y los informes.'],
      ['Pon la unidad de medida', 'Si lleva el símbolo %, la aplicación entiende que es un porcentaje y te deja escribir 95 en lugar de 0,95.'],
      ['Define las metas', 'Escribe la meta anual, la mensual o ambas (mínimo una). Luego elige "Meta que rige".'],
      ['Elige el sentido', 'Si mayor es mejor (ventas, cumplimiento) o menor es mejor (ausentismo, rotación, consumos).'],
      ['Frecuencias y responsable', 'Frecuencia de medición, de seguimiento y quién lo mide.'],
      ['Crea', 'El indicador aparece solo en la lista, la matriz, el dashboard y los informes. Para retirarlo, "Dar de baja": se oculta pero su historial no se borra.'],
    ] },
  { id: 'g-cierres', titulo: 'Cerrar y reabrir meses', icono: 'fa-lock', color: '#A91D3A', roles: ['admin'],
    pasos: [
      ['Entiende la regla', 'Los meses se cierran solos después del día 15 del mismo mes. No tienes que hacer nada para que se cierren.'],
      ['Configuración → Cierres mensuales', 'Ves los 12 meses del año con su estado: "vencido automáticamente", "reabierto por un administrador" o abierto.'],
      ['Reabrir un mes', 'Pulsa "Reabrir" y confirma. Desde ese momento los digitadores pueden registrar de nuevo en ese mes. Queda anotado que fuiste tú.'],
      ['Volver a cerrarlo', 'Cuando terminen, pulsa "Cerrar ahora" para que quede bloqueado otra vez.'],
      ['Cambiar el último día para registrar', 'Configuración → Notificaciones → "Último día para registrar". El aviso de "faltan 2 días" siempre sale dos días antes de ese último día.'],
    ] },
  { id: 'g-correos', titulo: 'Poner a funcionar los correos automáticos', icono: 'fa-envelope', color: '#166534', roles: ['admin'],
    pasos: [
      ['Agrega a las personas', 'En Indicadores, despliega cada proceso y pulsa "Involucrados y notificaciones". Escribe nombre, cargo y correo, y deja activado "Recibe avisos".'],
      ['Configura la firma', 'Configuración → Notificaciones → "Firma de los correos": cargo y datos de contacto. Los correos salen firmados solo con el cargo.'],
      ['Comprueba el logo', 'En la misma pestaña, "Publicar y comprobar logo". Debe mostrarse la imagen. En Outlook de escritorio puede pedir permitir imágenes.'],
      ['Envía un correo de prueba', '"Enviar correo de prueba" llega siempre, haya o no pendientes. Revisa que se vea bien y que no caiga en spam.'],
      ['Prueba el envío real', '"Enviar recordatorio ahora" manda un correo real a los involucrados de los procesos con pendientes. Pide confirmación.'],
      ['Activa el despertador diario', 'En GitHub: Settings → Secrets → crea APP_URL (dirección de la app) y CRON_SECRET (la misma clave que pusiste en Cloudflare). Desde ahí, los días 2, 13 y 16 se envían solos.'],
    ] },
  { id: 'g-dashboard', titulo: 'Leer el Dashboard', icono: 'fa-chart-pie', color: '#4472C4', roles: ['admin'],
    pasos: [
      ['El número grande', 'Cumplimiento de la meta: de los registros con dato y meta, cuántos cumplieron. Debajo, la variación frente al mes anterior ya completo.'],
      ['Diligenciamiento y alertas', 'A la derecha: qué porcentaje de lo esperado se registró, cuántos meses vencieron sin dato y cuántos incumplimientos no tienen plan.'],
      ['Cumplimiento e incumplimiento acumulado', 'Tres tasas que suman el total: cumplen, no llegaron a la meta y no se diligenciaron. Debajo, lo mismo por proceso.'],
      ['La torta', 'Qué indicadores pesan más en el incumplimiento. Cambia entre "No llegaron a la meta" y "No diligenciados". Haz clic en un indicador para abrirlo.'],
      ['Filtros', 'Elige un proceso y/o un rango de meses (Desde, Hasta). Todo se recalcula. "Quitar filtros" regresa a la vista completa.'],
      ['Mapa del año', 'Cada fila por mes. Verde: 85 % o más. Dorado: 60 a 84 %. Vino: menos de 60 %. Rayado: venció sin registrar.'],
    ] },
  { id: 'g-informe', titulo: 'Sacar el informe mensual en PDF', icono: 'fa-file-pdf', color: '#A91D3A', roles: ['admin', 'digitador', 'usuario'],
    pasos: [
      ['Entra a Informe mensual', 'Elige el mes, el año y, si quieres, un solo proceso.'],
      ['Revisa el resumen', 'Arriba: cumplimiento, cuántos cumplen, cuántos no, cuántos no se diligenciaron y cuántos siguen pendientes.'],
      ['Lee la tabla', 'Por cada indicador: meta, resultado, estado, causa y plan de acción, agrupados por proceso.'],
      ['Descarga el PDF', 'Pulsa "Descargar PDF". En el cuadro de impresión, elige "Guardar como PDF" como destino.'],
      ['Si lo necesitas en Excel', 'El botón "Excel" baja el mismo informe con colores.'],
    ] },
  { id: 'g-roles', titulo: 'Dar acceso a una persona nueva', icono: 'fa-user-plus', color: '#8064A2', roles: ['admin'],
    pasos: [
      ['Entra a Configuración → Usuarios', 'Ahí está el formulario "Crear usuario".'],
      ['Escribe su correo', 'Debe ser el correo con el que va a entrar a la aplicación.'],
      ['Genera la contraseña temporal', 'Pulsa "Generar": crea una fácil de dictar, sin letras confundibles. También puedes escribir la tuya (mínimo 8 caracteres).'],
      ['Elige el rol', 'Administrador, Digitador o Usuario. Elige el más bajo que le alcance para trabajar: casi todas las personas solo necesitan Digitador o Usuario.'],
      ['Pulsa "Crear usuario"', 'La cuenta queda lista al instante. Verás los datos de acceso UNA sola vez: cópialos con "Copiar datos de acceso" y entrégaselos por un medio seguro. Si la cuenta ya existía en Supabase, queda agregada con el rol y conserva su contraseña.'],
      ['La persona entra y cambia su contraseña', 'Desde su nombre, arriba a la derecha → "Cambiar mi contraseña".'],
      ['Después, desde la lista', 'Puedes cambiarle el rol, ponerle una contraseña nueva ("Nueva contraseña") o quitarle el acceso. No puedes quitártelo a ti mismo.'],
    ] },
  { id: 'g-novedades', titulo: 'Usar Novedades para saber por dónde empezar', icono: 'fa-bell', color: '#C9932B', roles: ['admin'],
    pasos: [
      ['Mira los contadores', 'Críticas y altas son lo urgente. Debajo ves los meses sin registrar y los incumplimientos sin plan.'],
      ['Revisa el comportamiento por área', 'Cada proceso muestra dos barras: cuánto cumple y cuánto diligencia. Son problemas distintos.'],
      ['Filtra las alertas', 'Por nivel (críticas, altas, medias) y por proceso. Se muestran de 10 en 10.'],
      ['Pulsa "Revisar"', 'Abre el indicador en el mes exacto del problema. Resuélvelo allí y la alerta desaparece sola.'],
    ] },
];

/* ---------------------------------------------------------------------------
   Preguntas frecuentes
--------------------------------------------------------------------------- */
export const FAQ = [
  { roles: ['admin', 'digitador'], q: '¿Por qué no me deja guardar un mes?', a: 'Hay tres razones posibles: el mes ya está cerrado (pide a un administrador que lo reabra), falta el plan de acción (es obligatorio siempre) o tu rol es de solo consulta. El mensaje que aparece te dice cuál es.' },
  { roles: ['admin', 'digitador', 'usuario'], q: '¿Por qué se pinta de vino un mes que me parece que cumplió?', a: 'Revisa la meta que rige el indicador (anual o mensual) y el sentido: en indicadores donde menos es mejor, un valor mayor que la meta no cumple. En la ficha, "Meta en la gráfica" te deja comparar con la otra meta.' },
  { roles: ['admin', 'digitador', 'usuario'], q: '¿Qué diferencia hay entre "no llegó a la meta" y "no se diligenció"?', a: 'En el primero alguien registró el dato y quedó por debajo. En el segundo nadie registró nada y el mes ya venció. Son problemas distintos y se miden por separado.' },
  { roles: ['admin', 'digitador', 'usuario'], q: '¿Por qué un mes aparece rayado en rosa?', a: 'Porque venció (se cerró) y el indicador no tiene dato.',
    porRol: { admin: 'Porque venció (se cerró) y el indicador no tiene dato. Para corregirlo, reabre ese mes en Configuración → Cierres mensuales y pide que lo registren.', digitador: 'Porque venció (se cerró) y el indicador no tiene dato. Para corregirlo, pide a un administrador que reabra ese mes y luego lo registras tú.' } },
  { roles: ['admin', 'digitador'], q: '¿Qué pasa si escribo 0,95 en un indicador de porcentaje?', a: 'Escribe siempre 95 para 95 %. En la importación desde Excel, un número menor a 2 se toma como fracción (0,95 = 95 %) y la vista previa te muestra cómo lo entendió antes de guardar.' },
  { roles: ['admin'], q: '¿Cuándo se envían los correos?', a: 'Solos: el día 2 (recordatorio a todos, con el resumen de cómo va el mes anterior), el día 13 (aviso a quienes tienen pendientes) y el día 16 (cierre, a todos). Si el despertador falla un día, la función lo recupera al siguiente. A mano, solo un administrador puede enviarlos, desde Configuración → Notificaciones.' },
  { roles: ['digitador'], q: '¿Cuándo me llegan correos?', a: 'Si estás en la lista de "Involucrados" de un proceso y tienes los avisos activados: el día 2 de cada mes (qué falta registrar del mes anterior), el día 13 (faltan dos días para el último día, solo si todavía hay pendientes) y el día 16 (el mes se cerró).' },
  { roles: ['admin', 'digitador'], q: '¿Por qué el correo no tiene botones?', a: 'A propósito. Un correo sin enlaces no se puede suplantar con un botón falso. Para registrar datos se entra a la aplicación escribiendo la dirección en el navegador.' },
  { roles: ['admin'], q: '¿Quién puede ver los correos de las personas?', a: 'Solo los administradores. Digitadores y usuarios no ven la lista de involucrados.' },
  { roles: ['admin'], q: '¿Se pierde algo si doy de baja un indicador?', a: 'No. Se oculta de la lista, la matriz, el dashboard y los informes, pero su historial queda guardado.' },
  { roles: ['admin'], q: '¿Puedo agregar indicadores sin tocar la base de datos?', a: 'Sí. Uno a uno en Configuración → Indicadores → "Nuevo indicador", o muchos a la vez con la hoja "Indicadores nuevos" de la plantilla de importación (solo administradores).' },
  { roles: ['admin'], q: '¿Qué hago si el logo no se ve en el correo?', a: 'Configuración → Notificaciones → "Publicar y comprobar logo". Si ahí se ve, el correo está bien: Outlook de escritorio bloquea imágenes hasta que el destinatario pulsa "Descargar imágenes" o agrega al remitente como seguro.' },
  { roles: ['admin'], q: '¿Cómo sé que el envío automático está funcionando?', a: 'En Configuración → Notificaciones hay un panel "Envío automático" que muestra cuándo fue la última vez que el despertador llamó, cuándo se envió el último recordatorio y las fechas de los próximos envíos. Si dice que lleva días sin llamar, revisa los secretos de GitHub.' },
  { roles: ['usuario'], q: '¿Puedo corregir o agregar un dato?', a: 'No: tu rol es de consulta. Si ves un dato que no es correcto, avísale a la persona que digita ese proceso o al administrador.' },
  { roles: ['usuario'], q: '¿Qué significa el candado en la cinta de un indicador?', a: 'Que ese mes ya se cerró y no se puede modificar. Es normal: los meses se cierran solos después del día 15 del mismo mes.' },
  { roles: ['admin', 'digitador', 'usuario'], q: '¿Funciona en el celular?', a: 'Sí. En pantallas pequeñas el menú pasa a la barra inferior y las tablas se vuelven tarjetas apiladas. La matriz se desliza hacia los lados.' },
  { roles: ['admin'], q: '¿Y si alguien pierde la contraseña?', a: 'Configuración → Usuarios → "Nueva contraseña" en su fila: la aplicación genera una y te la muestra una sola vez para que se la entregues.' },
  { roles: ['admin'], q: '¿Qué pasa con los meses del libro que no traen plan de acción?', a: 'Se importan como históricos: no se les exige plan y seguirán apareciendo como «sin plan» en el Dashboard hasta que alguien lo complete. Lo que se registra desde la aplicación sí exige plan.' },
  { roles: ['admin'], q: '¿Por qué un 0 del libro no se importó?', a: 'El libro rellena con 0 los meses que todavía no se reportan. Un 0 sin análisis ni plan escrito se toma como relleno; un 0 con texto escrito sí se importa como dato real.' },
  { roles: ['admin', 'digitador', 'usuario'], q: '¿Cómo cambio mi contraseña?', a: 'Pulsa tu nombre, arriba a la derecha, y elige "Cambiar mi contraseña". Escríbela dos veces: mínimo 8 caracteres, con letras y números.' },
  { roles: ['admin', 'digitador', 'usuario'], q: '¿Cómo cambio el nombre con el que aparezco?', a: 'Pulsa tu nombre, arriba a la derecha, y elige "Cambiar mi nombre". Se ve en el menú y en el registro de actividad; tu correo de acceso no cambia.' },
  { roles: ['admin', 'digitador', 'usuario'], q: '¿Cómo encuentro algo rápido?', a: 'Pulsa Ctrl y K (o la tecla "/"). Escribe parte del nombre de un indicador, de una sección o de una acción y pulsa Enter. Funciona sin importar tildes ni mayúsculas.' },
  { roles: ['admin', 'digitador', 'usuario'], q: '¿Qué es la Matriz «Definición» y la de «Seguimiento»?', a: 'La Definición es la matriz de objetivos, metas e indicadores, igual que en el Excel (estrategia, objetivo, unidad, meta, frecuencia, responsable y fuente). El Seguimiento muestra los resultados mes a mes. Se cambia de una a otra arriba a la izquierda.' },
  { roles: ['admin', 'digitador'], q: '¿Por qué un indicador me pide dos números?', a: 'Porque su resultado sale de ellos: ejecutadas ÷ planeadas, numerador ÷ denominador, o la reducción frente al año anterior. Escribes los dos números y el resultado se calcula solo, con si cumple la meta. Si no tienes los dos números, puedes escribir el resultado directamente.' },
  { roles: ['admin', 'digitador', 'usuario'], q: '¿Por qué no puedo editar un mes?', a: 'Porque está cerrado: pasó el último día para registrarlo (por defecto, el 15 del mismo mes). Los meses cerrados se pueden ver, pero no cambiar, borrar ni mover. Solo un administrador puede reabrir un mes, y queda anotado quién lo hizo.' },
  { roles: ['admin'], q: '¿Cómo sé quién cambió un dato o quién entró?', a: 'En la Bitácora. "Actividad" muestra cada cambio con quién lo hizo, cuándo y el valor de antes y de después; "Accesos" muestra quién está en línea ahora y las entradas y salidas. Nadie puede borrar ni alterar ese registro, ni siquiera un administrador.' },
  { roles: ['admin'], q: '¿Cuánto espacio queda en la base de datos?', a: 'En la Bitácora → Espacio: cuánto se usa de los 500 MB del plan gratuito, qué tablas lo ocupan y en cuánto tiempo se llenaría con el ritmo de los últimos 60 días. Si cambias de plan, actualiza el límite ahí mismo.' },
  { roles: ['digitador', 'usuario'], q: '¿Y si pierdo la contraseña?', a: 'Pídele a un administrador que la restablezca.' },
  { roles: ['admin'], q: '¿Por qué en la Actividad desaparecen solas las notas de "alguien depuró N registros"?', a: 'Esas notas avisan que corrió una limpieza, pero no son auditoría de quién cambió qué: se borran solas después de 1 día para no acumular ruido. El resto de la Actividad (quién cambió un dato, quién entró) no se toca nunca.' },
  { roles: ['admin', 'digitador', 'usuario'], q: '¿Qué hace la primera tarjeta del botón "+" (Acciones)?', a: 'Te lleva directo al último indicador en el que trabajaste, sin tener que buscarlo. Se recuerda en tu propio equipo; si entras desde otro computador, no aparece hasta que abras algo ahí.' },
  { roles: ['admin'], q: '¿Puedo deshacer que elimine un envío del historial de correos?', a: 'Sí: al eliminar uno, aparece un aviso con el botón "Deshacer" durante unos segundos. El borrado de verdad se demora ese tiempo a propósito, para que deshacer funcione de verdad y no sea solo una promesa.' },
];

/* ---------------------------------------------------------------------------
   Pruebas guiadas para empezar
--------------------------------------------------------------------------- */
export const PRUEBAS = [
  { id: 'p01', roles: ['admin', 'digitador', 'usuario'], titulo: 'Iniciar sesión y reconocer lo que ves', pasos: ['Entra con tu correo y contraseña.', 'Mira el menú de arriba (o la barra inferior en el celular) y la franja de colores que está debajo.'], esperado: 'Ves solo las secciones de tu rol. El pie del menú dice tu rol: Administrador, Digitador o Usuario.' },
  { id: 'p02', roles: ['admin', 'digitador', 'usuario'], titulo: 'Leer el estado del mes', pasos: ['Abre Indicadores.', 'Despliega un proceso.', 'Cambia de mes con las flechas.'], esperado: 'Cada indicador muestra su cinta del año con los colores correctos y los contadores de arriba cambian con el mes.' },
  { id: 'p03', roles: ['admin', 'digitador'], titulo: 'Registrar un dato con su plan de acción', pasos: ['Abre un indicador y haz clic en el mes abierto.', 'Escribe un valor, una causa y un plan.', 'Guarda.'], esperado: 'La casilla del mes se pinta de verde o vino según la meta, y el dato aparece en la tabla de meses.' },
  { id: 'p04', roles: ['admin', 'digitador'], titulo: 'Intentar guardar sin plan de acción', pasos: ['Abre un mes abierto.', 'Escribe solo el valor y deja el plan vacío.', 'Guarda.'], esperado: 'No guarda y dice que el plan de acción es obligatorio, sin borrar lo que escribiste.' },
  { id: 'p05', roles: ['admin', 'digitador', 'usuario'], titulo: 'Comprobar que un mes cerrado no se modifica', pasos: ['Abre un indicador y haz clic en un mes con candado.'], esperado: 'El formulario avisa que el mes está cerrado y no deja guardar.' },
  { id: 'p06', roles: ['admin', 'usuario'], titulo: 'Confirmar que un Usuario solo consulta', pasos: ['Abre un indicador y entra a un mes.'], esperado: 'El botón dice "Ver", aparece el aviso de rol de consulta y no existe el botón Guardar.' },
  { id: 'p07', roles: ['admin', 'digitador', 'usuario'], titulo: 'Usar la matriz', pasos: ['Abre Matriz.', 'Filtra por un proceso y por "No cumplen meta".', 'Pulsa "Exportar a Excel".'], esperado: 'La tabla se reduce a lo filtrado y se descarga un .xlsx con los mismos colores.' },
  { id: 'p08', roles: ['admin', 'digitador', 'usuario'], titulo: 'Sacar el informe mensual en PDF', pasos: ['Abre Informe mensual y elige un mes con datos.', 'Pulsa "Descargar PDF" y elige "Guardar como PDF".'], esperado: 'El PDF sale en horizontal, con logo, resumen y cada indicador con su causa y su plan, sin menús ni botones.' },
  { id: 'p09', roles: ['admin', 'digitador'], titulo: 'Importar desde Excel', pasos: ['Abre Importar Excel y descarga la plantilla.', 'Llena dos filas bien y una sin plan.', 'Súbela, revisa la vista previa e importa.'], esperado: 'La vista previa marca dos válidas y una con error. Al confirmar se guardan solo las dos válidas.' },
  { id: 'p10', roles: ['admin'], titulo: 'Explorar el Dashboard con filtros', pasos: ['Abre Dashboard.', 'Elige un proceso en el filtro.', 'Cambia "Desde" y "Hasta".', 'En la torta, cambia a "No diligenciados".'], esperado: 'Todo se recalcula, el mapa pasa a mostrar los indicadores del proceso y "Quitar filtros" regresa a la vista completa.' },
  { id: 'p11', roles: ['admin'], titulo: 'Revisar Novedades', pasos: ['Abre Novedades.', 'Filtra por "Críticas".', 'Pulsa "Revisar" en una alerta.'], esperado: 'Se abre el indicador en el mes del problema.' },
  { id: 'p12', roles: ['admin'], titulo: 'Crear un indicador nuevo y darlo de baja', pasos: ['Configuración → Indicadores → "Nuevo indicador".', 'Completa nombre, unidad con % y una meta.', 'Crea y busca el indicador en la Matriz.', 'Vuelve a Configuración y dalo de baja.'], esperado: 'Aparece en la matriz apenas se crea y desaparece al darlo de baja.' },
  { id: 'p13', roles: ['admin'], titulo: 'Probar meta anual y meta mensual', pasos: ['Edita un indicador: pon una meta mensual distinta de la anual y elige "La meta mensual".', 'Abre su ficha.', 'En la gráfica, cambia "Meta en la gráfica" entre mensual y anual.'], esperado: 'La leyenda y las barras azules cambian con la meta elegida y en la matriz la meta que rige aparece subrayada.' },
  { id: 'p14', roles: ['admin'], titulo: 'Reabrir un mes y registrar en él', pasos: ['Configuración → Cierres mensuales → "Reabrir" en un mes cerrado.', 'Pide al digitador (o hazlo tú) que registre un dato en ese mes.', 'Ciérralo de nuevo.'], esperado: 'Mientras está reabierto se puede registrar; al cerrarlo vuelve a bloquearse.' },
  { id: 'p15', roles: ['admin'], titulo: 'Crear un usuario y cambiarle el rol', pasos: ['Configuración → Usuarios → Crear usuario.', 'Escribe un correo, pulsa Generar y elige Digitador.', 'Pulsa Crear usuario y copia los datos de acceso.', 'Entra con esa cuenta en otra ventana.', 'Vuelve y cámbiale el rol a Usuario.'], esperado: 'La cuenta entra de inmediato. Como digitador ve Matriz, Indicadores, Informe, Importar y Ayuda; tras el cambio de rol solo consulta.' },
  { id: 'p16', roles: ['admin'], titulo: 'Comprobar el logo de los correos', pasos: ['Configuración → Notificaciones → "Publicar y comprobar logo".'], esperado: 'Aparece el logo, la etiqueta "Accesible" y el aviso de que se publicaron el logo y 4 iconos.' },
  { id: 'p17', roles: ['admin'], titulo: 'Enviar un correo de prueba', pasos: ['Configuración → Notificaciones.', 'Escribe tu correo y pulsa "Enviar correo de prueba".', 'Ábrelo en el computador y en el celular.'], esperado: 'Llega con logo, firma con el cargo (sin nombre), sin ningún enlace, y se adapta al modo oscuro.' },
  { id: 'p18', roles: ['admin'], titulo: 'Enviar el recordatorio real', pasos: ['Configuración → Notificaciones → "Enviar recordatorio ahora".', 'Confirma el aviso.'], esperado: 'Los involucrados de los procesos con pendientes reciben el correo con la lista de lo que falta. La aplicación te dice a cuántas personas llegó.' },
  { id: 'p19', roles: ['admin'], titulo: 'Comprobar el despertador diario', pasos: ['En GitHub, pestaña Actions → "Correos automáticos de indicadores" → "Run workflow".'], esperado: 'El flujo termina en verde. Si hoy no es día 2, 13 ni 16, no envía nada: eso es lo correcto.' },
  { id: 'p20', roles: ['admin', 'digitador', 'usuario'], titulo: 'Cerrar sesión y entrar con otro rol', pasos: ['Pulsa el botón de salir del menú.', 'Entra con una cuenta de otro rol.'], esperado: 'El menú y las pantallas cambian según el rol de la nueva cuenta.' },
  { id: 'p21', roles: ['admin'], titulo: 'Comprobar el plazo del día 15', pasos: ['Mira la franja de colores de arriba: dice hasta qué día se puede registrar.', 'Configuración → Cierres mensuales: el mes en curso debe aparecer abierto y los anteriores, cerrados.', 'Cuando pase el día 15, vuelve a mirar la franja y esa lista.'], esperado: 'Hasta el 15 inclusive el mes en curso se puede registrar; el 16 aparece cerrado, con candado, y solo un administrador puede reabrirlo.' },
  { id: 'p22', roles: ['admin'], titulo: 'Importar el libro completo', pasos: ['Importar Excel → Libro de indicadores.', 'Elige el libro y espera la vista previa.', 'Revisa el cuadro de metas mensuales y los avisos.', 'Pulsa Importar a la aplicación y confirma.', 'Repite la importación con el mismo libro.'], esperado: 'La primera vez guarda lo que faltaba; la segunda dice «No hay nada que importar».' },
];


/* ---------------------------------------------------------------------------
   Qué ve cada rol
   El administrador ve todo; el digitador y el usuario, solo lo que les toca.
   Donde el texto cambia según quién lee, hay una versión propia para ese rol.
--------------------------------------------------------------------------- */
const TODOS = ['admin', 'digitador', 'usuario'];

const META_LAMINAS = {
  lista: { roles: TODOS, porRol: { usuario: {
    resumen: 'La pantalla donde consultas el estado del mes en los 9 procesos y ves qué indicadores ya tienen dato.',
    pasos: [
      'A la izquierda ves el avance del mes (cuántos indicadores ya se diligenciaron, cuántos cumplen, cuántos no y cuántos faltan) y, al lado, el mes dibujado como un plano: un lote por proceso y una casilla por indicador.',
      'Cada proceso es una franja que se despliega. Su color lateral es el de su categoría en el Excel.',
      'Cada indicador tiene su "cinta del año": 12 casillas, una por mes. Verde cumple, vino no cumple, rayado rosa venció sin registrar, gris está por registrar.',
      'Haz clic en una casilla para ver el detalle de ese mes: valor, análisis, causa y plan de acción.',
      'Con las flechas del recuadro de la izquierda cambias de mes; con el buscador y los filtros encuentras un indicador o solo los que no cumplen.',
    ] } } },
  registro: { roles: ['admin', 'digitador'] },
  metas: { roles: TODOS, porRol: {
    digitador: { titulo: 'Entender la meta de cada indicador', resumen: 'Cada indicador tiene una meta anual y una mensual. Saber cuál rige te dice por qué un mes sale verde o vino.',
      pasos: ['Meta anual: el objetivo del año completo.', 'Meta mensual: el objetivo de cada mes; puede variar mes a mes.', '"Meta que rige": con cuál se mide el cumplimiento. En la matriz aparece subrayada en dorado.', 'En la gráfica de cada indicador puedes comparar con la otra meta, sin cambiar nada.', 'Si una meta te parece incorrecta, avisa al administrador: solo él puede cambiarla.'] },
    usuario: { titulo: 'Entender la meta de cada indicador', resumen: 'Para saber por qué un mes sale verde o vino, mira qué meta rige.',
      pasos: ['Cada indicador tiene una meta anual (todo el año) y una mensual (cada mes).', 'La que rige aparece subrayada en dorado en la matriz.', 'En la gráfica del indicador puedes comparar contra la otra meta o contra el mes o el año anterior.', 'Las metas las define el administrador.'] } } },
  ficha: { roles: TODOS },
  matriz: { roles: TODOS },
  dashboard: { roles: ['admin'] },
  informe: { roles: TODOS },
  excel: { roles: ['admin', 'digitador'], porRol: { digitador: {
    pasos: ['Descarga la plantilla del mes: ya trae los indicadores listados.', 'Complétala: valor, análisis, causa y plan de acción (obligatorio).', 'Súbela. La aplicación revisa fila por fila y marca cada una como lista o con su error.', 'Los errores típicos: falta el plan, el mes está cerrado, el indicador no existe o la fila está repetida.', 'Confirma, y solo se guardan las filas válidas.'] } } },
  cierre: { roles: TODOS, porRol: {
    digitador: { titulo: 'Los meses se cierran solos', resumen: 'Cada mes se cierra en una fecha fija. Después de eso ya no puedes modificarlo.',
      pasos: ['El mes en curso está abierto hasta el día 15.', 'La franja de colores que ves arriba, en todas las pantallas, dice hasta qué día se puede registrar y cuántos días quedan.', 'El mes anterior sigue abierto hasta el día 15 y el 16 se cierra solo.', 'Un mes cerrado no se puede modificar ni a mano ni con Excel. Lo verás con un candado.', 'Si necesitas corregir un mes cerrado, pídele a un administrador que lo reabra.', 'Por eso conviene registrar antes del día 15: los correos del día 2 y del día 13 te lo recuerdan.'] },
    usuario: { titulo: 'Por qué algunos meses tienen candado', resumen: 'Los meses se cierran solos después del día 15 del mismo mes y ya no se modifican.',
      pasos: ['Solo está abierto el mes en curso (hasta el día 15) y los que vienen: los meses que ya pasaron están cerrados.', 'La franja de colores de arriba, en todas las pantallas, te dice hasta qué día se puede registrar.', 'Pasado ese día el mes se cierra y aparece un candado en la cinta.', 'Un mes cerrado que quedó sin dato se ve rayado en rosa: significa que no se diligenció a tiempo.', 'Solo un administrador puede reabrir un mes.'] } } },
  correos: { roles: ['admin', 'digitador'], porRol: { digitador: {
    titulo: 'Los correos que recibirás', resumen: 'Si estás en la lista de un proceso, la aplicación te recuerda sola lo que falta.',
    pasos: ['Día 2 de cada mes: qué indicadores de tu proceso faltan por registrar este mes, con un resumen de cómo va.', 'Día 13 (faltan dos días para el último día): solo llega si todavía hay pendientes.', 'Día 16: el mes se cerró y te cuentan cómo quedó.', 'Los correos no tienen botones ni enlaces a propósito: para registrar, entra a la aplicación escribiendo la dirección.', 'Salen firmados solo con el cargo del Analista de Gestión Integral.'] } } },
  novedades: { roles: ['admin'] },
  roles: { roles: TODOS, porRol: {
    digitador: { titulo: 'Tu rol: Digitador', resumen: 'Registras datos y consultas. No configuras nada.',
      pasos: ['Puedes registrar datos a mano o con Excel, y consultar la matriz, los indicadores y los informes.', 'No ves Dashboard, Novedades ni Configuración: son del administrador.', 'No puedes reabrir meses cerrados ni crear indicadores.', 'Un permiso que no tienes no solo está escondido: la base de datos lo rechaza.', 'Si necesitas otro permiso, pídeselo al administrador.'] },
    usuario: { titulo: 'Tu rol: Usuario', resumen: 'Consultas indicadores, matriz e informes.',
      pasos: ['Puedes ver el estado de los indicadores, la matriz y descargar el informe mensual.', 'No puedes registrar ni modificar datos.', 'Si necesitas registrar, pídele al administrador que te cambie el rol a Digitador.', 'Los permisos los aplica la base de datos, no solo la pantalla.'] } } },
};

/** Láminas del recorrido para un rol, con el texto que le corresponde. */
export function laminasPara(rol) {
  return LAMINAS.filter(l => META_LAMINAS[l.id].roles.includes(rol)).map(l => {
    const o = META_LAMINAS[l.id].porRol?.[rol] || {};
    return { ...l, ...o, roles: META_LAMINAS[l.id].roles };
  });
}

const META_NODOS = {
  registro: { ver: ['admin', 'digitador'] }, excel: { ver: ['admin', 'digitador'] }, config: { ver: ['admin'] },
  plan: { ver: TODOS }, cierre: { ver: TODOS }, bd: { ver: TODOS }, roles: { ver: TODOS },
  indicadores: { ver: TODOS }, matriz: { ver: TODOS }, dashboard: { ver: ['admin'] }, novedades: { ver: ['admin'] },
  informe: { ver: TODOS }, correos: { ver: ['admin', 'digitador'] },
};
const POR_ROL_NODOS = {
  cierre: {
    digitador: { sirve: 'Regla: el mes se cierra solo después del día 15 del mismo mes. Después de eso no puedes modificarlo.', detalle: 'Si necesitas corregir un mes cerrado, un administrador debe reabrirlo. La base de datos lo bloquea, no solo la pantalla.' },
    usuario: { sirve: 'Regla: el mes se cierra solo después del día 15 del mismo mes y ya no se modifica.', detalle: 'Por eso ves un candado en los meses cerrados y rayado rosa en los que quedaron sin dato.' },
  },
  roles: {
    digitador: { sirve: 'Tu rol es Digitador: registras datos y consultas, pero no configuras.', detalle: 'Lo que no puedes hacer no solo está escondido: la base de datos lo rechaza.' },
    usuario: { sirve: 'Tu rol es Usuario: consultas indicadores, matriz e informes.', detalle: 'No puedes registrar ni modificar. Si necesitas hacerlo, pide que te cambien el rol.' },
  },
  correos: { digitador: { sirve: 'Te recuerdan lo que falta registrar: día 2, aviso del día 13 y cierre del día 16.', detalle: 'Los recibes si estás en la lista de involucrados de un proceso. No tienen enlaces: entra a la aplicación escribiendo la dirección.' } },
  bd: {
    digitador: { detalle: 'Es la única fuente de verdad: todas las pantallas leen de aquí, por eso nunca se contradicen. Tú solo puedes escribir registros mensuales.' },
    usuario: { detalle: 'Es la única fuente de verdad: todas las pantallas leen de aquí, por eso nunca se contradicen. Tú solo puedes leer.' },
  },
};

/** Elementos del mapa "todo conectado" que ve un rol, con las conexiones limitadas a lo que puede ver. */
export function nodosPara(rol) {
  const visibles = NODOS.filter(n => META_NODOS[n.id].ver.includes(rol));
  const ids = new Set(visibles.map(n => n.id));
  return visibles.map(n => ({
    ...n, ...(POR_ROL_NODOS[n.id]?.[rol] || {}),
    recibe: n.recibe.filter(x => ids.has(x)), alimenta: n.alimenta.filter(x => ids.has(x)),
  }));
}

export const guiasPara = rol => GUIAS.filter(g => g.roles.includes(rol));
export const faqPara = rol => FAQ.filter(f => f.roles.includes(rol)).map(f => [f.q, f.porRol?.[rol] || f.a]);
export const glosarioPara = rol => GLOSARIO.filter(([t]) => rol === 'admin' || t !== 'Involucrados');
export const pruebasPara = rol => PRUEBAS.filter(p => p.roles.includes(rol));

/** Frase de bienvenida a la guía según quién la lee. */
export const INTRO = {
  admin: 'Aquí está todo: cómo trabaja cada una de las tres personas que usan la aplicación (Usuario, Digitador y Administrador) y cómo la administras tú. Con "Ver la guía como" puedes mirar lo que ve cada rol.',
  digitador: 'Lo que haces tú: registrar los datos de los indicadores (a mano o con Excel), entender las metas y los cierres, y consultar la matriz y los informes.',
  usuario: 'Lo que puedes hacer tú: consultar el estado de los indicadores, la matriz y los informes mensuales.',
};
