import type { RefObject } from 'react';
import { MAIN_WINDOW_TEXTS } from '@/modules/main-window/constants/mainWindow';
import { getBodyAspectRatio } from '@/modules/mascot/utils/pieceStyle';

interface SidebarProfileProps {
  anchorRef : RefObject<HTMLDivElement | null>;
  status    : string;
}

// The avatar box only marks the spot: the island's Glup flies here when the panel opens.
export const SidebarProfile = ({ anchorRef, status }: SidebarProfileProps) => (
  <div className="mb-[18px] flex items-center gap-2.5">
    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-raised">
      <div ref={anchorRef} className="w-11" style={{ aspectRatio: getBodyAspectRatio() }} />
    </div>
    <div className="min-w-0">
      <p className="text-lg font-bold leading-tight text-text">{MAIN_WINDOW_TEXTS.name}</p>
      <p className="mt-0.5 flex min-h-8 items-start gap-1.5 text-xs leading-snug text-muted">
        <span className="mt-[5px] size-2 shrink-0 rounded-full bg-mint" />
        <span>{status}</span>
      </p>
    </div>
  </div>
);
