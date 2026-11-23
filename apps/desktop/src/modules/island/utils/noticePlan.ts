import type { NoticePlan } from '@/modules/island/interfaces/noticePlan';
import type { VisibleIslandState } from '@/modules/island/types/islandState';

interface PlanNoticeParams {
  // A notice is already on the wide pill.
  live    : boolean;
  // The island is opening or closing.
  moving  : boolean;
  settled : VisibleIslandState;
  reduced : boolean;
}

// What a new result does with the pill. Reduced motion only changes how it shows (a short fade instead
// of the bubble), never whether it shows: the same notice, the same time, the same "Ver".
export const planNotice = ({ live, moving, settled, reduced }: PlanNoticeParams): NoticePlan => ({
  action : live ? 'replace' : moving || settled !== 'collapsed' ? 'skip' : 'show',
  style  : reduced ? 'fade' : 'bubble',
});
