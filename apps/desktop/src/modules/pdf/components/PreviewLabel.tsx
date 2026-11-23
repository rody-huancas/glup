import type { PreviewText } from '@/modules/pdf/utils/stampPreview';
import { cx } from '@/shared/utils/classNames';

interface PreviewLabelProps {
  text    : string;
  preview : PreviewText;
  bold    : boolean;
  // Gray like the watermark, or black like page numbers.
  muted   : boolean;
}

const ANCHORS: Record<PreviewText['anchor'], string> = {
  center          : 'translate(-50%, -50%)',
  'bottom-right'  : 'translate(-100%, -100%)',
  'bottom-center' : 'translate(-50%, -100%)',
};

// The text over the page in the preview, in a Helvetica-like font as in the PDF.
export const PreviewLabel = ({ text, preview, bold, muted }: PreviewLabelProps) => (
  <span
    className={cx('absolute whitespace-nowrap leading-none', bold && 'font-bold', muted ? 'text-ink-gray' : 'text-ink')}
    style={{
      left            : preview.left,
      top             : preview.top,
      fontSize        : preview.fontSize,
      opacity         : preview.opacity,
      fontFamily      : 'Helvetica, Arial, sans-serif',
      transform       : `${ANCHORS[preview.anchor]} rotate(${-preview.angle}deg)`,
      transformOrigin : preview.anchor === 'center' ? 'center' : 'right bottom',
    }}
  >
    {text}
  </span>
);
