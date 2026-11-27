import type { ImageMetadata } from 'astro';

export type Accent = 'brand' | 'lilac' | 'coral' | 'yellow' | 'sky' | 'mint' | 'silver';

export type FamilyId = 'images' | 'pdf' | 'media' | 'text' | 'clipboard' | 'pc';

export type FileKind = 'pdf' | 'photo' | 'voice' | 'video' | 'text' | 'zip';

export interface ILink {
  label : string;
  href  : string;
}

export interface ISkill {
  title       : string;
  description : string;
}

export interface IFamily {
  id     : FamilyId;
  name   : string;
  phrase : string;
  accent : Accent;
  glup   : ImageMetadata;
  notes? : string[];
}

export interface IStep {
  number : string;
  title  : string;
  body   : string;
  image  : ImageMetadata;
  alt    : string;
  window : string;
}

export interface IDownloadRow {
  what   : string;
  forUse : string;
  weight : string;
}

export interface IQuestion {
  question : string;
  answer   : string;
}

export interface IHeading {
  label : string;
  title : string;
  lead? : string;
}
