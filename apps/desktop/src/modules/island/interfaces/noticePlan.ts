import type { NoticeAction } from '@/modules/island/types/noticeAction';
import type { NoticeStyle } from '@/modules/island/types/noticeStyle';

export interface NoticePlan {
  action : NoticeAction;
  style  : NoticeStyle;
}
