import type { SpaceKind } from '@/modules/space/types/spaceKind';
import { formatCount } from '@/shared/utils/numbers';

export const SPACE_TEXTS = {
  title       : 'Qué ocupa espacio',
  subtitle    : 'Solo leo: nada cambia, salvo lo que tú mandes a la papelera.',
  where       : 'Qué reviso',
  folder      : 'Elegir carpeta…',
  pickTitle   : 'Elige la carpeta que reviso',
  free        : (free: string, total: string) => `${free} libres de ${total}`,
  analyze     : 'Revisar',
  again       : 'Revisar de nuevo',
  queued      : 'Espero a que termine la otra tarea…',
  stopped     : 'Me detuve: esto es lo que alcancé a revisar.',
  map         : 'Mapa de lo que ocupa espacio',
  legend      : 'Colores',
  list        : 'De lo más grande a lo más chico',
  rest        : (count: number, size: string) => `y ${formatCount(count)} más · ${size}`,
  kinds       : 'Por tipo',
  biggest     : 'Los 20 archivos más grandes',
  empty       : 'Elige un disco o una carpeta y toca «Revisar».',
  nothing     : 'Esta carpeta está vacía.',
  details     : 'Detalles',
  cloud       : (count: string, size: string) => `${count} archivos están solo en la nube (${size}): no ocupan espacio aquí y no los descargué.`,
  denied      : (count: string) => (count === '1' ? '1 carpeta no se pudo leer (es del sistema).' : `${count} carpetas no se pudieron leer (son del sistema).`),
  links       : 'Algunas carpetas son atajos a otras: lo de adentro lo conté donde está de verdad.',
  hardLinks   : 'Algunos archivos aparecen en varios lugares pero ocupan espacio una sola vez; los conté una vez.',
  yourFolder  : 'Tu carpeta',
  files       : (count: string) => `${count} archivos`,
  share       : (percent: string) => `${percent} de esta carpeta`,
  enter       : (name: string) => `Entrar a ${name}`,
  open        : 'Abrir carpeta',
  trash       : 'Mandar a la papelera',
  trashTitle  : (name: string) => `¿Mando «${name}» a la papelera?`,
  trashBody   : (size: string) => `Libera ${size}. Puedes recuperarlo desde la papelera de Windows.`,
  trashYes    : 'Mandar a la papelera',
  trashNo     : 'Mejor no',
  thisFolder  : (name: string) => `Esta carpeta: ${name}`,
  cleanup     : 'Ir a Limpieza',
  duplicates  : 'Buscar archivos repetidos',
  took        : (seconds: string) => `Revisado en ${seconds} s`,
};

export const KIND_LABELS: Record<SpaceKind, string> = { photos: 'Fotos', videos: 'Videos', documents: 'Documentos', programs: 'Programas', system: 'Sistema y apps', other: 'Otros' };

// The colour of each kind: fotos, videos and documentos as their families (lila, amarillo, celeste);
// programas, sistema and otros muted but with colour of their own (they are most of a PC): steel blue,
// sage and a soft terracotta. As hex, to mix them and pick the letters that read on each one.
export const KIND_HEX: Record<SpaceKind, string> = {
  photos    : '#B9A8F5',
  videos    : '#F6C36B',
  documents : '#7CC4F2',
  programs  : '#8FA7C9',
  system    : '#A9BC9C',
  other     : '#D6A68C',
};
// A folder where its kind barely wins looks paler: its colour mixed with this light grey.
export const MAP_PALE = '#E4E3EA';
export const KIND_ORDER: SpaceKind[] = ['videos', 'photos', 'documents', 'programs', 'system', 'other'];

export const POLL_EVERY = 900;
