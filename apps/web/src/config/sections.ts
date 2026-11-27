import type { ISection } from '@/types/section.types';

// In page order: the bottom bar and the sections' ids come from here.
export const SECTIONS: ISection[] = [
  { id: 'inicio',        label: 'Inicio',        accent: 'brand' },
  { id: 'que-hace',      label: 'Qué hace',      accent: 'lilac' },
  { id: 'como-funciona', label: 'Cómo funciona', accent: 'yellow' },
  { id: 'privacidad',    label: 'Privacidad',    accent: 'sky' },
  { id: 'preguntas',     label: 'Preguntas',     accent: 'coral' },
  { id: 'descargar',     label: 'Descargar',     accent: 'silver' },
];
