import type { RefObject } from 'react';
import { NOTICE_SHAPE } from '@/modules/island/constants/islandShape';
import type { IslandNotice } from '@/modules/island/interfaces/islandNotice';
import { getNoticeAnchorStyle, getNoticeTextStyle } from '@/modules/island/utils/islandStyles';
import { cx } from '@/shared/utils/classNames';

interface IslandNoticeViewProps {
  anchorRef : RefObject<HTMLDivElement | null>;
  textRef   : RefObject<HTMLDivElement | null>;
  notice    : IslandNotice | null;
}

// Glup's spot and the result line of the live notice; GSAP shows them while the pill is wide.
export const IslandNoticeView = ({ anchorRef, textRef, notice }: IslandNoticeViewProps) => (
  <>
    <div ref={anchorRef} aria-hidden className="pointer-events-none invisible absolute left-1/2" style={getNoticeAnchorStyle(NOTICE_SHAPE.width)} />
    <div
      ref={textRef}
      className="pointer-events-none absolute left-1/2 top-0 flex items-center opacity-0"
      style={getNoticeTextStyle(NOTICE_SHAPE.width, NOTICE_SHAPE.height)}
    >
      <p className={cx('truncate text-xs font-semibold', notice?.tone === 'success' ? 'text-mint' : notice?.tone === 'calm' ? 'text-text' : 'text-lilac-soft')}>
        {notice?.message}
      </p>
    </div>
  </>
);
