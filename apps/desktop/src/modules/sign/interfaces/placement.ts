import type { RelativeRect } from '@/modules/sign/interfaces/geometry';

export interface ImageContent {
  kind        : 'image';
  signatureId : string;
  path        : string;
  url         : string;
  // Height / width of the signature image.
  aspect      : number;
}

export interface TextContent {
  kind     : 'text';
  text     : string;
  // In PDF points.
  fontSize : number;
}

export type PlacementContent = ImageContent | TextContent;

export interface SignPlacement {
  id      : string;
  // 1-based.
  page    : number;
  rect    : RelativeRect;
  content : PlacementContent;
}

// What sign_pdf receives for each element.
export type PlacementRequest = {
  page   : number;
  x      : number;
  y      : number;
  width  : number;
  height : number;
} & ({ kind: 'image'; path: string } | { kind: 'text'; text: string });
