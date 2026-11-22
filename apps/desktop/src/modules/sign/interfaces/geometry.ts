import type { PageRotation } from '@/modules/sign/types/pageRotation';

// 0 to 1, relative to the page as shown (rotation applied), from its top-left corner.
export interface RelativeRect {
  x      : number;
  y      : number;
  width  : number;
  height : number;
}

// CSS pixels inside the rendered page.
export interface ScreenRect {
  left   : number;
  top    : number;
  width  : number;
  height : number;
}

export interface Size {
  width  : number;
  height : number;
}

// The visible box of a page (CropBox, otherwise MediaBox) in PDF points, and its rotation.
export interface PageBox {
  left     : number;
  bottom   : number;
  width    : number;
  height   : number;
  rotation : PageRotation;
}

// Maps the unit square onto a placed rectangle in PDF user space (the cm operator).
export interface PdfMatrix {
  a : number;
  b : number;
  c : number;
  d : number;
  e : number;
  f : number;
}
