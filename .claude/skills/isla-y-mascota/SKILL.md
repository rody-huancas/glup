---
name: isla-y-mascota
description: Reglas de la isla de Glup (la pastilla pegada a un borde o una esquina de la pantalla que se despliega en el panel) y de la mascota animada - máquina de estados de la isla, posición en cualquier borde (modules/dock), región visible y clicable de la ventana, foco, pantalla completa, avisos de tareas, animaciones con GSAP, forma con orejas en SVG, piezas de la mascota (cuerpo, ojos, bocas, brazos, patitas), estados de Glup y movimiento reducido. Úsala al tocar modules/island, modules/mascot, services/island_window.rs, island_watchdog.rs, fullscreen_watcher.rs o cualquier animación - «la isla no aparece», «cambia la animación», «nuevo gesto de Glup», «se queda trabada». Va junto con convenciones, desktop-ui y tauri-rust.
---

# La isla y Glup

## La isla

Glup vive en una ventana transparente, siempre encima y sin ícono en la barra de tareas, pegada a un
borde o una esquina de una pantalla (por defecto, arriba al centro de la principal; ver «Posición») o
flotando como burbuja (ver «Modo burbuja»).
**Nunca hay dos Glup abiertos**: con `tauri-plugin-single-instance`, abrirlo otra vez (acceso directo,
menú Inicio) no lanza otro; el que ya está despliega la isla fijada, como «Abrir Glup» de la bandeja.
La ventana tiene el tamaño del pico de la animación para su borde y **una región de Windows recorta lo
visible y clicable** al estado actual, para que los clics alrededor lleguen a las apps de abajo.

### Posición (modules/dock)

- **Dónde**: arriba, abajo, izquierda, derecha o una esquina, en cualquier punto del borde. Se guarda en
  `settings.json` como `islandDock` (borde + posición relativa 0–1 + pantalla). Todo lo que decide es
  puro y con pruebas en `modules/dock/utils/`:
  - `placeIsland`: dónde va la ventana (en el **área de trabajo**, así nunca queda bajo la barra de
    tareas) y dónde se dibuja la isla dentro de ella. Arriba al centro da la ventana de siempre
    (1200 × 720) y sus regiones.
  - `dockShape` y las formas de `DOCK_SHAPES`: pastilla acostada arriba y abajo, de pie a los lados,
    apoyada en dos bordes en las esquinas. El panel abierto mide siempre 1040 × 640 y **se abre hacia el
    centro**: si la pastilla está cerca de una punta, el panel se corre (`shift`) para no salirse.
  - `dockGeometry`: los paths se arman en los términos del borde (a lo largo y hacia adentro) y se
    pasan a la ventana sin rotaciones CSS: **Glup y el panel siempre derechos**. Un espejo invierte el
    giro de los arcos.
  - `dockLayout`: la región de cada momento (`dockRegion`), la caja del contenido y dónde van Glup, el
    aviso, el puntito y la barra de progreso.
  - `snapDock` (el borde o la esquina más cercana al cursor, en la pantalla bajo él) y `resolveDock`
    (una pantalla que ya no está deja la isla en la principal, mismo borde y misma posición relativa).
- **Arrastrar**: mantener presionada la pastilla recogida y mover (`useIslandDragGesture`, desde
  `DRAG_THRESHOLD` px o al salir de la pastilla con el botón apretado). Desde ahí Rust sigue el cursor
  (`island_drag.rs`, evento `island-drag`) y la ventana se mueve al borde donde quedaría, con un halo
  suave como guía; al soltar se guarda. Un clic sin mover sigue abriendo la isla.
- **Rust** solo da las pantallas con su área de trabajo (`get_island_screens`) y pone la ventana donde
  se le pide (`set_island_frame`, que recuerda el marco para los vigilantes y para «Mostrar Glup»). La
  región es un rectángulo de la ventana (`set_island_area`), no un tamaño centrado.
- Las pantallas se vuelven a leer cada 2 s: si una se desconecta o cambia la resolución, la isla se
  acomoda sola. La pantalla completa que la oculta es la de **su** pantalla.
