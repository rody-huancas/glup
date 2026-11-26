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
Para compilar whisper.cpp («Pasar audio a texto») también hacen falta **CMake** y **LLVM** (por libclang):
`winget install Kitware.CMake LLVM.LLVM`. El CI de GitHub ya los trae.
Más detalles en el `README.md`.

```bash
pnpm install
pnpm dev
```

### La tarjeta de video para «Pasar audio a texto» (opcional)

Con tarjeta de video, «Pasar audio a texto» corre en `glup-voz.exe` (`apps/desktop/src-tauri/voz`),
un programa aparte con whisper.cpp y Vulkan; Glup lo abre y, si falla, sigue con el procesador. **No
hace falta para trabajar en Glup**: sin él, `pnpm dev` funciona igual y escucha con el procesador.

Para compilarlo hace falta, además, el **Vulkan SDK** (los encabezados, `glslc` y `vulkan-1.lib`):

```bash
winget install KhronosGroup.VulkanSDK     # deja VULKAN_SDK y su Bin en el PATH (abre una terminal nueva)
pnpm voz:build                            # target/debug/glup-voz.exe, junto al glup.exe de pnpm dev
```

- Se compila **aparte** (`cargo build -p glup-voz`, nunca junto con Glup): si Cargo los compila
  juntos, une las features de `whisper-rs` y Glup también enlazaría Vulkan.
- `pnpm voz:build` pone `CMAKE_PROJECT_INCLUDE=voz/short-paths.cmake`: el generador de shaders de
  whisper.cpp se compila en `target/vk`, porque dentro de la carpeta de Cargo sus rutas pasan de 260
  caracteres y MSVC no puede abrirlas.
- La primera compilación tarda unos 3 minutos (cientos de shaders). La primera vez que escucha en
  una PC, el driver compila sus pipelines (unos 20 s una sola vez; después los guarda).
- Para usar Vulkan hace falta el cargador `vulkan-1.dll`, que instalan los drivers de NVIDIA, AMD e
  Intel. Si no está, `glup-voz.exe` no arranca y Glup usa el procesador.

### El clic derecho del Explorador

Glup aparece en el clic derecho de las fotos, los PDF, el audio y el video, y en «Enviar a». Todo es
por usuario y no pide administrador.

- **Cómo se arma:**
  - El menú se escribe en `HKCU\Software\Classes\SystemFileAssociations\.<ext>\shell\Glup`, con
    subcomandos en cascada que salen de `tools.json` (el campo `menu`).
  - Explorer abre un `glup.exe --menu <herramienta> "<archivo>"` por cada archivo elegido. La
    instancia única los junta en una sola tarea, con todo lo que llega en 500 ms.
  - `menuNeedsStep` en `tools.json` dice si esa opción pregunta algo (la isla se abre en el paso) o
    corre directo con las opciones de siempre (solo avisa al terminar).
- **Quién escribe y quita las entradas:** Glup mismo (`services/explorer`).
  - Las vuelve a escribir al arrancar, por si una actualización cambió la ruta.
  - El instalador (solo NSIS; no hay `.msi`) lo llama con `--install-shell` al instalar y con
    `--uninstall-shell` al desinstalar (`src-tauri/windows/installer-hooks.nsh`).
- **En desarrollo:** una compilación de desarrollo no escribe nada fuera de sí misma: ni el clic
  derecho, ni «Enviar a», ni el arranque con Windows. Si encuentra entradas que apuntan a
  `target\debug`, las borra al iniciar. Para probarlas, arranca con `GLUP_DEV_SHELL=1`
  (`services/dev_build.rs`).
- **Sin consolas:** `glup.exe` es un programa de ventana también en desarrollo. Sus logs llegan
  igual a la terminal de `pnpm dev`, y los procesos que abre el Explorador no muestran ninguna
  ventana.
