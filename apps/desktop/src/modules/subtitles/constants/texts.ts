import type { SubtitleMode } from '@/modules/subtitles/types/subtitleMode';

export const SUBTITLES_TEXTS = {
  title       : 'Subtítulos',
  steps       : ['Escuchar', 'Revisar', 'Guardar'],
  duration    : (time: string) => `Duración: ${time}`,
  notLoaded   : 'Lo verás aquí cuando descargue lo necesario para trabajar con video.',
  listenTask  : (name: string) => `Subtítulos · ${name}`,
  saveTask    : (name: string) => `Guardar subtítulos · ${name}`,
  heard       : 'Ya escuché el video: revisa las frases',
  setupBody   : 'Escucho el video aquí mismo, en tu computadora, y armo frases cortas para que las revises antes de guardarlas.',
  listen      : 'Escuchar el video',
  back        : 'Volver',
  queued      : 'Espero a que termine la otra tarea…',
  failed      : 'No pude sacar los subtítulos',
  retry       : 'Probar de nuevo',
  phrases     : (count: number) => (count === 1 ? '1 frase' : `${count} frases`),
  list        : 'Frases',
  start       : 'Desde',
  end         : 'Hasta',
  text        : (index: number) => `Texto de la frase ${index}`,
  merge       : 'Unir con la siguiente',
  split       : 'Partir',
  splitHint   : 'Parte la frase donde está el cursor',
  remove      : 'Quitar',
  goTo        : (time: string) => `Ir a ${time}`,
  saveAs      : 'Cómo guardo',
  modes       : {
    file  : { label: 'Archivo .srt aparte', hint: 'Con el mismo nombre que el video' },
    embed : { label: 'Dentro del video, se pueden apagar', hint: 'Sin volver a codificarlo' },
    burn  : { label: 'Pegados en la imagen', hint: 'Para WhatsApp, Instagram o TikTok' },
  } satisfies Record<SubtitleMode, { label: string; hint: string }>,
  embedOnly   : 'Este formato no lleva subtítulos adentro (solo MP4, MOV, MKV y WebM).',
  background  : 'Fondo',
  backgroundHint : 'Una caja semitransparente detrás de las letras',
  burnNote    : 'Vuelvo a codificar el video: tarda un poco más.',
  cancel      : 'Cancelar',
  save        : 'Guardar subtítulos',
  exitTitle   : '¿Salir sin guardar?',
  exitBody    : 'Se pierden las frases que revisaste.',
  exitConfirm : 'Salir',
  exitCancel  : 'Seguir',
};

// Formats that take a track inside (services/subtitles/burn.rs, track_codec).
export const TRACK_EXTENSIONS = ['mp4', 'm4v', 'mov', '3gp', 'mkv', 'webm'];
// The shortest phrase, in milliseconds.
export const MIN_CUE_MS = 100;
