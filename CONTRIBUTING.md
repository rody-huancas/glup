# Cómo contribuir a Glup

¡Gracias por querer ayudar! Glup es una mascota de escritorio que hace tareas cotidianas con tus
archivos, gratis y sin subir nada a internet.

> **English speakers:** contributions are welcome in English too. The code is written in English; the
> app's interface and docs are in Spanish for now. Please follow the rules below and open an issue if
> anything is unclear.

## Antes de empezar

1. Busca si ya hay un issue sobre lo que quieres hacer. Si no, ábrelo y cuéntalo antes de escribir
   código: así evitamos trabajo repetido o cambios que no encajan.
2. Lee las reglas del proyecto en `.claude/skills/`:
   - `convenciones`: reglas de todo el repo (idioma, formato, licencias, archivos de la persona).
   - `desktop-ui`: la interfaz en React.
   - `tauri-rust`: el lado nativo en Rust.
   - `acciones`: cómo agregar una acción sobre archivos.
   - `isla-y-mascota`: la isla y las animaciones de Glup.

   Si usas Claude Code u otro asistente, el `CLAUDE.md` de la raíz le indica qué leer.

## Preparar el entorno

Requisitos: Rust (stable, con `rustup`), Node.js 20+, pnpm 10 y, en Windows, las Build Tools de C++.
Más detalles en el `README.md`.

```bash
pnpm install
pnpm dev
```

## Lo que no se negocia

- **Los archivos originales nunca se modifican ni se borran.**
- **Nada sale de la computadora de la persona.**
- **Solo dependencias con licencias permisivas** (MIT, Apache-2.0, BSD, ISC, Zlib). Nada GPL ni AGPL.
- **El formato es manual**: no pases formateadores automáticos sobre archivos existentes.
- **Textos de la interfaz en español llano**, con la voz de Glup.

## Antes de abrir el PR

```bash
pnpm --filter desktop typecheck
pnpm --filter desktop test
cd apps/desktop/src-tauri && cargo check && cargo test
```

- Todo en verde, sin warnings.
- Una rama por cambio: `feature/<nombre>`, `fix/<nombre>` o `chore/<nombre>`, desde `master`.
- Commits convencionales en español: `feat: …`, `fix: …`, `chore: …`.
- Completa la plantilla del PR, incluida la sección «Qué probar a mano».
