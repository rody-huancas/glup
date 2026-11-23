---
name: tauri-rust
description: Reglas obligatorias del lado nativo de Glup (apps/desktop/src-tauri, Rust + Tauri 2) - comandos, servicios, estado compartido, tareas en segundo plano con progreso y cancelación, procesamiento en paralelo, errores en español, seguridad de archivos, ventana de la isla, crates permitidos y pruebas. Úsala al crear, modificar o revisar cualquier cosa en src-tauri - «nuevo comando», «procesa esto en Rust», «agrega un crate», «por qué se congela la isla», «escribe una prueba en Rust». Va siempre junto con la skill convenciones; para una acción sobre archivos, suma la skill acciones.
---

# Lado nativo de Glup (apps/desktop/src-tauri)

**Antes, la skill `convenciones`.** Aquí solo va lo propio de Rust y Tauri.

## Estructura

```text
src-tauri/
├── Cargo.toml          Dependencias; perfiles dev optimizados para los crates de imagen
├── tauri.conf.json     Ventana de la isla, bandeja, permisos, actualizador (sin versión: la lee de Cargo.toml)
├── tauri.release.conf.json  Solo para el workflow Release: genera los archivos firmados del actualizador
├── capabilities/       Permisos de Tauri por ventana
└── src/
    ├── main.rs         Solo llama a lib::run
    ├── lib.rs          Builder: plugins, estado compartido (.manage) y registro de comandos
    ├── commands/       Un archivo por área: los #[tauri::command], delgados
    └── services/       La lógica, por área
        ├── <área>.rs                    Un concepto por archivo (naming.rs, destination.rs…)
        └── <área>/mod.rs + tests.rs     Áreas grandes en carpeta (image/, pdf/)
```

## Reglas obligatorias

1. **Comandos delgados.** Un `#[tauri::command]` en `commands/<área>.rs` recibe la petición, delega
   en `services/` y convierte el resultado. No contiene lógica de negocio. Todo comando nuevo se
   registra en `lib.rs` y su nombre se agrega a `src/shared/constants/events.ts` del frontend.
2. **Nunca bloquear la interfaz.** El trabajo pesado (imágenes, PDFs, ZIP, recorrer carpetas) corre
   en `tauri::async_runtime::spawn_blocking` o en un hilo aparte. Los comandos que hacen E/S son
   `async`.
3. **Tareas.** Una acción larga se registra al empezar (`tasks::start`) y guarda su resultado al
   terminar (`tasks::finish`), aunque nadie esté escuchando: así sobrevive a que la isla se recoja.
   El progreso se emite como evento (`ACTION_PROGRESS_EVENT`) con «N de M» y lo que se está haciendo.
4. **Cancelación** con una bandera compartida (`ActionControl`) que se revisa entre archivos o
   páginas. Al cancelar: lo que ya terminó se conserva y se informa; un archivo único a medio
   escribir (un ZIP o un PDF unido) se borra.
5. **Paralelismo** con `rayon`, limitado por `services/parallel.rs` (la mitad de los núcleos, mínimo
   1 y máximo 8) para que la PC no se ponga lenta. Lo que depende del orden (páginas de un PDF) va en
   secuencia.
6. **Errores.** Las funciones devuelven `Result`. Nada de `unwrap()`, `expect()` ni `panic!` fuera
   de las pruebas. Los errores que pueden llegar a la pantalla van en español llano y salen de
   constantes, no de `error.to_string()` de una librería (ese detalle va al log).
7. **Parámetros agrupados** en un `struct <Algo>Params` cuando son más de 2 (skill `convenciones`,
   regla 5). Las peticiones de los comandos son structs con `#[derive(Deserialize)]` y
   `#[serde(rename_all = "camelCase")]`; las respuestas, con `Serialize` y el mismo renombrado.
8. **Funciones puras y efectos inyectados.** Lo que decide (nombres de salida, rangos, cálculos de
   tamaño, regiones de la ventana) es puro; el acceso al disco o al sistema se pasa como parámetro
   (por ejemplo `exists: impl Fn(&Path) -> bool` en `naming::output_path`) para poder probarlo.
9. **Seguridad de archivos** (skill `convenciones`, regla 10): nunca se abre un original para
   escritura. Los resultados van a la carpeta de destino elegida (`services/destination.rs`) con el
   nombre de `services/naming.rs`, que nunca sobrescribe (agrega « (2)», « (3)»). Los intermedios van
   a una carpeta temporal que se borra al terminar.
10. **Recompresión con red de seguridad.** Toda salida con pérdida (JPEG, imágenes dentro de un PDF)
    se compara con la original antes de reemplazarla; si difiere más del umbral o no se puede
    decodificar con seguridad, se conserva la original. Un resultado que no pesa menos no se guarda.
