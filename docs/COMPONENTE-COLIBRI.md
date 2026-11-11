# El "bicho" que carga el resumen (antes mariposa, ahora colibrí)

Documento aparte para cuando quieras llevar esta idea a otra aplicación. Explica el concepto, las piezas de código y cómo adaptarlo, sin depender de nada de Supabase ni de este proyecto en particular: es React + CSS puro.

## 1. La idea

Es un **"Resumen vivo"**: una lista de datos a la izquierda y un escenario a la derecha que siempre muestra uno de ellos en grande. Cada pocos segundos (o al tocar una fila), un personaje (antes una mariposa, ahora un colibrí) **vuela desde esa fila hasta el escenario cargando su icono**, lo deja ahí (el escenario cambia de dato) y el icono original reaparece en la fila. Un hilo curvo (una línea SVG) conecta el centro del escenario con el bicho mientras vuela, como si colgara de él.

Archivos involucrados en este proyecto (para que los ubiques si quieres copiarlos):
- `src/components/vida/ResumenVivo.jsx` — toda la lógica y el dibujo del bicho.
- `src/vida.css` — sección "el colibrí y el escenario" (busca `.rv-`, `.m-izq`, `.m-der`, `.colibri`).

## 2. Las tres piezas de la animación

1. **El dibujo (SVG).** El bicho es un `<svg>` con dos grupos, `m-izq` y `m-der` (ala izquierda y derecha), más cuerpo/cabeza/pico/cola. Cada ala tiene su `transform-origin` en el punto donde "nace" del cuerpo, y una animación CSS (`aletea`) que la rota unos grados hacia arriba y abajo sin parar (`infinite alternate`). Cambiar de mariposa a colibrí fue, en el fondo, solo cambiar los `path` del SVG y acortar la duración de `aletea` (una mariposa aletea lento, `.22s`; un colibrí, muy rápido, `.09s`) — la mecánica de vuelo no se tocó.

2. **El vuelo (matemática, no CSS).** La función `mover(destino, duración)` hace una animación manual con `requestAnimationFrame`: en cada cuadro calcula qué tan avanzado va (`k`, de 0 a 1), aplica una curva de aceleración/desaceleración (`ease` cúbico) y le suma un arco hacia arriba (`-Math.sin(k*Math.PI)*36`) para que no vaya en línea recta sino "saltando". Con esa posición llama a `pintar(x, y, giro)`, que mueve el bicho con `transform: translate(...)` y redibuja el hilo curvo con un `path` cuadrático (`Q`) desde el centro del escenario hasta el bicho.

3. **La coreografía (`recorrer`).** Cuando toca cambiar de fila: vuela hasta el icono de esa fila → "lo toma" (lo oculta de la fila y lo muestra pegado al bicho) → vuela hasta el escenario → lo "suelta" (el escenario cambia de dato, con una animación de aparición). Todo con `await` en secuencia, así que no hay que manejar temporizadores sueltos.

## 3. Cómo adaptarlo a otra app (sin Supabase, sin nada de este proyecto)

Necesitas tres cosas, ninguna específica de este sistema:
- Una lista de `items` con `{ id, icono, titulo, valor, texto, tono }` (el `icono` puede ser cualquier cosa: un emoji, una clase de Font Awesome, un SVG propio).
- El componente `ResumenVivo` tal cual, cambiándole el icono de react-icons/Font Awesome que uses por el tuyo.
- El CSS de la sección `.rv-*` (son unas 35 líneas): la lista (`.rv-lista`, `.rv-fila`, `.rv-chip`), el escenario (`.rv-escenario`, `.rv-destacado`, `.rv-slot`) y el bicho (`.rv-bicho`, `.rv-hilo`).

No usa ninguna librería de animación (ni Framer Motion ni GSAP): es `requestAnimationFrame` a mano, así que corre en cualquier proyecto React sin instalar nada nuevo. Si tu otra app no es React, la misma idea funciona en JS puro: lo único que "sabe" de React es el `useState`/`useRef` para guardar la posición; la matemática del vuelo y el dibujo del hilo son agnósticos.

## 4. Qué cambia si quieres otro animal/objeto

- Dale otro `viewBox`/`path` al SVG (puedes copiar cualquier icono de dos "mitades" simétricas: alas, orejas, aletas).
- Ajusta la duración de `aletea` según qué tan rápido "bate" (rápido = insecto/colibrí, lento = ave grande).
- Si no quieres que bata nada (por ejemplo, un cohete o una flecha), simplemente no le pongas la animación `aletea` y el vuelo seguirá funcionando igual.
