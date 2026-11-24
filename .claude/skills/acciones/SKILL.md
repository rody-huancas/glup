---
name: acciones
description: Cómo se agrega o cambia una acción sobre archivos en Glup, de punta a punta - definición en actions.json, cuándo aparece según el tipo y la cantidad de archivos, pasos intermedios (formatos, niveles, ordenar, elegir páginas), servicio en Rust, nombres de salida, carpeta de destino, ZIP, progreso, cancelación, red de seguridad, resultado en el panel, historial y herramientas rápidas. Úsala ante «agrega una acción», «nueva herramienta», «convertir X a Y», «que Glup haga…», o al revisar un PR que toque modules/actions, modules/pdf, modules/sign o src-tauri/src/services. Va junto con convenciones, desktop-ui y tauri-rust.
---

# Acciones de Glup

Una **acción** es lo que Glup hace con los archivos que le sueltas: convertir, reducir peso, unir,
separar, firmar, juntar en ZIP… Todas siguen el mismo recorrido, para que la persona siempre vea lo
mismo: suelta, Glup come, elige, Glup trabaja, resultado.

## El recorrido

1. **Soltar o elegir archivos.** La cantidad se muestra al instante; mientras Rust lee la
   información (`get_files_info`, solo metadatos y los primeros bytes) se ve un skeleton y Glup
   mastica.
2. **Elegir la acción.** Las acciones posibles salen de `modules/actions/constants/actions.json`
   según el tipo de archivo (`pdf`, `image`, `pdf-mixed`, `any`) y la cantidad
   (`single`, `multiple`, `any`). Una es la principal (botón mint).
3. **Paso intermedio** (opcional): elegir formato, nivel, orden de archivos o páginas. Con "Volver".
   Mientras hay un paso con lista o cuadrícula, la isla queda fijada. Las acciones que necesitan una
   pantalla entera (Firmar, Organizar páginas) ocultan el menú lateral, retienen la isla
   (`panel.fullScreen`) y preguntan antes de salir si hay cambios.
4. **Guardar en**: misma carpeta, carpeta "Glup" junto al original o una carpeta elegida. Se elige
   **antes** de ejecutar y se recuerda en `settings.json`. Con varios archivos, el interruptor
   «Entregar todo en un ZIP».
5. **Trabajar**: tarea en segundo plano con su etapa en palabras llanas, barra y Cancelar:
   «Descargando lo que necesito… 120 de 514 MB» → «Comprobando la descarga…» → «Preparándome…» →
   la acción («Pasando a texto… 35 %», «N de M») → «Guardando…». La barra solo se llena mientras algo
   se cuenta; si no, se mueve sola, y nunca queda llena y quieta. Si la acción necesita descargar algo
   la primera vez, primero se eligen las opciones, después se pide permiso y «Descargar» lanza **una
   sola tarea** (descarga y acción), con una sola tarjeta y un solo Cancelar (`withLearning`). Las
   palabras de cada acción van en `WORKING_TEXTS` y las de las etapas en `STAGE_TEXTS`. La isla puede
   recogerse; la tarea sigue y avisa al terminar.
6. **Resultado**: al terminar avisa una sola vez (toast en el panel o notificación de Windows, ver
   `isla-y-mascota`). Glup feliz, «Listo · de 2,4 MB a 680 KB», con Abrir y Ver en carpeta. Errores
   parciales con Glup confundido y los nombres que fallaron. Se guarda en el historial.

## Agregar una acción, paso a paso

1. **Definirla** en `actions.json`: `id` en inglés, `label` en español, `fileType`, `fileCount`,
   `primary`. Si todavía no está implementada, se muestra con «Esto lo aprendo pronto» (lista de
   implementadas en `constants/implemented.ts`).
2. **Paso intermedio**, si lo necesita: un componente en el módulo que corresponde (`actions`,
   `pdf`, `sign`) y su estado en el flujo de `useActionSelection`. Las opciones viajan en `options`.
3. **Servicio en Rust** en `services/<área>/<acción>.rs`, puro en lo posible, con su `struct …Params`.
   Lo despacha `services/actions.rs` según el `action_id`.
