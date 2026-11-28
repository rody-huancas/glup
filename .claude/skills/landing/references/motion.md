# Movimiento con GSAP

Parte de `../SKILL.md`, regla 9. GSAP (licencia estándar sin costo, la misma que usa la app) y su
plugin ScrollTrigger. Dos archivos:

- `src/scripts/motion.ts` (lo carga `base-layout.astro`): no importa GSAP. Con movimiento reducido no
  hace nada. Si no, tras `load` y con el navegador libre importa `motion-scenes.ts` y arranca la
  flotación; lo que sigue al scroll (parallax, la escena de comer) espera al primer scroll, toque o
  tecla, porque ScrollTrigger mide toda la página y ese cálculo, al abrir, empeora el rendimiento.
- `src/scripts/motion-scenes.ts`: las escenas, con `startFloating` y `startScrolling`. La primera
  arranca también el héroe: `hero-logo.ts` (el logotipo) y `hero-mascot.ts` (Glup), que devuelven una
  función que quita sus listeners y llamadas pendientes cuando `gsap.matchMedia` revierte. Sus bucles
  esperan mientras el héroe no está en pantalla.

## Carga sin parpadeo

- Un script mínimo en el `<head>` de `base-layout.astro` pone `html.js` y, si no hay movimiento
  reducido, `html.motion`. Con esa clase, `src/styles/motion.css` hace **las entradas en CSS**
  (`@keyframes`, `animation-fill-mode: backwards`) desde el primer dibujo: el logotipo (`logo-fall`,
  letra por letra) y las piezas del héroe marcadas con `data-enter="<orden>"` (`enter-pop`). Nada
  espera a JavaScript, nada se ve, salta y vuelve.
- `backwards` aplica el primer cuadro mientras cada una espera su turno y no deja estilos al terminar:
  después GSAP anima las piezas desde su lugar (los bucles), nunca con un `set` inicial.
- Seguro: `html.motion-on` se pone con el primer `animationstart`; si a los 2,5 s no está, se quita
  `html.motion` y todo aparece quieto.
- Lo que solo prepara GSAP (el globo y las chispas de «Cómo funciona») empieza chico recién con
  `html.motion-scroll`, que pone la escena al prepararse: si GSAP no carga, se ve completo.
- Las animaciones CSS de transformación sobre elementos **dentro** de un SVG no las compone la tarjeta:
  se recalculan en el hilo principal. Una entrada larga o un bucle que corra desde el primer dibujo va
  sobre elementos HTML (o un `<svg>` entero), no sobre un `<g>`.
- Para comprobarlo: grabar los primeros 3 s (opacidad de cada pieza cuadro a cuadro, con la CPU frenada
  4×) y verificar que ninguna se vea y desaparezca; y Lighthouse 95+ en celular con la máquina libre.

## Reglas

- **`gsap.matchMedia()` siempre.** Cada animación se registra dentro de
  `'(prefers-reduced-motion: no-preference)'`; al cambiar la preferencia GSAP revierte solo. Con
  movimiento reducido no se registra nada: el HTML ya está en su estado final y visible.
- **Nada escondido esperando a JavaScript.** Las entradas son CSS (arriba); GSAP nunca hace un `set`
  inicial que mueva o esconda algo que ya se ve. Sin JavaScript, o con movimiento reducido, se ve todo.
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
  | `data-logo`, `data-logo-letter`, `data-logo-throat`, `data-logo-snack` | El logotipo: entrada de las letras, la «u» que se come un archivito cada 6–8 s y la gelatina al pasar el cursor |
  | `data-hero-glup`, `data-glup-art`, `data-glup-eye`, `data-glup-leaf`, `data-glup-cheeks`, `data-glup-mouth="smile"/"open"`, `data-glup-arm`, `data-snack`, `data-hero-bubble` | Glup del héroe (SVG): entra con un rebote (CSS, `glup-enter`), respira, mece la hojita, parpadea, mira al cursor y se come el archivo flotante más cercano |
  | `data-glup-poke` | El botón «Saludar a Glup»: con el cursor o el foco encima, sonrisa grande y saltito; al hacer clic, salta y saluda. `hidden` en el HTML, lo muestra el script solo con movimiento |
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
