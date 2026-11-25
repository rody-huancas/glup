import { useState } from 'react';
import { UPSCALE_TEXTS } from '@/modules/upscale/constants/texts';

interface BeforeAfterProps {
  // One picture: before on its left half, after on its right half (services/upscale, preview).
  url : string;
}

const tag = 'pointer-events-none absolute top-2 rounded-full bg-bg/80 px-2 py-0.5 text-[11px] font-semibold';

// The same piece before and after, one over the other, with a curtain to slide (mouse or arrows).
export const BeforeAfter = ({ url }: BeforeAfterProps) => {
  const [split, setSplit]   = useState(50);
  const [aspect, setAspect] = useState(1);
  const half = (side: 'left' | 'right') => ({ backgroundImage: `url(${url})`, backgroundSize: '200% 100%', backgroundPosition: side });

  return (
    <>
      <img src={url} alt="" className="hidden" onLoad={(event) => setAspect(event.currentTarget.naturalWidth / 2 / Math.max(1, event.currentTarget.naturalHeight))} />
      <div className="relative w-full max-w-[min(100%,60vh)] overflow-hidden rounded-sm" style={{ aspectRatio: aspect }}>
        <div aria-hidden className="absolute inset-0 bg-no-repeat [image-rendering:auto]" style={half('left')} />
        <div aria-hidden className="absolute inset-0 bg-no-repeat" style={{ ...half('right'), clipPath: `inset(0 0 0 ${split}%)` }} />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-fam-images" style={{ left: `${split}%` }} />
        <span aria-hidden className={`${tag} left-2 text-text`}>{UPSCALE_TEXTS.before}</span>
        <span aria-hidden className={`${tag} right-2 text-fam-images`}>{UPSCALE_TEXTS.after}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={split}
          onChange={(event) => setSplit(Number(event.target.value))}
          aria-label={UPSCALE_TEXTS.curtain}
          className="absolute inset-0 size-full cursor-ew-resize opacity-0"
        />
      </div>
    </>
  );
};
