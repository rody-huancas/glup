import type { PictureBox } from '@/modules/media/interfaces/pictureBox';
import { overlayStyle } from '@/modules/subtitles/utils/overlay';

interface SubtitleOverlayProps {
  text       : string | null;
  box        : PictureBox;
  // «Fondo»: the half-transparent box behind the letters.
  background : boolean;
}

// The phrase over the picture as it will look drawn: white bold letters with a dark border (or a box),
// at the bottom in the middle, at the size it will have for this picture.
export const SubtitleOverlay = ({ text, box, background }: SubtitleOverlayProps) => {
  if (!text) return null;
  const style  = overlayStyle(box);
  const border = `${style.outline}px`;
  const shadow = [`-${border} 0`, `${border} 0`, `0 -${border}`, `0 ${border}`, `-${border} -${border}`, `${border} ${border}`, `-${border} ${border}`, `${border} -${border}`].map((offset) => `${offset} 0 #000`).join(',');

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ bottom: style.bottom, paddingInline: style.sides }}>
      <p
        className="text-center leading-tight font-bold whitespace-pre text-white"
        style={{
          fontFamily      : 'Arial, sans-serif',
          fontSize        : style.fontSize,
          textShadow      : background ? undefined : shadow,
          backgroundColor : background ? 'rgb(0 0 0 / 0.62)' : undefined,
          padding         : background ? `0 ${style.padding}px` : undefined,
          boxDecorationBreak : 'clone',
        }}
      >
        {text}
      </p>
    </div>
  );
};
