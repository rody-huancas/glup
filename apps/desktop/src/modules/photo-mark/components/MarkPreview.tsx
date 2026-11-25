import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { usePictureBox } from '@/modules/media/hooks/usePictureBox';
import { usePhotoPreview } from '@/modules/photo-tools/hooks/usePhotoPreview';
import { FONT_CSS } from '@/modules/photo-mark/constants/texts';
import type { MarkOptions } from '@/modules/photo-mark/interfaces/markOptions';
import { markHeight, MOSAIC_ANGLE, mosaicCenters, placeAt, shadowPad } from '@/modules/photo-mark/utils/layout';
import { Skeleton } from '@/shared/components/Skeleton';

interface MarkPreviewProps {
  url     : string | null;
  options : MarkOptions;
  // The photo's own size (upright), to lay the mark as Rust will.
  size    : [number, number] | null;
}

// ab_glyph sizes letters by their whole line (ascent to descent), CSS by the em: about this much smaller.
const LINE_TO_EM = 1.12;

const measure = (text: string, font: string): number => {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return text.length * 10;
  context.font = font;
  return context.measureText(text).width;
};

// The photo with its mark drawn over it, live: the same sizes and places Rust uses, scaled to the screen.
export const MarkPreview = ({ url, options, size }: MarkPreviewProps) => {
  const { box, measure: observe } = usePictureBox();
  const logo                      = usePhotoPreview(options.kind === 'logo' ? options.logo : null, 512);
  const [logoAspect, setAspect]   = useState(1);

  useEffect(() => {
    if (!logo.url) return;
    const image  = new Image();
    image.onload = () => setAspect(image.naturalWidth / Math.max(1, image.naturalHeight));
    image.src    = logo.url;
  }, [logo.url]);

  const [width, height] = size ?? [0, 0];
  const markH           = markHeight(width, height, options.size);
  const css             = FONT_CSS[options.font];
  const pad             = options.kind === 'text' ? shadowPad(markH, options.shadow) : 0;
  const fontPx          = markH / LINE_TO_EM;
  const markW           = useMemo(
    () => (options.kind === 'text' ? Math.ceil(measure(options.text, `${css.weight} ${fontPx}px ${css.family}`)) + pad * 2 : Math.round(markH * logoAspect)),
    [options.kind, options.text, css, fontPx, pad, markH, logoAspect],
  );
  const scale = box && width > 0 ? box.width / width : 0;
  const shown = options.kind === 'text' ? options.text.trim() !== '' : logo.url !== null;

  const stamp = (style: CSSProperties, key?: number) =>
    options.kind === 'text' ? (
      <span
        key={key}
        className="absolute leading-none whitespace-pre"
        style={{
          ...style,
          padding    : pad * scale,
          fontFamily : css.family,
          fontWeight : css.weight,
          fontSize   : fontPx * scale,
          lineHeight : `${markH * scale}px`,
          color      : options.color,
          opacity    : options.opacity,
          textShadow : options.shadow ? `${(markH / 22) * scale}px ${(markH / 22) * scale}px ${(markH / 12) * scale}px rgb(0 0 0 / 0.55)` : undefined,
        }}
      >
        {options.text}
      </span>
    ) : (
      <img key={key} src={logo.url ?? ''} alt="" className="absolute" style={{ ...style, height: markH * scale, opacity: options.opacity }} />
    );

  const marks = !shown || scale === 0 ? null : options.place === 'mosaic'
    ? mosaicCenters({ width, height, markW, markH: markH + pad * 2 }).map(([x, y], index) => stamp({ left: x * scale, top: y * scale, transform: `translate(-50%, -50%) rotate(-${MOSAIC_ANGLE}deg)` }, index))
    : (() => {
      const [x, y] = placeAt({ place: options.place, width, height, markW, markH: markH + pad * 2 });
      return stamp({ left: x * scale, top: y * scale });
    })();

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center rounded-control bg-bg p-2">
      {url ? (
        <div className="relative flex max-h-full max-w-full overflow-hidden">
          <img ref={observe} src={url} alt="" className="max-h-[60vh] max-w-full object-contain @3xl:max-h-[calc(100vh-260px)]" />
          <div aria-hidden className="pointer-events-none absolute inset-0">{marks}</div>
        </div>
      ) : (
        <Skeleton className="min-h-60 w-full rounded-control" />
      )}
    </div>
  );
};
