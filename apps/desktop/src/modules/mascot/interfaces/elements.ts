import type { RefObject } from 'react';
import type { FileKind } from '@/modules/mascot/types/fileKind';
import type { MouthKind } from '@/modules/mascot/types/mouthKind';

export type ElementRef<T extends HTMLElement = HTMLDivElement> = RefObject<T | null>;

export interface EyeElements {
  wrapper : ElementRef;
  open    : ElementRef<HTMLImageElement>;
}

export interface MascotElements {
  breath   : ElementRef;
  act      : ElementRef;
  eyes     : ElementRef;
  eyeLeft  : EyeElements;
  eyeRight : EyeElements;
  mouths   : Record<MouthKind, ElementRef<HTMLImageElement>>;
  files    : Record<FileKind, ElementRef<HTMLImageElement>>;
}