4. **Nombre de salida** con un `OutputKind` de `services/naming.rs` (agregar uno nuevo si hace
   falta, con su prueba). Nombres en español y con guiones: `contrato-unido.pdf`,
   `foto-comprimida.jpg`, `contrato-paginas/`.
5. **Progreso y cancelación** (skill `tauri-rust`, reglas 3 y 4). Varios archivos independientes, en
   paralelo con el límite de `parallel.rs`.
6. **Red de seguridad** si la salida tiene pérdida, y «no guardar si no mejora» si la acción busca
   bajar el peso (skill `tauri-rust`, regla 10). El mensaje explica por qué en lenguaje simple.
7. **Resultado y textos**: el resumen en `utils/result.ts` y los textos en `constants/texts.ts`
   (`RESULT_TEXTS`). El detalle del historial («Peso reducido: de 3,8 MB a 1,6 MB», «Unido · 3
   archivos · 24 páginas»).
8. **Herramientas**: toda acción se agrega al catálogo `modules/tools/constants/tools.json` (sección,
   ícono, nombre y descripción corta; `actionId` igual al de `actions.json`). Si merece acceso directo
   en Inicio, lleva `quickTitle` y aparece en Herramientas rápidas. Pasa por el mismo flujo que el
   drop (nunca ejecuta a ciegas).
9. **Pruebas**: Rust con archivos generados (casos normales, nombres repetidos, cancelación, archivos
   raros), y Vitest para la lógica del paso intermedio.

## Reglas de las acciones

- **El original nunca se toca.** Siempre un archivo nuevo, en el destino elegido.
- **Nada sale de la computadora.** Ninguna acción usa servicios en línea.
- **Formatos y casos raros**: un archivo protegido con contraseña, roto o en un formato que no se
  puede leer se informa con un texto claro («Este PDF tiene contraseña, todavía no puedo abrirlo») y
  las demás piezas del lote siguen.
- **Licencias**: una acción que necesita una librería nueva cumple la skill `convenciones`, regla 12.
  Si la única forma es una librería GPL/AGPL, la acción no se hace así: se discute en un issue.
- **Contraseñas**: viajan solo en las opciones de la tarea, nunca se guardan (ni en `settings.json`,
  ni en el historial, ni en logs) y Rust no las imprime. «Quitar contraseña» solo funciona con la
  contraseña correcta (se comprueba antes con `check_pdf_password`): nada de adivinar ni forzar. El
  cifrado es AES-256 (PDF 2.0, revisión 6) con lopdf y una clave aleatoria (`getrandom`).
- **Fotos de iPhone (HEIC/HEIF) y AVIF**: entran en todas las herramientas de imágenes. Las abre
  Windows con sus extensiones de Microsoft Store («Extensiones de imagen HEIF» + «Extensiones de vídeo
  HEVC», «Extensión de vídeo AV1»); si no puede, el mismo FFmpeg de los videos. Antes de una acción, si
  Windows no puede y FFmpeg no está, se pide descargarlo (`photos` en `LEARNABLES`, el mismo FFmpeg)
  y corre en la misma tarea. Siempre derechas, la principal de una ráfaga, el mosaico entero y en
  sRGB. Las miniaturas las hace Rust (`get_image_preview`): el webview no muestra HEIC.
- **Fecha y ubicación**: Convertir, Reducir peso y A JPG guardan en la salida la fecha de la foto, la
  cámara y, solo si «Quitar ubicación» está apagado (encendido por defecto, en `settings.json` como
  `keepLocation`), el GPS. Solo JPG, PNG y WebP; AVIF, ICO y PDF no llevan EXIF.
- **Videos**: FFmpeg (LGPL, aparte; skill `convenciones`, regla 12) con `h264_mf` y `aac`, nunca
  `libx264`. Todo lo que decide (tamaño de imagen, tasas de bits, argumentos) es puro en
  `services/video/plan.rs`; el proceso se lanza en `encode.rs`, con progreso leído de `-progress` y
  Cancelar que lo detiene y borra el archivo a medias. Uno a la vez.
