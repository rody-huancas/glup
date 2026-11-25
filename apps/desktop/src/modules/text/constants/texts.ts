import { formatCount } from '@/shared/utils/numbers';

export const TEXT_TEXTS = {
  done      : (pages: number) => `Texto sacado · ${pages} ${pages === 1 ? 'página' : 'páginas'}`,
  empty     : 'No encontré texto en esto',
  copy      : 'Copiar todo',
  copied    : 'Copiado',
  save      : 'Guardar como .txt',
  saving    : 'Guardando…',
  saved     : (name: string) => `Guardado · ${name}`,
  reveal    : 'Ver en carpeta',
  back      : 'Volver',
  saveError : 'No pude guardar el texto. Vuelve a intentarlo.',
  copyError : 'No pude copiarlo. Selecciónalo y cópialo a mano.',
  area      : 'Texto sacado',
  page      : (page: number, total: number) => `Página ${page} de ${formatCount(total)}`,
  image     : (index: number, total: number) => `Imagen ${index} de ${formatCount(total)}`,
};
