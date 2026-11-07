# Indicadores de Gestión · Finca Torremolinos

Aplicación web para el seguimiento mensual del Sistema Integrado de Gestión: 42 indicadores en 9 procesos,
con metas anual y mensual, plan de acción obligatorio, matriz, dashboard, informe mensual en PDF, importación
desde Excel, cierre automático de meses, tres roles y correos automáticos.

> **Dentro de la aplicación está el menú "Cómo se usa"** (al final del menú): un recorrido animado, un mapa de qué se
> conecta con qué, guías paso a paso, glosario, preguntas frecuentes y pruebas guiadas para empezar. **Se adapta a quien
> lo abre**: el Usuario solo ve lo que le toca, el Digitador lo suyo y el Administrador lo ve todo (y puede mirar la
> guía "como" cada rol).

## Cómo se ve
(Los tokens, el movimiento y los estados de cada componente están en `docs/DISENO.md`.)

Sin barra lateral: arriba, una franja verde con la navegación; debajo, **la franja del plazo**, una regla con los 12 meses y la
cuenta regresiva hacia el último día para registrar. Cada pantalla trae un *cajetín* a la izquierda (título, controles y cifras
principales), como el recuadro de título de un plano. Indicadores dibuja el mes como un plano (un lote por proceso, una casilla por
indicador) y el Dashboard abre con el mapa del año. Tipografías: Big Shoulders Display y Source Sans 3 (se instalan con
`npm install`, no dependen de internet). Colores de la marca: verde, crema, dorado y vino.

## Cargar los datos desde el Excel original
**Importar Excel → Libro de indicadores** (solo administradores) lee el libro «Indicadores de Gestión» tal como está: la hoja
«Indicadores» (catálogo) y una hoja por indicador (meta mensual, valor de cada mes, análisis y plan de acción).

- **No guarda nada hasta que confirmas.** Primero compara con lo que ya hay y muestra qué cambiaría, indicador por indicador.
- **Seguro de repetir.** El modo «Completar» (por defecto) agrega lo que falta y llena lo vacío sin pisar nada; «Reemplazar» deja que el libro mande.
- **Ceros de relleno.** El libro rellena con 0 los meses que aún no se reportan. Un mes cuenta como reportado si tiene valor y
  (el valor no es cero, o ese mes tiene análisis o plan escritos). Un 0 sin texto se ignora.
- **Meta mensual.** La fila «Mínimos» de cada hoja es la meta mensual. Si difiere de la anual, el indicador pasa a evaluarse contra ella,
  como en el libro. La vista previa muestra cuántos meses cambian de estado antes de importar.
- **Meses sin plan.** Lo que el libro trae sin plan de acción se guarda con la marca `historico` (exenta de la regla «plan obligatorio»,
  que sigue vigente para todo lo que se registre desde la aplicación) y se cuenta como «sin plan» en el Dashboard.
- **Quién escribe.** La función `functions/api/importar-libro.js` (solo administradores) valida todo y es la única que usa la llave de servicio.
- Se pueden corregir erratas del libro sin romperlo: por ejemplo, una hoja que dice «Adquisión…» se une con «Adquisición…» y se avisa.

## Qué trae esta versión
- **Matriz idéntica al Excel** (encabezado, columnas, versión) con descarga en ese formato, y el seguimiento mes a mes en la otra pestaña.
- **Forma de cálculo por indicador**: unos se digitan y otros salen de dos números (ejecutadas ÷ planeadas, numerador ÷ denominador, reducción frente al año anterior).
- **Importación del libro de Excel completo** con vista previa, modos «completar» y «reemplazar», meta mensual y corrección de las fórmulas del libro que están mal.
- **Auditoría** (solo administradores): quién cambió qué con el antes y el después, quién entra y sale, quién está en línea, y el espacio de la base de datos con su estimación.
- **Meses cerrados**: no se pueden cambiar, borrar ni mover (lo hace cumplir la base de datos); solo un administrador los reabre.
- **Nombre de usuario** editable, **buscador** con Ctrl K y una bienvenida compacta.
- El diseño está documentado en `docs/DISENO.md`.

## Orden del menú
Dashboard (solo administrador) · Matriz · Indicadores · Informe mensual · Importar Excel (digitador y administrador) ·
Novedades y Configuración (solo administrador) · **Cómo se usa** (al final). Al entrar, el administrador aterriza en el
Dashboard y los demás en la Matriz.

## Qué es cada pieza

| Pieza | Para qué sirve | Dónde vive |
|---|---|---|
| La aplicación (React + Vite) | Las pantallas | Cloudflare Pages |
| Supabase | Datos, inicio de sesión, permisos por rol y logo de los correos | supabase.com |
| Funciones (`functions/api/`) | Envían los correos, cierran el mes el día 16 (después del 15) y crean usuarios (solo administradores) | Cloudflare Pages Functions |
| Brevo | Entrega los correos | brevo.com |
| GitHub Actions (`.github/workflows/`) | Despierta la función todos los días a las 8:00 a.m. (Colombia) | GitHub |

## Roles

