# Diseño del Sistema de Gestión: el plano de campo

Documento de entrega para quien mantenga la interfaz. Cubre el concepto, los *tokens*, el movimiento, los componentes y sus estados, la accesibilidad verificada y las reglas de redacción. Todo vive en `src/plano.css` (tokens y componentes) y `src/components/`.

## 1. Concepto

Una finca de rosas se gestiona sobre un plano de lotes y camas, y los indicadores son una matriz de procesos por meses. Por eso el dato se dibuja como el plano de la finca y no como tarjetas de panel genérico.

- **Franja superior** con la navegación (sin barra lateral) y, debajo, **la franja del plazo**: una regla de 12 meses con la cuenta regresiva hacia el último día para registrar. Es lo que más importa de este trabajo: cada mes se cierra.
- **Cajetín** a la izquierda de cada pantalla (como el recuadro de título de un plano): título, controles y cifras principales.
- **Piezas memorables:** el mapa del mes (un lote por proceso, una casilla por indicador), el mapa del año y la Matriz idéntica al Excel.

## 2. Tokens

| Token | Valor | Uso |
|---|---|---|
| `--f-900` / `--f-800` | `#0F3D22` / `#166534` | Estructura, títulos, acción primaria |
| `--canvas` | `#F5F4EF` | Fondo (crema de la marca) |
| `--gold` / `--gold-ink` | `#C9932B` / `#7E5C0F` | Plazo y atención. **Para texto se usa `--gold-ink`**: el dorado sobre blanco no llega a 4,5:1 |
| `--wine` | `#A91D3A` | No cumple, error |
| `--ink-2` / `--ink-3` | `#414945` / `#59615C` | Texto secundario (cumplen AA sobre el crema) |
| `--display` | Big Shoulders Display | Títulos y cifras grandes (condensada, de rotulado) |
| `--texto` | Atkinson Hyperlegible Next | Texto corrido y tablas (diseñada para leer datos) |
| `--r-1/2/3` | 2 / 3 / 4 px | Formas casi rectas |
| `--mast-h` | 60 px | Alto de la barra superior |
| `--lado` | 264 px | Ancho del cajetín |

Escala de la cifra principal del cajetín por altura de pantalla: 112 px (>900), 84 (≤900), 56 (≤780), 44 (≤700). Con menos de 600 px de alto el cajetín se desplaza por dentro.

## 3. Movimiento

| Token | Valor | Uso |
|---|---|---|
| `--mov-rapido` | 150 ms | Respuesta a un toque (hover, pulsar) |
| `--mov-medio` | 450 ms | Cambios de lugar (marcador de la barra, barras que crecen) |
| `--mov-lento` | 800 ms | Llegada de una pantalla (título) |
| `--curva` | `cubic-bezier(.2,.8,.2,1)` | Salida suave |
| `--curva-resorte` | `cubic-bezier(.3,1.25,.4,1)` | Rebote leve (marcador, casillas) |

Qué se mueve y por qué:

- **Marcador dorado** de la barra: se desliza a la sección activa (orienta).
- **Línea de progreso** bajo la barra al cambiar de pantalla (confirma que algo pasa).
- **Llegada escalonada**: primero el título del cajetín y luego cada pieza, una tras otra, máximo 7 retardos.
- **Siembra** de casillas del mapa del mes y del año, en diagonal (es el momento memorable de la pantalla).
- **Meses de la franja** se llenan de izquierda a derecha al abrir.
- **Barras** de espacio y de reparto crecen desde la izquierda.

Todo se apaga con *reducir movimiento* (`prefers-reduced-motion`): animaciones y transiciones quedan a 0,01 ms.

## 4. Componentes y estados

