import glupImages from '@/assets/familias/glup-imagenes.png';
import glupPdf from '@/assets/familias/glup-pdf.png';
import glupMedia from '@/assets/familias/glup-audio-video.png';
import glupText from '@/assets/familias/glup-texto.png';
import glupClipboard from '@/assets/familias/glup-portapapeles.png';
import glupPc from '@/assets/familias/glup-tu-pc.png';
import type { IFamily, IHeading } from '@/types/content.types';

export const FAMILIES_HEADING: IHeading = {
  label : 'Qué hace',
  title : 'Seis familias de habilidades',
  lead  : 'Las encuentras en Habilidades, en el buscador (Ctrl+K), al soltarle un archivo o con el clic derecho del Explorador de Windows.',
};

export const FAMILIES_TEXTS = {
  skills : 'Habilidades',
  window : (name: string) => `familia/${name.toLowerCase()}`,
};

// The phrases are the app's (and the README's); the skills come from the app's own list (tools.json).
export const FAMILIES: IFamily[] = [
  { id: 'images',    name: 'Imágenes',      accent: 'lilac',  glup: glupImages,    phrase: 'Tus fotos, más livianas o en otro formato, sin que se vean peor.' },
  { id: 'pdf',       name: 'PDF',           accent: 'coral',  glup: glupPdf,       phrase: 'Todo lo que se suele hacer con un PDF, sin páginas web de por medio.' },
  { id: 'media',     name: 'Audio y video', accent: 'yellow', glup: glupMedia,     phrase: 'Videos más livianos y audios pasados a texto.' },
  { id: 'text',      name: 'Texto',         accent: 'sky',    glup: glupText,      phrase: 'Saca el texto de fotos, PDF escaneados y de tu pantalla.' },
  {
    id     : 'clipboard',
    name   : 'Portapapeles',
    accent : 'mint',
    glup   : glupClipboard,
    phrase : 'Lo que copiaste, para buscarlo y copiarlo de nuevo.',
    notes  : ['Está apagado hasta que lo enciendas.', 'Se guarda cifrado con tu cuenta de Windows.', 'Nunca guarda lo que Windows marca como privado.'],
  },
  { id: 'pc',        name: 'Tu PC',         accent: 'silver', glup: glupPc,        phrase: 'Haz espacio, ordena carpetas y mira qué la tiene ocupada.' },
];
