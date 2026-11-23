export const SCREEN_TEXT_TEXTS = {
  hint   : 'Arrastra sobre el texto que quieres copiar · Esc para cancelar',
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
