import type { SettingEntry } from '@/modules/main-window/interfaces/settingEntry';
import { formatCount } from '@/shared/utils/numbers';

export const SIDEBAR_TEXTS = {
  search        : 'Buscar',
  searchLabel   : 'Buscar herramientas, familias y ajustes',
  shortcut      : 'Ctrl K',
  results       : 'Resultados',
  nothing       : 'No encontré nada con eso',
  allTools      : 'Ver todas las habilidades',
  family        : 'Familia',
  setting       : 'Ajustes',
  favorites     : 'Favoritos',
  noFavorites   : 'Marca con ★ las que más usas',
  expand        : (section: string) => `Mostrar ${section}`,
  collapse      : (section: string) => `Contraer ${section}`,
  remove        : (tool: string) => `Quitar ${tool} de favoritos`,
  move          : (tool: string) => `Mover ${tool} (arrastra, o Alt y las flechas)`,
  newEntries    : (count: number) => (count === 1 ? '1 entrada nueva' : `${formatCount(count)} entradas nuevas`),
  tasks         : (count: number) => `${formatCount(count)} tareas`,
  openTask      : (title: string) => `Ver la tarea: ${title}`,
  private       : 'Todo en tu PC',
};

// The search shows a few of each kind, so the list never needs to scroll.
export const SEARCH_LIMITS = { tools: 6, families: 3, settings: 3 };

// What of Ajustes it can find (each one opens Ajustes).
export const SETTING_ENTRIES: SettingEntry[] = [
  { id: 'autostart', title: 'Arrancar con Windows', keywords: 'inicio encender prender' },
  { id: 'notifications', title: 'Notificaciones de Windows', keywords: 'avisos' },
  { id: 'position', title: 'Posición de Glup', keywords: 'borde esquina lugar isla mover' },
  { id: 'look', title: 'Cómo se muestra Glup', keywords: 'isla oculto burbuja atajo' },
  { id: 'border', title: 'Borde de la isla', keywords: 'apariencia contorno fondo oscuro' },
  { id: 'screen-text', title: 'Atajo de Copiar texto de la pantalla', keywords: 'teclado historial' },
  { id: 'clipboard', title: 'Portapapeles', keywords: 'copiar guardados limite programas' },
  { id: 'save', title: 'Dónde guardar los resultados', keywords: 'carpeta destino zip' },
  { id: 'gpu', title: 'Tarjeta de video para pasar audio a texto', keywords: 'gpu procesador transcribir' },
  { id: 'learned', title: 'Lo que aprendí', keywords: 'descargas modelos borrar espacio ffmpeg' },
  { id: 'version', title: 'Versión y actualizaciones', keywords: 'actualizar novedades' },
];
