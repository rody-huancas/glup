---
name: isla-y-mascota
description: Reglas de la isla de Glup (la pastilla del borde superior que se despliega en el panel) y de la mascota animada - máquina de estados de la isla, región visible y clicable de la ventana, foco, pantalla completa, avisos de tareas, animaciones con GSAP, forma con orejas en SVG, piezas de la mascota (cuerpo, ojos, bocas, brazos, patitas), estados de Glup y movimiento reducido. Úsala al tocar modules/island, modules/mascot, services/island_window.rs, island_watchdog.rs, fullscreen_watcher.rs o cualquier animación - «la isla no aparece», «cambia la animación», «nuevo gesto de Glup», «se queda trabada». Va junto con convenciones, desktop-ui y tauri-rust.
---

# La isla y Glup

## La isla

Glup vive en una ventana transparente, siempre encima y sin ícono en la barra de tareas, centrada en
el borde superior del monitor principal. **Nunca hay dos Glup abiertos**: con
`tauri-plugin-single-instance`, abrirlo otra vez (acceso directo, menú Inicio) no lanza otro; el que
ya está despliega la isla fijada, como «Abrir Glup» de la bandeja. La ventana tiene un tamaño fijo (el del pico de la
animación) y **una región de Windows recorta lo visible y clicable** al tamaño del estado actual, para
que los clics alrededor lleguen a las apps de abajo.

### Máquina de estados

La isla es una **máquina de estados pura** (`modules/island/utils/islandMachine.ts`), con fases
`collapsed`, `expanding`, `expanded`, `collapsing`, `notice` y `hidden`, y eventos tipados. `useIsland`
solo traduce cada fase en animación, región y foco.

- Todo cambio de comportamiento empieza en la máquina, con su prueba en
  `islandMachine.test.ts`. Nada de banderas sueltas en componentes.
- **Invariantes** (`checkInvariants`), que ningún cambio puede romper:
  - fuera de `hidden`, la región visible incluye siempre la pastilla y la ventana es visible;
  - `hidden` solo por pantalla completa o por la bandeja;
  - el aviso (`notice`) solo existe con la pastilla ancha;
  - fijada solo estando abierta.
- Los temporizadores (abrir, recoger) usan callbacks estables: un render no los reinicia.
- **Vigilantes** cada 2 s (Rust y frontend) corrigen si el estado y la ventana real no coinciden, y
  lo anotan en el log (`[glup:isla]`, `[glup:vigilante]` en modo dev).
- «Mostrar/Ocultar Glup» y «Abrir Glup» de la bandeja siempre devuelven una isla funcional.

### Comportamiento

| Situación | Qué pasa |
| --- | --- |
| Cursor sobre la pastilla 120 ms | Se infla y se despliega el panel |
| Archivo arrastrado hacia la pastilla | Se despliega al instante, zona de soltar en mint |
| Cursor fuera del panel 350 ms | Se recoge, aunque haya una tarea en curso (la pastilla muestra su progreso) |
| La persona está en medio de algo | No se recoge al salir el cursor: fijada, archivo arrastrándose encima, paso con lista o cuadrícula (ordenar, páginas, formato, nivel), pantalla de firma o un diálogo abierto (confirmación de Limpieza, crear firma, selector de archivos o carpetas) |
| Recoger o Esc | Se recoge con despedida de Glup |
| Tarea termina con la isla recogida | Aviso ancho 4 s con el resultado |
| Pantalla completa en el monitor principal | `hidden` |

- Lo que la mantiene abierta lo decide la máquina: `isHeldOpen` (fijada o algún `HoldReason`:
  `drag`, `step`, `sign` (una pantalla entera: Firmar u Organizar páginas), `dialog`), que `useIsland`
  le envía con el evento `holds`. Un diálogo nuevo
  la retiene con `useIslandHold(abierto)` o `holdWhile(...)` para los selectores nativos. Que Glup
  coma o trabaje **no** la retiene.
- Recoger **no** reinicia la navegación ni el estado de las secciones. Una selección de archivos con
  sus acciones a la vista (sin ejecutar) queda **pendiente**: la pastilla recogida muestra un puntito
  lila y, al abrir, Inicio la muestra tal como estaba. Se descarta solo al cerrarla (x o «Volver»), al
  soltar otros archivos o a los 10 minutos con la isla recogida.

### Arranque y bienvenida

- **Inicio con Windows** (`tauri-plugin-autostart`, opción en Ajustes › General y casilla en la
  bandeja, siempre con el estado real del sistema): Windows lo abre con `--autostart` y Glup arranca
  como la pastilla recogida, sin desplegarse ni hacer ruido.
- **Abierto a mano** (menú Inicio, acceso directo, sin `--autostart`; `useLaunchOpen`): la isla se
  despliega fijada al arrancar, como «Abrir Glup», para que se note que se abrió. Lo decide Rust una
  sola vez por proceso (`take_launch_open` devuelve true solo la primera vez): el webview puede
  recargarse (Vite en dev, una recuperación) y el frontend nunca decide por su cuenta que es el arranque.
  **En desarrollo** (`debug_assertions`) no se despliega al arrancar, porque cada recompilación de
  Rust reinicia el proceso y la isla se abriría fijada sola: `take_launch_open` devuelve false salvo
  con la variable de entorno `GLUP_LAUNCH_OPEN=1`, para probarlo a propósito. En release no cambia.
