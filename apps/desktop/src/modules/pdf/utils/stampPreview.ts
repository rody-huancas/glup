import { NUMBER_FONT_SIZE, NUMBER_MARGIN } from '@/modules/pdf/constants/numbering';
import { A4_WIDTH } from '@/modules/pdf/constants/pdf';
import { CORNER_MARGIN, CORNER_SIZE, DIAGONAL_SHARE, OPACITY_ALPHA } from '@/modules/pdf/constants/watermark';
import type { WatermarkOptions } from '@/modules/pdf/interfaces/watermarkOptions';
import type { NumberPosition } from '@/modules/pdf/types/numbering';
import type { Size } from '@/shared/interfaces/size';

interface WatermarkPreviewParams {
  options : WatermarkOptions;
  page    : Size;
  // Width of the text at a font size of 1 (in the same unit), measured by the caller.
  unit    : number;
}

interface NumberPreviewParams {
  position : NumberPosition;
  page     : Size;
}

// Where and how big the text is drawn over the preview, in screen pixels. Same rules as Rust
// (services/pdf/watermark.rs and numbering.rs); sizes in points are scaled as if the page were A4 wide.
export interface PreviewText {
  left     : number;
  top      : number;
  fontSize : number;
  // Degrees, counterclockwise as seen (CSS rotates the other way).
  angle    : number;
  opacity  : number;
  // How the box is anchored at (left, top): its center, or its right edge on the baseline.
  anchor   : 'center' | 'bottom-right' | 'bottom-center';
}

// The smallest text that is still readable in a 176 px tall page.
const MIN_PREVIEW_FONT = 7;

export const watermarkPreview = ({ options, page, unit }: WatermarkPreviewParams): PreviewText => {
  const opacity = OPACITY_ALPHA[options.opacity];

  if (options.position === 'diagonal') {
    const angle    = Math.atan2(page.height, page.width);
    const fontSize = Math.min((Math.hypot(page.width, page.height) * DIAGONAL_SHARE[options.size]) / Math.max(unit, 0.01), Math.min(page.width, page.height) / 3);
    return { left: page.width / 2, top: page.height / 2, fontSize, angle: (angle * 180) / Math.PI, opacity, anchor: 'center' };
  }

  const scale = page.width / A4_WIDTH;
  return {
    left     : page.width - CORNER_MARGIN * scale,
    top      : page.height - CORNER_MARGIN * scale,
    fontSize : Math.max(CORNER_SIZE[options.size] * scale, MIN_PREVIEW_FONT),
    angle    : 0,
    opacity,
    anchor   : 'bottom-right',
  };
};

export const numberPreview = ({ position, page }: NumberPreviewParams): PreviewText => {
  const scale    = page.width / A4_WIDTH;
  const margin   = NUMBER_MARGIN * scale;
  const fontSize = Math.max(NUMBER_FONT_SIZE * scale, MIN_PREVIEW_FONT);
  const base     = { fontSize, angle: 0, opacity: 1 };

  if (position === 'bottom-center') return { ...base, left: page.width / 2, top: page.height - margin, anchor: 'bottom-center' };
  if (position === 'bottom-right') return { ...base, left: page.width - margin, top: page.height - margin, anchor: 'bottom-right' };
  return { ...base, left: page.width - margin, top: margin + fontSize, anchor: 'bottom-right' };
};
