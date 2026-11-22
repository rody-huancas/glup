import { PageThumb } from '@/modules/pdf/components/PageThumb';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import { PDF_TEXTS } from '@/modules/pdf/constants/pdf';
import { usePageCount } from '@/modules/pdf/hooks/usePageCount';
import { usePageSelection } from '@/modules/pdf/hooks/usePageSelection';
import { Button } from '@/shared/components/Button';
import { cx } from '@/shared/utils/classNames';

interface PageSelectionStepProps {
  path     : string;
  pages    : number | null;
  onCreate : (pages: number[]) => void;
  onBack   : () => void;
}

// Click thumbnails or type "1-3, 5, 8-10"; both stay in sync. The grid scrolls inside and loads lazily.
export const PageSelectionStep = ({ path, pages, onCreate, onBack }: PageSelectionStepProps) => {
  const total     = usePageCount(path, pages);
  const selection = usePageSelection(total);

  return (
    <div className="flex flex-col">
      <StepHeader title={PDF_TEXTS.pagesTitle} onBack={onBack} />
      <div className="scroll-thin mt-2.5 grid max-h-[136px] grid-cols-6 gap-2 overflow-y-auto pr-1">
        {Array.from({ length: total }, (_, index) => index + 1).map((page) => (
          <PageThumb key={page} path={path} page={page} position={selection.pages.indexOf(page) + 1} onToggle={selection.toggle} />
        ))}
      </div>
      <div className="mt-2.5 flex items-start gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <input
            value={selection.text}
            onChange={(event) => selection.write(event.target.value)}
            placeholder={PDF_TEXTS.pagesExample}
            aria-label={PDF_TEXTS.pagesField}
            aria-invalid={selection.error !== null}
            className={cx(
              'h-10 rounded-control border bg-raised px-3 text-[13px] text-text outline-none placeholder:text-muted focus:border-lilac',
              selection.error ? 'border-[#E58A9A]' : 'border-line-strong',
            )}
          />
          {selection.error && <span className="text-[11px] text-[#E58A9A]">{selection.error}</span>}
        </label>
        <Button onClick={() => onCreate(selection.pages)} disabled={!selection.valid} className="h-10 shrink-0">
          {PDF_TEXTS.pagesButton(selection.pages.length)}
        </Button>
      </div>
    </div>
  );
};
