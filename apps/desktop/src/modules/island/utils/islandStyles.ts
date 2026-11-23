import type { CSSProperties } from 'react';
import { MASCOT_SLOT_WIDTH, PEEK_POSE } from '@/modules/island/constants/island';
import type { IslandLayout } from '@/modules/island/interfaces/islandLayout';
import { getContentSize } from '@/modules/island/utils/islandLayout';
import { getBodyAspectRatio } from '@/modules/mascot/utils/pieceStyle';

export const getContentKeyframe = ({ target }: IslandLayout) => ({
  opacity: target === 'expanded' ? 1 : 0,
});

// Untransformed box of the flying Glup, centered like the panel so it never drifts while the panel grows.
export const getFlyerStyle = (): CSSProperties => ({
  width      : `${MASCOT_SLOT_WIDTH}px`,
  marginLeft : `${-MASCOT_SLOT_WIDTH / 2}px`,
});

// Where Glup sits in the pill: only its top peeks out, cropped by the panel.
export const getPillAnchorStyle = (): CSSProperties => ({
  width       : `${MASCOT_SLOT_WIDTH * PEEK_POSE.scale}px`,
  marginLeft  : `${PEEK_POSE.x - MASCOT_SLOT_WIDTH / 2}px`,
  top         : `${PEEK_POSE.y}px`,
  aspectRatio : getBodyAspectRatio(),
});

// Where Glup sits in the live notice: at the left end, a bit smaller, only its head showing.
const NOTICE_MASCOT = { scale: 0.5, inset: 10, top: -9 };

export const getNoticeAnchorStyle = (noticeWidth: number): CSSProperties => ({
  width       : `${MASCOT_SLOT_WIDTH * NOTICE_MASCOT.scale}px`,
  marginLeft  : `${-noticeWidth / 2 + NOTICE_MASCOT.inset}px`,
  top         : `${NOTICE_MASCOT.top}px`,
  aspectRatio : getBodyAspectRatio(),
});

// The text takes the rest of the notice, to the right of Glup.
export const getNoticeTextStyle = (noticeWidth: number, height: number): CSSProperties => {
  const start = -noticeWidth / 2 + NOTICE_MASCOT.inset + MASCOT_SLOT_WIDTH * NOTICE_MASCOT.scale + 6;

  return {
    marginLeft : `${start}px`,
    width      : `${noticeWidth / 2 - start - 14}px`,
    height     : `${height}px`,
  };
};

export const getContentStyle = (layout: IslandLayout): CSSProperties => {
  const { width, height } = getContentSize();

  return {
    ...getContentKeyframe(layout),
    width  : `${width}px`,
    height : `${height}px`,
  };
};