- Ajustes › General › «Posición de Glup» (`DockPositionSetting`): un dibujo de la pantalla para elegir
  con un clic (o con sus ocho botones), la pantalla si hay varias y «Volver arriba al centro».
- La posición no asume «arriba al centro» en ningún lado: la burbuja es otro `DockKind` (`'bubble'`) y
  otra forma de reposo de la misma máquina.

### Modo oculto

- Ajustes › General › «Cómo se muestra»: «Isla» (como siempre), «Oculta» o «Burbuja» (`islandRest` en
  `settings.json`: `pill`, `hidden`, `bubble`), en cualquier borde o esquina. La máquina lo sabe como su
  **forma de reposo** (`rest`): la fase de reposo sigue siendo `collapsed` y `hidden` sigue siendo solo
  la ventana oculta (pantalla completa, bandeja, captura). Cambiar de forma descarta el aviso y el
  arrastre de la forma anterior; el panel abierto sigue abierto.
- **Oculta no se ve nada**: las formas de reposo (`collapsed`, `hover`, `settle`) miden 0, así que el
  panel sale del borde mismo con la burbuja de siempre (con movimiento reducido, el fundido) y vuelve a
  él. Sin pastilla no hay aviso ancho (la máquina lo ignora: avisa la notificación de Windows, según su
  ajuste, o el toast al abrir), ni arrastre, ni hover.
- **No bloquea nada**: en reposo la región de la ventana queda **vacía** (`set_island_area` con
  `clickable: false`): ni clics ni arrastres de ventanas de abajo. Lo que la trae es Rust: el
  `cursor_tracker` vigila la **zona de aparición** (`revealZone`: una franja de 2 px contra el borde,
  del largo de la pastilla, o un cuadrado de 24 px en la esquina, más su margen; `zone_hit`, con
  pruebas) y la isla se abre si el cursor se queda ahí el retraso de Ajustes (`reveal`, de 0,15 a
  0,8 s; `getToggleDelay`). Arrastrar un archivo al borde la abre igual y se suelta en el panel.
- También la abren su **atajo** («Abrir y cerrar Glup», Ctrl+Alt+Shift+G por defecto; abre y cierra,
  y toma el foco para Esc) y «Abrir Glup» de la bandeja. Se recoge como siempre: al salir el cursor,
  con Esc o con el atajo.
- La primera vez que se elige «Oculta», un diálogo dice cómo volver a abrirla («Entendido» o «Mejor
  como isla»). Si la barra de tareas se oculta sola en ese borde (`get_taskbar_state`,
  `competesWithTaskbar`), Ajustes avisa que compiten y sugiere otro borde.

### Modo burbuja

- «Burbuja»: un círculo flotante de **56 px CSS** (un ícono grande: 56 px a 100 %, 84 px a 150 %, nítido
  porque se dibuja, no es un mapa de bits), con la cara de Glup, el mismo color de la pastilla y una
  sombra suave. Las formas están en `DOCK_SHAPES.bubble` (sin orejas: un rectángulo redondeado que es
  un círculo en reposo) y las medidas en `BUBBLE`.
- **La ventana es toda el área de trabajo de su pantalla** (`placeBubble`): moverla dentro de una
  pantalla solo mueve la región (`set_island_frame` no recoloca la ventana si el marco no cambió). En
  reposo la región es **redonda** (`regionShape` → `round`, `CreateEllipticRgn`): el círculo con 8 px
  para la sombra y el anillo; nada más bloquea clics. Mientras se abre, la región es solo lo que el
  panel puede alcanzar, no la pantalla entera.
- **Se arrastra a cualquier lado** y en cualquier pantalla: el centro sigue al cursor desde donde se
  tomó (`dragBubble`) y queda donde se suelta, sin pegarse al borde; si quedaría en parte afuera, se
  acomoda adentro (`fitBubble`). Se guarda como `islandBubble`
  (pantalla + centro en fracciones del área de trabajo); `resolveBubble` la lleva al lugar equivalente
  de la principal si su pantalla ya no está, y siempre dentro de la pantalla.
