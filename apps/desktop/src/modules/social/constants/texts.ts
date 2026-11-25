import type { SocialFit, SocialFormat } from '@/modules/social/types/socialFit';
import { formatCount } from '@/shared/utils/numbers';

export const SOCIAL_TEXTS = {
  title       : 'Tamaño para redes',
  subtitle    : (count: number) => (count === 1 ? '1 foto' : `${formatCount(count)} fotos`),
  network     : 'Red',
  size        : 'Medida',
  custom      : 'Personalizado',
  customTag   : (width: number, height: number) => `${width}x${height}`,
  width       : 'Ancho (px)',
  height      : 'Alto (px)',
  lock        : 'Mantener la proporción',
  fit         : 'Cómo encajo la foto',
  fits        : {
    crop    : { label: 'Recortar', hint: 'Elige el encuadre: arrastra y acerca' },
    contain : { label: 'Que entre completa', hint: 'Sin recortar; relleno lo que falta' },
  } satisfies Record<SocialFit, { label: string; hint: string }>,
  fill        : 'Relleno',
  color       : 'Un color',
  colorHint   : 'El que elijas',
  colorField  : 'Color del relleno',
  blur        : 'La foto desenfocada',
  blurHint    : 'La misma foto, suave, detrás',
  format      : 'Formato',
  formats     : { jpg: 'JPG', png: 'PNG', webp: 'WebP' } satisfies Record<SocialFormat, string>,
  zoom        : 'Acercar',
  frame       : 'Encuadre: arrástralo, o usa las flechas para moverlo y + y − para acercar',
  onlyThis    : 'Ajustar solo esta foto',
  onlyThisHint: 'Si no, el encuadre vale para todas',
  save        : 'Guardar',
  output      : (width: number, height: number) => `Saldrá de ${width} × ${height} px`,
};

export const FORMATS: SocialFormat[] = ['jpg', 'png', 'webp'];
// The keyboard: a step of the frame (of the photo), bigger with Shift; and the zoom.
export const MOVE_STEP = { small: 0.01, big: 0.05 };
export const ZOOM_STEP = 0.1;
