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

### Las copias de los modelos (models-v1)

Glup descarga sus modelos primero del release `models-v1` de este repositorio y, si no están ahí, de su
origen (Hugging Face, en una revisión fija). En los dos casos comprueba el SHA-256 de cada archivo. La
lista de cada modelo (nombre, copia, origen, hash y peso) está en `background/model.rs`,
`transcribe/model.rs` y `upscale/model.rs`, y una prueba revisa que cada copia apunte a `models-v1`.
FFmpeg se sigue bajando de BtbN/FFmpeg-Builds: por qué, en `THIRD_PARTY_NOTICES.md`.

Para publicar las copias (o agregar un modelo nuevo):

1. Junta en una carpeta fuera del repo (por defecto `Downloads\glup-espejo`) cada modelo con el nombre
   que tiene en el código, bajado de su URL de origen; su licencia original (`<modelo>-LICENSE.txt`,
   tomada del commit exacto) y un `<modelo>-README.md` con su origen: repositorio, revisión y autor.
2. Con el CLI de GitHub (`gh auth login` una vez), corre:

   ```powershell
   .\scripts\publish-models.ps1            # agrega -WhatIf para ver qué haría sin subir nada
   ```

   Comprueba cada modelo contra el SHA-256 del código, escribe `SHA256SUMS.txt` y crea el release
   `models-v1` marcado como «no es la última versión» (no es una versión de Glup), con todo adentro. Si
   el release ya existe, sube solo lo que falte; nunca reemplaza un archivo.
3. Un modelo nuevo: agrégalo también a la lista del script (una prueba revisa que coincidan) y a
   `THIRD_PARTY_NOTICES.md`.

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
`?scene=desktop` (la isla sobre un escritorio) y `?scene=mascot` (Glup solo, para el logo). Si una pantalla pide un dato que el demo no tiene, la
consola dice `[glup:demo] sin datos para …`.

`pnpm docs:shots` vuelve a sacar todas las imágenes de `docs/images` con esa interfaz: maneja el Edge que
trae Windows con `playwright-core` (sin descargar navegadores) y usa el FFmpeg que Glup descargó para los
videos (o el de `GLUP_FFMPEG`). Deja WebP para las capturas y GIF y MP4 para el clip, y no deja nada
corriendo ni archivos temporales.
Con nombres, rehace solo esas: `pnpm docs:shots inicio isla-abierta glup logo` (`glup` es el GIF y el MP4;
`logo`, el Glup del README, armado por la app con sus capas: cuerpo, ojos, boca, brazos y patitas;
`icono`, el ícono de la app desde ese mismo Glup, con `tauri icon`; `insignias`, las del README).

Las insignias del README son SVG propios (`docs/images/badges`, sin servicios de afuera), hechos por
`scripts/badges.mjs` con la versión de `Cargo.toml`: `pnpm version:set` las vuelve a escribir solo. El
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

Solo Windows por ahora. La versión vive en `apps/desktop/src-tauri/Cargo.toml` (Tauri la lee de ahí);
`Cargo.lock`, `apps/desktop/package.json` y la insignia de versión del README la siguen.

1. **Subir la versión** en `master`: `pnpm version:set 0.2.0` (cambia todo junto, o nada si algo falta).
2. **Escribir las notas** en `.github/release-notes.md`, en palabras llanas: van al Release y a lo que
   Glup muestra en Ajustes al avisar de la actualización. `{version}` se cambia por el número.
3. **Commit y push**: `git commit -am "chore: versión 0.2.0"` y `git push`. Espera a que el CI pase:
   arma el mismo instalador que el Release (en debug y sin firmar), con `glup-voz.exe` adentro.
4. **Tag y push del tag**: `git tag v0.2.0` y `git push origin v0.2.0`. El workflow `Release` compila
   `glup-voz.exe` y Glup en release y deja un **borrador** con `Glup-0.2.0-Windows.exe`, su `.sig` y
   `latest.json` (Tauri lo llama `Glup_0.2.0_x64-setup.exe`; el paso «Installer name» lo renombra y
   corrige `latest.json`); al final comprueba que estén los tres, que no quede el nombre de Tauri y que
   `latest.json` apunte a ese instalador.
   Falla si el tag no coincide con `Cargo.toml`.
5. **Revisar el borrador** en GitHub › Releases: los tres archivos, las notas, e instalar el `.exe` y
   probarlo.
6. **Publicarlo como la última versión**: `gh release edit v0.2.0 --draft=false --latest` (o en la web,
   «Publish release» con «Set as the latest release» marcado). Tiene que ser la última: Glup busca
   `releases/latest/download/latest.json`, y el release `models-v1` (los modelos) nunca debe ganarle.
   Desde ese momento las copias instaladas ven la versión nueva (al arrancar, cada 6 horas o con «Buscar
   actualizaciones» en Ajustes).

La firma del actualizador usa los secretos `TAURI_SIGNING_PRIVATE_KEY` y
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`; la clave pública está en `tauri.conf.json`. Si se pierde la clave
privada, las copias instaladas ya no pueden actualizarse solas: guárdala bien.
