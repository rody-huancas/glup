import { BACKGROUND_TEXTS, LEARNED_TEXTS } from '@/modules/background/constants/texts';
import type { Learnable } from '@/modules/background/interfaces/learnable';
import type { LearnableId } from '@/modules/background/types/learnableId';
import { deleteBackgroundModel, downloadBackgroundModel, getBackgroundModel } from '@/modules/background/services/backgroundModel';
import { VIDEO_TOOL_TEXTS } from '@/modules/video/constants/texts';
import { deleteVideoTool, downloadVideoTool, getVideoTool } from '@/modules/video/services/videoTool';

export const LEARNABLES: Record<LearnableId, Learnable> = {
  background : {
    id        : 'background',
    texts     : {
      body       : BACKGROUND_TEXTS.learnBody,
      learning   : BACKGROUND_TEXTS.learning,
      taskTitle  : BACKGROUND_TEXTS.taskTitle,
      learned    : LEARNED_TEXTS.removeBg,
      deleteBody : LEARNED_TEXTS.confirmBody,
    },
    getStatus : getBackgroundModel,
    download  : downloadBackgroundModel,
    remove    : deleteBackgroundModel,
  },
  video      : {
    id        : 'video',
    texts     : {
      body       : VIDEO_TOOL_TEXTS.learnBody,
      learning   : VIDEO_TOOL_TEXTS.learning,
      taskTitle  : VIDEO_TOOL_TEXTS.taskTitle,
      learned    : VIDEO_TOOL_TEXTS.learned,
      deleteBody : VIDEO_TOOL_TEXTS.deleteBody,
    },
    getStatus : getVideoTool,
    download  : downloadVideoTool,
    remove    : deleteVideoTool,
  },
};

// In Ajustes, in this order.
export const LEARNABLE_ORDER: LearnableId[] = ['background', 'video'];