- **Botones**: primario (verde sólido), secundario (contorno). Estados: normal, hover, activo (escala .97), foco (anillo dorado de 3 px), deshabilitado.
- **Campos**: borde de 2 px; foco con anillo dorado; error con `role="alert"` y texto que dice qué pasó, por qué y cómo arreglarlo.
- **Mapa del mes** (`MapaMes`): casilla = cumple (verde), no alcanzó (vino), por registrar (vacía), venció sin registrar (rayada), sin meta (dorada). Cada casilla es un botón con nombre accesible.
- **Franja del plazo** (`FranjaPlazo`): abierto (dorado), urgente (vino, quedan 2 días o menos), cerrado (gris), reabierto (verde claro).
- **Paleta de búsqueda** (`Paleta`): patrón *combobox* + *listbox*; el foco se queda en el campo y la opción activa se anuncia (`aria-activedescendant`). Abre con Ctrl/⌘ K o «/».
- **Mes cerrado**: título con candado, aviso con el porqué y quién puede reabrirlo, campos de solo lectura. El administrador ve «Reabrir este mes».
- **Registro por componentes**: dos números con los nombres del indicador y un resultado que se calcula a la vista, con *aria-live* y si cumple la meta.
- **Bitácora**: lista de eventos con «Ver los cambios» (antes y después), accesos en línea, y espacio con barra y estimación.

Vacío, carga y error siempre existen: esqueleto con brillo mientras carga (`Cargando`), estado vacío que explica cómo empezar, y alerta con la causa.

## 5. Accesibilidad verificada

- Bitácora automática con **axe-core (WCAG 2.0/2.1 A y AA)**: 0 violaciones en las pantallas principales de escritorio, en celular, en los cuadros de diálogo, con el menú abierto y con el rol de solo consulta.
- Contraste: textos secundarios y rol dorado sobre verde corregidos; el dorado en texto usa `--gold-ink`.
- Teclado: enlace «Saltar al contenido», tablas con desplazamiento enfocables, buscador completo con teclado, cuadros de diálogo con foco atrapado y devuelto.
- Zoom: la bienvenida y el cajetín se prueban del 100 % al 400 %; la bienvenida siempre cabe y sus botones quedan a la vista.
- Objetivos táctiles de 44 px en el celular. Nombres accesibles que contienen su texto visible.
- **Lo que una prueba automática no cubre** (aproximadamente 30 % de los problemas): falta una revisión con lector de pantalla real (NVDA o VoiceOver).

## 6. Crítica de diseño (marco *design-critique*)

**Lo que funciona:** la identidad es inconfundible; la franja del plazo da contexto en todas las pantallas; el cajetín deja el centro libre para el dato; la Matriz es idéntica a lo que la gente ya conoce del Excel.

**Lo que se encontró y se corrigió:** barra superior apretada con 9 secciones (se compacta por tramos y pasa a barra inferior desde 1100 px); títulos largos desbordando el cajetín; cajetín del Dashboard más alto que la pantalla (cifras por tramos de altura); botón «Editar» en meses cerrados (ahora «Ver» con candado); bienvenida de 12 láminas que no cabía con zoom (ahora una tarjeta corta).

**Pendiente:** revisión con lector de pantalla; prueba con usuarios reales del equipo de la finca.

## 7. Redacción (marco *ux-copy*)

- Los errores dicen **qué pasó, por qué y cómo arreglarlo**: «Planeadas debe ser mayor que cero para poder dividir».
- Los botones empiezan con un verbo y dicen el resultado: «Reabrir el mes», «Quitar acceso», «Guardar nombre».
- Las confirmaciones nombran la consecuencia: «Se podrá volver a registrar y editar este mes… Queda anotado quién lo reabrió».
- Los vacíos explican cómo empezar: «Cuando alguien registre un dato… aparecerá aquí con su nombre y la hora».
- Mismo término para la misma cosa: «mes cerrado», «último día para registrar», «plan de acción».

## 8. Casos límite

Nombres de proceso e indicador largos (se parten, no se cortan); mes con datos pero sin plan (histórico); indicador sin meta numérica (se registra pero no se evalúa); división por cero al calcular (se explica); límite de almacenamiento personalizable; presencia sin cierre de sesión (se ve la última actividad).
