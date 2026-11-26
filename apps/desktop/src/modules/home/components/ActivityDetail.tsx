import { useRef } from 'react';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { ActivityCard } from '@/modules/home/components/ActivityCard';
import { DASHBOARD_TEXTS } from '@/modules/home/constants/dashboard';
import { useIslandHold } from '@/modules/island/hooks/useIslandHold';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import { CloseIcon } from '@/shared/icons/CloseIcon';

interface ActivityDetailProps {
  entries : HistoryEntry[];
  now     : Date;
  onClose : () => void;
}

// The big chart with its period, over Inicio (Esc, × or a click outside close it); the island stays open
// meanwhile.
export const ActivityDetail = ({ entries, now, onClose }: ActivityDetailProps) => {
  const box       = useRef<HTMLDivElement>(null);
  const onKeyDown = useFocusTrap({ containerRef: box, onEscape: onClose });
  useIslandHold(true);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[18px] bg-black/55 p-6" onPointerDown={onClose}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={DASHBOARD_TEXTS.weekDetail}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => event.stopPropagation()}
        className="@container relative w-full max-w-[640px] rounded-[18px] bg-surface shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={DASHBOARD_TEXTS.closeDetail}
          title={DASHBOARD_TEXTS.closeDetail}
          className="absolute -top-3 -right-3 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full border border-line-strong bg-raised text-muted outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-lilac"
        >
          <CloseIcon className="size-3.5" />
        </button>
        <ActivityCard entries={entries} now={now} />
      </div>
    </div>
  );
};
