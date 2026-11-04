# Indicadores de Gestión · Finca Torremolinos

Aplicación web para el seguimiento mensual del Sistema Integrado de Gestión: 42 indicadores en 9 procesos,
con metas anual y mensual, plan de acción obligatorio, matriz, dashboard, informe mensual en PDF, importación
desde Excel, cierre automático de meses, tres roles y correos automáticos.

> **Dentro de la aplicación está el menú "Cómo se usa"** (al final del menú): un recorrido animado, un mapa de qué se
> conecta con qué, guías paso a paso, glosario, preguntas frecuentes y pruebas guiadas para empezar. **Se adapta a quien
> lo abre**: el Usuario solo ve lo que le toca, el Digitador lo suyo y el Administrador lo ve todo (y puede mirar la
> guía "como" cada rol).

## Orden del menú
Dashboard (solo administrador) · Matriz · Indicadores · Informe mensual · Importar Excel (digitador y administrador) ·
Novedades y Configuración (solo administrador) · **Cómo se usa** (al final). Al entrar, el administrador aterriza en el
Dashboard y los demás en la Matriz.

## Qué es cada pieza

| Pieza | Para qué sirve | Dónde vive |
|---|---|---|
| La aplicación (React + Vite) | Las pantallas | Cloudflare Pages |
| Supabase | Datos, inicio de sesión, permisos por rol y logo de los correos | supabase.com |
| Función de correos (`functions/api/`) | Arma y envía los correos, cierra el mes el día 12 | Cloudflare Pages Functions |
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
Las demás personas se crean igual y su rol se cambia desde Configuración → Usuarios.

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
- **Día 10**: aviso de 2 días solo a quienes tienen pendientes.
- **Día 12**: se cierra el mes y se avisa a todos.

Es robusto: si el despertador falla un día, la función **recupera** el envío al día siguiente (una sola vez al mes), y un mes
que un administrador reabrió **no se vuelve a cerrar solo**. Cada llamada deja un "latido" que se ve en
Configuración → Notificaciones → *Envío automático* (estado del despertador, último envío y próximas fechas).
Para comprobarlo: pestaña Actions → *Run workflow*.

## Reglas de negocio que conviene saber
- **Plan de acción obligatorio** en cada dato, aunque el indicador cumpla (pantalla, importación y base de datos).
- Un mes se cierra solo el **día 12 del mes siguiente** (configurable). Lo aplica la base de datos; solo un administrador lo reabre.
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
