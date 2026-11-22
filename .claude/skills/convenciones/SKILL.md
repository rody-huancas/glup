---
name: convenciones
description: Reglas transversales obligatorias de todo el repo de Glup (apps/desktop/src, apps/desktop/src-tauri, apps/web y la raíz) - idioma del código y de los textos, formato manual con alineación, nombres, arrow functions, imports, parámetros agrupados, comentarios y código reemplazado, licencias de dependencias, seguridad de los archivos de la persona y lo que nunca se hace. Úsala SIEMPRE antes de crear, mover, modificar o revisar cualquier archivo, junto con la skill de la parte que toques. Actívala también ante «dónde pongo esto», «crea un archivo», «agrega una librería», «revisa este PR» o «por qué está así».
---

# Convenciones de Glup

Valen para **todo** el repo. Las skills `desktop-ui` y `tauri-rust` solo concretan lo propio de cada
lado. Si dos reglas parecen chocar, se pregunta.

## Reglas obligatorias

1. **Idioma.**
   - El **código va en inglés**: variables, funciones, tipos, componentes, archivos, carpetas,
     comandos de Tauri, eventos, claves de JSON, ramas y nombres de pruebas.
   - **Todo lo que lee una persona va en español**: textos de la interfaz, mensajes de error que
     pueden llegar a la pantalla, nombres de archivos de salida (`foto-comprimida.jpg`,
     `contrato-unido.pdf`) y la documentación (`README.md`, `CLAUDE.md`, skills).
   - Los **comentarios** del código van en inglés.
   - Lenguaje llano en la interfaz: sin jerga técnica, siglas ni nombres de tecnologías. Glup habla
     en primera persona y con calidez («Esto lo aprendo pronto», «Ya pesaba poco»).
2. **Formato manual, nunca automático.** Nada de formato al guardar, `prettier --write`,
   `cargo fmt` ni `eslint --fix` masivo sobre código existente: deshacen la alineación. Se revisa
   siempre el diff.
3. **Alineación en columnas.** Las propiedades de objetos, interfaces y structs, y las asignaciones
   consecutivas, se alinean con espacios. En TypeScript, los dos puntos de las propiedades también se
   alinean:

   ```ts
   interface PickFilesParams {
     type     : DialogFileType;
     multiple : boolean;
   }

   const exponent  = Math.floor(Math.log(bytes) / Math.log(FILE_SIZE_BASE));
   const unitIndex = Math.min(exponent, FILE_SIZE_UNITS.length - 1);
   ```

   ```rust
   pub const COMPRESSED_SUFFIX: &str = "comprimida";
   pub const BATCH_PDF_PREFIX: &str  = "imagenes";
   ```

   Los imports **no** se alinean. Indentación: 2 espacios en TypeScript, CSS y JSON; 4 en Rust.
4. **Arrow functions siempre** en TypeScript, asignadas a `const` y tipadas. Se permite el retorno
   implícito cuando el cuerpo es una sola expresión. Nada de `function`, `any` ni `!` para callar al
   compilador. Uniones con `as const` o `type`, nunca `enum` de TypeScript.
5. **Parámetros agrupados.** Una función con **más de 2 parámetros** recibe un único objeto tipado y
   lo desestructura: en TypeScript una `interface <Algo>Params`; en Rust un `struct <Algo>Params`.
   Firmas cortas y legibles.
6. **Imports**, uno por línea y sin alinear:
   - TypeScript: primero `react` y las librerías externas (`@tauri-apps/*`, `gsap`, `pdfjs-dist`…),
     después el código propio con el alias `@/`, ordenado por ruta. Nunca rutas relativas
     (`./`, `../`). Los tipos con `import type`.
   - Rust: `std`, luego crates externos, luego `crate::`, en bloques separados por una línea.
7. **Comentarios: solo los esenciales.** Explican el porqué que el código no dice (un caso borde, una
   decisión, una limitación de una librería), en inglés y en una o dos líneas. Nada de comentar lo
   obvio.
8. **El código reemplazado se deja comentado** justo al lado del nuevo, para comparar en el diff. Un
   módulo o pantalla retirados enteros van a la carpeta `legacy/` de su app, fuera del código que se
   compila, con un `README.md` que diga qué es y por qué se retiró.
9. **Nada de dominio inventado.** Si una función del producto, un texto o un comportamiento no está
   definido, se pregunta antes de implementarlo. En la interfaz, un hueco se muestra honesto
   («Esta parte la estoy preparando»), nunca con datos falsos.
10. **Los archivos de la persona son sagrados.** Nunca se modifica, sobrescribe ni borra un archivo
    original. Los resultados se escriben como archivos nuevos (ver skill `acciones`). Lo que se borra
    a pedido de la persona va a la papelera, nunca se elimina directo.
11. **Todo es local.** Ninguna función envía archivos ni datos de la persona a internet. Las funciones
    con IA (futuras) son opcionales, usan la clave de la propia persona y lo dicen claramente.
12. **Licencias.** Glup es MIT. Solo se agregan dependencias con licencias permisivas: MIT,
    Apache-2.0, BSD, ISC, Zlib, Unicode; fuentes con OFL. **Prohibidas** GPL, AGPL y LGPL enlazada
    estáticamente (por ejemplo Ghostscript o MuPDF). Una dependencia nueva se justifica en el PR:
    qué resuelve, su licencia y si complica la compilación en Windows.
13. **Accesibilidad y movimiento.** Todo lo interactivo es un `<button>`, `<a>` o `<input>` real,
    usable con teclado y con foco visible (`:focus-visible`). Toda animación respeta
    `prefers-reduced-motion`.
14. **Pruebas.** La lógica pura (cálculos, nombres de salida, rangos, coordenadas, máquinas de
    estado) lleva pruebas: Vitest en TypeScript y `#[cfg(test)]` en Rust. Las pruebas generan sus
    propios archivos en una carpeta temporal; nunca usan archivos reales de nadie ni los suben al repo.
15. **No hagas commits ni push** salvo que la persona lo pida.

## Antes de dar algo por terminado

```bash
pnpm --filter desktop typecheck
pnpm --filter desktop test
cd apps/desktop/src-tauri && cargo check && cargo test
```

Sin errores ni warnings. Lo que no se puede probar automáticamente (animaciones, arrastrar archivos
desde el Explorador, la ventana real) se lista en el PR como «qué probar a mano».

## Ramas y commits

- Rama principal: `master`. Ramas en inglés: `feature/<nombre>`, `fix/<nombre>`, `chore/<nombre>`.
- Commits convencionales en español: `feat: firmar PDF`, `fix: la isla no reaparecía tras una tarea`,
  `chore: actualizar dependencias`.
