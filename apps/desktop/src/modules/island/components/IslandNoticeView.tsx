import type { RefObject } from 'react';
import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import type { IslandNotice } from '@/modules/island/interfaces/islandNotice';
import { getNoticeAnchorStyle, getNoticeTextStyle } from '@/modules/island/utils/islandStyles';
import { SCREEN_TEXT_TEXTS } from '@/modules/screen-text/constants/texts';
import { cx } from '@/shared/utils/classNames';

interface IslandNoticeViewProps {
  anchorRef : RefObject<HTMLDivElement | null>;
  textRef   : RefObject<HTMLDivElement | null>;
  notice    : IslandNotice | null;
  placement : IslandPlacement;
  // "Ver": the history line the notice talks about (Copiar texto de la pantalla).
  onView    : (entryId: string) => void;
}

// Glup's spot and the result line of the live notice; GSAP shows them while the pill is wide.
export const IslandNoticeView = ({ anchorRef, textRef, notice, placement, onView }: IslandNoticeViewProps) => {
  const entryId = notice?.entryId ?? null;

  return (
    <>
      <div ref={anchorRef} aria-hidden className="pointer-events-none invisible absolute" style={getNoticeAnchorStyle(placement)} />
      <div
        ref={textRef}
        className="pointer-events-none absolute flex items-center gap-2 opacity-0"
        style={getNoticeTextStyle(placement)}
      >
        <p className={cx('min-w-0 flex-1 truncate text-xs font-semibold', notice?.tone === 'success' ? 'text-mint' : notice?.tone === 'calm' ? 'text-text' : 'text-lilac-soft')}>
          {notice?.message}
        </p>
        {entryId && (
          <button
            type="button"
            onClick={() => onView(entryId)}
            className="pointer-events-auto shrink-0 cursor-pointer rounded-md text-xs font-semibold text-lilac hover:text-lilac-soft"
          >
            {SCREEN_TEXT_TEXTS.view}
          </button>
        )}
      </div>
    </>
  );
};
