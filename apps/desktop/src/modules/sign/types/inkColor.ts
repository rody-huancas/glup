// original: the stroke's own color (uploaded images only).
export type InkColor = 'original' | 'black' | 'blue';
// export type InkColor = 'black' | 'blue';

export type SolidInk = Exclude<InkColor, 'original'>;
