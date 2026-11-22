import { SIGN_TEXTS } from '@/modules/sign/constants/sign';
import { ChevronLeftIcon } from '@/shared/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '@/shared/icons/ChevronRightIcon';
import { MinusIcon } from '@/shared/icons/MinusIcon';
import { PlusIcon } from '@/shared/icons/PlusIcon';
import { IconButton } from '@/shared/components/IconButton';
import { cx } from '@/shared/utils/classNames';

interface ViewerZoom {
  fitted  : boolean;
  percent : number;
  fit     : () => void;
  actual  : () => void;
  zoomIn  : () => void;
  zoomOut : () => void;
}

interface ViewerToolbarProps {
  name       : string;
  page       : number;
  total      : number;
  zoom       : ViewerZoom;
  onPrevious : () => void;
  onNext     : () => void;
}

const textButton = 'h-7 cursor-pointer rounded-md px-2 text-[12px] font-semibold transition-colors hover:bg-raised';

export const ViewerToolbar = ({ name, page, total, zoom, onPrevious, onNext }: ViewerToolbarProps) => (
  <div className="flex h-8 shrink-0 items-center justify-between gap-3">
    <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text">{name}</p>
    <div className="flex items-center gap-1">
      <IconButton icon={ChevronLeftIcon} label={SIGN_TEXTS.previous} onClick={onPrevious} disabled={page <= 1} className="size-7" iconClass="size-4" />
      <span className="min-w-[104px] text-center text-[12px] font-semibold text-muted">{SIGN_TEXTS.page(page, Math.max(total, 1))}</span>
      <IconButton icon={ChevronRightIcon} label={SIGN_TEXTS.next} onClick={onNext} disabled={page >= total} className="size-7" iconClass="size-4" />
    </div>
    <div className="flex flex-1 items-center justify-end gap-1">
      <button type="button" onClick={zoom.fit} aria-pressed={zoom.fitted} className={cx(textButton, zoom.fitted ? 'text-mint' : 'text-muted hover:text-text')}>
        {SIGN_TEXTS.zoomFit}
      </button>
      <button type="button" onClick={zoom.actual} className={cx(textButton, 'text-muted hover:text-text')}>
        {SIGN_TEXTS.zoomActual}
      </button>
      <IconButton icon={MinusIcon} label={SIGN_TEXTS.zoomOut} onClick={zoom.zoomOut} className="size-7" iconClass="size-4" />
      <span className="w-10 text-center text-[11px] font-semibold text-muted">{zoom.percent}%</span>
      <IconButton icon={PlusIcon} label={SIGN_TEXTS.zoomIn} onClick={zoom.zoomIn} className="size-7" iconClass="size-4" />
    </div>
  </div>
);
