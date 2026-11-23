import { useCopyAgain } from '@/modules/history/hooks/useCopyAgain';
import { SCREEN_HISTORY_TEXTS } from '@/modules/screen-text/constants/texts';
import { Button } from '@/shared/components/Button';

interface HistoryTextDetailProps {
  id   : string;
  text : string;
}

// A copied text, whole and selectable, with "Copiar de nuevo".
export const HistoryTextDetail = ({ id, text }: HistoryTextDetailProps) => {
  const { state, copy } = useCopyAgain(text);

  return (
    <div id={id} className="flex flex-col gap-2.5 px-3 pb-3">
      <p className="max-h-40 overflow-y-auto scroll-thin whitespace-pre-wrap break-words rounded-control bg-bg p-3 text-[13px] leading-relaxed text-text select-text">{text}</p>
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={copy} className="h-8 px-3 text-[12px]">
          {SCREEN_HISTORY_TEXTS.copy}
        </Button>
        <span aria-live="polite" className={state === 'failed' ? 'text-[12px] font-semibold text-lilac-soft' : 'text-[12px] font-semibold text-mint'}>
          {state === 'copied' && SCREEN_HISTORY_TEXTS.copied}
          {state === 'failed' && SCREEN_HISTORY_TEXTS.failed}
        </span>
      </div>
    </div>
  );
};
