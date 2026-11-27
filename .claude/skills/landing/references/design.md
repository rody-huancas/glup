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
  el nombre de la sección actual que abre la lista hacia arriba.
- **Barra de arriba** (`top-bar.astro`): fina, «Glup» a la izquierda y la línea en monoespaciada a la
  derecha.
- **Botones** (`button-link.astro`): enlaces con borde grueso y `shadow-hard-sm`; al pasar o enfocar
  se desplazan hacia la sombra (solo `transform`).

## Ilustraciones (`components/art/`)

- SVG en línea, con `viewBox`, `aria-hidden="true"` y `focusable="false"`.
- **Gorditas e isométricas**: formas redondeadas, una cara frontal y una cara lateral más oscura
  (el token `-deep`) desplazada en diagonal para el volumen.
- **Borde `ink` grueso** (`stroke-width` 4 sobre un `viewBox` de unos 120 px), `stroke-linejoin`
  y `stroke-linecap` redondos, colores planos sin degradados.
- Colores por clases de Tailwind sobre los tokens (`fill-coral`, `stroke-ink`), nunca hex en el SVG.
- Archivos del héroe: PDF coral, foto lila, nota de voz amarilla, video amarillo, texto celeste, ZIP
  gris (`file-tile.astro`, prop `kind`).
