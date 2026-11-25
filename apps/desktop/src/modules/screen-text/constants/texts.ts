import { formatCount } from '@/shared/utils/numbers';

export const SCREEN_TEXT_TEXTS = {
  hint   : 'Arrastra sobre el texto que quieres copiar · Esc para cancelar',
  qrHint : 'Arrastra sobre el código QR · Esc para cancelar',
  codes  : (count: number) => (count === 1 ? 'Encontré un código' : `Encontré ${formatCount(count)} códigos`),
  alsoQr : (words: number) => `Copié ${words} ${words === 1 ? 'palabra' : 'palabras'} · y hay un QR`,
  noCode : 'No encontré ningún código ahí',
  copied : (words: number) => `Copié ${words} ${words === 1 ? 'palabra' : 'palabras'}`,
  empty  : 'No encontré texto ahí',
  failed : 'No pude leer esa zona',
  view   : 'Ver',
};

export const SCREEN_HISTORY_TEXTS = {
  label   : 'Guardar en el historial lo que copio de la pantalla',
  hint    : 'Solo en tu PC, para verlo y copiarlo de nuevo',
  offHint : 'Lo que copies de la pantalla no quedará en el historial',
  copy    : 'Copiar de nuevo',
  copied  : 'Copiado',
  failed  : 'No pude copiarlo',
};
