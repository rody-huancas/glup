import { BACKGROUND_TEXTS, LEARNED_TEXTS } from '@/modules/background/constants/texts';
import type { Learnable } from '@/modules/background/interfaces/learnable';
import type { LearnableId } from '@/modules/background/types/learnableId';
import { TRANSCRIBE_TEXTS } from '@/modules/transcribe/constants/transcribe';
import { deleteTranscribeModel, downloadTranscribeModel, getTranscribeModel } from '@/modules/transcribe/services/transcribe';
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
  'transcribe-fast'    : {
    id        : 'transcribe-fast',
    texts     : {
      body       : TRANSCRIBE_TEXTS.learnBody,
      learning   : TRANSCRIBE_TEXTS.learning,
      taskTitle  : TRANSCRIBE_TEXTS.learnTask,
      learned    : TRANSCRIBE_TEXTS.learnedFast,
      deleteBody : TRANSCRIBE_TEXTS.deleteBody,
    },
    getStatus : () => getTranscribeModel('fast'),
    download  : (taskId) => downloadTranscribeModel('fast', taskId),
    remove    : () => deleteTranscribeModel('fast'),
  },
  'transcribe-precise' : {
    id        : 'transcribe-precise',
    texts     : {
      body       : TRANSCRIBE_TEXTS.learnBody,
      learning   : TRANSCRIBE_TEXTS.learning,
      taskTitle  : TRANSCRIBE_TEXTS.learnTask,
      learned    : TRANSCRIBE_TEXTS.learnedBest,
      deleteBody : TRANSCRIBE_TEXTS.deleteBody,
    },
    getStatus : () => getTranscribeModel('precise'),
    download  : (taskId) => downloadTranscribeModel('precise', taskId),
    remove    : () => deleteTranscribeModel('precise'),
  },
};

// In Ajustes, in this order.
export const LEARNABLE_ORDER: LearnableId[] = ['background', 'video', 'transcribe-fast', 'transcribe-precise'];
