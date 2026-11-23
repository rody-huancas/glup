import type { ShortcutTarget } from '@/modules/shortcuts/types/shortcutTarget';

interface KnownConflictParams {
  label : string;
  use   : string;
}

interface ShortcutLabel {
  label : string;
  hint  : string;
}

// Each shortcut of Glup in Ajustes.
export const SHORTCUT_LABELS: Record<ShortcutTarget, ShortcutLabel> = {
  'screen-text' : { label: 'Atajo para copiar texto de la pantalla', hint: 'Funciona desde cualquier programa' },
  clipboard     : { label: 'Atajo para abrir el portapapeles', hint: 'Lo abre desde cualquier programa' },
};

export const SHORTCUT_TEXTS = {
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
