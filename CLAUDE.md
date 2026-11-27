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
- `apps/web`: la página de descarga. Astro estático + GSAP + Tailwind CSS v4, sin JavaScript salvo
  las animaciones y la barra de secciones.

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
| `.claude/skills/landing/` | Todo lo de `apps/web`: la página de descarga, su diseño, textos, ilustraciones y animaciones |

## Comandos

```bash
pnpm install
pnpm dev                                   # tauri dev (la primera compilación de Rust tarda)
pnpm build                                 # instalador (release: solo si se pide)
pnpm version:set 0.2.0                     # versión (Cargo.toml manda; package.json la sigue)
pnpm sweep                                 # borra de target lo que no se usó en 3 días (sweep:dry solo lista)
pnpm dev:stop                              # cierra solo lo de desarrollo (glup.exe de target, pnpm dev); -DryRun lista
pnpm web:dev                               # la página de descarga (apps/web)
pnpm web:build                             # apps/web/dist
pnpm web:shots                             # capturas de la página, imagen para compartir y favicons
pnpm social:shots                          # imágenes para redes (carrusel, PDF, post y enlace) en docs/images/social
pnpm voz:build                             # glup-voz.exe, la tarjeta de video de «Pasar audio a texto» (pide el Vulkan SDK)

pnpm --filter desktop typecheck            # tsc
pnpm --filter desktop test                 # vitest
pnpm --filter web typecheck                # astro check (si se tocó apps/web)
pnpm --filter web test                     # vitest de apps/web
cd apps/desktop/src-tauri && cargo check && cargo test
```

## Forma de trabajar

- Una cosa a la vez. Cambios pequeños y revisables.
- El formato es manual: nunca formateadores automáticos (ni Prettier ni rustfmt) sobre código existente.
- Lo que se reemplaza o se retira se borra: ni se comenta ni se guarda aparte (nada de `legacy/`),
  porque el historial queda en git.
- Nunca se modifican ni se borran los archivos originales de la persona (las únicas excepciones,
  Limpieza y Ordenar una carpeta, están en la skill `convenciones`, regla 10).
- No inventes funciones del producto: si algo no está claro, pregunta.
- Nunca simules clics, teclas ni arrastres sobre el escritorio del usuario. Para probar algo visual, usa
  tests, logs y descríbeme qué probar a mano.
- No hagas commits ni push salvo que se pidan. Tampoco tags: un tag `v*.*.*` dispara la publicación.
- Antes de terminar: typecheck, vitest, cargo check y cargo test en verde.
- Nunca se compila en release en local (`cargo build --release`, `cargo test --release`,
  `tauri build`) salvo que la persona lo pida: el instalador lo arma el workflow de Release.
- Cuidar el disco sin perder la compilación incremental: al terminar una tarea en la que se compiló,
  se corre `pnpm sweep` (borra de `target/*/build` y `target/*/incremental` lo que no se usó en 3
  días; `pnpm sweep:dry` solo lista lo que borraría). `cargo clean` solo si quedan menos de 20 GB
  libres en C: (antes, `pnpm dev:stop`, porque `glup.exe` de `target` y `tauri dev` bloquean archivos
  de `target`).
- «No dejar nada corriendo» es **solo lo de desarrollo**: `pnpm dev:stop` cierra los `glup.exe` y
  `glup-voz.exe` que corren desde `apps/desktop/src-tauri/target/` y el `pnpm dev`/`tauri dev`/Vite
  de este repo. Se elige **por la ruta del ejecutable**, nunca por el nombre: el Glup instalado (donde lo
  pone el instalador, en `AppData\Local`) también es `glup.exe` y **nunca** se cierra.
  Al terminar una tarea no quedan copias del
  proyecto (worktrees, clones), carpetas de compilación extra (otro `CARGO_TARGET_DIR`) ni archivos
  temporales pesados (modelos, entornos de Python, imágenes de prueba).
