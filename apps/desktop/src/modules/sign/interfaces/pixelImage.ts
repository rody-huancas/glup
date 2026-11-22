// RGBA pixels, like ImageData, so image work stays pure and testable.
export interface PixelImage {
  data   : Uint8ClampedArray;
  width  : number;
  height : number;
}
