# Sistema de diseño de la landing

Parte de `../SKILL.md`, reglas 7, 8 y 11. Inspirado en el estilo «papel cuadriculado y ventanitas
retro»; todo lo que se ve es propio.

## Tokens (`src/styles/tokens.css`, `@theme`)

| Grupo | Tokens | Uso |
| --- | --- | --- |
| Fondos | `paper`, `paper-deep`, `navy`, `navy-soft`, `grid-paper`, `grid-navy` | Secciones crema y azul marino, y las líneas finas azuladas del cuadriculado |
| Tinta | `ink`, `ink-soft`, `on-navy`, `on-navy-soft` | Texto y bordes gruesos sobre crema; texto sobre azul marino |
| Familias | `lilac`, `coral`, `yellow`, `sky`, `mint`, `silver`, cada uno con `-deep` (la cara oscura del volumen) | Acentos, ilustraciones y la barra de secciones |
| Marca | `brand` (el menta de Glup) | Botón principal, Inicio |
| Fuentes | `font-display` (Bricolage Grotesque, OFL), `font-mono` (JetBrains Mono, OFL) | Titulares enormes y apretados; etiquetas |
| Sombras | `shadow-hard`, `shadow-hard-sm` | Sombra dura desplazada, sin difuminar |

Un color o una medida nuevos se agregan como token, nunca sueltos en `class`.

## Contraste (AA)

- Sobre **crema**: texto en `ink` o `ink-soft`. Los colores de familia solo como fondo (con texto
  `ink` encima) o en ilustraciones, nunca como color de texto.
- Sobre **azul marino**: texto en `on-navy` / `on-navy-soft`; los colores de familia sí pueden ser
  texto (son claros).

## Piezas

- **Ventanita retro** (`retro-window.astro`, `window.css`): barra de título con tres puntitos de
  colores y un título en monoespaciada, borde grueso `ink`, esquinas apenas redondeadas y
  `shadow-hard`. Variante por familia (`accent`), que tiñe la barra.
- **Fondo**: el cuadriculado es un `background-image` con dos gradientes lineales finos (clases
  `paper-grid` y `navy-grid` de `base.css`). Las secciones alternan crema y azul marino.
- **Barra de secciones** (`section-nav.astro`, `nav.css`): fija abajo, dividida en partes iguales;
  la actual se pinta con el color de su sección (`aria-current="true"`). En celular es un botón con
  el nombre de la sección actual que abre la lista hacia arriba: se desliza y aparece (~250 ms, las
  opciones escalonadas) sobre un velo que oscurece la página; Esc o un clic afuera la cierran.
- **Preguntas** (`faq-section.astro`): `<details>` cuya respuesta crece en alto y aparece
  (`::details-content` e `interpolate-size`), con el + que gira a ×.
- **Barra de arriba** (`top-bar.astro`): fina, «Glup» a la izquierda y la línea en monoespaciada a la
  derecha.
- **Botones** (`button-link.astro`): enlaces con borde grueso y `shadow-hard-sm`; al pasar o enfocar
  se desplazan hacia la sombra (solo `transform`).

## Logotipo (`components/art/glup-logo.astro`)

- «GLUP» en cuatro teclas gorditas del mismo tamaño, una por color de familia (G lila, L coral, U
  amarilla, P celeste): borde `ink`, cara lateral `-deep` para el volumen, sombra dura y la letra en
  mayúscula con la grotesca del sitio. Lo que se lee en voz alta sigue siendo «Glup».
- Cada tecla es su propio `<svg>` dentro de una grilla (`logo-keys`): la entrada CSS mueve elementos
  enteros que compone la tarjeta. Con `live` (solo el héroe) lleva lo que usan las animaciones: la «U»
  come un archivito cada 6–8 s y el cursor las «teclea» en fila (`scripts/hero-logo.ts`).
- En la barra de arriba y el pie, una versión chica y quieta junto a Glup.
- En el héroe va dentro del `<h1>` con `aria-label="Glup"` y el texto «Glup» en `sr-only`; las teclas
  son `aria-hidden`.

## Imágenes de Glup

- Las piezas de la mascota y los Glups de familia van **sin pérdida** (`lib/image-widths.ts`,
  `sharpImage`): WebP sin pérdida (`astro.config.ts` lo pone para todo WebP), con anchos para pantallas
  1x, 2x y 3x hasta el tamaño de cada archivo. Las capturas de la app van en AVIF (con pérdida, no se
  nota).
- El límite es el archivo de origen: el cuerpo de Glup mide 656 px (alcanza para 2x a su tamaño en el
  héroe) y los Glups de familia, 256 px. Para más nitidez hacen falta piezas más grandes en la app.

## Enlaces

- Lo que sale del sitio abre en una pestaña nueva con `rel="noopener noreferrer"` y un aviso para
  lectores de pantalla (`SITE.newTab`): `ButtonLink` y `TextLink` lo hacen solos (`lib/links.ts`). La
  descarga del instalador (`.exe`) no abre pestaña.
- Los enlaces internos (`#seccion`) los atiende `scripts/anchors.ts`: scroll suave, el foco pasa a la
  sección y la dirección queda sin `#`.

## Ilustraciones (`components/art/`)

- SVG en línea, con `viewBox`, `aria-hidden="true"` y `focusable="false"`.
- **Gorditas e isométricas**: formas redondeadas, una cara frontal y una cara lateral más oscura
  (el token `-deep`) desplazada en diagonal para el volumen.
- **Borde `ink` grueso** (`stroke-width` 4 sobre un `viewBox` de unos 120 px), `stroke-linejoin`
  y `stroke-linecap` redondos, colores planos sin degradados.
- Colores por clases de Tailwind sobre los tokens (`fill-coral`, `stroke-ink`), nunca hex en el SVG.
- Archivos del héroe: PDF coral, foto lila, nota de voz amarilla, video amarillo, texto celeste, ZIP
  gris (`file-tile.astro`, prop `kind`).
