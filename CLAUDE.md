# CLAUDE.md

Guía para Claude Code (y cualquier asistente) en este repositorio.

## Qué es Glup

Una mascota de escritorio open source (MIT) que vive como una "isla" en el borde superior de la
pantalla. Al pasar el cursor se despliega un panel; al soltarle archivos, Glup se los "come" y ofrece
acciones (convertir y reducir peso de imágenes, unir, separar, reducir peso y firmar PDFs, juntar en
ZIP). Todo se procesa en la computadora de la persona: nada se sube a internet.

- `apps/desktop`: la app. Tauri 2 (Rust) + React 19 + TypeScript + Vite + Tailwind CSS v4.
  - `src/`: la interfaz (isla, panel, mascota, pantallas).
  - `src-tauri/src/`: el trabajo pesado y lo nativo (archivos, imágenes, PDFs, ventana, bandeja).
- `apps/web`: la página de descarga (Astro, pendiente).

## Las reglas viven en las skills

Antes de tocar código, lee la skill que corresponde. **`convenciones` aplica siempre**, junto con la
de la parte que toques:

| Skill | Cuándo |
| --- | --- |
| `.claude/skills/convenciones/` | Siempre: idioma, formato, nombres, imports, comentarios, licencias, qué no hacer |
| `.claude/skills/desktop-ui/` | Todo lo de `apps/desktop/src/`: módulos, componentes, hooks, servicios, estilos, textos |
| `.claude/skills/tauri-rust/` | Todo lo de `apps/desktop/src-tauri/`: comandos, servicios, tareas, errores, pruebas, crates |
| `.claude/skills/acciones/` | Agregar o cambiar una acción sobre archivos, de punta a punta |
| `.claude/skills/isla-y-mascota/` | La isla, su máquina de estados, la región de la ventana y las animaciones de Glup |

## Comandos

```bash
pnpm install
pnpm dev                                   # tauri dev (la primera compilación de Rust tarda)
pnpm build                                 # instalador
pnpm version:set 0.2.0                     # versión (Cargo.toml manda; package.json la sigue)

pnpm --filter desktop typecheck            # tsc
pnpm --filter desktop test                 # vitest
cd apps/desktop/src-tauri && cargo check && cargo test
```

## Forma de trabajar

- Una cosa a la vez. Cambios pequeños y revisables.
- El formato es manual: nunca formateadores automáticos (ni Prettier ni rustfmt) sobre código existente.
- El código que se reemplaza se deja comentado junto al nuevo, para comparar fácilmente.
- Nunca se modifican ni se borran los archivos originales de la persona.
- No inventes funciones del producto: si algo no está claro, pregunta.
- No hagas commits ni push salvo que se pidan. Tampoco tags: un tag `v*.*.*` dispara la publicación.
- Antes de terminar: typecheck, vitest, cargo check y cargo test en verde.
- Cuidar el disco: si en la tarea se corrió `cargo test` o se compiló en release (`cargo build
  --release`, `cargo test --release`, `tauri build`), al terminarla se corre `cargo clean` en
  `apps/desktop/src-tauri` (antes, detener `glup.exe` y `tauri dev` si están corriendo).
  Al terminar una tarea no quedan copias del
  proyecto (worktrees, clones), carpetas de compilación extra (otro `CARGO_TARGET_DIR`) ni archivos
  temporales pesados (modelos, entornos de Python, imágenes de prueba).