- **El panel y el aviso salen hacia donde hay más espacio** (`bubbleLayout`: derecha o izquierda,
  abajo o arriba) desde el lado de la burbuja, con la misma animación, y nunca se salen de la pantalla
  (`bubbleBox` los empuja adentro). Hasta el tamaño del hover la forma queda centrada en la burbuja.
  El aviso es una pestaña al costado con el texto y «Ver»; Glup se queda en la burbuja.
- Progreso: un **anillo** mint alrededor (`IslandBubbleRing`), lleno según la fracción o con un arco que
  gira si no se sabe cuánto falta (con movimiento reducido, el anillo entero más suave). La sombra
  (`IslandBubbleShadow`) y el anillo van fuera del recorte de la silueta.
- **Se abre con un clic, no con hover** (`hoverOpens` es falso para la burbuja): presionar y soltar sin
  mover (menos de `DRAG_THRESHOLD` px) la abre; presionar y mover la arrastra, y mientras se arrastra
  nunca se abre. Al pasar el cursor solo se agranda un poco (la forma `hover`; con movimiento reducido,
  nada) y el cursor es la mano. La burbuja en reposo es un **botón** («Abrir Glup»,
  `IslandBubbleButton`) que responde a Enter y Espacio con el foco.
- **Abierta, no se cierra al salir el cursor** (`closesOnLeave`): se cierra con un clic afuera (la
  ventana pierde el foco → evento `outside`, salvo que algo la retenga, como un diálogo nativo), con
  Esc, con el atajo o con un clic en Glup. Al abrirse toma el foco para eso.
- Lo demás es igual que la pastilla: el atajo, la bandeja, soltar archivos (la abre al instante),
  pantalla completa, vigilantes y movimiento reducido. En Ajustes, el dibujo de «Posición de
  Glup» la muestra donde está (un clic la lleva ahí) y «Traer la burbuja al centro» la lleva al medio de
  la principal.

### Máquina de estados

La isla es una **máquina de estados pura** (`modules/island/utils/islandMachine.ts`), con fases
`collapsed`, `expanding`, `expanded`, `collapsing`, `notice` y `hidden`, y eventos tipados. `useIsland`
solo traduce cada fase en animación, región y foco.

- Todo cambio de comportamiento empieza en la máquina, con su prueba en
  `islandMachine.test.ts`. Nada de banderas sueltas en componentes.
- **Invariantes** (`checkInvariants`), que ningún cambio puede romper:
  - fuera de `hidden`, la región visible incluye siempre la pastilla y la ventana es visible;
  - `hidden` solo por pantalla completa, por la bandeja o mientras se elige una zona en «Copiar texto
    de la pantalla» (`capturing`);
  - el aviso (`notice`) solo existe con la pastilla ancha;
  - fijada solo estando abierta;
  - arrastrada (`moving`) solo estando recogida: mientras se arrastra no se abre, ni con hover, y un
    aviso que llega en ese momento no ensancha la pastilla (igual se cuenta por su toast o notificación);
  - oculta en reposo (`rest: 'hidden'`), ni aviso ancho ni arrastre (la burbuja sí los tiene).
  Se comprueban con las formas de arriba al centro: las reglas son las mismas en todos los bordes.
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
| La persona está en medio de algo | No se recoge al salir el cursor: fijada, archivo arrastrándose encima, paso con lista o cuadrícula (ordenar, páginas, formato, nivel), pantalla de firma o un diálogo abierto (confirmación de Limpieza o de «Limpiar historial», crear firma, selector de archivos o carpetas, escuchar un atajo nuevo en Ajustes) |
| Recoger o Esc | Se recoge con despedida de Glup |
| Tarea termina con la isla recogida | Aviso ancho 4 s con el resultado |
| Tarea termina (cualquiera) | Toast arriba del contenido del panel o notificación de Windows, nunca los dos (`decideNotice`) |
| Pantalla completa en la pantalla de la isla | `hidden` |
| Pastilla presionada y arrastrada | `moving`: sigue al borde más cercano con un halo; al soltar queda ahí |
| Oculta: cursor contra su borde el retraso de Ajustes, su atajo o la bandeja | Sale el panel completo desde ese borde; al recogerse vuelve a no verse nada |
| Burbuja presionada y arrastrada | `moving`: sigue al cursor por la pantalla (y a otra); al soltar queda ahí, dentro de la pantalla |
| Burbuja: cursor encima | Se agranda un poco, sin abrirse |
| Burbuja: clic (o Enter/Espacio), atajo, bandeja o un archivo arrastrado | El panel sale de la burbuja hacia donde hay más espacio |
| Burbuja abierta: clic afuera, Esc, atajo o clic en Glup | Se recoge a la burbuja (salir con el cursor no la cierra) |
| «Copiar texto de la pantalla» (atajo, bandeja o Herramientas) | `hidden` mientras se elige la zona; vuelve como pastilla limpia y muestra el aviso («Copié 42 palabras» con «Ver», que abre esa línea del Historial, Glup feliz; «No encontré texto ahí», confundido). Con Glup oculto (bandeja, pantalla completa), una notificación de Windows con las mismas palabras |

