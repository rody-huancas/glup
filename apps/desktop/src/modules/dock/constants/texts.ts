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