11. **Estado compartido** con `.manage()` en `lib.rs` y `State<T>` en los comandos; tipos con
    `Mutex`/atómicos. Lo que se guarda entre usos (`settings.json`, `history.json`, firmas) vive en la
    carpeta de datos de la app (`app_data_dir`), nunca junto al ejecutable.
12. **Ventana de la isla.** El tamaño y la región visible se manejan en `services/island_window.rs`,
    expuestos con el comando `set_island_area` (`commands/island.rs`); los vigilantes (`island_watchdog.rs`) corrigen desajustes. Las APIs de
    Windows van detrás de `#[cfg(windows)]`, con una versión vacía para los demás sistemas.
13. **Crates.** Solo licencias permisivas (skill `convenciones`, regla 12). Preferir crates en Rust
    puro; un crate que necesita una librería de C instalada aparte en Windows se discute antes.
    Excepción acordada: `ort` (ONNX Runtime, para «Quitar fondo»), que baja ONNX Runtime ya compilado
    al compilar y lo enlaza estático; no hay que instalar nada aparte ni empaquetar DLLs (DirectML lo
    trae Windows). La sesión del modelo vive en `services/background/session.rs`: se carga una vez,
    prueba la tarjeta gráfica con caída al procesador y se libera tras 5 minutos sin uso. Los
    crates pesados de imagen llevan `opt-level = 3` en `[profile.dev.package.*]`.
    Actualizaciones con `tauri-plugin-updater`, todo desde Rust (`services/updates.rs`): revisa al
    arrancar y cada 6 horas (en debug solo con `GLUP_UPDATE_CHECK=1`), guarda lo encontrado en
    `UpdateState` y lo instala con «Actualizar ahora». La versión vive solo en `Cargo.toml`
    (`pnpm version:set`). `getrandom` da la clave aleatoria de «Poner contraseña»; el cifrado AES-256
    lo hace lopdf.
    Videos: `ffmpeg.exe` se descarga una vez a `tools/` (solo sus bytes dentro del ZIP del build, con
    un `Range`; `flate2` lo descomprime) y se ejecuta como proceso aparte, sin ventana
    (`encode::hide_window`). Nunca se enlaza: ver la regla 12 de `convenciones`.
14. **Pruebas.** `#[cfg(test)] mod tests` en el mismo archivo, o `tests.rs` en las áreas con carpeta.
    Los archivos de prueba (imágenes, PDFs, ZIP) se generan por código en una carpeta temporal y se
    borran al terminar. Lo que verifica calidad visual compara contenido (por ejemplo error medio
    por canal), no solo el peso.
15. **Formato manual** (sin `cargo fmt`), 4 espacios, constantes y brazos de `match` alineados,
    comentarios esenciales en inglés.

## Cómo se ve un comando

```rust
#[tauri::command]
pub async fn run_action(app: AppHandle, request: ActionRequest) -> Result<ActionReport, String> {
    let task = request.task_id.clone();

    if let Some(task) = &task {
        tasks::start(&app, task, &request.action_id);
    }

    let worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || actions::run(&worker, request))
        .await
        .map_err(|error| error.to_string())
        .and_then(|result| result);

    if let Some(task) = &task {
        tasks::finish(&app, task, &result);
    }

    result
}
```

## Espacio en disco

- `[profile.dev]` usa `debug = "line-tables-only"`: los errores muestran archivo y línea, y `target`
  pesa mucho menos. Los crates de imagen y `ort` siguen con `opt-level = 3`.
- Si en la tarea se corrió `cargo test` o se compiló en release (`cargo build --release`,
  `cargo test --release`, `tauri build`), al terminarla se corre `cargo clean` (todo `target`, no
  solo `--release`): las compilaciones de prueba también pesan varios GB. Antes se detienen
  `glup.exe` y `tauri dev` si están corriendo, porque bloquean archivos de `target`.
- Al terminar una tarea no quedan copias del proyecto (worktrees, clones), carpetas de compilación
  extra (otro `CARGO_TARGET_DIR`) ni archivos temporales pesados.

## Checklist de un cambio en Rust

- [ ] Comando delgado, registrado en `lib.rs` y con su nombre en `events.ts`.
- [ ] Trabajo pesado fuera del hilo principal, con progreso y cancelación si tarda.
- [ ] Sin `unwrap`/`expect` fuera de pruebas; errores visibles en español.
- [ ] Ningún original modificado; nombres de salida con `naming.rs`.
- [ ] Pruebas con archivos generados en una carpeta temporal.
- [ ] `cargo check` y `cargo test` sin errores ni warnings.
- [ ] `cargo clean` al terminar si se corrió `cargo test` o se compiló en release; sin copias del
      proyecto ni carpetas de compilación extra.
