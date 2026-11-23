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
5. **Trabajar**: tarea en segundo plano con progreso («N de M»), barra y Cancelar. La isla puede
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
| Imagen | Convertir (WebP, JPG, PNG, AVIF, ICO), Reducir peso, A PDF, Quitar fondo (transparente PNG o blanco JPG; la primera vez pide descargar el modelo) |
| PDF (1) | Reducir peso (Normal, Al máximo, peso objetivo), Firmar, Separar páginas, Organizar páginas (girar, quitar y reordenar), A imágenes, Poner contraseña, Marca de agua, Numerar páginas, Sacar imágenes |
| PDF con contraseña (1) | Quitar contraseña (la única; con otros archivos se rechaza: «Primero quítale la contraseña») |
| PDF (2+) | Unir, Reducir peso, Poner contraseña, Marca de agua, Numerar páginas, Juntar en ZIP |
| PDF + imágenes | Unir en un PDF, Juntar en ZIP |
| Video (1+) | Reducir peso (Para WhatsApp, Para correo, Lo más liviano o un peso máximo; la primera vez pide descargar FFmpeg) |
| Imagen (1) | Foto tamaño carnet (pasaporte 3,5 × 4,5, cuadrada 5 × 5 o a medida; foto y hoja 10 × 15 a 300 ppp; usa el modelo de Quitar fondo y el detector de rostros de Windows) |
| Imágenes, PDFs o ambos | Sacar texto (solo Windows: el OCR que trae el sistema; el resultado se lee en el panel, se copia o se guarda como .txt) |
| Cualquier mezcla (2+) | Juntar en ZIP |

## Checklist

- [ ] Definida en `actions.json` y visible solo cuando aplica.
- [ ] Respeta «Guardar en» y el ZIP cuando hay varias salidas.
- [ ] Progreso, cancelación y resultado como las demás.
- [ ] Original intacto; nombres con `naming.rs`.
- [ ] Red de seguridad si hay pérdida.
- [ ] Historial con un detalle claro.
- [ ] Pruebas en Rust y, si hay paso intermedio, en Vitest.