| Rol | Puede |
|---|---|
| Administrador | Todo: configurar, crear indicadores, cerrar/reabrir meses, usuarios, dashboard, novedades, correos |
| Digitador | Registrar datos (a mano o con Excel) y consultar matriz e informes |
| Usuario | Solo consultar indicadores, matriz e informes |

Los permisos los aplica **la base de datos** (políticas RLS), no solo la pantalla. Una cuenta sin fila en
`indicadores_usuarios` se trata como Usuario.

## Puesta en marcha (para empezar a probar)

### 1. Base de datos
En Supabase → SQL Editor ejecuta **`supabase/schema.sql` completo**. Es seguro repetirlo y ya incluye todo:
catálogo, 248 registros históricos, roles, permisos, plan obligatorio y cierre automático.

Si ya tenías una versión anterior instalada, ejecuta solo **`supabase/migracion_roles_y_metas.sql`**.

### 2. Tu primer administrador
Authentication → Users → *Add user* (correo y contraseña). Luego, en el SQL Editor:
```sql
insert into indicadores_usuarios (user_id, email, rol)
select id, email, 'admin' from auth.users where email = 'TU-CORREO'
on conflict (user_id) do update set rol = 'admin';
```
Las demás personas las crea un administrador desde la propia aplicación: **Configuración → Usuarios → Crear usuario** (correo, contraseña temporal y rol). Ahí mismo cambia roles, pone contraseñas nuevas y quita accesos. Cada persona cambia su contraseña desde su nombre, arriba a la derecha.

### 3. Probar en tu computador
```bash
npm install
cp .env.example .env.local        # y pon VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev                       # la interfaz, en http://localhost:5173
```
Para probar también los correos: copia `.dev.vars.example` a `.dev.vars`, complétalo y usa `npm run preview:api`.
(En `npm run dev` las funciones de correo no existen: es lo normal.)

### 4. Publicar
Sube el proyecto a GitHub y conéctalo a Cloudflare Pages (comando de compilación `npm run build`, carpeta `dist`).
En Cloudflare → Settings → Environment variables:

| Variable | Qué es |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Conexión de la aplicación (públicas) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Conexión de la función de correos (**la llave service role es secreta**) |
| `PROVEEDOR_CORREO` | `brevo` |
| `BREVO_API_KEY` | Llave de Brevo |
| `CORREO_REMITENTE` | `Indicadores Torremolinos <torremolinosfinca@gmail.com>` (verificado en Brevo) |
| `CRON_SECRET` | Una clave larga inventada por ti |
| `URL_PUBLICA` | La dirección pública de la aplicación |

### 5. Correos automáticos
En GitHub → Settings → Secrets and variables → Actions crea `APP_URL` y `CRON_SECRET` (la misma de Cloudflare).
Desde ahí el flujo `correos-automaticos.yml` corre cada día a las 8:00 a.m. y la función decide sola:
- **Día 2**: recordatorio a TODOS los procesos, con un resumen de cómo cerró el mes anterior (cumplieron, no llegaron, sin registrar).
- **Día 13**: aviso de 2 días (antes del último día para registrar) solo a quienes tienen pendientes.
- **Día 16**: se cierra el mes (se pudo registrar hasta el 15) y se avisa a todos.

Es robusto: si el despertador falla un día, la función **recupera** el envío al día siguiente (una sola vez al mes), y un mes
que un administrador reabrió **no se vuelve a cerrar solo**. Cada llamada deja un "latido" que se ve en
Configuración → Notificaciones → *Envío automático* (estado del despertador, último envío y próximas fechas).
Para comprobarlo: pestaña Actions → *Run workflow*.

## Reglas de negocio que conviene saber
- **Plan de acción obligatorio** en cada dato, aunque el indicador cumpla (pantalla, importación y base de datos).
- Un mes se puede registrar hasta el **día 15 del mes siguiente** (inclusive; es configurable) y **el 16 se cierra solo**. Lo aplica la base de datos; solo un administrador lo reabre.
- Hay **dos tipos de incumplimiento**: no llegar a la meta y no diligenciar. Se miden por separado.
- Meta anual y mensual son independientes; "Meta que rige" decide con cuál se calcula el cumplimiento.
- Los correos salen firmados **solo con el cargo**, sin nombre de persona, y **sin enlaces** a propósito.
- Los indicadores en % se escriben como 95 (= 95 %). En la importación, un número menor a 2 se toma como fracción.

## Estructura
```
src/pages/        Indicadores, Ficha, Matriz, Informe, Importar, Dashboard, Novedades, Configuración, Cómo se usa
src/components/   Armazón, diálogos, gráficas y la ayuda (src/components/ayuda/)
src/lib/          Reglas de cálculo, acceso a datos, importación desde Excel
functions/api/    Función de correos y sus plantillas
supabase/         schema.sql (instalación completa) y migracion_roles_y_metas.sql
.github/workflows Despertador diario de los correos
```
El texto de la pantalla "Cómo se usa" vive en `src/components/ayuda/contenido.js`: si cambias una regla, cámbialo ahí.

## Seguridad
- `.env`, `.env.local` y `.dev.vars` **no se suben a GitHub**.
- La llave `service role` y la de Brevo solo existen en el servidor; la pantalla nunca las ve.
- Activa la verificación en dos pasos en Supabase, Brevo, GitHub y Cloudflare.