- **Sacar texto**: el OCR de Windows (`Windows.Media.Ocr`, crate `windows`) desde Rust; nada que
  descargar. En un PDF, las páginas con texto seleccionable las lee pdf.js tal cual y solo las
  escaneadas se renderizan y pasan por el OCR. Rust arma el texto (`services/text/compose.rs`, por
  archivo y «Página N») y lo guarda como `.txt`. Fuera de Windows la acción no aparece
  (`PLATFORM_ACTIONS`).
- **Texto sobre las páginas** (marca de agua, números): `services/pdf/stamp.rs` lo dibuja encima del
  contenido, derecho como se ve la página (respeta `/Rotate` y el recuadro), con Helvetica estándar
  (sin incrustar fuentes). La vista previa del paso usa los mismos números que Rust.
- **Lenguaje**: los nombres de acciones son verbos cortos («Reducir peso», «Unir», «A imágenes»).
  «Comprimir» no se usa para bajar el peso, porque se confunde con ZIP.

## Acciones existentes (referencia)

| Tipo | Acciones |
| --- | --- |
| Imagen (también HEIC/HEIF y AVIF) | Convertir (WebP, JPG, PNG, AVIF, ICO), Reducir peso (un HEIC sale en JPG), A PDF, Quitar fondo (transparente PNG o blanco JPG; la primera vez pide descargar el modelo) |
| Solo HEIC/HEIF (1+) | A JPG («Fotos de iPhone a JPG» en Herramientas y en Inicio: calidad Normal, Alta o Liviana; red de seguridad que compara con la foto) |
| PDF (1) | Reducir peso (Normal, Al máximo, peso objetivo), Firmar, Separar páginas, Organizar páginas (girar, quitar y reordenar), A imágenes, Poner contraseña, Marca de agua, Numerar páginas, Sacar imágenes |
| PDF con contraseña (1) | Quitar contraseña (la única; con otros archivos se rechaza: «Primero quítale la contraseña») |
| PDF (2+) | Unir, Reducir peso, Poner contraseña, Marca de agua, Numerar páginas, Juntar en ZIP |
| PDF + imágenes | Unir en un PDF, Juntar en ZIP |
| Video (1+) | Reducir peso (Para WhatsApp, Para correo, Lo más liviano o un peso máximo; la primera vez pide descargar FFmpeg) |
| Imagen (1) | Foto tamaño carnet (pasaporte 3,5 × 4,5, cuadrada 5 × 5 o a medida; foto y hoja 10 × 15 a 300 ppp; usa el modelo de Quitar fondo y el detector de rostros de Windows) |
| Audio (1+) y video (secundaria) | Pasar audio a texto (Whisper con la tarjeta de video si hay una que sirva —`glup-voz.exe`, Vulkan— y si no con el procesador; Ajustes › «Usar la tarjeta de video»: Automático o Nunca; el progreso dice con cuál; Rápido o Más preciso, cada nivel con su descarga; texto, .txt y .srt) |
| Imágenes, PDFs o ambos | Sacar texto (solo Windows: el OCR que trae el sistema; el resultado se lee en el panel, se copia o se guarda como .txt) |
| Cualquier mezcla (2+) | Juntar en ZIP |
| Sin archivos (Herramientas y su atajo) | Portapapeles (solo Windows, apagado hasta que se activa: recuerda textos e imágenes copiados, cifrados en la PC, para buscarlos y copiarlos de nuevo; no es una acción sobre archivos) |
| Sin archivos (Herramientas › Tu PC) | Rendimiento (solo lectura y cosas reversibles: uso de procesador, memoria y disco con frases, espacio de cada disco con enlace a Limpieza, batería y su salud, tiempo encendida; las 5 apps que más usan, agrupadas por app, con «Cerrar» que pide confirmación y solo después ofrece forzar, nunca Windows ni Glup; «Al encender la PC» con interruptores sobre StartupApproved, como el Administrador de tareas. Lee cada 2 s solo con el panel abierto. Nada de «liberar RAM», limpiar el registro ni «acelerar») |
| Sin archivos (Herramientas › Tu PC) | Ordenar una carpeta (Descargas por defecto u otra elegida: sus archivos sueltos a subcarpetas por tipo — `services/folder_sort/categories.json` — o por año y mes; vista previa obligatoria, «Ordenar» como tarea con progreso y Cancelar, y «Deshacer» en el resultado, el aviso y el Historial. Ver abajo) |
| Sin archivos (Herramientas, atajo o bandeja) | Copiar texto de la pantalla (solo Windows: se elige una zona sobre una imagen congelada y su texto va al portapapeles; no es una acción sobre archivos. El texto queda en el historial local para verlo y «Copiar de nuevo», salvo que se apague en Ajustes) |

