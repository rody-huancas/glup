import imagesLarge from '@/modules/families/assets/glup-imagenes-256.webp';
import imagesSmall from '@/modules/families/assets/glup-imagenes-128.webp';
import pdfLarge from '@/modules/families/assets/glup-pdf-256.webp';
import pdfSmall from '@/modules/families/assets/glup-pdf-128.webp';
import mediaLarge from '@/modules/families/assets/glup-audio-video-256.webp';
import mediaSmall from '@/modules/families/assets/glup-audio-video-128.webp';
import textLarge from '@/modules/families/assets/glup-texto-256.webp';
import textSmall from '@/modules/families/assets/glup-texto-128.webp';
import clipboardLarge from '@/modules/families/assets/glup-portapapeles-256.webp';
import clipboardSmall from '@/modules/families/assets/glup-portapapeles-128.webp';
import pcLarge from '@/modules/families/assets/glup-tu-pc-256.webp';
import pcSmall from '@/modules/families/assets/glup-tu-pc-128.webp';
import type { Family } from '@/modules/families/interfaces/family';
import type { FamilyStyle } from '@/modules/families/interfaces/familyStyle';
import type { FamilyId } from '@/modules/families/types/familyId';
import { formatCount } from '@/shared/utils/numbers';

// In this order in Habilidades and in the search.
export const FAMILY_IDS: FamilyId[] = ['images', 'pdf', 'media', 'text', 'clipboard', 'pc'];

export const FAMILIES: Record<FamilyId, Family> = {
  images    : {
    id      : 'images',
    name    : 'Imágenes',
    hint    : 'Convierte, aliviana y arregla tus fotos.',
    dialog  : 'image',
    formats : 'JPG, PNG, WebP, HEIC de iPhone, AVIF y más',
    art     : { small: imagesSmall, large: imagesLarge },
  },
  pdf       : {
    id      : 'pdf',
    name    : 'PDF',
    hint    : 'Une, separa, firma y protege tus documentos.',
    dialog  : 'pdf',
    formats : 'Archivos PDF',
    art     : { small: pdfSmall, large: pdfLarge },
  },
  media     : {
    id      : 'media',
    name    : 'Audio y video',
    hint    : 'Videos más livianos y audios pasados a texto.',
    dialog  : 'audio',
    formats : 'Audios y videos: MP3, M4A, WAV, notas de voz, MP4, MOV…',
    art     : { small: mediaSmall, large: mediaLarge },
  },
  text      : {
    id      : 'text',
    name    : 'Texto',
    hint    : 'Saca el texto de fotos, PDF escaneados y de tu pantalla.',
    dialog  : 'any',
    formats : 'Fotos, capturas y PDF escaneados',
    art     : { small: textSmall, large: textLarge },
  },
  clipboard : {
    id      : 'clipboard',
    name    : 'Portapapeles',
    hint    : 'Lo que copiaste, para buscarlo y copiarlo de nuevo.',
    dialog  : null,
    formats : null,
    art     : { small: clipboardSmall, large: clipboardLarge },
  },
  pc        : {
    id      : 'pc',
    name    : 'Tu PC',
    hint    : 'Haz espacio, ordena carpetas y mira qué la tiene ocupada.',
    dialog  : 'files',
    formats : 'Cualquier archivo, para juntarlo en un ZIP',
    art     : { small: pcSmall, large: pcLarge },
  },
};

export const FAMILY_STYLES: Record<FamilyId, FamilyStyle> = {
  images   : {
    text   : 'text-fam-images',
    fill   : 'bg-fam-images',
    border : 'border-fam-images/45',
    edge   : 'hover:border-fam-images/70',
    dark   : 'bg-fam-images-dark',
    hover  : 'hover:bg-fam-images-deep',
    deep   : 'bg-fam-images-deep',
    ink    : 'text-fam-images-ink',
    nav    : 'bg-fam-images font-semibold text-fam-images-ink',
  },
  pdf      : {
    text   : 'text-fam-pdf',
    fill   : 'bg-fam-pdf',
    border : 'border-fam-pdf/45',
    edge   : 'hover:border-fam-pdf/70',
    dark   : 'bg-fam-pdf-dark',
    hover  : 'hover:bg-fam-pdf-deep',
    deep   : 'bg-fam-pdf-deep',
    ink    : 'text-fam-pdf-ink',
    nav    : 'bg-fam-pdf font-semibold text-fam-pdf-ink',
  },
  media    : {
    text   : 'text-fam-media',
    fill   : 'bg-fam-media',
    border : 'border-fam-media/45',
    edge   : 'hover:border-fam-media/70',
    dark   : 'bg-fam-media-dark',
    hover  : 'hover:bg-fam-media-deep',
    deep   : 'bg-fam-media-deep',
    ink    : 'text-fam-media-ink',
    nav    : 'bg-fam-media font-semibold text-fam-media-ink',
  },
  text     : {
    text   : 'text-fam-text',
    fill   : 'bg-fam-text',
    border : 'border-fam-text/45',
    edge   : 'hover:border-fam-text/70',
    dark   : 'bg-fam-text-dark',
    hover  : 'hover:bg-fam-text-deep',
    deep   : 'bg-fam-text-deep',
    ink    : 'text-fam-text-ink',
    nav    : 'bg-fam-text font-semibold text-fam-text-ink',
  },
  clipboard: {
    text   : 'text-fam-clipboard',
    fill   : 'bg-fam-clipboard',
    border : 'border-fam-clipboard/45',
    edge   : 'hover:border-fam-clipboard/70',
    dark   : 'bg-fam-clipboard-dark',
    hover  : 'hover:bg-fam-clipboard-deep',
    deep   : 'bg-fam-clipboard-deep',
    ink    : 'text-fam-clipboard-ink',
    nav    : 'bg-fam-clipboard font-semibold text-fam-clipboard-ink',
  },
  pc       : {
    text   : 'text-fam-pc',
    fill   : 'bg-fam-pc',
    border : 'border-fam-pc/45',
    edge   : 'hover:border-fam-pc/70',
    dark   : 'bg-fam-pc-dark',
    hover  : 'hover:bg-fam-pc-deep',
    deep   : 'bg-fam-pc-deep',
    ink    : 'text-fam-pc-ink',
    nav    : 'bg-fam-pc font-semibold text-fam-pc-ink',
  },
};

export const FAMILY_TEXTS = {
  tools      : (count: number) => (count === 1 ? '1 herramienta' : `${formatCount(count)} herramientas`),
  saved      : (count: number) => (count === 1 ? '1 guardado' : `${formatCount(count)} guardados`),
  clipOff    : 'Apagado',
  free       : (gigabytes: number) => `${gigabytes} GB libres`,
  newResult  : 'resultado nuevo de Limpieza',
  dropTitle  : 'Suelta aquí tus archivos',
  chooseIn   : (family: string) => `Elegir archivos para ${family}`,
  toolsTitle : 'Sus herramientas',
  open       : (family: string) => `Abrir ${family}`,
};
