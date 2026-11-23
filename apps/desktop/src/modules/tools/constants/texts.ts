import type { ToolSection } from '@/modules/tools/types/toolSection';

export const TOOLS_TEXTS = {
  title      : 'Herramientas',
  subtitle   : 'Todo lo que sé hacer. Elige una y te pido los archivos.',
  search     : 'Buscar una herramienta',
  emptyTitle : 'No sé hacer eso todavía.',
  emptyIdea  : 'Si se te ocurre algo que te serviría, ',
  emptyLink  : 'cuéntamelo',
  emptyEnd   : '.',
};

export const TOOL_SECTION_TITLES: Record<ToolSection, string> = {
  pdf    : 'PDF',
  images : 'Imágenes',
  videos : 'Videos',
  text   : 'Texto',
  files  : 'Archivos',
  pc     : 'Tu PC',
};
