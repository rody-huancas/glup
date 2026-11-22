import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import type { ActionResult } from '@/modules/actions/interfaces/actionResult';
import type { ResultTone } from '@/modules/actions/types/resultTone';
import { Button } from '@/shared/components/Button';
import { cx } from '@/shared/utils/classNames';

interface ActionResultViewProps {
  result   : ActionResult;
  onOpen   : () => void;
  onReveal : () => void;
}

const TONE_CLASSES: Record<ResultTone, string> = {
  success : 'text-mint',
  partial : 'text-lilac-soft',
  failed  : 'text-lilac-soft',
  calm    : 'text-text',
};

export const ActionResultView = ({ result, onOpen, onReveal }: ActionResultViewProps) => (
  <div className="mt-3 flex min-h-[88px] flex-col gap-2">
    <p className={cx('text-[15px] font-semibold', TONE_CLASSES[result.tone])}>{result.message}</p>
    {result.note && <p className="text-xs text-muted">{result.note}</p>}
    {result.failedNames.length > 0 && <p className="truncate text-xs text-muted">{result.failedNames.join(', ')}</p>}
    {(result.openPath || result.revealPath) && (
      <div className="mt-auto flex gap-2">
        {result.openPath && (
          <Button onClick={onOpen} className="h-10">
            {ACTIONS_TEXTS.open}
          </Button>
        )}
        {result.revealPath && (
          <Button variant="secondary" onClick={onReveal} className="h-10">
            {ACTIONS_TEXTS.reveal}
          </Button>
        )}
      </div>
    )}
  </div>
);
