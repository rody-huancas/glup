---
name: desktop-ui
description: Reglas obligatorias de la interfaz de Glup (apps/desktop/src, React 19 + TypeScript + Vite + Tailwind CSS v4 dentro de Tauri) - estructura de módulos, dónde va cada archivo, nombres de archivos, componentes y props, hooks, servicios que llaman a Rust, stores, textos en español, tokens de estilo, componentes compartidos, estados de carga, error y vacío, y pruebas con Vitest. Úsala al crear, modificar o revisar cualquier cosa en apps/desktop/src - «crea un componente», «nueva pantalla», «agrega un texto», «llama a este comando de Rust», «cambia un color». Va siempre junto con la skill convenciones. Para la isla y la mascota, suma la skill isla-y-mascota; para una acción nueva, la skill acciones.
---

# Interfaz de Glup (apps/desktop/src)

**Antes, la skill `convenciones`.** Aquí solo va lo propio de la interfaz.

## Estructura

```text
src/
├── main.tsx, App.tsx, index.css     Arranque, raíz y tokens de Tailwind (@theme)
├── modules/<módulo>/                Una unidad del producto por carpeta
│   ├── pages/                       Pantallas del panel (HomePage, HistoryPage, SettingsPage…)
│   ├── components/                  Un componente por archivo
│   ├── hooks/                       Un hook por archivo (useAlgo.ts)
│   ├── services/                    Las llamadas a Rust (invoke) y a plugins de Tauri
│   ├── store/                       Estado de módulo fuera de React, si hace falta
│   ├── interfaces/                  Una interface por archivo
│   ├── types/                       Tipos (uniones, alias), uno por concepto
│   ├── constants/                   Constantes por tema; los textos en texts.ts
│   ├── utils/                       Funciones puras por concepto, con su *.test.ts al lado
│   └── assets/                      Imágenes propias del módulo
└── shared/                          Lo que usan dos o más módulos
    ├── components/                  Button, Card, IconButton, FileChip, Switch, Skeleton, ProgressBar, ConfirmDialog, Checkbox, SelectAll…
    ├── icons/                       Íconos SVG de trazo, uno por archivo
    ├── hooks/                       useFileDrop, useGlobalCursor, useCheckSelection (checks de una lista)…
    ├── constants/                   Nombres de comandos y eventos de Tauri (events.ts)…
    ├── interfaces/, types/, utils/
```

Módulos actuales: `island` (la isla y su máquina de estados), `mascot` (Glup y sus animaciones),
`main-window` (el layout del panel), `home`, `actions`, `tasks`, `pdf`, `sign`, `organize`, `cleanup`,
`history`, `settings`, `text`, `screen-text`, `shortcuts`, `clipboard`, `tools`, `updates`, `video`, `notices`, `id-photo`, `transcribe`. Se crean **solo las subcarpetas que se usan**.

## Reglas obligatorias

1. **Nombres de archivo.** Componentes y páginas en PascalCase (`ActionButton.tsx`,
   `HomePage.tsx`). Todo lo demás en camelCase (`fileSize.ts`, `useTasks.ts`, `actionDefinition.ts`).
   Pruebas junto al archivo: `pageRanges.test.ts`.
2. **Un componente por archivo**, con su interface de props en el mismo archivo, justo encima:
   `interface <Componente>Props`. Un subcomponente es otro componente y va en su propio archivo.
   Sin `React.FC`.
3. **Interfaces y tipos.** Las interfaces del módulo van en `interfaces/`, una por archivo y con el
   nombre del concepto (`interfaces/fileInfo.ts` → `FileInfo`), sin prefijo `I`. Las uniones y alias
   en `types/`. Una interface de parámetros que solo usa un archivo (`PickFilesParams`) puede quedarse
   en ese archivo.
4. **Lógica fuera de los componentes.** Un componente pinta; el comportamiento va a un hook y los
   cálculos a `utils/`. Funciones puras, sin React ni Tauri, para poder probarlas.
5. **Solo `services/` habla con Rust.** Toda llamada a `invoke` o a un plugin de Tauri vive en
   `modules/<m>/services/`, con el nombre del comando tomado de `shared/constants/events.ts`, nunca
   escrito suelto. Los componentes y hooks llaman al servicio. Escuchar eventos de Rust (`listen`)
   se hace en un hook o en el store del módulo.
