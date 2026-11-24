import type { DockEdge } from '@/modules/dock/types/dockEdge';

export const DOCK_TEXTS = {
  title      : 'Posición de Glup',
  hint       : 'Toca el dibujo donde lo quieras, o arrástralo desde la pastilla',
  drawing    : 'Dibujo de la pantalla: toca un borde para poner a Glup ahí',
  reset      : 'Volver arriba al centro',
  screen     : 'Pantalla',
  screenName : (index: number, primary: boolean) => `Pantalla ${index + 1}${primary ? ' (principal)' : ''}`,
  failed     : 'No pude moverlo. Vuelve a intentarlo.',
};

export const LOOK_TEXTS = {
  title       : 'Cómo se muestra',
  island      : 'Isla',
  islandHint  : 'La pastilla siempre a la vista en su borde',
  hidden      : 'Oculta',
  hiddenHint  : 'No se ve nada hasta que llevas el cursor a ese borde',
  delay       : 'Cuánto esperar en el borde',
  delayHint   : 'Para que no salga al pasar sin querer',
  delayOption : (ms: number) => `${(ms / 1000).toLocaleString('es', { maximumFractionDigits: 2 })} s`,
  taskbar     : 'Tu barra de tareas se oculta sola en ese borde y también sale al llevar el cursor ahí: pueden competir. Mejor elige otro borde para Glup.',
  introTitle  : 'Glup queda oculto',
  introBody   : (shortcut: string | null) =>
    `Para abrirlo, lleva el cursor al borde donde estaba y espera un instante${shortcut ? `, usa ${shortcut}` : ''} o toca «Abrir Glup» en su ícono de la bandeja.`,
  introKeep   : 'Mejor como isla',
  introOk     : 'Entendido',
  failed      : 'No pude cambiarlo. Vuelve a intentarlo.',
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
