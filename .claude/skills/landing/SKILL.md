---
name: landing
description: Reglas obligatorias de la página de descarga de Glup (apps/web, Astro estático + GSAP + Tailwind CSS v4) - estructura de carpetas, componentes .astro, contenido en español en src/content, sistema de diseño en @theme (papel cuadriculado, ventanitas retro, colores de las familias), ilustraciones SVG propias, animaciones con GSAP y ScrollTrigger con movimiento reducido, barra de secciones, SEO y Open Graph, imágenes con astro:assets, accesibilidad, rendimiento (Lighthouse) y capturas. Úsala al crear, modificar o revisar cualquier cosa de apps/web - «cambia un texto de la landing», «nueva sección», «agrega una ilustración», «anima esto», «Open Graph», «capturas de la landing». Va siempre junto con la skill convenciones.
---

# La landing de Glup (`apps/web`)

Una sola página estática que presenta Glup y lleva a descargarlo. Astro pinta HTML sin JavaScript; lo
único que corre en el navegador es GSAP (las animaciones) y dos scripts mínimos (la barra de secciones
y su menú en celular). **Antes, la skill `convenciones`**: idioma, formato manual con alineación,
arrow functions, imports, comentarios, licencias. Aquí no se repite.

## Reglas obligatorias

1. **Estático y sin frameworks de componentes.** `output: 'static'`, sin adaptador, sin islas de
   React ni librerías de componentes. Una interacción que el HTML resuelve se hace con HTML: el
   acordeón de Preguntas es `<details>`/`<summary>`. Un script solo existe si el HTML no alcanza
   (`src/scripts/`), y se importa desde el `<script>` de un componente (Astro lo empaqueta y lo
   carga como módulo, diferido).
2. **Estructura fija** (`references/structure.md`): `pages/` solo rutas, `layouts/`, `components/`
   (un `.astro` por archivo; las ilustraciones en `components/art/`), `content/` (los textos),
   `config/` (enlaces y SEO), `lib/` (lógica pura con pruebas), `scripts/` (lo que corre en el
   navegador), `styles/`, `types/`.
3. **Los textos viven en `src/content/`, nunca en los componentes.** Un archivo `.ts` por sección
   (`hero.ts`, `families.ts`, `faq.ts`…), en español llano, tipado con `types/content.types.ts`. Un
   componente recibe su contenido por props o lo importa de su archivo de contenido; no escribe una
   frase propia (salvo un `aria-label` que dependa de un dato, armado también desde el contenido).
4. **Nada inventado.** Las habilidades, las preguntas, los pesos de lo que se descarga y los
   requisitos salen del `README.md` y de `apps/desktop` (las frases de las familias son las de
   `modules/families/constants/families.ts`). Si cambian allá, se cambian aquí en la misma tarea.
5. **Props con nombre.** Un `.astro` declara `interface I<Componente>Props` y `type Props =
   I<Componente>Props;`.
6. **Imports con alias**, nunca relativos: `@/` → `src/`, `@docs/` → `docs/images/` del repo (las
   capturas), `@mascot/` → las piezas de la mascota de `apps/desktop` (para armar a Glup y que pueda
   abrir la boca), `@tools/` → `tools.json` de la app (las habilidades). Son imágenes y datos, no
   código: ninguna app importa código de otra. Los Glups de familia son PNG propios en
   `src/assets/familias/`: los de 256 px de la app con el fondo transparente limpio (el WebP con
   pérdida deja un velo casi invisible que se ve como un recuadro) y recortados al dibujo.
7. **Estilo solo con tokens** (`references/design.md`). Los tokens viven en `@theme` de
   `src/styles/tokens.css`; las clases propias (ventanita, barra, piezas de Glup) en una hoja por
   familia de componentes en `src/styles/`. Sin colores de la paleta de Tailwind, sin valores
   arbitrarios en `class`, sin `<style>` en un `.astro` y sin `style="…"`.
8. **Ilustraciones propias en SVG** (`references/design.md`, «Ilustraciones»): isométricas,
   «gorditas», borde oscuro grueso, colores planos y una cara más oscura para el volumen. Nunca
   textos, logos ni dibujos de otro sitio. Son decorativas: `aria-hidden="true"` y sin `alt`.
9. **El contenido siempre se ve.** El HTML pinta todo visible, sin depender de JavaScript ni de
   ScrollTrigger; una animación solo mejora lo que ya está. Sin `content-visibility` (deja secciones
   sin pintar en capturas y al imprimir). **Movimiento con GSAP** (`references/motion.md`), cargado
   tarde y siempre dentro de `gsap.matchMedia('(prefers-reduced-motion: no-preference)')`.
10. **Imágenes con `astro:assets`** (`<Image>` o `<Picture>`), con `width`, `height` (los pone
    Astro), `alt` en español y `loading="lazy"` salvo lo que se ve al abrir. Las decorativas, con
    `alt=""`.
11. **Accesible**: contraste AA (texto de color solo sobre el azul marino; sobre crema, tinta), foco
    visible (`:focus-visible`), todo usable con teclado, un enlace «Saltar al contenido», la barra
    fija nunca tapa contenido (`scroll-padding` y relleno abajo del `body`), un solo `<h1>`.
12. **SEO desde el layout**: `components/seo-head.astro` escribe título, descripción, Open Graph,
    tarjeta para compartir, favicon e idioma (`es`). La URL pública sale de `SITE_URL` (sin ella no
    hay canónica ni URL absoluta de la imagen para compartir).
13. **Rendimiento**: Lighthouse 95+ en rendimiento y accesibilidad. Fuentes autoalojadas
    (`@fontsource-variable`, OFL) con `font-display: swap`, solo el peso variable; nada de
    terceros (ni analítica, ni fuentes de Google, ni CDNs).
14. **Pruebas**: Vitest para `lib/` (`pnpm --filter web test`); `pnpm --filter web typecheck`
    (`astro check`) y `pnpm web:build` sin errores ni avisos.
15. **Capturas**: `pnpm web:shots` construye la página, la abre en Edge con `playwright-core` y deja
    en `docs/images/landing/` las capturas de escritorio y de celular (solo en local: no se versionan,
    `.gitignore`), y en `apps/web/public/` la
    imagen para compartir y los favicons. Nada queda corriendo.

## Comandos

```bash
pnpm web:dev                    # astro dev
pnpm web:build                  # astro build → apps/web/dist
pnpm web:shots                  # capturas, imagen para compartir y favicons
pnpm social:shots               # imágenes para redes en docs/images/social (src/social, solo en dev)
pnpm --filter web typecheck     # astro check
pnpm --filter web test          # vitest
```

## Cuándo leer cada reference

| Situación | Lee |
| --- | --- |
| Dónde va un archivo, cómo se llama, una sección nueva | `references/structure.md` |
| Colores, tipografía, ventanitas, fondo, ilustraciones, barra de secciones | `references/design.md` |
| Animar algo, ScrollTrigger, movimiento reducido | `references/motion.md` |

Lee la reference **antes** de escribir. Para un cambio de una línea basta con imitar el archivo.

## Antes de dar algo por terminado

- [ ] ¿Los textos nuevos están en `src/content/` y salen del README o de la app?
- [ ] ¿Ningún color, medida ni `style` suelto fuera de `src/styles/`?
- [ ] ¿Se ve bien a 360 px de ancho, con teclado y con movimiento reducido?
- [ ] ¿`typecheck`, `test` y `web:build` en verde? ¿Las capturas, al día si cambió algo visible?
