import { formatCount } from '@/shared/utils/numbers';

// The bar that shows while lines are marked (Historial, Portapapeles).
export const SELECTION_TEXTS = {
  count  : (count: number) => `${formatCount(count)} ${count === 1 ? 'seleccionado' : 'seleccionados'}`,
  remove : 'Quitar',
  cancel : 'Cancelar',
};