- **Windows 11:** hoy Glup aparece en «Mostrar más opciones». Para el menú moderno haría falta:
  - **Un controlador `IExplorerCommand`:** un servidor COM, en una DLL o en un `.exe` registrado como
    servidor fuera de proceso, que dé el título, el ícono, el estado según la selección y los
    subcomandos (`IEnumExplorerCommand`), y que reciba la selección entera en `Invoke`, con lo que
    no haría falta juntar procesos.
  - **Identidad de paquete:** un paquete MSIX completo, o uno «sparse» (*packaging with external
    location*) junto al instalador actual. Su `AppxManifest.xml` declara `desktop4:FileExplorerContextMenus`
    con un `desktop5:ItemType` por tipo de archivo y el `com:SurrogateServer` (o `com:ExeServer`) con
    el CLSID del controlador.
  - **Firma:** el paquete tiene que ir firmado con un certificado de confianza (de código, o de la
    Microsoft Store). Sin firma, Windows no lo registra.
  - **Instalación:** registrar el paquete al instalar (`Add-AppxPackage -ExternalLocation`, o la API
    `PackageManager`) y quitarlo al desinstalar.

### El modo demo y las imágenes del README

La interfaz también abre en el navegador, sin Tauri, con datos de ejemplo inventados (una tal «Ana»):
`apps/desktop/vite.demo.config.ts` cambia las llamadas a Rust por `apps/desktop/src/demo/` (los datos
están en `src/demo/fixtures/`). Es solo para desarrollo: `demo.html` no entra en el instalador.

```bash
cd apps/desktop && npx vite --config vite.demo.config.ts
# http://localhost:1430/demo.html?screen=home
```

Cada pantalla y estado se abre por la dirección: `?screen=home|tools|history|clipboard|space|duplicates|
settings|position|subtitles|scan|task|result`, `?screen=family&id=pdf`, `?island=collapsed|notice|open` y
`?scene=desktop` (la isla sobre un escritorio). Si una pantalla pide un dato que el demo no tiene, la
consola dice `[glup:demo] sin datos para …`.

`pnpm docs:shots` vuelve a sacar todas las imágenes de `docs/images` con esa interfaz: maneja el Edge que
trae Windows con `playwright-core` (sin descargar navegadores) y usa el FFmpeg que Glup descargó para los
videos (o el de `GLUP_FFMPEG`). Deja WebP para las capturas y GIF y MP4 para el clip, y no deja nada
corriendo ni archivos temporales.
Con nombres, rehace solo esas: `pnpm docs:shots inicio isla-abierta glup` (`glup` es el GIF y el MP4). El
reloj del demo marca siempre las 16:30 de hoy (`src/demo/clock.ts`), así las imágenes no cambian según la
hora en que se saquen.

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

## Publicar una versión

Solo Windows por ahora. La versión vive en `apps/desktop/src-tauri/Cargo.toml` (Tauri la lee de ahí) y
`apps/desktop/package.json` la sigue.

1. **Subir la versión** en `master`: `pnpm version:set 0.2.0`. Cambia `Cargo.toml`, `Cargo.lock` y
   `package.json` juntos.
2. **Commit**: `git commit -am "chore: versión 0.2.0"` y `git push`. Espera a que el CI pase.
3. **Tag con las notas**. El mensaje del tag es lo que trae la versión: va al Release y a lo que Glup
   muestra en Ajustes (cambiar el texto del borrador después no cambia lo que ve Glup).

   ```bash
   git tag -a v0.2.0 -m "- Herramientas: el catálogo completo
   - Arreglos en la isla"
   ```

4. **Push del tag**: `git push origin v0.2.0`. El workflow `Release` compila y deja un **borrador**
   con el instalador `.exe` (NSIS, el único) y `latest.json`. Falla si el tag no coincide con `Cargo.toml`.
5. **Revisar el borrador** en GitHub › Releases: que estén los archivos (también los `.sig`), instalar
   el `.exe` y probarlo.
6. **Publicarlo** («Publish release»). Desde ese momento las copias instaladas lo ven como versión
   nueva (lo revisan al arrancar y cada 6 horas, o con «Buscar actualizaciones» en Ajustes).

La firma usa los secretos `TAURI_SIGNING_PRIVATE_KEY` y `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Si se
pierde la clave privada, las copias instaladas ya no pueden actualizarse solas: guárdala bien.
