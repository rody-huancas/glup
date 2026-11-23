# Glup

Glup es una mascota de escritorio open source que vive en una esquina de tu pantalla. Respira, parpadea, te sigue con la mirada y reacciona cuando le haces clic o le arrastras archivos encima.

Más adelante podrá procesar los PDFs e imágenes que le sueltes. Por ahora solo reacciona: identifica el tipo de archivo y se lo "come", pero no hace nada con él.

## Estructura

```
glup/
├── apps/
│   ├── desktop/   App de escritorio (Tauri 2 + React + TypeScript + Vite + Tailwind CSS v4)
│   └── web/       Página de descarga (Astro, pendiente)
├── pnpm-workspace.yaml
└── package.json
```

## Requisitos

- [Rust](https://www.rust-lang.org/tools/install) (stable, vía `rustup`)
- [Node.js](https://nodejs.org) 20 o superior
- [pnpm](https://pnpm.io/installation) 10
- En Windows: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) con la carga de trabajo "Desarrollo para el escritorio con C++", y WebView2 (ya viene instalado en Windows 10/11).
- [CMake](https://cmake.org/) y [LLVM](https://llvm.org/) (por libclang), para compilar whisper.cpp: `winget install Kitware.CMake LLVM.LLVM`.

Más detalles en los [prerrequisitos de Tauri](https://tauri.app/start/prerequisites/).

## Cómo correrlo

```bash
pnpm install
pnpm dev
```

`pnpm dev` equivale a `pnpm --filter desktop tauri dev`. La primera compilación de Rust tarda unos minutos.

Para generar el instalador:

```bash
pnpm build
```

## Cómo se usa

- **Clic** en Glup: se pone feliz y salta.
- **Arrastrar** manteniendo presionado: lo mueves por la pantalla.
- **Soltar un archivo** encima: si es PDF o imagen se lo come; si no, se confunde.
- **Bandeja del sistema**: "Mostrar/Ocultar Glup" y "Salir".

## Licencia

[MIT](LICENSE). Las piezas de terceros que usa (el modelo de «Quitar fondo», ONNX Runtime) y sus
licencias están en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