- Lo que la mantiene abierta lo decide la máquina: `isHeldOpen` (fijada o algún `HoldReason`:
  `drag`, `step`, `sign` (una pantalla entera: Firmar u Organizar páginas), `dialog`), que `useIsland`
  le envía con el evento `holds`. Un diálogo nuevo
  la retiene con `useIslandHold(abierto)` o `holdWhile(...)` para los selectores nativos. Que Glup
  coma o trabaje **no** la retiene.
- **Avisos de fin de tarea** (`modules/notices`): con el panel abierto y la persona ahí (cursor encima
  o Glup al frente) o una tarea de menos de 3 s, un toast arriba del contenido (Glup en miniatura,
  el resultado, «Ver», se va a los 5 s). Si no está mirando, una notificación de Windows
  (`tauri-winrt-notification`; el clic despliega la isla en la pantalla dueña) y ningún toast. Si
  las notificaciones están apagadas en Ajustes, el toast espera a que se abra el panel.
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
- **Forma**: un path SVG de `buildDockPath(placement, shape)`, con orejas cóncavas que la unen al borde
  (o a los dos, en una esquina). El mismo path rellena y recorta; el panel cubre toda la ventana y solo
  el recorte muestra la isla. React nunca pone el path: lo dibuja GSAP (`renderIslandShape`).

## Animaciones

- **GSAP** (`gsap`, `@gsap/react`, plugin `Flip`) para abrir, cerrar, el aviso y el vuelo de Glup
  entre la pastilla y el avatar. Apertura tipo burbuja (anticipación + expansión elástica) y cierre
  con temblor de asentamiento.
- Las animaciones usan las formas del borde de la isla (`dockShape`): la burbuja crece hacia el centro
  desde cualquier borde o esquina. Si la isla cambia de lugar quieta (al soltarla, desde Ajustes),
  `relayout` la dibuja en el lugar nuevo, en el estado en que está.
- Toda animación **se puede interrumpir**: se invierte desde donde está, sin saltos. La región nunca
  se reduce mientras quede algo visible del panel.
- Duraciones, curvas y tamaños en `constants/` (`islandTimeline.ts`, `islandMascot.ts`, `limbs.ts`, y
  las formas y poses de cada borde en `modules/dock/constants/dock.ts`). Ningún número mágico dentro de un hook.
