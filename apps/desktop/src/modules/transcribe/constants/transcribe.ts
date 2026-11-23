import type { TranscribeLanguage } from '@/modules/transcribe/types/transcribeLanguage';
import type { TranscribeLevel } from '@/modules/transcribe/types/transcribeLevel';

export const TRANSCRIBE_TEXTS = {
  title       : 'Pasar audio a texto',
  language    : 'Idioma',
  otherField  : 'Otro idioma',
  level       : 'Precisión',
  fast        : 'Rápido',
  fastTip     : 'Buen español en poco tiempo',
  precise     : 'Más preciso',
  preciseTip  : 'Tarda más, se equivoca menos',
  start       : 'Pasar a texto',
  estimate    : (minutes: number) => (minutes === 1 ? 'Esto tomará cerca de un minuto.' : `Esto tomará unos ${minutes} minutos.`),
  quick       : 'Esto tomará menos de un minuto.',
  local       : 'Todo se escucha en tu PC: el audio nunca sale de ella.',
  empty       : 'No escuché a nadie hablar en esto',
  done        : (duration: string) => `Audio pasado a texto · ${duration}`,
  taskTitle   : (name: string) => `Pasar a texto · ${name}`,
  saveSrt     : 'Guardar subtítulos (.srt)',
  savedSrt    : (name: string) => `Subtítulos guardados · ${name}`,
  // Learning (the one-time download) and Ajustes › "Lo que aprendí".
  learnBody   : (size: string) => `Para pasar audios a texto necesito aprender algo nuevo. Es una descarga de ${size}, una sola vez. Tus audios nunca salen de tu PC.`,
  learning    : 'Aprendiendo a escuchar audios…',
  learnTask   : 'Aprender a escuchar audios',
  learnedFast : (size: string) => `Pasar audio a texto, rápido · ${size}`,
  learnedBest : (size: string) => `Pasar audio a texto, más preciso · ${size}`,
  deleteBody  : 'Libero ese espacio. Si vuelves a pasar un audio a texto con ese nivel, te pediré descargarlo otra vez.',
};

export const LEVEL_LABELS: Record<TranscribeLevel, string> = {
  fast    : TRANSCRIBE_TEXTS.fast,
  precise : TRANSCRIBE_TEXTS.precise,
};

// The short list; "Otro" opens the rest.
export const MAIN_LANGUAGES: TranscribeLanguage[] = ['auto', 'es', 'en', 'pt', 'other'];

export const LANGUAGE_LABELS: Record<TranscribeLanguage, string> = {
  auto  : 'Detectar solo',
  es    : 'Español',
  en    : 'Inglés',
  pt    : 'Portugués',
  other : 'Otro',
  fr    : 'Francés',
  it    : 'Italiano',
  de    : 'Alemán',
  ca    : 'Catalán',
  qu    : 'Quechua',
};

export const OTHER_LANGUAGES: TranscribeLanguage[] = ['fr', 'it', 'de', 'ca', 'qu'];
