# Legacy

Código retirado que se conserva como referencia. No se importa ni se compila (está fuera de `src`).

- `main-window/`: ventana principal separada (barra superior propia, minimizar y cerrar). El panel ahora vive dentro de la isla.
- `shared/`: utilidades que solo usaba esa ventana (abrirla desde la isla, detectar su etiqueta).
- `island/`: paneles de la etapa 2 (zona de soltar de 340x200 y panel de acciones de 420 px) y su flujo. También las animaciones de apertura y cierre con Web Animations API (`islandAnimations.ts`, `useIslandTransitions.ts`, `islandTransition.ts`) y la pastilla con su propio Glup (`IslandMascotSlot.tsx`), reemplazadas por GSAP. La primera versión con GSAP (estirar y caer) está en `islandTimelineStretch.ts` y `islandTimelineStretchConstants.ts`.

Del lado de Rust, lo equivalente está en `src-tauri/legacy/`.
