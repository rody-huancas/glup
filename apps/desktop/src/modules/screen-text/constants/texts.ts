interface KnownConflictParams {
  label : string;
  use   : string;
}

export const SCREEN_TEXT_TEXTS = {
  hint   : 'Arrastra sobre el texto que quieres copiar · Esc para cancelar',
  copied : (words: number) => `Copié ${words} ${words === 1 ? 'palabra' : 'palabras'}`,
  empty  : 'No encontré texto ahí',
  failed : 'No pude leer esa zona',
  view   : 'Ver',
};

export const SHORTCUT_TEXTS = {
  label           : 'Atajo para copiar texto de la pantalla',
  hint            : 'Funciona desde cualquier programa',
  taken           : 'Ese atajo ya lo usa otro programa. Elige otro.',
  invalid         : 'Usa Ctrl, Alt o Windows junto con una letra, un número o una tecla F.',
  failed          : 'No pude cambiarlo. Vuelve a intentarlo.',
  change          : 'Cambiar',
  cancel          : 'Cancelar',
  listening       : 'Presiona las teclas que quieras…',
  keysLabel       : (keys: string) => `Atajo actual: ${keys}`,
  space           : 'Espacio',
  windows         : 'Windows',
  saveAnyway      : 'Guardar igual',
  chooseOther     : 'Elegir otro',
  knownConflict   : ({ label, use }: KnownConflictParams) => `${label} ya es un atajo conocido: sirve para ${use}. Si lo guardas, puede dejar de funcionar en otros programas.`,
  windowsConflict : (label: string) => `${label} puede ser un atajo de Windows: muchas combinaciones con la tecla Windows ya tienen uso. Si lo guardas, puede dejar de funcionar.`,
  altGrConflict   : (label: string) => `${label} es AltGr en muchos teclados en español: podrías dejar de escribir símbolos como @ o €.`,
  tabsUse         : 'cambiar de pestaña en el navegador',
  menusUse        : 'abrir los menús de muchos programas',
  cardOff         : 'Atajo apagado',
  cardTaken       : 'Otro programa usa el atajo',
  changeLabel     : 'Cambiar el atajo en Ajustes',
};

export const SCREEN_HISTORY_TEXTS = {
  label   : 'Guardar en el historial lo que copio de la pantalla',
  hint    : 'Solo en tu PC, para verlo y copiarlo de nuevo',
  offHint : 'Lo que copies de la pantalla no quedará en el historial',
  copy    : 'Copiar de nuevo',
  copied  : 'Copiado',
  failed  : 'No pude copiarlo',
};
