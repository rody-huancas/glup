import type { RefObject } from 'react';
import { NOTICE_SHAPE } from '@/modules/island/constants/islandShape';
import type { IslandNotice } from '@/modules/island/interfaces/islandNotice';
import { getNoticeAnchorStyle, getNoticeTextStyle } from '@/modules/island/utils/islandStyles';
import { SCREEN_TEXT_TEXTS } from '@/modules/screen-text/constants/texts';
import { cx } from '@/shared/utils/classNames';

interface IslandNoticeViewProps {
  anchorRef : RefObject<HTMLDivElement | null>;
  textRef   : RefObject<HTMLDivElement | null>;
  notice    : IslandNotice | null;
  // "Ver": the history line the notice talks about (Copiar texto de la pantalla).
  onView    : (entryId: string) => void;
}

// Glup's spot and the result line of the live notice; GSAP shows them while the pill is wide.
export const IslandNoticeView = ({ anchorRef, textRef, notice, onView }: IslandNoticeViewProps) => {
  const entryId = notice?.entryId ?? null;

  return (
    <>
      <div ref={anchorRef} aria-hidden className="pointer-events-none invisible absolute left-1/2" style={getNoticeAnchorStyle(NOTICE_SHAPE.width)} />
      <div
        ref={textRef}
        className="pointer-events-none absolute left-1/2 top-0 flex items-center gap-2 opacity-0"
        style={getNoticeTextStyle(NOTICE_SHAPE.width, NOTICE_SHAPE.height)}
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