- **Instancia única:** solo despliega cuando de verdad se intenta abrir otro Glup, y no si ese segundo
  arranque trae `--autostart`.
- **Bienvenida, solo la primera vez** (sin `settings.json` previo y sin `--autostart`; lo decide
  `shouldShowWelcome` en `modules/welcome/utils/welcome.ts`): la isla se despliega sola y una pantalla
  cubre el panel con Glup grande saludando, «¡Hola! Soy Glup.» y la pregunta «¿Quieres que esté
  siempre a mano?». «Sí, abrir al encender» o «Ahora no» guardan la elección (`welcomeSeen` en
  `settings.json`), activan o no el inicio automático y llevan a Inicio. Mientras está a la vista
  cuenta como paso (`step`): no se recoge sola. Un `settings.json` de antes cuenta como bienvenida
  vista.

### Pantalla al desplegar

La decide `pickOpenPage` (`modules/tasks/utils/taskOwner.ts`, con pruebas), en este orden:

1. Un archivo arrastrándose: Inicio (es donde se suelta).
2. Una tarea terminada con la isla recogida y sin ver: su pantalla dueña (la más reciente).
3. Una selección de archivos pendiente: Inicio, con esos archivos y sus acciones.
4. Una tarea en curso: la pantalla dueña de la más reciente, con su progreso.
5. Si no, la última sección en la que estaba la persona, con su estado; si se recogió hace más de
   10 minutos (`ISLAND_TIMING.lastPageLifetime`), Inicio.

Cada tarea declara su pantalla dueña (`owner`) al encolarse, y cada pantalla muestra solo sus tareas
(`tasksForPage`).

- **Foco**: `focus: true` en la ventana (sin eso, el drop de archivos no funciona en WebView2). La
  isla no le quita el foco a la app activa al aparecer; lo toma solo con un clic dentro o con acciones
  visibles (para Esc).
- **Forma**: un path SVG generado por `buildIslandPath({ width, height, earRadius, bottomRadius })`,
  con orejas cóncavas arriba que la unen al borde de la pantalla. El mismo path rellena y recorta.

## Animaciones

- **GSAP** (`gsap`, `@gsap/react`, plugin `Flip`) para abrir, cerrar, el aviso y el vuelo de Glup
  entre la pastilla y el avatar. Apertura tipo burbuja (anticipación + expansión elástica) y cierre
  con temblor de asentamiento.
- Toda animación **se puede interrumpir**: se invierte desde donde está, sin saltos. La región nunca
  se reduce mientras quede algo visible del panel.
- Duraciones, curvas y tamaños en `constants/` (`islandTimeline.ts`, `islandShape.ts`,
  `islandMascot.ts`, `limbs.ts`). Ningún número mágico dentro de un hook.
- `prefers-reduced-motion`: solo fundidos cortos y cambios de cara; sin vuelos, rebotes ni gestos.

## Glup

Glup es **una sola instancia** que se usa en la pastilla, el avatar del menú y la zona de soltar. Se
arma con piezas PNG apiladas y posicionadas en porcentajes según `constants/layout.ts`:

- **Detrás del cuerpo**: brazos (`arm-left`, `arm-right`, `arm-wave` al saludar) y patitas, cada uno
  con su `pivot` para girar.
- **Cuerpo** sin cara, brazos ni patitas.
- **Delante**: ojos (abiertos y felices) y bocas (sonrisa, abierta, «o», línea, ondulada).

### Estados

| Estado | Cara y gestos |
| --- | --- |
| `idle` | Respira, parpadea al azar, sigue el cursor con los ojos, golpecito de patita |
| `alert` | Boca «o», ojos grandes, se frota las manitos |
| `eating` | Boca abierta, brazos a la boca, traga con squash and stretch |
| `working` | Boca línea, mira abajo, se balancea, brazos y patitas alternados |
| `happy` | Ojos felices, boca abierta, salta celebrando |
| `confused` | Boca ondulada, se inclina, se rasca la cabeza |

- Gestos especiales: saluda al abrir la isla, se despide al cerrarla a propósito, señala «Elegir
  archivos» y hace animaciones de espera (mirar a los lados, balancearse, estirarse, zapatear).
- Un gesto nuevo se agrega en el hook de su grupo (`useMascotLimbs`, `useIslandMascot`), con sus
  tiempos en `constants/` y su versión para movimiento reducido.
- En la pastilla no se animan brazos ni patitas: no se ven.

### Piezas nuevas

Las piezas salen del diseño original (estilo 3D suave, menta y lila). Una pieza nueva:

1. Se genera con fondo transparente real, a la misma escala que el personaje.
2. Se recorta y se ubica comparándola con el cuerpo, y su posición (`x`, `y`, `w` en %, `layer`,
   `pivot`) se agrega a `constants/layout.ts`.
3. Se verifica que encaje en los tres tamaños (pastilla, avatar y zona de soltar).

## Checklist

- [ ] El cambio de comportamiento está en la máquina de estados, con prueba.
- [ ] Las invariantes se siguen cumpliendo.
- [ ] Animación interrumpible y con versión de movimiento reducido.
- [ ] Tiempos y tamaños en `constants/`.
- [ ] Probado a mano: hover, arrastrar un archivo, recoger a mitad, pantalla completa y bandeja.
