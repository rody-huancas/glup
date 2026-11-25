import type { RefObject } from 'react';
import { FAMILY_STYLES } from '@/modules/families/constants/families';
import type { FamilyId } from '@/modules/families/types/familyId';
import { MAIN_WINDOW_TEXTS } from '@/modules/main-window/constants/mainWindow';
import { getBodyAspectRatio } from '@/modules/mascot/utils/pieceStyle';
import { cx } from '@/shared/utils/classNames';

interface SidebarProfileProps {
  anchorRef : RefObject<HTMLDivElement | null>;
  status    : string;
  // While a task runs: the family of its tool colors Glup's box and the dot of the status.
  family    : FamilyId | null;
}

// The avatar box only marks the spot: the island's Glup flies here when the panel opens.
export const SidebarProfile = ({ anchorRef, status, family }: SidebarProfileProps) => (
  <div className="mb-[18px] flex items-center gap-2.5">
    <div className={cx('flex size-14 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300', family ? FAMILY_STYLES[family].deep : 'bg-raised')}>
      <div ref={anchorRef} className="w-11" style={{ aspectRatio: getBodyAspectRatio() }} />
    </div>
    <div className="min-w-0">
      <p className="text-lg font-bold leading-tight text-text">{MAIN_WINDOW_TEXTS.name}</p>
      <p className="mt-0.5 flex min-h-8 items-start gap-1.5 text-xs leading-snug text-muted">
        <span className={cx('mt-[5px] size-2 shrink-0 rounded-full transition-colors duration-300', family ? FAMILY_STYLES[family].fill : 'bg-mint')} />
        <span>{status}</span>
      </p>
    </div>
  </div>
);
