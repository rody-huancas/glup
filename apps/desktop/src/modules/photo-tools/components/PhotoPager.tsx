import { PHOTO_TOOLS_TEXTS } from '@/modules/photo-tools/constants/texts';

interface PhotoPagerProps {
  index    : number;
  total    : number;
  onChange : (index: number) => void;
}

const arrow = 'flex size-8 cursor-pointer items-center justify-center rounded-full border border-line-strong text-text outline-none hover:bg-raised focus-visible:ring-2 focus-visible:ring-fam-images disabled:cursor-default disabled:opacity-40';

// «Foto 2 de 5» with the two arrows, when there is more than one.
export const PhotoPager = ({ index, total, onChange }: PhotoPagerProps) =>
  total > 1 ? (
    <div className="flex items-center justify-center gap-2">
      <button type="button" className={arrow} aria-label={PHOTO_TOOLS_TEXTS.previous} disabled={index === 0} onClick={() => onChange(index - 1)}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 6-6 6 6 6" /></svg>
      </button>
      <span aria-live="polite" className="min-w-24 text-center text-[12px] text-muted tabular-nums">{PHOTO_TOOLS_TEXTS.page(index + 1, total)}</span>
      <button type="button" className={arrow} aria-label={PHOTO_TOOLS_TEXTS.next} disabled={index === total - 1} onClick={() => onChange(index + 1)}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
      </button>
    </div>
  ) : null;