6. **Estado.** Estado local con `useState`/`useReducer`. Lo que debe sobrevivir a los componentes
   (las tareas en curso, por ejemplo) vive en un store de módulo en `store/`, consumido con
   `useSyncExternalStore`. No se agregan librerías de estado sin acordarlo.
7. **Textos.** Ningún texto visible escrito suelto en el JSX: va en `constants/texts.ts` del módulo,
   en diccionarios `*_TEXTS` con claves en inglés y valores en español. Los textos que dependen de
   números son funciones (`filesCount: (count) => ...`). Plurales bien hechos («1 imagen», «2
   imágenes»).
8. **Configuración como datos.** Lo que se puede describir como lista (acciones, herramientas
   rápidas, formatos) va en un JSON del módulo (`constants/actions.json`) tipado con su interface.
9. **Estilos con Tailwind v4 y los tokens** de `index.css` (`@theme`): `bg-bg`, `bg-surface`,
   `bg-raised`, `border-line`, `text-text`, `text-muted`, `bg-mint`, `text-mint-ink`, `text-lilac`,
   `rounded-control`, `rounded-panel`. Nada de colores sueltos (`#fff`, `bg-white`, `text-red-500`)
   ni valores arbitrarios para colores. Un color o radio nuevo se agrega como token. Fuente: Plus
   Jakarta Sans, incluida localmente con `@fontsource`: la app funciona sin internet.
10. **Sin librerías de componentes.** Los controles salen de `shared/components/`. Antes de crear un
    botón, chip o tarjeta, se revisa si ya existe ahí; si falta y lo usarían dos módulos, se crea en
    `shared/`.
11. **Estados completos.** Cada pantalla y panel contempla carga (skeleton con `shimmer`, nunca un
    hueco vacío), error (Glup confundido y un texto que dice qué hacer), vacío honesto y contenido.
    Las esperas de más de unos segundos muestran progreso y permiten cancelar. Las tareas se muestran
    siempre con `WorkingStatus` (`modules/actions/utils/progressView.ts` decide palabras y barra); una
    etapa sin conteo usa la barra indeterminada (`ProgressBar` con `null`), que con movimiento
    reducido no se desplaza: queda al centro y cambia de intensidad.
12. **Sin scroll en el panel** salvo en listas que lo necesitan (historial, miniaturas), con la
    utilidad `scroll-thin`. El panel mide 1040x640: el contenido se diseña para entrar.
13. **Animaciones.** GSAP (`gsap` + `@gsap/react` con `useGSAP`) para la isla y las transiciones; la
    Web Animations API se acepta en animaciones simples de la mascota. Duraciones, curvas y tamaños
    en `constants/`. Siempre con alternativa para `prefers-reduced-motion`. Detalle en la skill
    `isla-y-mascota`.
14. **Pruebas con Vitest** para utils, máquinas de estado y conversiones (rangos de páginas,
    coordenadas, tamaños). Los componentes no necesitan pruebas salvo lógica que no se pueda sacar
    a un util.

## Cómo se ve una pieza

```tsx
import type { ActionDefinition } from '@/modules/actions/interfaces/actionDefinition';
import type { ActionId } from '@/modules/actions/types/actionId';
import { Button } from '@/shared/components/Button';

interface ActionButtonProps {
  action   : ActionDefinition;
  disabled : boolean;
  onChoose : (actionId: ActionId) => void;
}

export const ActionButton = ({ action, disabled, onChoose }: ActionButtonProps) => (
  <Button
    variant={action.primary ? 'primary' : 'secondary'}
    disabled={disabled}
    onClick={() => onChoose(action.id)}
  >
    {action.label}
  </Button>
);
```

```ts
import { invoke } from '@tauri-apps/api/core';
import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import { GET_FILES_INFO } from '@/shared/constants/events';

export const getFilesInfo = (paths: string[]): Promise<FileInfo[]> => invoke<FileInfo[]>(GET_FILES_INFO, { paths });
```

## Checklist de un cambio en la interfaz

- [ ] Cada archivo en su carpeta y con su convención de nombre.
- [ ] Textos en `constants/texts.ts`, en español llano.
- [ ] Solo tokens de estilo; nada de colores sueltos.
- [ ] Carga, error y vacío contemplados.
- [ ] Teclado, foco visible y `prefers-reduced-motion`.
- [ ] `typecheck` y `test` en verde.
