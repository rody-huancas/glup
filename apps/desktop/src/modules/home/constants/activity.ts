import type { FamilyId } from '@/modules/families/types/familyId';
import type { ActivityRange } from '@/modules/home/types/activityRange';

export const ACTIVITY_RANGES: ActivityRange[] = ['week', 'month', 'half'];

// How many bars each range has.
export const ACTIVITY_BARS: Record<ActivityRange, number> = { week: 7, month: 4, half: 6 };

export const ACTIVITY_LOCALE = 'es';

// The chart in CSS pixels: the room for the bars, the labels under them, and the widest a bar gets.
export const ACTIVITY_CHART = { height: 96, labels: 18, maxBar: 26, share: 0.42, gap: 2 };

// The bars that stand in while there are no data: drawn with stripes, never as real numbers.
export const PLACEHOLDER_BARS = [0.45, 0.7, 0.35, 0.85, 0.55, 0.65, 0.4];

// Seconds, as GSAP expects: the bars grow when they show (not with reduced motion).
export const ACTIVITY_MOTION = { duration: 0.5, stagger: 0.04, ease: 'power3.out' };

// How each family's work is said in the balloon ("12 imágenes, 3 PDF").
export const FAMILY_UNITS: Record<FamilyId, [string, string]> = {
  images    : ['imagen', 'imágenes'],
  pdf       : ['PDF', 'PDF'],
  media     : ['audio o video', 'audios y videos'],
  text      : ['texto', 'textos'],
  clipboard : ['cosa del portapapeles', 'cosas del portapapeles'],
  pc        : ['tarea en tu PC', 'tareas en tu PC'],
};

export const ACTIVITY_TEXTS = {
  title     : 'Lo que hicimos',
  ranges    : { week: 'Esta semana', month: 'Últimas 4 semanas', half: 'Últimos 6 meses' } satisfies Record<ActivityRange, string>,
  rangeName : 'Período del gráfico',
  chart     : (range: string) => `Gráfico de lo que hicimos: ${range}`,
  noData    : 'Aún no hay datos',
  nothing   : 'nada',
  week      : (start: string) => `Semana del ${start}`,
  table     : 'Lo que hicimos, por período y familia',
  period    : 'Período',
  total     : 'Total',
};
