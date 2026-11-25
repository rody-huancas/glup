import type { AudioFormat, AudioQuality } from '@/modules/media/types/audioFormat';
import type { AnimationFormat } from '@/modules/media/types/animationFormat';
import type { TrimMode } from '@/modules/media/types/trimMode';

export const EXTRACT_TEXTS = {
  title    : 'Sacar el audio',
  format   : 'Formato',
  quality  : 'Calidad',
  formats  : {
    mp3 : { label: 'MP3', hint: 'Se escucha en todos lados' },
    m4a : { label: 'M4A', hint: 'Más liviano a igual calidad' },
    wav : { label: 'WAV', hint: 'Sin comprimir: pesa más' },
  } satisfies Record<AudioFormat, { label: string; hint: string }>,
  qualities : {
    normal : { label: 'Normal', hint: 'Para escuchar' },
    high   : { label: 'Alta', hint: 'Para editar o guardar' },
  } satisfies Record<AudioQuality, { label: string; hint: string }>,
  wavHint  : 'WAV va siempre sin comprimir.',
  copyHint : 'Si el sonido del video ya está en ese formato, lo copio tal cual: más rápido y sin perder nada.',
  go       : 'Sacar el audio',
};

export const TRIM_TEXTS = {
  title       : 'Recortar',
  taskTitle   : (name: string) => `Recortar · ${name}`,
  learnFirst  : 'Para recortar necesito aprender a trabajar con audio y video.',
  opening     : 'Abriendo…',
  previewing  : 'Preparando una vista previa para verlo aquí…',
  failed      : 'No pude abrir este archivo',
  playRange   : 'Reproducir el tramo',
  pause       : 'Pausar',
  markStart   : 'Marcar inicio aquí',
  markEnd     : 'Marcar fin aquí',
  start       : 'Inicio',
  end         : 'Fin',
  length      : 'Duración',
  startHandle : 'Inicio del tramo',
  endHandle   : 'Fin del tramo',
  handleHint  : 'Flechas para moverlo, Mayús para saltos más grandes',
  timeline    : 'Línea de tiempo',
  timeField   : (label: string) => `${label} (minutos:segundos.décimas)`,
  badTime     : 'Escribe el tiempo como 1:05.3',
  mode        : 'Cómo corto',
  modes       : {
    fast  : { label: 'Rápido, sin perder calidad', hint: 'Copio el tramo tal cual' },
    exact : { label: 'Exacto', hint: 'Vuelvo a codificarlo: más lento' },
  } satisfies Record<TrimMode, { label: string; hint: string }>,
  keyframe    : (at: string) => `En un video, el corte rápido empieza en el cuadro clave anterior: empezará en ${at}.`,
  findingKeys : 'Buscando los cuadros clave…',
  cancel      : 'Cancelar',
  save        : 'Guardar recorte',
  exitTitle   : '¿Salir sin guardar?',
  exitBody    : 'Se pierde el tramo que elegiste.',
  exitConfirm : 'Salir',
  exitCancel  : 'Seguir',
};

export const PLAYER_TEXTS = {
  play     : 'Reproducir',
  pause    : 'Pausar',
  position : 'Posición',
};

export const ANIMATION_TEXTS = {
  title       : 'Video a GIF',
  taskTitle   : (name: string) => `Video a GIF · ${name}`,
  format      : 'Formato',
  formats     : {
    gif  : { label: 'GIF', hint: 'Se ve en todos lados' },
    webp : { label: 'WebP animado', hint: 'Pesa mucho menos; sirve en WhatsApp y la web' },
  } satisfies Record<AnimationFormat, { label: string; hint: string }>,
  width       : 'Ancho',
  fixedWidths : [320, 480, 640],
  original    : (width: number) => `Original (${width} px)`,
  fps         : 'Cuadros por segundo',
  loop        : 'Repetir siempre',
  willWeigh   : (size: string) => `Pesará unos ${size}`,
  weighs      : (size: string) => `Pesa ${size}`,
  heavy       : 'Pasa de 8 MB: prueba con menos ancho o menos cuadros por segundo, o con WebP.',
  long        : (seconds: number) => `El tramo pasa de ${seconds} s: el GIF va a pesar mucho. Acórtalo si puedes.`,
  preview     : 'Ver cómo queda',
  previewing  : 'Haciendo la vista previa…',
  previewAlt  : 'Vista previa de la animación',
  backToVideo : 'Volver al video',
  failed      : 'No pude hacer la vista previa',
  save        : 'Guardar animación',
};

// How far the arrows move a handle (seconds): a tenth, a second with Shift.
export const TRIM_STEPS = { small: 0.1, big: 1 };
// The shortest stretch.
export const MIN_STRETCH = 0.1;
// The timeline: frames under a video, bars under an audio.
export const STRIP_FRAMES = 16;
export const WAVE_BARS = 160;
