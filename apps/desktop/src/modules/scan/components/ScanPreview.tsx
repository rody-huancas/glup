import { SCAN_TEXTS } from '@/modules/scan/constants/texts';
import { Skeleton } from '@/shared/components/Skeleton';

interface ScanPreviewProps {
  url     : string | null;
  loading : boolean;
  index   : number;
}

// The chosen page straightened and cleaned, as it will be saved.
export const ScanPreview = ({ url, loading, index }: ScanPreviewProps) => (
  <figure className="flex shrink-0 flex-col gap-1.5">
    <figcaption className="flex items-center justify-between text-[11px] font-semibold text-muted">
      {SCAN_TEXTS.preview}
      {loading && <span aria-live="polite" className="font-normal">{SCAN_TEXTS.previewing}</span>}
    </figcaption>
    <div className="flex h-[180px] items-center justify-center rounded-control border border-line bg-bg p-2">
      {url ? <img src={url} alt={SCAN_TEXTS.previewOf(index)} className="max-h-full max-w-full object-contain shadow-sm" /> : <Skeleton className="h-full w-[70%]" />}
    </div>
  </figure>
);
