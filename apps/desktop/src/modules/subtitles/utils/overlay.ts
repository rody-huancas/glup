import type { PictureBox } from '@/modules/media/interfaces/pictureBox';

export interface OverlayStyle {
  fontSize : number;
  bottom   : number;
  sides    : number;
  outline  : number;
  padding  : number;
}

// The same rule as the drawn subtitles (services/subtitles/burn.rs): letters by the height, smaller on a
// narrow picture so 42 characters fit; the margins and the border in the same proportions.
export const overlayStyle = ({ width, height }: PictureBox): OverlayStyle => {
  const fontSize = Math.max(8, Math.min(height * 0.058, width * 0.042));
  return { fontSize, bottom: height * 0.06, sides: width * 0.05, outline: Math.max(1, fontSize / 14), padding: fontSize / 5 };
};
