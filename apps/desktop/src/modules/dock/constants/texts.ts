import type { DockEdge } from '@/modules/dock/types/dockEdge';
import { formatDecimal } from '@/shared/utils/numbers';

export const DOCK_TEXTS = {
  title         : 'Posición de Glup',
  hint          : 'Arrastra el marcador a cualquier punto de un borde o a una esquina, o arrastra la pastilla',
  bubbleHint    : 'Arrastra el marcador donde quieras la burbuja, o arrastra la burbuja',
  drawing       : 'Dibujo de la pantalla: arrastra o toca un borde para poner a Glup ahí; las flechas lo mueven por su borde',
  offset        : 'Posición en el borde',
  inCorner      : 'En la esquina',
  bubbleDrawing : 'Dibujo de la pantalla: toca donde quieras la burbuja',
  reset         : 'Volver arriba al centro',
  bubbleReset   : 'Traer la burbuja al centro',
  screen        : 'Pantalla',
  screenName    : (index: number, primary: boolean) => `Pantalla ${index + 1}${primary ? ' (principal)' : ''}`,
  failed        : 'No pude moverlo. Vuelve a intentarlo.',
};

export const LOOK_TEXTS = {
  title       : 'Cómo se muestra',
  island      : 'Isla',
  islandHint  : 'La pastilla siempre a la vista en su borde',
  hidden      : 'Oculta',
  hiddenHint  : 'No se ve nada hasta que llevas el cursor a ese borde',
  bubble      : 'Burbuja',
  bubbleHint  : 'Un círculo flotante que dejas donde quieras',
  delay       : 'Cuánto esperar en el borde',
  delayHint   : 'Para que no salga al pasar sin querer',
  delayOption : (ms: number) => `${formatDecimal(ms / 1000, 2)} s`,
  taskbar     : 'Tu barra de tareas se oculta sola en ese borde y también sale al llevar el cursor ahí: pueden competir. Mejor elige otro borde para Glup.',
  introTitle  : 'Glup queda oculto',
  introBody   : (shortcut: string | null) =>
    `Para abrirlo, lleva el cursor al borde donde estaba y espera un instante${shortcut ? `, usa ${shortcut}` : ''} o toca «Abrir Glup» en su ícono de la bandeja.`,
  introKeep   : 'Mejor como isla',
  introOk     : 'Entendido',
  failed      : 'No pude cambiarlo. Vuelve a intentarlo.',
};

// The edge (or corner) under the drawing while it moves ("Arriba · 35 %").
export const DOCK_EDGE_NAMES: Record<DockEdge, string> = {
  'top'          : 'Arriba',
  'bottom'       : 'Abajo',
  'left'         : 'Izquierda',
  'right'        : 'Derecha',
  'top-left'     : 'Arriba a la izquierda',
  'top-right'    : 'Arriba a la derecha',
  'bottom-left'  : 'Abajo a la izquierda',
  'bottom-right' : 'Abajo a la derecha',
};

// The eight spots of the drawing, for those who use the keyboard.
export const DOCK_SPOT_LABELS: Record<DockEdge, string> = {
  'top'          : 'Arriba al centro',
  'bottom'       : 'Abajo al centro',
  'left'         : 'A la izquierda, al medio',
  'right'        : 'A la derecha, al medio',
  'top-left'     : 'Arriba a la izquierda',
  'top-right'    : 'Arriba a la derecha',
  'bottom-left'  : 'Abajo a la izquierda',
  'bottom-right' : 'Abajo a la derecha',
};
