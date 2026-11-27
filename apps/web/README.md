# Glup Web

La página de descarga de Glup: una sola página estática hecha con [Astro](https://astro.build),
Tailwind CSS v4 y GSAP. Las reglas están en la skill `.claude/skills/landing/`.

```bash
pnpm web:dev       # en la raíz del repo
pnpm web:build     # apps/web/dist
pnpm web:shots     # capturas en docs/images/landing (solo en local), imagen para compartir y favicons
```

- **Textos**: `src/content/`, un archivo por sección. Salen del README y de la app: si cambian allá,
  se cambian aquí.
- **Dominio**: `SITE_URL=https://… pnpm web:build` escribe la URL canónica y la imagen para compartir
  con su dirección completa. Sin `SITE_URL` la página funciona igual, sin esas dos cosas.
- **La versión** que muestra la barra de arriba sale de `apps/desktop/package.json`.
- **Los Glups de familia** (`src/assets/familias/`) son los de 256 px de la app
  (`apps/desktop/src/modules/families/assets/`), en PNG con el fondo transparente limpio y recortados
  al dibujo. Si cambian allá, se vuelven a sacar.
