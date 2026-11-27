import type { Accent } from '@/types/content.types';

export type SectionId = 'inicio' | 'que-hace' | 'como-funciona' | 'privacidad' | 'preguntas' | 'descargar';

export interface ISection {
  id     : SectionId;
  label  : string;
  accent : Accent;
}

export interface ISectionTop {
  id  : SectionId;
  top : number;
}
