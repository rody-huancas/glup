# Movimiento con GSAP

Parte de `../SKILL.md`, regla 9. GSAP (licencia estándar sin costo, la misma que usa la app) y su
plugin ScrollTrigger. Dos archivos:

- `src/scripts/motion.ts` (lo carga `base-layout.astro`): no importa GSAP. Con movimiento reducido no
  hace nada. Si no, tras `load` y con el navegador libre importa `motion-scenes.ts` y arranca la
  flotación; lo que sigue al scroll (parallax, la escena de comer) espera al primer scroll, toque o
  tecla, porque ScrollTrigger mide toda la página y ese cálculo, al abrir, empeora el rendimiento.
- `src/scripts/motion-scenes.ts`: las escenas, con `startFloating` y `startScrolling`.

## Reglas

- **`gsap.matchMedia()` siempre.** Cada animación se registra dentro de
  `'(prefers-reduced-motion: no-preference)'`; al cambiar la preferencia GSAP revierte solo. Con
  movimiento reducido no se registra nada: el HTML ya está en su estado final y visible.
- **Nada escondido por CSS esperando a JavaScript.** Lo que aparece con animación parte visible en
  el HTML y GSAP lo lleva a su punto de inicio (`gsap.from`, `gsap.set` dentro del matchMedia) recién
  cuando la escena se prepara. Sin JavaScript, o con movimiento reducido, se ve todo.
- **Una escena de entrada se reproduce una vez y queda terminada** (`once: true`): nunca se rebobina
  ni vuelve a esconder nada al subir.
- **Solo `transform` y `opacity`.** Nada que cambie el layout (ancho, alto, márgenes), para no
  mover el contenido ni empeorar el rendimiento.
- **Los elementos se marcan con `data-*`**, no con clases de estilo:

  | Atributo | Qué hace |
  | --- | --- |
  | `data-float` | Flota suave (arriba y abajo, un leve giro), sin fin |
  | `data-depth="0.4"` | Parallax: se desplaza con el scroll del héroe, más cuanto mayor es la profundidad |
  | `data-eat-scene` | La escena de «Cómo funciona»: un archivo cae y Glup se lo come |
  | `data-eat-file`, `data-eat-mouth="open"/"smile"`, `data-eat-bubble`, `data-eat-body` | Sus piezas |

- **ScrollTrigger con `scrub`** para el parallax (sigue al scroll) y con `once: true` para la escena
  de comer (se reproduce al entrar y queda terminada).
- **En celular, menos.** Los objetos que sobran en pantallas chicas se ocultan con CSS (`art-extra`),
  así GSAP anima solo lo que se ve.
- Duraciones cortas (0,3–1,2 s) y curvas suaves (`sine.inOut` para flotar, `back.out` para los
  rebotes). Nada que parpadee más de tres veces por segundo.

## Comprobar

- `pnpm web:shots` recorre toda la página antes de la captura completa: ahí se ve todo, con las
  escenas terminadas.
- Con JavaScript desactivado (en Edge: DevTools › Ctrl+Shift+P › «Disable JavaScript») la página se
  ve completa; en celular la barra de abajo es una fila que se desliza (el botón compacto necesita JS:
  `base-layout.astro` marca `<html class="js">`).

## Probar a mano

Con el sistema en movimiento reducido (Windows: Configuración › Accesibilidad › Efectos visuales ›
Efectos de animación apagado) la página debe verse completa y quieta.