## Ordenar una carpeta

No es una acción sobre archivos soltados: es una pantalla de Herramientas › Tu PC (`modules/folder-sort`,
`services/folder_sort/`), con el mismo recorrido de tarea (progreso, Cancelar, aviso, historial).

- **Qué se mueve**: solo los archivos sueltos de la carpeta; no entra en subcarpetas ni mueve
  carpetas ni accesos directos simbólicos. **No toca** descargas en curso (extensiones de
  `downloading` en `categories.json`: `.crdownload`, `.part`, `.tmp`, `.opdownload`…), archivos en
  uso (se prueba abrirlos sin compartir), ocultos o del sistema, ni los modificados hace menos de
  2 minutos. Lo que salta lo cuenta con su motivo.
- **Por tipo**: las carpetas y sus extensiones viven en `categories.json` (no en el código):
  Imágenes, PDFs, Documentos, Hojas de cálculo, Presentaciones, Videos, Audio, Comprimidos,
  Instaladores y «Otros» para lo demás. **Por fecha**: «2026» › «11 - Noviembre», según la fecha de
  modificación (mes con dos cifras para que se ordenen bien).
- **Vista previa obligatoria** (`preview_folder_sort`): un resumen por carpeta destino, desplegable,
  y lo que se salta. Rust guarda ese plan; `sort_folder` mueve **solo** ese plan, una vez, y antes
  de cada archivo comprueba que sigue igual (tamaño, fecha, no en uso).
- **Mover**: renombrar sin reemplazar (`MoveFileExW` sin `REPLACE_EXISTING`); a otro disco, copia
  nueva, comparación byte a byte y recién entonces se borra el original. Nombres con
  `OutputKind::Same` de `naming.rs` («contrato (2).pdf»).
- **Registro y Deshacer**: antes de mover el primer archivo se escribe `orden/<id>.json` (sin
  terminar) en la carpeta de datos, y cada paso se agrega al momento como una línea de
  `orden/<id>.log`: la carpeta creada, el movimiento **antes** de hacerlo (pendiente, con su destino
  exacto) y después (hecho o fallido). Al recuperar, un pendiente sin cerrar cuenta como movido solo
  si el archivo ya no está en el origen y está en el destino con su tamaño; si sigue en el origen, no
  se toca. Al terminar, todo queda en un solo `<id>.json` terminado.
  «Deshacer» devuelve cada archivo a su lugar y nombre, del último al primero; si ya no está (o es
  otro) o su lugar está ocupado, lo salta y lo dice. Borra solo las subcarpetas que creó Glup y solo
  si quedaron vacías. Cancelado a medias, lo que falta queda para otro «Deshacer».
- **Historial**: la entrada (id `orden-<id>`) se crea al empezar como «Ordené Descargas» · «120
  archivos · en curso» y se actualiza al terminar («120 archivos en 7 carpetas», con el registro en
  `undo` hasta que se deshace: «… · deshecho»). Si no movió nada, se quitan la entrada y el registro.
- **Glup cerrado a la mitad**: al iniciar, `spawn_recovery` busca en `orden/` los registros sin
  terminar; cada uno se da por terminado y su entrada queda (o se crea) como «se interrumpió (40 de
  120)», con «Deshacer». Uno que no llegó a mover nada se borra sin entrada.

## Checklist

- [ ] Definida en `actions.json` y visible solo cuando aplica.
- [ ] Respeta «Guardar en» y el ZIP cuando hay varias salidas.
- [ ] Progreso, cancelación y resultado como las demás.
- [ ] Original intacto; nombres con `naming.rs`.
- [ ] Red de seguridad si hay pérdida.
- [ ] Historial con un detalle claro.
- [ ] Pruebas en Rust y, si hay paso intermedio, en Vitest.
