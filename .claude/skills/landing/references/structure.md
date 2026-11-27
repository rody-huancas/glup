# Estructura de `apps/web`

Parte de `../SKILL.md`, reglas 2, 3, 5 y 6.

## Árbol

```text
apps/web/
├── astro.config.ts           Tailwind, alias, la versión de Glup y SITE_URL
├── tsconfig.json             astro/tsconfigs/strict y los alias (@/, @docs/, @mascot/)
├── vitest.config.ts
├── public/                   favicon.png, apple-touch-icon.png, og.png (los genera pnpm web:shots)
└── src/
    ├── pages/
    │   ├── index.astro       Monta el layout y las secciones, en orden
    │   └── robots.txt.ts
    ├── layouts/base-layout.astro   El documento: <head>, barras, <main>, pie
    ├── components/           Un componente .astro por archivo
    │   ├── seo-head.astro
    │   ├── top-bar.astro, section-nav.astro, site-footer.astro
    │   ├── hero-section.astro, families-section.astro, how-section.astro,
    │   │   privacy-section.astro, faq-section.astro, download-section.astro
    │   ├── retro-window.astro, section-heading.astro, button-link.astro, glup-figure.astro
    │   └── art/              Ilustraciones SVG: file-tile, cursor, sparkle, bubble, folder, family-*
    ├── assets/familias/      Los Glups de familia en PNG transparente y recortado
    ├── content/              Los textos, un archivo por sección (site, hero, families, steps,
    │                         privacy, faq, download, footer)
    ├── config/               links.ts (descarga, repo, autor), sections.ts (la barra), seo.ts
    ├── lib/                  Lógica pura con su .test.ts al lado
    ├── scripts/              Lo que corre en el navegador: motion.ts (carga tarde motion-scenes.ts,
    │                         con GSAP), section-nav.ts
    ├── styles/               globals.css (entrada), tokens.css (@theme), base.css, motion.css (las
    │                         entradas) y una hoja por familia (window.css, nav.css, glup.css, art.css)
    └── types/                content.types.ts, section.types.ts
```

## Qué va en cada carpeta

- **`pages/index.astro`**: solo monta. Cada sección es un componente con nombre.
- **Una sección** (`*-section.astro`) es un `<section id="…">` con su `aria-labelledby`; su `id` es
  el de `config/sections.ts`, que también usa la barra de abajo. Una sección nueva: su entrada en
  `sections.ts` (id, etiqueta, color), su archivo en `content/`, su componente y su lugar en
  `index.astro`.
- **`content/`**: datos y textos en español, tipados. Las imágenes que acompañan a un texto se
  importan ahí mismo (`import shot from '@docs/resultado.webp'`) para que `astro:assets` las
  optimice.
- **`config/`**: decisiones (URLs, secciones, SEO), no frases largas.
- **`lib/`**: funciones puras (qué sección está activa, el título del documento…), probadas con
  Vitest.
- **`scripts/`**: módulos del navegador, sin dependencias salvo `gsap`. Leen el DOM por
  `data-*` (nunca por clases de estilo) y se cargan desde el `<script>` del componente que los usa.

## Nombres

- Archivos en `kebab-case` e inglés; un `.astro` se importa en `PascalCase`.
- Atributos para los scripts: `data-float`, `data-depth`, `data-eat-*`, `data-nav-*`, `data-section`.
- Clases propias con prefijo de su hoja: `window-*`, `nav-*`, `glup-*`, `art-*`.

## Formato

A mano, como el resto del repo: 2 espacios, propiedades y asignaciones alineadas en columnas en los
`.ts` y en el frontmatter. Nada de Prettier.