- `prefers-reduced-motion`: solo fundidos cortos y cambios de cara; sin vuelos, rebotes ni balanceos.
  **Reducir el movimiento quita o suaviza animaciones, nunca esconde información ni salta un estado**:
  - la máquina hace el mismo recorrido con y sin movimiento reducido (`reducedMotion.test.ts`); solo
    cambia cómo se anima;
  - el aviso de la pastilla aparece igual (`planNotice`: la pastilla ancha y Glup se ponen de golpe y
    el texto aparece con un fundido corto), dura lo mismo y tiene los mismos botones («Ver»);
  - los gestos que dicen algo (saludar, señalar «Elegir archivos») mantienen su pose quieta el mismo
    tiempo (`buildStillGesture`); los de espera (estirarse, zapatear) no se hacen.
  - las animaciones del cuerpo de cada estado (saltar feliz, rascarse confundido, balancearse
    trabajando, la sorpresa de `alert`, comer) pasan por `createAnimationScope(reduced)`, que las
    cambia por su pose quieta el mismo tiempo (`stillMotion.ts`): la de su final si se queda ahí
    (`fill: forwards`), si no la de reposo. El estado dura lo mismo y su cara cambia igual;
  - la respiración y el rebote de la boca, que son solo movimiento, no se hacen. El parpadeo y la
    mirada que sigue el cursor se quedan: son la cara.

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
  tiempos en `constants/` y su versión para movimiento reducido (quieta si el gesto dice algo).
- En la pastilla no se animan brazos ni patitas: no se ven.

### Glup asomado (pastilla de arriba)

En la pastilla del borde de arriba Glup no sale cortado: se **asoma** (`glup-peek-160.webp` y `-320`,
sacados de `glup-peek-sin-cara.png`, con los cachetes del dibujo pero sin ojos ni boca). Su base plana
va sobre el borde de abajo de la pastilla y se ven la cabeza, los audífonos y las manitos. Los demás
bordes, las esquinas y la burbuja siguen con el Glup de siempre.

- Es **la misma instancia** con otra piel: `Mascot` con `peek` (solo el de la isla) dibuja también la
  capa asomada. La variable CSS `--peek` (0 entero, 1 asomado), puesta en `squash`, funde el cuerpo
  (con brazos, patitas y archivos) en la capa asomada y lleva cada pieza de la cara de su lugar en el
  cuerpo entero a su lugar en el dibujo asomado (`getPieceStyle` mezcla ambas posiciones con `calc`).
  Así la cara sigue viva (parpadeo, mirada, estados) con los ojos y bocas de siempre.
- `constants/peek.ts`: `PEEK_LAYER` (dónde va la capa dentro de la caja de Glup, elegida para que su
  cara caiga sobre la del Glup entero) y `PEEK_PIECES` (la cara medida en `glup-peek.png`: ojos un
  poco más chicos para su separación, 0,78; boca casi igual, 0,97). Si el dibujo cambia, se vuelven a
  medir los dos PNG, que están alineados píxel a píxel.
- Dónde: `usesPeek(placement)` (borde de arriba, pastilla acostada). `TOP_PILL_SHAPES` hace esa
  pastilla un poco más alta (150 × 38) y `PEEK_POSE` deja 3 px bajo el borde de la pantalla; el aviso
  lo lleva asomado al principio (34 px de alto) y el texto empieza después de lo que se ve.
- La transición: al abrirse, `--peek` va a 0 en la primera mitad del vuelo (`MASCOT_MOTION.peek`);
  al cerrarse, vuelve a 1 en la segunda mitad. Con movimiento reducido se pone de golpe, como el resto.
  `setCollapsedPose` y `setExpandedPose` lo ponen según el borde (al moverse de borde, también).

### Piezas nuevas

Las piezas salen del diseño original (estilo 3D suave, menta y lila). Una pieza nueva:

1. Se genera con fondo transparente real, a la misma escala que el personaje.
2. Se recorta y se ubica comparándola con el cuerpo, y su posición (`x`, `y`, `w` en %, `layer`,
   `pivot`) se agrega a `constants/layout.ts`.
3. Se verifica que encaje en los tres tamaños (pastilla, avatar y zona de soltar).

## Checklist

- [ ] El cambio de comportamiento está en la máquina de estados, con prueba.
- [ ] Las invariantes se siguen cumpliendo.
- [ ] Animación interrumpible y con versión de movimiento reducido que no esconde nada.
- [ ] Tiempos y tamaños en `constants/`.
- [ ] Probado a mano: hover, arrastrar un archivo, recoger a mitad, pantalla completa y bandeja.
